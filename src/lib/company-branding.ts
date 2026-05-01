import { mixHex, normalizeHex } from "@/lib/branding-colors";

export type CompanyBranding = {
  headerCoverFallbackBg: string;
  headerTitleColor: string;
  headerSubtitleColor: string;
  headerLogoBorderColor: string;
  bodyPageBg: string;
  bodyCardBg: string;
  bodyTextColor: string;
  bodyHeadingColor: string;
  bodyBorderColor: string;
  playerBg: string;
  playerTextColor: string;
  playerProgressFill: string;
  playerProgressTrack: string;
  playerControlBg: string;
  playerControlIcon: string;
  buttonPrimaryBg: string;
  buttonPrimaryText: string;
  buttonPrimaryHoverBg: string;
  linkColor: string;
  linkHoverColor: string;
  footerBg: string;
  footerTextColor: string;
  footerLinkColor: string;
};

export const COMPANY_BRANDING_KEYS = [
  "headerCoverFallbackBg",
  "headerTitleColor",
  "headerSubtitleColor",
  "headerLogoBorderColor",
  "bodyPageBg",
  "bodyCardBg",
  "bodyTextColor",
  "bodyHeadingColor",
  "bodyBorderColor",
  "playerBg",
  "playerTextColor",
  "playerProgressFill",
  "playerProgressTrack",
  "playerControlBg",
  "playerControlIcon",
  "buttonPrimaryBg",
  "buttonPrimaryText",
  "buttonPrimaryHoverBg",
  "linkColor",
  "linkHoverColor",
  "footerBg",
  "footerTextColor",
  "footerLinkColor",
] as const satisfies ReadonlyArray<keyof CompanyBranding>;

/** Matches legacy retail defaults so existing UI does not drift after migration. */
export const DEFAULT_COMPANY_BRANDING: CompanyBranding = {
  headerCoverFallbackBg: "#e6e3dc",
  headerTitleColor: "#1a1a1a",
  headerSubtitleColor: "#8a8580",
  headerLogoBorderColor: "#ffffff",
  bodyPageBg: "#f6f4ef",
  bodyCardBg: "#ffffff",
  bodyTextColor: "#1a1a1a",
  bodyHeadingColor: "#1a1a1a",
  bodyBorderColor: "#e6e3dc",
  playerBg: "#f0ebe3",
  playerTextColor: "#1a1a1a",
  playerProgressFill: "#c9a96e",
  playerProgressTrack: "#e6e3dc",
  playerControlBg: "#1a1a1a",
  playerControlIcon: "#f6f4ef",
  buttonPrimaryBg: "#1a1a1a",
  buttonPrimaryText: "#f6f4ef",
  buttonPrimaryHoverBg: "#333333",
  linkColor: "#a8864a",
  linkHoverColor: "#1a1a1a",
  footerBg: "#f6f4ef",
  footerTextColor: "#8a8580",
  footerLinkColor: "#c9a96e",
};

function pickHex(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  return normalizeHex(raw) ?? fallback;
}

export function mergeCompanyBranding(input: unknown): CompanyBranding {
  const base = DEFAULT_COMPANY_BRANDING;
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return { ...base };
  }
  const o = input as Record<string, unknown>;
  const next = { ...base };
  for (const k of COMPANY_BRANDING_KEYS) {
    next[k] = pickHex(o[k], base[k]);
  }
  return next;
}

function brandingVarRecord(b: CompanyBranding): Record<string, string> {
  const muted = mixHex(b.bodyTextColor, b.bodyPageBg, 0.42);
  const rowActive = mixHex(b.playerProgressFill, b.bodyPageBg, 0.14);
  return {
    "--brand-header-cover-fallback-bg": b.headerCoverFallbackBg,
    "--brand-header-title": b.headerTitleColor,
    "--brand-header-subtitle": b.headerSubtitleColor,
    "--brand-header-logo-border": b.headerLogoBorderColor,
    "--brand-body-page-bg": b.bodyPageBg,
    "--brand-body-card-bg": b.bodyCardBg,
    "--brand-body-text": b.bodyTextColor,
    "--brand-body-heading": b.bodyHeadingColor,
    "--brand-body-border": b.bodyBorderColor,
    "--brand-body-muted": muted,
    "--brand-row-active": rowActive,
    "--brand-player-bg": b.playerBg,
    "--brand-player-text": b.playerTextColor,
    "--brand-player-progress-fill": b.playerProgressFill,
    "--brand-player-progress-track": b.playerProgressTrack,
    "--brand-player-control-bg": b.playerControlBg,
    "--brand-player-control-icon": b.playerControlIcon,
    "--brand-button-primary-bg": b.buttonPrimaryBg,
    "--brand-button-primary-text": b.buttonPrimaryText,
    "--brand-button-primary-hover-bg": b.buttonPrimaryHoverBg,
    "--brand-link": b.linkColor,
    "--brand-link-hover": b.linkHoverColor,
    "--brand-footer-bg": b.footerBg,
    "--brand-footer-text": b.footerTextColor,
    "--brand-footer-link": b.footerLinkColor,
  };
}

export type RetailBrandingCssVars = Record<string, string>;

export function companyBrandingToCssVars(
  branding: CompanyBranding
): RetailBrandingCssVars {
  return brandingVarRecord(branding);
}

export function validateBrandingForSave(raw: unknown):
  | { ok: true; branding: CompanyBranding }
  | { ok: false; error: string } {
  if (raw === null || raw === undefined) {
    return { ok: false, error: "Invalid branding payload." };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Invalid branding payload." };
  }
  const merged = mergeCompanyBranding(raw);
  const incoming = raw as Record<string, unknown>;
  for (const k of COMPANY_BRANDING_KEYS) {
    const v = incoming[k];
    if (v !== undefined && typeof v !== "string") {
      return { ok: false, error: `Invalid color for ${k}.` };
    }
    if (typeof v === "string" && v.trim() !== "" && !normalizeHex(v)) {
      return { ok: false, error: `Invalid hex color: ${k}.` };
    }
  }
  if (incoming) {
    for (const rk of Object.keys(incoming)) {
      if (!(COMPANY_BRANDING_KEYS as readonly string[]).includes(rk)) {
        return { ok: false, error: `Unexpected branding key: ${rk}.` };
      }
    }
  }
  return { ok: true, branding: merged };
}
