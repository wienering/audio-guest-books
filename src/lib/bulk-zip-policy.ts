export const SYNC_BULK_ZIP_MAX_BYTES = 50 * 1024 * 1024;
export const SYNC_BULK_ZIP_MAX_FILES = 20;

export function bulkZipUsesSyncPath(files: { sizeBytes: number }[]): boolean {
  const n = files.length;
  const total = files.reduce((s, f) => s + f.sizeBytes, 0);
  return total < SYNC_BULK_ZIP_MAX_BYTES && n < SYNC_BULK_ZIP_MAX_FILES;
}
