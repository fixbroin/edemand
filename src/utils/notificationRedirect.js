"use client";

/**
 * Notification Redirect Utility
 * 
 * This utility function maps notification types to their respective redirect URLs.
 * It handles all customer notification types and de[termines the appropriate route
 * based on the notification data structure.
 * 
 * Notification type → redirect mapping (all customer types):
 *
 * BOOKING (→ /booking/inv-[id]):
 *   booking_status, booking_confirmed, new_booking_confirmation_to_customer,
 *   booking_rescheduled, booking_cancelled, booking_completed, booking_started,
 *   booking_ended, order, payment, additional_charges, rating_request,
 *   online_payment_failed/success/pending, payment_refund_executed/successful,
 *   review_request_after_booking_completion
 *
 * BIDS (→ /my-service-request-details/[job_id]):
 *   bid, bid_on_custom_job_request
 *
 * CONTENT:
 *   new_blog          → /blog-details/[blog_slug]
 *   provider          → /provider-details/[provider_slug]
 *   service           → /provider-details/[provider_slug]/[service_slug]
 *   category          → /service/[parent1]/[parent2]/.../[category_slug]
 *   url               → [url from payload]
 *
 * PAGES:
 *   privacy_policy_changed      → /privacy-policy
 *   terms_and_conditions_changed → /terms-and-conditions
 *
 * CHAT:
 *   chat, new_message, message  → /chats
 *
 * NO REDIRECT (return null):
 *   user_account_active, user_account_deactive, user_blocked,
 *   user_reported, general, maintenance_mode
 * 
 * NOTE: The `click_action` field (e.g., "FLUTTER_NOTIFICATION_CLICK") is Flutter-specific
 * and is IGNORED on web. Web notifications use the service worker's 'notificationclick' 
 * event handler instead. You don't need to ask backend to change this - it works fine on web.
 */

/**
 * Get redirect URL based on notification type and data
 * @param {Object} notificationData - The notification payload data
 * @returns {string|null} - The redirect URL or null if no redirect needed
 */
export const getNotificationRedirectUrl = (notificationData) => {
  // Return null if no notification data provided
  if (!notificationData) {
    return null;
  }

  // Get notification type from data
  // Firebase notifications typically have type in data.type or data.notification_type
  // Also check web_click_type and redirect_type (backend may send these)
  const notificationType = notificationData.type || 
                           notificationData.notification_type || 
                           notificationData.notificationType ||
                           notificationData.web_click_type ||
                           notificationData.redirect_type;

  // If no type specified, return null (no redirect)
  if (!notificationType) {
    return null;
  }

  // Convert type to lowercase for case-insensitive matching
  const type = notificationType.toLowerCase().trim();
  
  // Also get redirect_type/web_click_type for fallback matching
  const redirectType = (notificationData.redirect_type || notificationData.web_click_type || "").toLowerCase().trim();

  // Booking-related notifications - redirect to booking details
  // These all redirect to the same booking details page
  const bookingRelatedTypes = [
    // Core booking lifecycle
    'booking_status',
    'booking status',
    'booking_confirmed',
    'new_booking_confirmation_to_customer', // customer booking confirmation
    'booking_rescheduled',
    'booking_cancelled',
    'booking_completed',
    'booking_started',
    'booking_ended',
    // Order & payment
    'order',                      // generic order notification
    'payment',                    // generic payment notification
    'online_payment_failed',
    'online payment failed',
    'online_payment_success',
    'online payment success',
    'online_payment_pending',
    'online payment pending',
    'payment_refund_executed',
    'payment refund executed',
    'payment_refund_successful',
    'payment refund successful',
    // Additional charges
    'additional_charges',         // official type from backend
    'added_additional_charges',   // legacy variant
    'added additional charges',
    // Rating / review
    'rating_request',             // post-booking rating prompt
    'review_request_after_booking_completion',
    'review the request after booking completion',
  ];

  if (bookingRelatedTypes.includes(type)) {
    // Get booking ID from notification data
    // Check multiple possible field names
    const bookingId = notificationData.booking_id || 
                      notificationData.bookingId || 
                      notificationData.order_id || 
                      notificationData.orderId ||
                      notificationData.id;

    if (bookingId) {
      return `/booking/inv-${bookingId}`;
    }
    // If no booking ID, return null (can't redirect without ID)
    return null;
  }

  // Job request / bid notifications - redirect to service request details
  if (
    type === 'bid' ||
    type === 'bid_on_custom_job_request' ||
    type === 'bid on a custom job request'
  ) {
    const jobId = notificationData.custom_job_request_id ||
                  notificationData.customJobRequestId ||
                  notificationData.job_id ||
                  notificationData.jobId;

    if (jobId) {
      return `/my-service-request-details/${jobId}`;
    }
    return null;
  }

  // Blog notification - redirect to blog details
  if (type === 'new_blog' || type === 'new blog') {
    // Get blog slug from notification data
    const blogSlug = notificationData.blog_slug || 
                     notificationData.blogSlug || 
                     notificationData.slug ||
                     notificationData.blog_id ||
                     notificationData.blogId ||
                     notificationData.id;

    if (blogSlug) {
      return `/blog-details/${blogSlug}`;
    }
    return null;
  }

  // Privacy Policy notification - redirect to privacy policy page
  if (type === 'privacy_policy_changed' || type === 'privacy policy changed') {
    return '/privacy-policy';
  }

  // Terms and Conditions notification - redirect to terms and conditions page
  if (type === 'terms_and_conditions_changed' || 
      type === 'terms and conditions changed' ||
      type === 'terms_and_conditions' ||
      type === 'terms and conditions') {
    return '/terms-and-conditions';
  }

  // Notifications that intentionally have no redirect:
  // user_account_active, user_account_deactive  → account status change, stay on current page
  // user_blocked, user_reported                 → moderation actions, no target page
  // general                                     → informational, no specific target
  // maintenance_mode                            → app-wide notice, no specific target
  if (
    type === 'user_account_active' ||
    type === 'user_account_deactive' ||
    type === 'user_blocked' ||
    type === 'user_reported' ||
    type === 'general' ||
    type === 'maintenance_mode'
  ) {
    return null;
  }

  // Service details notification - redirect to provider-details/provider-slug/service-slug
  // This handles notifications for specific services from a provider
  if (type === 'service' || type === 'service_details' || type === 'service details') {
    const providerSlug = notificationData.provider_slug || 
                         notificationData.providerSlug ||
                         notificationData.provider_id ||
                         notificationData.providerId;
    
    const serviceSlug = notificationData.service_slug || 
                        notificationData.serviceSlug ||
                        notificationData.slug ||
                        notificationData.service_id ||
                        notificationData.serviceId;

    if (providerSlug && serviceSlug) {
      return `/provider-details/${providerSlug}/${serviceSlug}`;
    }
    return null;
  }

  // Provider notification - redirect to provider-details/provider-slug
  // Priority: provider_slug (for URL) > providerSlug > slug > provider_id (fallback, but not ideal for URL)
  // Also check redirect_type/web_click_type for "provider-details"
  if (type === 'provider' || redirectType === 'provider-details') {
    // Prefer slug over ID since we need slug for the URL route
    const providerSlug = notificationData.provider_slug || 
                         notificationData.providerSlug ||
                         notificationData.slug ||
                         // Fallback to ID only if slug is not available (will need conversion)
                         notificationData.provider_id ||
                         notificationData.providerId ||
                         notificationData.id;

    if (providerSlug) {
      return `/provider-details/${providerSlug}`;
    }
    return null;
  }

  // Category notification - redirect to service/parent1/parent2/.../categoryslug
  // Example: parent_category_slugs: ["home", "cleaning"], category_slug: "kitchen"
  // Result: /service/home/cleaning/kitchen
  // Supports nested categories with n number of parent categories
  if (type === 'category' || redirectType === 'category') {
    let categoryRoute = '/service';
    
    // Try multiple field name variations for parent slugs
    // Can be array of slugs: ['parent1', 'parent2', 'subcategory']
    let parentSlugs = notificationData.parent_category_slugs || 
                     notificationData.parentCategorySlugs ||
                     notificationData.parent_slugs ||
                     notificationData.parent_categories || // Alternative field name
                     [];
    
    // If parentSlugs is a string, try to parse it as JSON array
    if (typeof parentSlugs === "string") {
      try {
        parentSlugs = JSON.parse(parentSlugs);
      } catch (e) {
        // If not JSON, treat as comma-separated string
        parentSlugs = parentSlugs.split(",").map(p => p.trim()).filter(p => p);
      }
    }
    
    // Ensure parentSlugs is an array
    if (!Array.isArray(parentSlugs)) {
      parentSlugs = [];
    }
    
    // Get the final category slug
    const categorySlug = notificationData.category_slug || 
                         notificationData.categorySlug ||
                         notificationData.slug ||
                         notificationData.category_id ||
                         notificationData.categoryId;

    // Build route: /service/parent1/parent2/.../categoryslug
    // If parent slugs exist, join them with '/'
    if (parentSlugs && Array.isArray(parentSlugs) && parentSlugs.length > 0) {
      // Filter out empty values, convert to strings, and join
      const validParentSlugs = parentSlugs
        .map(slug => String(slug).trim())
        .filter(slug => slug && slug.length > 0);
      
      if (validParentSlugs.length > 0) {
        categoryRoute += `/${validParentSlugs.join('/')}`;
      }
      
      // Add final category slug if provided
      if (categorySlug) {
        const cleanSlug = String(categorySlug).trim();
        if (cleanSlug) {
          categoryRoute += `/${cleanSlug}`;
        }
      }
    } else if (categorySlug) {
      // No parent categories, just the category slug
      const cleanSlug = String(categorySlug).trim();
      if (cleanSlug) {
        categoryRoute += `/${cleanSlug}`;
      }
    } else {
      // No category slug found
      return null;
    }

    return categoryRoute;
  }

  // Chat notification - redirect to /chats
  if (type === 'chat' || type === 'message' || type === 'new_message' || type === 'new message') {
    return '/chats';
  }

  // Direct URL redirect
  if (type === 'url' && notificationData.url) {
    return notificationData.url;
  }

  // Default: no redirect
  return null;
};

/**
 * Check if a notification type requires a redirect
 * @param {Object} notificationData - The notification payload data
 * @returns {boolean} - True if redirect is needed, false otherwise
 */
export const isNotificationRedirectable = (notificationData) => {
  const redirectUrl = getNotificationRedirectUrl(notificationData);
  return redirectUrl !== null;
};

/**
 * Debug helper function to test notification redirects
 * Exposes a global function in development mode for easy testing
 * Usage in browser console: window.testNotificationRedirect({ type: 'new_blog', blog_slug: 'test-slug' })
 * 
 * @param {Object} notificationData - The notification payload to test
 * @returns {Object} - Debug information about the redirect
 */
export const debugNotificationRedirect = (notificationData) => {
  if (process.env.NODE_ENV !== "production") {
    
    const redirectUrl = getNotificationRedirectUrl(notificationData);
    const isRedirectable = isNotificationRedirectable(notificationData);

    
    return {
      redirectUrl,
      isRedirectable,
      willRedirect: redirectUrl !== null,
    };
  }
  
  return {
    redirectUrl: getNotificationRedirectUrl(notificationData),
    isRedirectable: isNotificationRedirectable(notificationData),
    willRedirect: getNotificationRedirectUrl(notificationData) !== null,
  };
};

// Expose debug helper globally (always available for debugging)
// This runs immediately when the module is loaded
(function exposeNotificationHelpers() {
  if (typeof window === "undefined") {
    return; // Not in browser environment
  }

  // Only attach once to avoid duplicate assignments
  if (window.__notificationRedirectHelpersAttached) {
    return; // Already attached
  }

  // Main functions with correct casing
  window.testNotificationRedirect = debugNotificationRedirect;
  window.getNotificationRedirectUrl = getNotificationRedirectUrl;
  window.isNotificationRedirectable = isNotificationRedirectable;
  
  // Add case-insensitive aliases for convenience
  window.testNotificationredirect = debugNotificationRedirect; // lowercase 'r'
  window.testnotificationredirect = debugNotificationRedirect; // all lowercase
  
  // Helper to show available functions
  window.__showNotificationHelpers = () => {
  };
  
  window.__notificationRedirectHelpersAttached = true;
  
})();

