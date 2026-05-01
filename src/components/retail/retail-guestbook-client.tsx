"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  RetailAudioPlayer,
  type RetailAudioFile,
  type RetailAudioPlayerHandle,
} from "@/components/retail/audio-player";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import type { RetailBulkZip } from "@/lib/retail-types";
import { formatFileDisplayName } from "@/lib/format-file-display-name";
import { cn } from "@/lib/utils";

type Props = {
  companySlug: string;
  clientSlug: string;
  files: RetailAudioFile[];
  bulkZip: RetailBulkZip | null;
};

const POLL_MS = 3000;
const MAX_POLLS = 240;

const SORT_OPTIONS = [
  { value: "default", label: "Default order" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function parseSortParam(raw: string | null): SortValue {
  if (raw && SORT_OPTIONS.some((o) => o.value === raw)) {
    return raw as SortValue;
  }
  return "default";
}

function compareName(a: RetailAudioFile, b: RetailAudioFile): number {
  const da = formatFileDisplayName(a.originalFilename);
  const db = formatFileDisplayName(b.originalFilename);
  return da.localeCompare(db, undefined, { sensitivity: "base" });
}

function AsyncZipButton(props: { zipRequestUrl: string; zipStatusUrl: string }) {
  const { zipRequestUrl, zipStatusUrl } = props;
  const [phase, setPhase] = useState<"idle" | "working" | "error">("idle");
  const [errMessage, setErrMessage] = useState<string | null>(null);

  const run = useCallback(async () => {
    setPhase("working");
    setErrMessage(null);
    try {
      const r = await fetch(zipRequestUrl, {
        method: "POST",
        credentials: "same-origin",
      });
      const j = (await r.json()) as {
        status?: string;
        jobId?: string;
        downloadUrl?: string;
        error?: string;
      };
      if (!r.ok) {
        setPhase("error");
        setErrMessage(j.error ?? "Could not start download.");
        return;
      }
      if (j.status === "ready" && j.downloadUrl) {
        window.location.assign(j.downloadUrl);
        setPhase("idle");
        return;
      }
      const jobId = j.jobId;
      if (!jobId) {
        setPhase("error");
        setErrMessage("Invalid server response.");
        return;
      }
      for (let n = 0; n < MAX_POLLS; n += 1) {
        await new Promise((res) => setTimeout(res, POLL_MS));
        const s = await fetch(
          `${zipStatusUrl}?jobId=${encodeURIComponent(jobId)}`,
          { credentials: "same-origin" }
        );
        const sj = (await s.json()) as {
          status?: string;
          downloadUrl?: string;
          error?: string;
          message?: string;
        };
        if (sj.status === "ready" && sj.downloadUrl) {
          window.location.assign(sj.downloadUrl);
          setPhase("idle");
          return;
        }
        if (sj.status === "failed") {
          setPhase("error");
          setErrMessage(sj.error ?? "Zip generation failed.");
          return;
        }
        if (sj.status === "expired") {
          setPhase("error");
          setErrMessage(sj.message ?? "Download expired. Try again.");
          return;
        }
      }
      setPhase("error");
      setErrMessage("Still preparing — try again in a few minutes.");
    } catch {
      setPhase("error");
      setErrMessage("Network error.");
    }
  }, [zipRequestUrl, zipStatusUrl]);

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <button
        type="button"
        disabled={phase === "working"}
        onClick={() => void run()}
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-11 min-h-11 justify-center px-5 text-base transition-colors hover:[background-color:var(--brand-button-primary-hover-bg)] sm:text-lg disabled:opacity-70"
        )}
        style={{
          background: "var(--brand-button-primary-bg)",
          color: "var(--brand-button-primary-text)",
        }}
      >
        {phase === "working" ? (
          "Preparing download…"
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Download className="size-4" aria-hidden />
            Download all (ZIP)
          </span>
        )}
      </button>
      {phase === "working" ? (
        <p className="max-w-md text-right text-sm" style={{ color: "var(--brand-body-muted)" }}>
          Preparing your download… This may take a few minutes for large events.
        </p>
      ) : null}
      {phase === "error" && errMessage ? (
        <div className="flex flex-col items-end gap-2 text-right text-sm text-red-600">
          <p>{errMessage}</p>
          <button
            type="button"
            className="font-medium underline underline-offset-2"
            onClick={() => {
              setPhase("idle");
              setErrMessage(null);
            }}
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function RetailGuestbookClient({
  companySlug,
  clientSlug,
  files,
  bulkZip,
}: Props) {
  const apiBase = `/api/retail/${encodeURIComponent(companySlug)}/${encodeURIComponent(clientSlug)}`;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const sortKey = useMemo(
    () => parseSortParam(searchParams.get("sort")),
    [searchParams]
  );

  const setSortKey = useCallback(
    (value: SortValue) => {
      const p = new URLSearchParams(searchParams.toString());
      if (value === "default") p.delete("sort");
      else p.set("sort", value);
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const listFiles = useMemo(() => {
    const list = [...files];
    switch (sortKey) {
      case "default":
        return list;
      case "name-asc":
        return list.sort(compareName);
      case "name-desc":
        return list.sort((a, b) => compareName(b, a));
      case "newest":
        return list.sort((a, b) => {
          const tb = new Date(b.uploadedAtIso).getTime();
          const ta = new Date(a.uploadedAtIso).getTime();
          if (tb !== ta) return tb - ta;
          return a.id.localeCompare(b.id);
        });
      case "oldest":
        return list.sort((a, b) => {
          const ta = new Date(a.uploadedAtIso).getTime();
          const tb = new Date(b.uploadedAtIso).getTime();
          if (ta !== tb) return ta - tb;
          return a.id.localeCompare(b.id);
        });
      default:
        return list;
    }
  }, [files, sortKey]);

  const [searchQuery, setSearchQuery] = useState("");

  const displayFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return listFiles;
    return listFiles.filter((f) =>
      formatFileDisplayName(f.originalFilename).toLowerCase().includes(q)
    );
  }, [listFiles, searchQuery]);

  const filterActive = searchQuery.trim().length > 0;

  const playerRef = useRef<RetailAudioPlayerHandle>(null);
  /**
   * When true before active track loads, player calls play(); cleared after consume.
   * List-driven selection sync clears this so initial load / sort / filter never autoplay.
   */
  const autoplayNextTrackLoadRef = useRef(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(
    files[0]?.id ?? null
  );

  useEffect(() => {
    autoplayNextTrackLoadRef.current = false;
    if (displayFiles.length === 0) {
      setActiveFileId(null);
      return;
    }
    setActiveFileId((cur) => {
      if (cur && displayFiles.some((f) => f.id === cur)) return cur;
      return displayFiles[0]!.id;
    });
  }, [displayFiles]);

  const onAdvanceToNext = useCallback(() => {
    autoplayNextTrackLoadRef.current = true;
    setActiveFileId((cur) => {
      if (!cur) return null;
      const idx = displayFiles.findIndex((f) => f.id === cur);
      if (idx < 0 || idx >= displayFiles.length - 1) return cur;
      return displayFiles[idx + 1]!.id;
    });
  }, [displayFiles]);

  const onFirstPlayLogged = useCallback(
    (fileId: string) => {
      void fetch(
        `${apiBase}/playback-url?file_id=${encodeURIComponent(fileId)}`,
        { credentials: "same-origin" }
      ).catch(() => {});
    },
    [apiBase]
  );

  const onDownloadOne = useCallback(
    async (fileId: string) => {
      const r = await fetch(
        `${apiBase}/download-url?file_id=${encodeURIComponent(fileId)}`,
        { credentials: "same-origin" }
      );
      if (!r.ok) return;
      const j = (await r.json()) as { url?: string };
      if (j.url) window.location.assign(j.url);
    },
    [apiBase]
  );

  const onRowActivate = useCallback(
    (id: string) => {
      if (id === activeFileId) {
        playerRef.current?.togglePlayPause();
      } else {
        autoplayNextTrackLoadRef.current = true;
        setActiveFileId(id);
      }
    },
    [activeFileId]
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div
        className={cn(
          "sticky top-0 z-40 -mx-4 border-b px-4 pb-4 pt-1 sm:-mx-8 sm:px-8",
          "bg-[var(--brand-body-page-bg)]/95 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.18)] backdrop-blur-md supports-[backdrop-filter]:bg-[var(--brand-body-page-bg)]/80"
        )}
        style={{ borderColor: "var(--brand-body-border)" }}
      >
        <RetailAudioPlayer
          ref={playerRef}
          files={listFiles}
          activeFileId={activeFileId}
          autoplayNextTrackLoadRef={autoplayNextTrackLoadRef}
          onAdvanceToNext={onAdvanceToNext}
          onFirstPlayLogged={onFirstPlayLogged}
        />
      </div>

      <div className="space-y-2">
        <label className="sr-only" htmlFor="retail-file-search">
          Search recordings
        </label>
        <Input
          id="retail-file-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files..."
          autoComplete="off"
          className="h-11 w-full max-w-xl border text-base placeholder:text-[var(--brand-body-muted)]"
          style={{
            borderColor: "var(--brand-body-border)",
            background: "var(--brand-body-card-bg)",
            color: "var(--brand-body-text)",
          }}
        />
        {filterActive ? (
          <p className="text-sm" style={{ color: "var(--brand-body-muted)" }}>
            {displayFiles.length} of {listFiles.length} files
          </p>
        ) : null}
      </div>

      <section aria-label="Recordings" className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <h2
            className="text-xl font-semibold sm:text-2xl"
            style={{ color: "var(--brand-body-heading)" }}
          >
            Recordings
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-4">
            <label
              className="flex min-w-0 flex-shrink-0 items-center gap-2 text-sm sm:text-base"
              style={{ color: "var(--brand-body-text)" }}
            >
              <span className="whitespace-nowrap">Sort by:</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortValue)}
                className="h-11 min-w-0 flex-1 rounded-md border px-3 py-2 text-base sm:min-w-[12rem] sm:flex-none"
                style={{
                  borderColor: "var(--brand-body-border)",
                  background: "var(--brand-body-card-bg)",
                  color: "var(--brand-body-text)",
                }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {bulkZip?.mode === "sync" ? (
              <a
                href={bulkZip.zipUrl}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "inline-flex h-11 min-h-11 items-center justify-center px-5 text-base transition-colors hover:[background-color:var(--brand-button-primary-hover-bg)] sm:text-lg"
                )}
                style={{
                  background: "var(--brand-button-primary-bg)",
                  color: "var(--brand-button-primary-text)",
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Download className="size-4" aria-hidden />
                  Download all (ZIP)
                </span>
              </a>
            ) : bulkZip?.mode === "async" ? (
              <AsyncZipButton
                zipRequestUrl={bulkZip.zipRequestUrl}
                zipStatusUrl={bulkZip.zipStatusUrl}
              />
            ) : null}
          </div>
        </div>

        {listFiles.length === 0 ? (
          <p
            className="rounded-lg border border-dashed px-4 py-10 text-center text-lg"
            style={{
              borderColor: "var(--brand-body-border)",
              background:
                "color-mix(in srgb, var(--brand-body-card-bg) 97%, var(--brand-body-muted) 3%)",
              color: "var(--brand-body-muted)",
            }}
          >
            No messages yet — check back soon.
          </p>
        ) : filterActive && displayFiles.length === 0 ? (
          <p
            className="rounded-lg border border-dashed px-4 py-10 text-center text-lg"
            style={{
              borderColor: "var(--brand-body-border)",
              background:
                "color-mix(in srgb, var(--brand-body-card-bg) 97%, var(--brand-body-muted) 3%)",
              color: "var(--brand-body-muted)",
            }}
          >
            No files match your search
          </p>
        ) : (
          <ul
            className="overflow-hidden rounded-xl border"
            style={{
              borderColor: "var(--brand-body-border)",
              background: "var(--brand-body-card-bg)",
            }}
          >
            {displayFiles.map((f) => {
              const active = f.id === activeFileId;
              const displayName = formatFileDisplayName(f.originalFilename);
              return (
                <li
                  key={f.id}
                  className="border-t border-solid first:border-t-0"
                  style={{ borderTopColor: "var(--brand-body-border)" }}
                >
                  <div
                    className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3"
                    style={
                      active
                        ? { background: "var(--brand-row-active)" }
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      onClick={() => onRowActivate(f.id)}
                      className="min-h-11 flex-1 rounded-lg py-2 text-left text-base transition-colors hover:opacity-90 sm:min-h-0 sm:py-2.5 sm:text-lg"
                      style={{ color: "var(--brand-body-text)" }}
                    >
                      <span className="font-medium">{displayName}</span>
                      {f.durationSeconds != null ? (
                        <span
                          className="mt-1 block text-sm sm:text-base"
                          style={{ color: "var(--brand-body-muted)" }}
                        >
                          {f.durationSeconds}s
                        </span>
                      ) : null}
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-2 sm:pl-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onDownloadOne(f.id);
                        }}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "lg" }),
                          "h-11 min-h-11 gap-2 border text-base sm:text-lg"
                        )}
                        style={{
                          borderColor: "var(--brand-body-border)",
                          background: "var(--brand-body-card-bg)",
                          color: "var(--brand-body-text)",
                        }}
                      >
                        <Download className="size-4" aria-hidden />
                        Download
                      </button>
                      {f.losslessOriginalFileId ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onDownloadOne(f.losslessOriginalFileId!);
                          }}
                          className="text-sm underline underline-offset-2 transition-colors hover:[color:var(--brand-link-hover)]"
                          style={{ color: "var(--brand-link)" }}
                        >
                          Download original
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
