"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";

import {
  RetailAudioPlayer,
  type RetailAudioFile,
  type RetailAudioPlayerHandle,
} from "@/components/retail/audio-player";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  companySlug: string;
  clientSlug: string;
  files: RetailAudioFile[];
};

export function RetailGuestbookClient({
  companySlug,
  clientSlug,
  files,
}: Props) {
  const apiBase = `/api/retail/${encodeURIComponent(companySlug)}/${encodeURIComponent(clientSlug)}`;
  const playerRef = useRef<RetailAudioPlayerHandle>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(
    files[0]?.id ?? null
  );

  const listFiles = useMemo(() => files, [files]);

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

  const zipHref = `${apiBase}/zip`;

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
          <a
            href={zipHref}
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 min-h-11 justify-center px-5 text-base text-white hover:brightness-110 sm:text-lg"
            )}
            style={{ background: "var(--retail-accent)" }}
          >
            Download all (ZIP)
          </a>
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
                    <div className="flex shrink-0 justify-end sm:pl-4">
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
