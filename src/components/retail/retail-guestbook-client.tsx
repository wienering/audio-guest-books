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
        `${apiBase}/playback-url?file_id=${encodeURIComponent(fileId)}`
      ).catch(() => {});
    },
    [apiBase]
  );

  const onDownloadOne = useCallback(
    async (fileId: string) => {
      const r = await fetch(
        `${apiBase}/download-url?file_id=${encodeURIComponent(fileId)}`
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
          <h2 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
            Recordings
          </h2>
          <a
            href={zipHref}
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 min-h-11 justify-center bg-teal-600 px-5 text-base text-white hover:bg-teal-700 sm:text-lg"
            )}
          >
            Download all (ZIP)
          </a>
        </div>

        {listFiles.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-10 text-center text-lg text-neutral-600">
            No messages yet — check back soon.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
            {listFiles.map((f) => {
              const active = f.id === activeFileId;
              return (
                <li key={f.id}>
                  <div
                    className={cn(
                      "flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3",
                      active && "bg-teal-50/80"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onRowActivate(f.id)}
                      className="min-h-11 flex-1 rounded-lg py-2 text-left text-base text-neutral-900 transition-colors hover:bg-neutral-100/80 sm:min-h-0 sm:py-2.5 sm:text-lg"
                    >
                      <span className="font-medium">{f.originalFilename}</span>
                      {f.durationSeconds != null ? (
                        <span className="mt-1 block text-sm text-neutral-500 sm:text-base">
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
                          "h-11 min-h-11 gap-2 border-neutral-300 text-base sm:text-lg"
                        )}
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
