export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const BASE_EXT = new Set([
  "mp3",
  "m4a",
  "aac",
  "ogg",
  "opus",
]);

const ULTIMATE_EXT = new Set(["wav", "flac", "aiff", "aif"]);

export function normalizeExtension(filename: string): string | null {
  const m = /\.([^.]+)$/.exec(filename.trim().toLowerCase());
  return m?.[1] ?? null;
}

export function isExtensionAllowedForPlan(
  ext: string,
  allowUltimateFormats: boolean
): boolean {
  if (BASE_EXT.has(ext)) return true;
  if (allowUltimateFormats && ULTIMATE_EXT.has(ext)) return true;
  return false;
}

function labelForExt(ext: string): string {
  if (ext === "aif" || ext === "aiff") return "AIFF";
  return ext.toUpperCase();
}

export function formatNotAllowedMessage(ext: string): string {
  if (ULTIMATE_EXT.has(ext)) {
    const label = labelForExt(ext);
    return `Your plan doesn't accept ${label} files. Upgrade to Ultimate for automatic conversion, or convert this file to MP3 before uploading.`;
  }
  return "This file type is not supported for your plan.";
}
