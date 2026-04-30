"use client";

import { useCallback, useRef, useState } from "react";
import { Download } from "lucide-react";

import {
  RetailAudioPlayer,
  type RetailAudioFile,
  type RetailAudioPlayerHandle,
} from "@/components/retail/audio-player";
import { buttonVariants } from "@/components/ui/button";
import type { RetailBulkZip } from "@/lib/retail-types";
import { cn } from "@/lib/utils";

type Props = {
  companySlug: string;
  clientSlug: string;
  files: RetailAudioFile[];
  bulkZip: RetailBulkZip | null;
};

const POLL_MS = 3000;
const MAX_POLLS = 240;

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
          "h-11 min-h-11 justify-center px-5 text-base text-white hover:brightness-110 sm:text-lg disabled:opacity-70"
        )}
        style={{ background: "var(--retail-accent)" }}
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
        <p className="max-w-md text-right text-sm text-[var(--retail-muted)]">
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
  const playerRef = useRef<RetailAudioPlayerHandle>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(
    files[0]?.id ?? null
  );

  const listFiles = files;

  const onAdvanceToNext = useCallback(() => {
    setActiveFileId((cur) => {
      if (!cur) return null;
      const idx = listFiles.findIndex((f) => f.id === cur);
      if (idx < 0 || idx >= listFiles.length - 1) return cur;
      return listFiles[idx + 1].id;
    });
  }, [listFiles]);

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
        setActiveFileId(id);
      }
    },
    [activeFileId]
  );

  return (
    <div className="space-y-10">
      <RetailAudioPlayer
        ref={playerRef}
        files={listFiles}
        activeFileId={activeFileId}
        onAdvanceToNext={onAdvanceToNext}
        onFirstPlayLogged={onFirstPlayLogged}
      />

      <section aria-label="Recordings" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-[var(--retail-text)] sm:text-2xl">
            Recordings
          </h2>
          {bulkZip?.mode === "sync" ? (
            <a
              href={bulkZip.zipUrl}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 min-h-11 justify-center px-5 text-base text-white hover:brightness-110 sm:text-lg"
              )}
              style={{ background: "var(--retail-accent)" }}
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

        {listFiles.length === 0 ? (
          <p
            className="rounded-lg border border-dashed px-4 py-10 text-center text-lg text-[var(--retail-muted)]"
            style={{
              borderColor: "var(--retail-border)",
              background:
                "color-mix(in srgb, var(--retail-bg) 97%, var(--retail-muted) 3%)",
            }}
          >
            No messages yet — check back soon.
          </p>
        ) : (
          <ul
            className="overflow-hidden rounded-xl border bg-[var(--retail-bg)]"
            style={{ borderColor: "var(--retail-border)" }}
          >
            {listFiles.map((f) => {
              const active = f.id === activeFileId;
              return (
                <li
                  key={f.id}
                  className="border-t border-solid first:border-t-0"
                  style={{ borderTopColor: "var(--retail-border)" }}
                >
                  <div
                    className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3"
                    style={
                      active
                        ? { background: "var(--retail-row-active)" }
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      onClick={() => onRowActivate(f.id)}
                      className="min-h-11 flex-1 rounded-lg py-2 text-left text-base text-[var(--retail-text)] transition-colors hover:opacity-90 sm:min-h-0 sm:py-2.5 sm:text-lg"
                    >
                      <span className="font-medium">{f.originalFilename}</span>
                      {f.durationSeconds != null ? (
                        <span className="mt-1 block text-sm text-[var(--retail-muted)] sm:text-base">
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
                        style={{ borderColor: "var(--retail-border)" }}
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
                          className="text-[var(--retail-muted)] text-sm underline underline-offset-2 hover:text-[var(--retail-text)]"
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
