#!/bin/bash

# ==================================================
# 🚀 Fixbro Custom Server VPS Deployment Script
# ==================================================

set -e

APP_NAME="fixbro-web"

# --------------------------------------------------
# 🎨 Colors & Styles
# --------------------------------------------------
RESET="\033[0m"
BOLD="\033[1m"

RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
CYAN="\033[36m"

CHECK="✅"
CROSS="❌"
INFO="ℹ️"
ROCKET="🚀"
BROOM="🧹"
BOX="📦"
GEAR="⚙️"

# --------------------------------------------------
# 🧰 Helpers
# --------------------------------------------------
log() {
  echo -e "${BLUE}${INFO}${RESET} $1"
}

success() {
  echo -e "${GREEN}${CHECK}${RESET} $1"
}

warn() {
  echo -e "${YELLOW}⚠️${RESET} $1"
}

error() {
  echo -e "${RED}${CROSS}${RESET} $1"
  exit 1
}

STEP=1
TOTAL=8
step() {
  echo ""
  echo -e "${BOLD}${CYAN}[$STEP/$TOTAL] $1${RESET}"
  STEP=$((STEP+1))
}

spinner() {
  local pid=$1
  local msg=$2
  local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  local i=0

  while ps -p $pid >/dev/null 2>&1; do
    printf "\r${CYAN}%s${RESET} %s" "${spin:i++%${#spin}:1}" "$msg"
    sleep 0.1
  done
  printf "\r${GREEN}${CHECK}${RESET} %s\n" "$msg"
}

# --------------------------------------------------
# Cross-platform sed
# --------------------------------------------------
replace_in_file() {
  local pattern=$1
  local file=$2
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$pattern" "$file"
  else
    sed -i "$pattern" "$file"
  fi
}

clear
echo "--------------------------------------------------"
echo -e "${BOLD}${ROCKET} Fixbro VPS Deployment (Custom Server)${RESET}"
echo "--------------------------------------------------"

# --------------------------------------------------
# 1. Port & PM2 Configuration
# --------------------------------------------------
step "PM2 & Port Configuration"

# Try to get port from ecosystem.config.cjs, fallback to 8001
CURRENT_PORT=$(grep -o "PORT: [0-9]*" ecosystem.config.cjs 2>/dev/null | grep -o "[0-9]*" | head -1)
[ -z "$CURRENT_PORT" ] && CURRENT_PORT=8001

echo -e "Current Port: ${GREEN}$CURRENT_PORT${RESET}"
read -p "➜ Enter Port (Press Enter to keep $CURRENT_PORT): " INPUT_PORT
PORT=${INPUT_PORT:-$CURRENT_PORT}

log "Checking PM2 processes..."
# Get the full list of PM2 processes
PM2_LIST=$(pm2 jlist)

# Check if our specific app name exists in the list
# We use jq (if available) or python for robust JSON parsing, falling back to grep strings if needed
if command -v jq >/dev/null; then
  PM2_EXISTS=$(echo "$PM2_LIST" | jq -r ".[] | select(.name == \"$APP_NAME\") | .name")
else
  # Fallback: Check if the APP_NAME string appears in the name field
  PM2_EXISTS=$(echo "$PM2_LIST" | grep -o "\"name\":\"$APP_NAME\"" || true)
fi

PORT_IN_USE=$(lsof -i :"$PORT" -sTCP:LISTEN -t 2>/dev/null || true)

RESTART_ONLY=false

if [[ -n "$PORT_IN_USE" && -z "$PM2_EXISTS" ]]; then
  # Port is in use, but NOT by our app (according to PM2)
  # BUT, let's double check if ANY PM2 process is using this port
  # because lsof might show a node process that IS managed by PM2 but under a different name
  
  # Get PID of port user
  PORT_PID=$PORT_IN_USE
  
  # Check if this PID belongs to a PM2 process
  PM2_PID_MATCH=$(echo "$PM2_LIST" | grep "\"pid\":$PORT_PID" || true)
  
  if [[ -n "$PM2_PID_MATCH" ]]; then
    # The port IS used by a PM2 process, but maybe with a different name (e.g., fixbro-web-test)
    warn "Port $PORT is used by a PM2 process with a different name."
    
    # Try to extract the name of the conflicting process
    CONFLICT_NAME=$(echo "$PM2_PID_MATCH" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [[ -n "$CONFLICT_NAME" ]]; then
       warn "Found conflicting PM2 process: $CONFLICT_NAME"
       if [[ "$CONFLICT_NAME" == "$APP_NAME" ]]; then
          success "Conflict is our app itself (orphaned or different ID). Proceeding."
          pm2 delete "$CONFLICT_NAME" || true
       else
          # Ask user or just force delete if in non-interactive mode?
          # Assuming interactive for now based on previous read prompts
          read -p "➜ Do you want to stop '$CONFLICT_NAME' and proceed? (y/n): " CONFIRM_DELETE
          if [[ "$CONFIRM_DELETE" == "y" || "$CONFIRM_DELETE" == "Y" ]]; then
            pm2 delete "$CONFLICT_NAME"
            success "Deleted conflicting process: $CONFLICT_NAME"
          else
            error "Aborting. Port $PORT is occupied by '$CONFLICT_NAME'."
          fi
       fi
    else
       error "Port $PORT is in use by a PM2 process (unknown name)."
    fi
  else
    # Port used by non-PM2 process
    error "Port $PORT is already in use by another process (PID: $PORT_PID)"
  fi
fi

if [[ -n "$PM2_EXISTS" ]]; then
  # App with exact name exists, check its port
  EXISTING_PORT=$(pm2 env "$APP_NAME" 2>/dev/null | grep -w "PORT=" | cut -d= -f2 || echo "")
  
  # Fallback: if pm2 env failed (empty), assume we need to restart/recreate to be safe
  if [[ -z "$EXISTING_PORT" ]]; then
     warn "Could not determine existing port for $APP_NAME. Will recreate."
     pm2 delete "$APP_NAME"
  elif [[ "$EXISTING_PORT" == "$PORT" ]]; then
    RESTART_ONLY=true
    success "PM2 app '$APP_NAME' exists on same port — will restart only"
  else
    warn "PM2 app '$APP_NAME' exists on port $EXISTING_PORT (new: $PORT) — will recreate"
    pm2 delete "$APP_NAME"
  fi
fi

# --------------------------------------------------
# 2. Clean Build Artifacts
# --------------------------------------------------
step "Cleaning old builds"
rm -rf .next out dist
mkdir -p logs .well-known
success "Clean complete"

# --------------------------------------------------
# 3. Install Dependencies
# --------------------------------------------------
step "Installing dependencies"
# Install all deps (including devDeps) for build
npm install >/dev/null 2>&1 &
spinner $! "Dependencies installed"

# --------------------------------------------------
# 4. Generate Sitemap & SW
# --------------------------------------------------
step "Generating sitemap & service worker"
if [ -f "scripts/setup-sitemap.js" ]; then
node scripts/setup-sitemap.js
fi
if [ -f "scripts/generate-sw.js" ]; then
  node scripts/generate-sw.js
fi
success "Assets generated"

# --------------------------------------------------
# 5. Build Next.js (Standalone Mode)
# --------------------------------------------------
step "Building Next.js (Standalone Mode)"

# Enable SEO for standalone mode logic
export NEXT_PUBLIC_ENABLE_SEO="true"
export NODE_ENV="production"

# Update ecosystem.config.cjs with new port
replace_in_file "s/PORT: [0-9]*/PORT: $PORT/g" ecosystem.config.cjs

npm run build >/dev/null 2>&1 &
spinner $! "Build complete"

[ ! -d ".next/standalone" ] && error "Build failed - .next/standalone directory not found"

# --------------------------------------------------
# 6. Generate Apache .htaccess
# --------------------------------------------------
step "Generating Apache configuration"

# Generate .htaccess using the Node.js script
# Pass the PORT as an argument
npm run generate-htaccess -- $PORT

success ".htaccess generated for port $PORT"

# --------------------------------------------------
# 7. Manage PM2 Process
# --------------------------------------------------
step "Managing PM2 process"

if [[ "$RESTART_ONLY" == "true" ]]; then
  log "Restarting existing PM2 process..."
  pm2 restart "$APP_NAME"
else
  log "Starting new PM2 process..."
  pm2 start ecosystem.config.cjs
fi

pm2 save
success "PM2 configured and saved"

# --------------------------------------------------
# 8. Reload Apache
# --------------------------------------------------
step "Reloading Apache"

# Enable required Apache modules
if command -v a2enmod >/dev/null; then
  log "Enabling Apache modules..."
  sudo a2enmod rewrite expires headers >/dev/null 2>&1 || warn "Could not enable Apache modules (might already be enabled or permission denied)"
fi

if command -v systemctl >/dev/null; then
  sudo systemctl reload apache2 2>/dev/null || sudo systemctl reload httpd 2>/dev/null || warn "Apache reload failed"
  success "Apache reloaded via systemctl"
elif command -v service >/dev/null; then
  sudo service apache2 reload 2>/dev/null || sudo service httpd reload 2>/dev/null || warn "Apache reload failed"
  success "Apache reloaded via service"
else
  warn "Apache reload skipped (command not found)"
fi

# --------------------------------------------------
# DONE
# --------------------------------------------------
echo ""
echo "=================================================="
echo -e "${GREEN}${ROCKET} DEPLOYMENT SUCCESSFUL${RESET}"
echo "=================================================="
echo -e "App Name : ${BOLD}$APP_NAME${RESET}"
echo -e "Mode     : ${BOLD}Standalone (Next.js)${RESET}"
echo -e "Port     : ${CYAN}$PORT${RESET}"
echo -e "URL      : ${CYAN}http://localhost:$PORT${RESET}"
echo "=================================================="
echo -e "${YELLOW}💡 Benefits:${RESET}"
echo -e "  • Reduced memory footprint"
echo -e "  • Faster startup times"
echo -e "  • Optimized production builds"
echo "=================================================="
echo ""

pm2 ls
