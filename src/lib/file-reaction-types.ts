/** Shared reaction keys for DB enum, API, and UI (public page uses SVGs; summaries may use unicode). */
export const FILE_REACTION_TYPES = [
  "heart",
  "laugh",
  "cry",
  "smile",
  "fire",
  "clap",
] as const;

export type FileReactionType = (typeof FILE_REACTION_TYPES)[number];

export type FileReactionCounts = Record<FileReactionType, number>;

export function emptyReactionCounts(): FileReactionCounts {
  return {
    heart: 0,
    laugh: 0,
    cry: 0,
    smile: 0,
    fire: 0,
    clap: 0,
  };
}

export function isFileReactionType(v: unknown): v is FileReactionType {
  return (
    typeof v === "string" &&
    (FILE_REACTION_TYPES as readonly string[]).includes(v)
  );
}

/** Unicode labels for compact dashboard summaries (public UI uses SVG only). */
export const FILE_REACTION_SUMMARY_CHARS: Record<FileReactionType, string> = {
  heart: "♥",
  laugh: "😂",
  cry: "😢",
  smile: "😊",
  fire: "🔥",
  clap: "👏",
};

export function formatReactionSummaryLine(
  counts: FileReactionCounts
): string | null {
  const parts = FILE_REACTION_TYPES.filter((t) => counts[t] > 0).map(
    (t) => `${FILE_REACTION_SUMMARY_CHARS[t]} ${counts[t]}`
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}
