/**
 * Strips the last file extension for display only (e.g. "0031.MP3" → "0031").
 * Keeps leading-dot names like ".env" unchanged.
 */
export function formatFileDisplayName(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) return "";

  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0) return trimmed;

  const base = trimmed.slice(0, lastDot);
  return base.length > 0 ? base : trimmed;
}
