export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

/** Max size for a single zip archive uploaded from the dashboard. */
export const MAX_ZIP_UPLOAD_BYTES = 1024 * 1024 * 1024;

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

/** True if the extension is one we treat as an audio file inside a zip. */
export function isAudioExtensionInZip(
  ext: string | null,
  allowUltimateFormats: boolean
): boolean {
  if (!ext) return false;
  return isExtensionAllowedForPlan(ext, allowUltimateFormats);
}

export function isKnownAudioExtension(ext: string | null): boolean {
  if (!ext) return false;
  return BASE_EXT.has(ext) || ULTIMATE_EXT.has(ext);
}

/** Zip listing: junk paths, non-audio skip, or an audio type bucket. */
export type ZipEntryKind =
  | "junk"
  | "non_audio"
  | "base_audio"
  | "ultimate_only_audio";

export function classifyZipEntry(pathInZip: string): ZipEntryKind {
  if (shouldSkipZipEntryPath(pathInZip)) return "junk";
  const baseName = pathInZip.split(/[/\\]/).pop() ?? pathInZip;
  const ext = normalizeExtension(baseName);
  if (!isKnownAudioExtension(ext)) return "non_audio";
  if (ext && ULTIMATE_EXT.has(ext)) return "ultimate_only_audio";
  return "base_audio";
}

const ZIP_SKIP_PATH_PREFIX_RE = /(^|\/)__MACOSX\//i;
const ZIP_SKIP_NAME_RE = /^\.ds_store$/i;

export function shouldSkipZipEntryPath(pathInZip: string): boolean {
  const normalized = pathInZip.replace(/\\/g, "/").trim();
  if (!normalized || normalized.endsWith("/")) return true;
  if (ZIP_SKIP_PATH_PREFIX_RE.test(normalized)) return true;
  const seg = normalized.split("/").pop() ?? "";
  if (ZIP_SKIP_NAME_RE.test(seg)) return true;
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

const ZIP_FORMAT_REJECT_LIST =
  "Upload failed: incompatible file format. Your plan accepts MP3, M4A, AAC, OGG, and OPUS. Found incompatible files: [list]. Remove these files and try again, or upgrade to Ultimate to upload WAV/FLAC/AIFF with automatic conversion.";

export function zipIncompatibleFormatsErrorMessage(filenames: string[]): string {
  const list = filenames.join(", ");
  return ZIP_FORMAT_REJECT_LIST.replace("[list]", list);
}
