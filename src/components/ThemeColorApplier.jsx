import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useSelector } from "react-redux";

/**
 * Reads theme colors from web_settings API response and applies them as
 * CSS custom properties on <html>, overriding the static values in globals.css.
 *
 * API field → CSS variable(s)
 *   primary_color          → --primary-color
 *   secondary_color        → --secondary-color
 *   light_bg_color         → --light-bg-color
 *   text_color             → --text-color
 *   card_background_color  → --card-bg-color, --provider-card-bg
 *   description_text_color → --description-text-color
 */
export default function ThemeColorApplier() {
  const { resolvedTheme } = useTheme();
  const themeColors = useSelector(
    (state) => state?.settingsData?.settings?.web_settings?.theme
  );

  useEffect(() => {
    if (!themeColors || typeof document === "undefined") return;

    const isDark = resolvedTheme === "dark";
    const colors = isDark ? themeColors.dark : themeColors.light;

    if (!colors) return;

    const root = document.documentElement;

    if (colors.primary_color) {
      root.style.setProperty("--primary-color", colors.primary_color);
    }
    if (colors.secondary_color) {
      root.style.setProperty("--secondary-color", colors.secondary_color);
    }
    if (colors.light_bg_color) {
      root.style.setProperty("--light-bg-color", colors.light_bg_color);
    }
    if (colors.text_color) {
      root.style.setProperty("--text-color", colors.text_color);
    }
    if (colors.card_background_color) {
      root.style.setProperty("--card-bg-color", colors.card_background_color);
    }
    if (colors.description_text_color) {
      root.style.setProperty("--description-text-color", colors.description_text_color);
    }
  }, [resolvedTheme, themeColors]);

  return null;
}
