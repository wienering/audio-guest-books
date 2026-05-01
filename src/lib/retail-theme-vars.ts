import { companyBrandingToCssVars, mergeCompanyBranding } from "@/lib/company-branding";

export type RetailThemeCssRecord = Record<string, string>;

/**
 * Computes CSS variables for public retail surfaces (guest book, tenant landing).
 * When custom branding feature is disabled, stored branding is ignored and defaults apply.
 */
export function buildRetailBrandingStyle(opts: {
  customBrandingEnabled: boolean;
  brandingJson: unknown;
}): RetailThemeCssRecord {
  if (!opts.customBrandingEnabled) {
    return companyBrandingToCssVars(mergeCompanyBranding(null));
  }
  return companyBrandingToCssVars(mergeCompanyBranding(opts.brandingJson));
}
