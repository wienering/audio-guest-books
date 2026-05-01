import {
  contrastingTextHex,
  hexToRgb,
  mixHex,
  normalizeHex,
  relativeLuminance,
} from "@/lib/branding-colors";

export type RetailThemeCssRecord = Record<string, string>;

/** Default retail page theme when vendor custom theme is off (audioguestbooks brand sheet). */
const DEFAULT_THEME: RetailThemeCssRecord = {
  "--retail-bg": "#f6f4ef",
  "--retail-text": "#1a1a1a",
  "--retail-muted": "#8a8580",
  "--retail-primary": "#1a1a1a",
  "--retail-border": "#e6e3dc",
  "--retail-accent": "#c9a96e",
  "--retail-row-active": "rgba(201, 169, 110, 0.14)",
  "--retail-player-bg": "color-mix(in srgb, var(--retail-bg) 94%, var(--retail-muted) 6%)",
};

export function buildRetailThemeCssVars(input: {
  useCustomTheme: boolean;
  themePrimary: string | null;
  themeSecondary: string | null;
  themeAccent: string | null;
  themeBackground: string | null;
  themeText: string | null;
}): RetailThemeCssRecord {
  if (!input.useCustomTheme) {
    return { ...DEFAULT_THEME };
  }

  const bg = normalizeHex(input.themeBackground) ?? "#f6f4ef";
  const primary = normalizeHex(input.themePrimary) ?? "#1a1a1a";
  const secondary = normalizeHex(input.themeSecondary);
  const accent = normalizeHex(input.themeAccent) ?? primary;
  const text =
    normalizeHex(input.themeText) ?? contrastingTextHex(bg);
  const rgbBg = hexToRgb(bg);
  const lum = rgbBg ? relativeLuminance(rgbBg) : 1;
  const border =
    secondary ?? (lum > 0.45 ? mixHex(text, bg, 0.12) : mixHex(text, bg, 0.2));
  const rowActive = mixHex(accent, bg, 0.14);
  const muted = mixHex(text, bg, 0.42);

  return {
    "--retail-bg": bg,
    "--retail-text": text,
    "--retail-muted": muted,
    "--retail-primary": primary,
    "--retail-border": border,
    "--retail-accent": accent,
    "--retail-row-active": rowActive,
    "--retail-player-bg": `color-mix(in srgb, ${bg} 92%, ${accent} 8%)`,
  };
}
