"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatNotAllowedMessage,
  isExtensionAllowedForPlan,
  MAX_UPLOAD_BYTES,
  normalizeExtension,
} from "@/lib/audio-upload-policy";
import { cn, formatBytes } from "@/lib/utils";

export type EventDetailClientFile = {
  id: string;
  originalFilename: string;
  sizeBytes: number;
  uploadedAt: string;
  displayOrder: number;
};

export type EventDetailClientProps = {
  eventId: string;
  eventName: string;
  eventTypeLabel: string;
  eventDateLabel: string;
  retailClientName: string;
  retailClientEmail: string;
  retailClientSlug: string;
  retentionUntilLabel: string;
  files: EventDetailClientFile[];
  allowUltimateFormats: boolean;
  fileLimit: number | null;
  activeFileCount: number;
};

function putToPresignedUrl(
  file: File,
  url: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream"
    );
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(file);
  });
}

function validateClientFile(
  file: File,
  allowUltimateFormats: boolean
): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return "File must be 100 MB or smaller.";
  }
  const ext = normalizeExtension(file.name);
  if (!ext) {
    return "Could not determine file type from the name.";
  }
  if (!isExtensionAllowedForPlan(ext, allowUltimateFormats)) {
    return formatNotAllowedMessage(ext);
  }
  return null;
}

const UPLOAD_AT_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

/** Stable across Node vs browser (avoids hydration mismatch on locale / AM·PM). */
function formatUploadedAtUtcEnUs(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    ...UPLOAD_AT_FORMAT,
    timeZone: "UTC",
  });
}

function useHydrationSafeUploadedAtLabel(iso: string) {
  const [label, setLabel] = useState(() => formatUploadedAtUtcEnUs(iso));
  useEffect(() => {
    setLabel(new Date(iso).toLocaleString(undefined, UPLOAD_AT_FORMAT));
  }, [iso]);
  return label;
}

function AudioRow(props: {
  file: EventDetailClientFile;
  onDeleted: () => void;
}) {
  const { file, onDeleted } = props;
  const uploadedAtLabel = useHydrationSafeUploadedAtLabel(file.uploadedAt);
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetch(`/api/uploads/${file.id}/playback-url`);
      if (!r.ok) return;
      const j = (await r.json()) as { url?: string };
      if (!cancelled && j.url) setSrc(j.url);
    })();
    return () => {
      cancelled = true;
    };
  }, [file.id]);

  async function onDownload() {
    const r = await fetch(`/api/uploads/${file.id}/download-url`);
    if (!r.ok) {
      toast.error("Could not start download.");
      return;
    }
    const j = (await r.json()) as { url?: string };
    if (j.url) {
      window.location.href = j.url;
    } else {
      toast.error("Could not start download.");
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      const r = await fetch(`/api/uploads/${file.id}`, { method: "DELETE" });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        toast.error(j?.error ?? "Could not delete file.");
        return;
      }
      toast.success("File deleted.");
      onDeleted();
    } finally {
      setBusy(false);
      confirmRef.current?.close();
    }
  }

  return (
    <li className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{file.originalFilename}</p>
          <p className="text-muted-foreground text-xs">
            {formatBytes(file.sizeBytes)} · {uploadedAtLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "shrink-0"
            )}
            onClick={() => onDownload()}
          >
            Download
          </button>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "destructive", size: "sm" }),
              "shrink-0"
            )}
            onClick={() => confirmRef.current?.showModal()}
            disabled={busy}
          >
            Delete
          </button>
        </div>
      </div>
      {src ? (
        <audio
          className="mt-3 w-full"
          controls
          preload="none"
          src={src}
        />
      ) : (
        <p className="mt-3 text-muted-foreground text-xs">Loading player…</p>
      )}

      <dialog
        ref={confirmRef}
        className="fixed top-1/2 left-1/2 w-[min(100%,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-5 shadow-lg backdrop:bg-black/50"
      >
        <p className="font-medium">Delete this file?</p>
        <p className="mt-2 text-muted-foreground text-sm">
          This removes the audio from storage and from this event. This cannot
          be undone.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={() => confirmRef.current?.close()}
          >
            Cancel
          </button>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
            onClick={() => void confirmDelete()}
            disabled={busy}
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </dialog>
    </li>
  );
}

export function EventDetailClient(props: EventDetailClientProps) {
  const router = useRouter();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const limitLabel = useMemo(() => {
    if (props.fileLimit === null) return "Unlimited files per event";
    return `Up to ${props.fileLimit} files per event (${props.activeFileCount} in use)`;
  }, [props.fileLimit, props.activeFileCount]);

  const sortedFiles = useMemo(
    () =>
      [...props.files].sort((a, b) => a.displayOrder - b.displayOrder),
    [props.files]
  );

  const bulkDialogRef = useRef<HTMLDialogElement | null>(null);
  const [bulkTyped, setBulkTyped] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const atCapacity =
    props.fileLimit !== null && props.activeFileCount >= props.fileLimit;

  const processFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const err = validateClientFile(file, props.allowUltimateFormats);
      if (err) {
        toast.error(err);
        return;
      }
      if (atCapacity) {
        toast.error(
          props.fileLimit !== null
            ? `Your plan allows up to ${props.fileLimit} files per event.`
            : "Upload limit reached."
        );
        return;
      }

      setBusy(true);
      setUploadPct(0);
      try {
        const presign = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            mime_type: file.type || "application/octet-stream",
            size: file.size,
            event_id: props.eventId,
          }),
        });
        const presignBody = (await presign.json().catch(() => null)) as
          | { putUrl?: string; fileId?: string; error?: string }
          | null;

        if (!presign.ok) {
          toast.error(presignBody?.error ?? "Could not start upload.");
          return;
        }

        const putUrl = presignBody?.putUrl;
        const fileId = presignBody?.fileId;
        if (!putUrl || !fileId) {
          toast.error("Invalid presign response.");
          return;
        }

        await putToPresignedUrl(file, putUrl, setUploadPct);

        const complete = await fetch("/api/uploads/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_id: fileId }),
        });
        const completeBody = (await complete.json().catch(() => null)) as
          | { error?: string }
          | null;
        if (!complete.ok) {
          toast.error(
            completeBody?.error ?? "Upload could not be confirmed."
          );
          return;
        }

        toast.success("Upload complete.");
        setUploadPct(null);
        router.refresh();
      } catch (e) {
        console.error(e);
        toast.error(
          e instanceof Error ? e.message : "Something went wrong."
        );
      } finally {
        setBusy(false);
        setUploadPct(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [
      atCapacity,
      props.allowUltimateFormats,
      props.eventId,
      props.fileLimit,
      router,
    ]
  );

  async function bulkDelete() {
    if (bulkTyped !== "DELETE") {
      toast.error('Type DELETE to confirm.');
      return;
    }
    setBulkBusy(true);
    try {
      const r = await fetch(`/api/events/${props.eventId}/files`, {
        method: "DELETE",
      });
      const j = (await r.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!r.ok) {
        toast.error(j?.error ?? "Could not delete files.");
        return;
      }
      toast.success("All files deleted.");
      bulkDialogRef.current?.close();
      setBulkTyped("");
      router.refresh();
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      <Link
        href="/dashboard"
        className="inline-flex text-muted-foreground text-sm hover:text-foreground"
      >
        ← Back to events
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {props.eventName}
        </h1>
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground">{props.eventTypeLabel}</span>
          {" · "}
          {props.eventDateLabel}
          {" · "}Client {props.retailClientName} ({props.retailClientEmail})
          {" · "}Slug{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            {props.retailClientSlug}
          </code>
        </p>
        <p className="text-muted-foreground text-xs">
          Retention until {props.retentionUntilLabel} (per plan).
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-medium">Upload audio</h2>
        <p className="text-muted-foreground text-sm">{limitLabel}</p>
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            const f = e.dataTransfer.files?.[0];
            void processFile(f);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "cursor-pointer rounded-xl border border-dashed px-4 py-10 text-center transition-colors",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/30 hover:border-muted-foreground/60"
          )}
        >
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            className="sr-only"
            accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac,.aiff,.aif"
            disabled={busy || atCapacity}
            onChange={(e) => {
              const f = e.target.files?.[0];
              void processFile(f);
            }}
          />
          <p className="font-medium">Drag and drop one audio file here</p>
          <p className="mt-2 text-muted-foreground text-sm">
            or click to browse · max 100 MB · one file at a time
          </p>
          {uploadPct !== null ? (
            <div className="mx-auto mt-4 max-w-md text-left">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-2 bg-primary transition-[width] duration-150"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
              <p className="mt-2 text-muted-foreground text-xs">{uploadPct}%</p>
            </div>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">
          Formats: MP3, M4A, AAC, OGG, Opus on Free/Pro. WAV, FLAC, and AIFF on
          Ultimate (stored as-is for now).
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-medium">Files ({sortedFiles.length})</h2>
          {sortedFiles.length > 0 ? (
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-destructive/40 text-destructive hover:bg-destructive/10"
              )}
              onClick={() => bulkDialogRef.current?.showModal()}
            >
              Delete all files
            </button>
          ) : null}
        </div>

        {sortedFiles.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
            No uploads yet. Add a file above.
          </p>
        ) : (
          <ul className="space-y-4">
            {sortedFiles.map((f) => (
              <AudioRow
                key={f.id}
                file={f}
                onDeleted={() => router.refresh()}
              />
            ))}
          </ul>
        )}
      </section>

      <dialog
        ref={bulkDialogRef}
        className="fixed top-1/2 left-1/2 w-[min(100%,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-5 shadow-lg backdrop:bg-black/50"
      >
        <p className="font-medium">Delete all files?</p>
        <p className="mt-2 text-muted-foreground text-sm">
          This removes every audio file for this event from storage. Type{" "}
          <strong>DELETE</strong> to confirm.
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="bulk-delete-confirm">Confirmation</Label>
          <Input
            id="bulk-delete-confirm"
            value={bulkTyped}
            onChange={(e) => setBulkTyped(e.target.value)}
            autoComplete="off"
            placeholder="DELETE"
          />
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={() => {
              bulkDialogRef.current?.close();
              setBulkTyped("");
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
            onClick={() => void bulkDelete()}
            disabled={bulkBusy}
          >
            {bulkBusy ? "Deleting…" : "Delete all"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
