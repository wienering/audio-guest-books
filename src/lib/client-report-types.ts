import type { CompanyBranding } from "@/lib/company-branding";

export type ClientReportAnalyticsSlice = {
  totalPlays: number;
  uniqueListeners: number;
  ok: boolean;
};

export type ClientReportPdfInput = {
  companyName: string;
  logoDataUri: string | null;
  branding: CompanyBranding;
  eventName: string;
  /** Display label for client / guest of honor */
  clientName: string;
  /** Long formatted event date e.g. October 15, 2025 */
  eventDateFormatted: string;
  /** Long formatted generation timestamp */
  generatedAtFormatted: string;
  recordingCount: number;
  totalDurationSeconds: number;
  analytics: ClientReportAnalyticsSlice | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactWebsite: string | null;
};
