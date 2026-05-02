"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FILE_REACTION_TYPES,
  type FileReactionCounts,
  type FileReactionType,
  isFileReactionType,
} from "@/lib/file-reaction-types";
import { cn } from "@/lib/utils";

function reactionStorageKey(fileId: string) {
  return `reactions:${fileId}`;
}

function loadSessionReactions(fileId: string): Set<FileReactionType> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(reactionStorageKey(fileId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((x): x is FileReactionType => isFileReactionType(x))
    );
  } catch {
    return new Set();
  }
}

function persistSessionReactions(
  fileId: string,
  selected: Set<FileReactionType>
) {
  try {
    localStorage.setItem(
      reactionStorageKey(fileId),
      JSON.stringify([...selected])
    );
  } catch {
    /* quota / private mode */
  }
}

function ReactionGlyph(props: {
  type: FileReactionType;
  className?: string;
}) {
  const { type, className } = props;
  const common = cn("size-[1.125rem] shrink-0", className);
  switch (type) {
    case "heart":
      return (
        <svg className={common} viewBox="0 0 24 24" aria-hidden fill="currentColor">
          <path d="M12 21s-6.716-5.047-9-8.5C.5 9.5.5 6.2 3.2 4.4 5.6 2.8 8.5 3.5 12 6.7c3.5-3.2 6.4-3.9 8.8-2.3 2.7 1.8 2.7 5.1.8 8.1C19.716 15.953 12 21 12 21z" />
        </svg>
      );
    case "laugh":
      return (
        <svg className={common} viewBox="0 0 24 24" aria-hidden fill="none">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.75" />
          <path
            fill="currentColor"
            d="M8 14c1.2 2 3 3 4 3s2.8-1 4-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="9" cy="10" r="1.25" fill="currentColor" />
          <circle cx="15" cy="10" r="1.25" fill="currentColor" />
        </svg>
      );
    case "cry":
      return (
        <svg className={common} viewBox="0 0 24 24" aria-hidden fill="none">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.75" />
          <path
            fill="currentColor"
            d="M9 15h6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="9" cy="10" r="1.25" fill="currentColor" />
          <circle cx="15" cy="10" r="1.25" fill="currentColor" />
          <path
            d="M8 18c1-.8 2.5-1.2 4-1.2s3 .4 4 1.2"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
      );
    case "smile":
      return (
        <svg className={common} viewBox="0 0 24 24" aria-hidden fill="none">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.75" />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            d="M8 14c1.3 1.6 3 2.5 4 2.5s2.7-.9 4-2.5"
          />
          <circle cx="9" cy="10" r="1.25" fill="currentColor" />
          <circle cx="15" cy="10" r="1.25" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}

const REACTION_LABELS: Record<FileReactionType, string> = {
  heart: "Heart",
  laugh: "Laugh",
  cry: "Moved",
  smile: "Smile",
};

type Props = {
  fileId: string;
  initialCounts: FileReactionCounts;
};

export function RetailFileReactions(props: Props) {
  const { fileId, initialCounts } = props;
  const [counts, setCounts] = useState<FileReactionCounts>(initialCounts);
  const [sessionSelected, setSessionSelected] = useState<Set<FileReactionType>>(
    () => new Set()
  );
  const [burstKey, setBurstKey] = useState<FileReactionType | null>(null);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCounts(initialCounts);
  }, [initialCounts]);

  useEffect(() => {
    setSessionSelected(loadSessionReactions(fileId));
  }, [fileId]);

  useEffect(() => {
    return () => {
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    };
  }, []);

  const triggerBurst = useCallback((t: FileReactionType) => {
    setBurstKey(t);
    if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    burstTimerRef.current = setTimeout(() => setBurstKey(null), 220);
  }, []);

  const onToggle = useCallback(
    async (type: FileReactionType) => {
      const prevSel = new Set(sessionSelected);
      const wasSelected = prevSel.has(type);
      const action = wasSelected ? "remove" : "add";

      const nextSel = new Set(prevSel);
      if (wasSelected) nextSel.delete(type);
      else nextSel.add(type);
      setSessionSelected(nextSel);
      persistSessionReactions(fileId, nextSel);

      if (!wasSelected) triggerBurst(type);

      try {
        const r = await fetch(
          `/api/files/${encodeURIComponent(fileId)}/reactions`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reaction_type: type, action }),
          }
        );
        const j = (await r.json()) as {
          reactions?: FileReactionCounts;
          error?: string;
        };
        if (!r.ok) {
          setSessionSelected(prevSel);
          persistSessionReactions(fileId, prevSel);
          return;
        }
        if (j.reactions) setCounts(j.reactions);
      } catch {
        setSessionSelected(prevSel);
        persistSessionReactions(fileId, prevSel);
      }
    },
    [fileId, sessionSelected, triggerBurst]
  );

  const buttons = useMemo(
    () =>
      FILE_REACTION_TYPES.map((type) => ({
        type,
        selected: sessionSelected.has(type),
        count: counts[type],
      })),
    [counts, sessionSelected]
  );

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-1"
      role="group"
      aria-label="Reactions"
    >
      {buttons.map(({ type, selected, count }) => (
        <button
          key={type}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void onToggle(type);
          }}
          className={cn(
            "inline-flex origin-center items-center gap-1 rounded-full border px-2 py-1 text-sm transition-[transform] duration-200",
            burstKey === type && "scale-125",
            selected
              ? "border-[color-mix(in_srgb,var(--brand-link)_55%,var(--brand-body-border))] bg-[color-mix(in_srgb,var(--brand-link)_12%,transparent)]"
              : "border-transparent opacity-90 hover:opacity-100"
          )}
          style={{
            color: "var(--brand-body-text)",
          }}
          aria-pressed={selected}
          aria-label={`${REACTION_LABELS[type]}${count > 0 ? `, ${count}` : ""}`}
        >
          <ReactionGlyph type={type} />
          {count > 0 ? (
            <span
              className="tabular-nums transition-[transform,opacity] duration-200"
              style={{ color: "var(--brand-body-muted)" }}
              key={count}
            >
              {count}
            </span>
          ) : (
            <span className="sr-only">{REACTION_LABELS[type]}</span>
          )}
        </button>
      ))}
    </div>
  );
}
