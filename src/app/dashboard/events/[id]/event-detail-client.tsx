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
  useTransition,
  type DragEvent,
} from "react";
import { toast } from "sonner";
import { Copy, GripVertical, Pencil, X } from "lucide-react";

import { extendRetentionAction } from "./retention-actions";
import {
  EventDeleteModal,
  EventEditModal,
  type EventEditInitial,
} from "./event-edit-modal";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatNotAllowedMessage,
  isExtensionAllowedForPlan,
  MAX_UPLOAD_BYTES,
  MAX_ZIP_UPLOAD_BYTES,
  normalizeExtension,
} from "@/lib/audio-upload-policy";
import { cn, formatBytes } from "@/lib/utils";

import { EventAnalyticsPanel } from "@/components/dashboard/analytics/event-analytics-panel";

import { EventRetailAppearanceSection } from "./event-retail-appearance";
import { SendLinkComposer } from "./send-link-composer";

import { APP_TIMEZONE, formatDateTime } from "@/lib/date-format";
import { formatRelativeTimePast } from "@/lib/relative-time";

const ZIP_JOB_RECENT_MS = 10 * 60 * 1000;
const DISMISSED_UPLOAD_JOB_IDS_KEY = "audio-guest-book:dismissed-upload-job-ids";

function loadDismissedUploadJobIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_UPLOAD_JOB_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function persistDismissedUploadJobIds(ids: Set<string>) {
  try {
    localStorage.setItem(
      DISMISSED_UPLOAD_JOB_IDS_KEY,
      JSON.stringify([...ids])
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export type EventDetailClientFile = {
  id: string;
  originalFilename: string;
  sizeBytes: number;
  uploadedAt: string;
  displayOrder: number;
  isOriginal: boolean;
  mimeType: string;
  transcodingStatus:
    | "not_needed"
    | "pending"
    | "processing"
    | "succeeded"
    | "failed";
  transcodingError: string | null;
};

export type EventUploadJobSnapshot = {
  id: string;
  status: string;
  originalFilename: string;
  totalFilesInArchive: number | null;
  filesProcessed: number;
  filesSucceeded: number;
  filesFailed: number;
  errorMessage: string | null;
  errorDetails: { filename: string; reason: string }[] | null;
  createdAt: string;
  completedAt: string | null;
};

function isZipJobUiVisible(
  job: EventUploadJobSnapshot,
  dismissed: Set<string>
): boolean {
  if (dismissed.has(job.id)) return false;
  if (job.status === "pending" || job.status === "processing") return true;
  if (
    job.status === "succeeded" ||
    job.status === "partial" ||
    job.status === "failed"
  ) {
    if (!job.completedAt) return false;
    return (
      Date.now() - new Date(job.completedAt).getTime() < ZIP_JOB_RECENT_MS
    );
  }
  return false;
}

export type EventDetailClientProps = {
  eventId: string;
  eventName: string;
  eventType:
    | "wedding"
    | "birthday"
    | "corporate"
    | "anniversary"
    | "other";
  eventTypeOther: string | null;
  eventTypeLabel: string;
  /** YYYY-MM-DD for the date input */
  eventDateIso: string;
  eventDateLabel: string;
  retailClientName: string;
  retailClientEmail: string;
  retailClientSlug: string;
  /** Full public gallery URL from `buildRetailEventPublicUrl` (tenant + client slug). */
  retailPublicUrl: string;
  companyName: string;
  mergeFieldValues: Record<string, string>;
  canUseCustomEmailTemplates: boolean;
  composerTemplates: {
    id: string;
    name: string;
    subject_template: string;
    body_template: string;
    is_default: boolean;
  }[];
  retailLinkLastSentAtIso: string | null;
  retailLinkSendCount: number;
  retentionUntilLabel: string;
  files: EventDetailClientFile[];
  uploadJobs: EventUploadJobSnapshot[];
  allowUltimateFormats: boolean;
  fileLimit: number | null;
  activeFileCount: number;
  retailCustomBranding: boolean;
  retailPasswordProtection: boolean;
  retailCoverPreviewUrl: string | null;
  retailPasswordActive: boolean;
  retailPasswordSetAtLabel: string | null;
  planName: string;
  metadataOnlyAfterLabel: string | null;
  permanentRemovalLabel: string | null;
  showRetentionWarning: boolean;
  canDragReorderFiles: boolean;
};

function putToPresignedUrl(
  file: File,
  url: string,
  onProgress: (pct: number) => void,
  contentType: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
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

type UploadJobApiRow = {
  id: string;
  status: string;
  original_filename: string;
  total_files_in_archive: number | null;
  files_processed: number;
  files_succeeded: number;
  files_failed: number;
  error_message: string | null;
  error_details: { filename: string; reason: string }[] | null;
  created_at: string;
  completed_at: string | null;
};

function mapApiJobToSnapshot(j: UploadJobApiRow): EventUploadJobSnapshot {
  return {
    id: j.id,
    status: j.status,
    originalFilename: j.original_filename,
    totalFilesInArchive: j.total_files_in_archive,
    filesProcessed: j.files_processed,
    filesSucceeded: j.files_succeeded,
    filesFailed: j.files_failed,
    errorMessage: j.error_message,
    errorDetails: j.error_details,
    createdAt: j.created_at,
    completedAt: j.completed_at,
  };
}

function validateClientZip(file: File): string | null {
  if (normalizeExtension(file.name) !== "zip") {
    return "Only .zip archives are supported for bulk upload.";
  }
  if (file.size > MAX_ZIP_UPLOAD_BYTES) {
    return "Zip archive must be 1 GB or smaller.";
  }
  return null;
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

/**
 * Always formatted in {@link APP_TIMEZONE} so server-rendered HTML matches
 * the client hydration output exactly, avoiding the AM/PM mismatch the old
 * `undefined`-locale path used to cause for non-en-US visitors.
 */
function formatUploadedAtLabel(iso: string) {
  return formatDateTime(iso, { ...UPLOAD_AT_FORMAT, timeZone: APP_TIMEZONE });
}

function LinkSentIndicator(props: {
  iso: string;
  sendCount: number;
}) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(formatRelativeTimePast(props.iso));
  }, [props.iso]);
  if (!props.iso) return null;
  const extra =
    props.sendCount > 1 ? ` (sent ${props.sendCount} times)` : "";
  return (
    <p className="text-muted-foreground text-xs">
      Link sent {label || "recently"}
      {extra}
    </p>
  );
}

type FileReorderUi = {
  isDragging: boolean;
  isDropTarget: boolean;
  onGripDragStart: (e: DragEvent) => void;
  onGripDragEnd: (e: DragEvent) => void;
  onRowDragOver: (e: DragEvent) => void;
  onRowDragLeave: (e: DragEvent) => void;
  onRowDrop: (e: DragEvent) => void;
};

function AudioRow(props: {
  file: EventDetailClientFile;
  onDeleted: () => void;
  reorder?: FileReorderUi;
}) {
  const { file, onDeleted, reorder } = props;
  const uploadedAtLabel = formatUploadedAtLabel(file.uploadedAt);
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

  async function retryTranscode() {
    const r = await fetch(`/api/uploads/${file.id}/retranscode`, {
      method: "POST",
    });
    if (!r.ok) {
      const j = (await r.json().catch(() => null)) as { error?: string } | null;
      toast.error(j?.error ?? "Could not queue transcoding.");
      return;
    }
    toast.success("Transcoding queued.");
    onDeleted();
  }

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

  const transcodeLabel =
    file.isOriginal &&
    (file.transcodingStatus === "pending" ||
      file.transcodingStatus === "processing")
      ? "Transcoding…"
      : null;

  return (
    <li
      className={cn(
        "rounded-lg border bg-card p-4 shadow-sm",
        reorder?.isDragging && "opacity-50",
        reorder?.isDropTarget && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
      onDragOver={reorder?.onRowDragOver}
      onDragLeave={reorder?.onRowDragLeave}
      onDrop={reorder?.onRowDrop}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-2">
          {reorder ? (
            <div
              draggable
              role="button"
              tabIndex={0}
              className="mt-0.5 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
              aria-label="Drag to reorder"
              onDragStart={(e) => reorder.onGripDragStart(e)}
              onDragEnd={(e) => reorder.onGripDragEnd(e)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") e.preventDefault();
              }}
            >
              <GripVertical className="size-5 shrink-0" aria-hidden />
            </div>
          ) : null}
          <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium break-words">
            {file.originalFilename}
            {file.isOriginal ? (
              <span className="ml-2 font-normal text-muted-foreground text-sm">
                (original)
              </span>
            ) : (
              <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
                transcoded MP3
              </span>
            )}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatBytes(file.sizeBytes)} · {uploadedAtLabel}
            {transcodeLabel ? (
              <>
                {" "}
                · <span className="font-medium text-amber-700">{transcodeLabel}</span>
              </>
            ) : null}
          </p>
          {file.isOriginal &&
          file.transcodingStatus === "failed" &&
          file.transcodingError ? (
            <p className="text-destructive text-xs">{file.transcodingError}</p>
          ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {file.isOriginal && file.transcodingStatus === "failed" ? (
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "shrink-0"
              )}
              onClick={() => void retryTranscode()}
            >
              Retry transcoding
            </button>
          ) : null}
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
  const [dashTab, setDashTab] = useState<"overview" | "analytics">(
    "overview"
  );
  const inputId = useId();
  const [extendPending, startExtendTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [jobSnapshots, setJobSnapshots] = useState(props.uploadJobs);
  const jobSnapshotsRef = useRef(jobSnapshots);
  jobSnapshotsRef.current = jobSnapshots;

  const [dismissedJobIds, setDismissedJobIds] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    setDismissedJobIds(loadDismissedUploadJobIds());
  }, []);

  const dismissZipJob = useCallback((jobId: string) => {
    setDismissedJobIds((prev) => {
      const next = new Set(prev);
      next.add(jobId);
      persistDismissedUploadJobIds(next);
      return next;
    });
  }, []);

  const [zipVisibilityTick, setZipVisibilityTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setZipVisibilityTick((t) => t + 1);
    }, 15_000);
    return () => window.clearInterval(id);
  }, []);

  const visibleZipJobs = useMemo(() => {
    void zipVisibilityTick;
    return jobSnapshots.filter((j) =>
      isZipJobUiVisible(j, dismissedJobIds)
    );
  }, [jobSnapshots, dismissedJobIds, zipVisibilityTick]);

  useEffect(() => {
    setJobSnapshots(props.uploadJobs);
  }, [props.uploadJobs]);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      if (cancelled) return;
      const cur = jobSnapshotsRef.current;
      const active = cur.filter(
        (j) => j.status === "pending" || j.status === "processing"
      );
      if (active.length === 0) return;

      const results = await Promise.all(
        active.map(async (j) => {
          const r = await fetch(`/api/upload-jobs/${j.id}`);
          if (!r.ok) return null;
          return mapApiJobToSnapshot((await r.json()) as UploadJobApiRow);
        })
      );

      let shouldRefresh = false;
      for (const next of results) {
        if (!next) continue;
        const prev = cur.find((j) => j.id === next.id);
        if (!prev) continue;
        if (
          (prev.status === "pending" || prev.status === "processing") &&
          (next.status === "succeeded" ||
            next.status === "failed" ||
            next.status === "partial")
        ) {
          shouldRefresh = true;
          if (next.status === "succeeded") {
            toast.success(`Finished: ${next.originalFilename}`);
          } else if (next.status === "partial") {
            toast("Partially processed", {
              description:
                next.errorMessage ??
                "Some files could not be extracted.",
            });
          } else {
            toast.error(next.errorMessage ?? `Failed: ${next.originalFilename}`);
          }
        }
      }

      setJobSnapshots((prev) => {
        const byId = new Map(prev.map((j) => [j.id, j]));
        for (const u of results) {
          if (u) byId.set(u.id, u);
        }
        return [...byId.values()].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt)
        );
      });

      if (shouldRefresh) {
        router.refresh();
      }
    }

    const id = setInterval(() => void tick(), 3000);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router]);

  const limitLabel = useMemo(() => {
    if (props.fileLimit === null) return "Unlimited files per event";
    return `Up to ${props.fileLimit} files per event (${props.activeFileCount} in use)`;
  }, [props.fileLimit, props.activeFileCount]);

  const sortedFiles = useMemo(
    () =>
      [...props.files].sort((a, b) => a.displayOrder - b.displayOrder),
    [props.files]
  );

  const sourceFileCount = useMemo(
    () => sortedFiles.filter((f) => f.isOriginal).length,
    [sortedFiles]
  );

  const originalsOrdered = useMemo(
    () => sortedFiles.filter((f) => f.isOriginal).map((f) => f.id),
    [sortedFiles]
  );

  const [draggingFileId, setDraggingFileId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dragSourceIdRef = useRef<string | null>(null);

  const commitReorder = useCallback(
    async (draggedId: string, targetId: string) => {
      if (draggedId === targetId) return;
      const order = [...originalsOrdered];
      const from = order.indexOf(draggedId);
      const to = order.indexOf(targetId);
      if (from < 0 || to < 0) return;
      const next = [...order];
      next.splice(from, 1);
      next.splice(to, 0, draggedId);
      try {
        const r = await fetch(`/api/events/${props.eventId}/files/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ originalFileIds: next }),
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => null)) as {
            error?: string;
          } | null;
          toast.error(j?.error ?? "Could not save order.");
          return;
        }
        toast.success("Order updated.");
        router.refresh();
      } catch {
        toast.error("Network error.");
      }
    },
    [originalsOrdered, props.eventId, router]
  );

  const bulkDialogRef = useRef<HTMLDialogElement | null>(null);
  const [bulkTyped, setBulkTyped] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const editInitial: EventEditInitial = useMemo(
    () => ({
      name: props.eventName,
      eventType: props.eventType,
      eventTypeOther: props.eventTypeOther,
      eventDate: props.eventDateIso,
      retailClientName: props.retailClientName,
      retailClientEmail: props.retailClientEmail,
      retailClientSlug: props.retailClientSlug,
      passwordActive: props.retailPasswordActive,
    }),
    [
      props.eventName,
      props.eventType,
      props.eventTypeOther,
      props.eventDateIso,
      props.retailClientName,
      props.retailClientEmail,
      props.retailClientSlug,
      props.retailPasswordActive,
    ]
  );

  const atCapacity =
    props.fileLimit !== null && props.activeFileCount >= props.fileLimit;

  const processFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const isZip = normalizeExtension(file.name) === "zip";

      if (isZip) {
        const zerr = validateClientZip(file);
        if (zerr) {
          toast.error(zerr);
          return;
        }
      } else {
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
      }

      const zipMime =
        file.type === "application/x-zip-compressed" ||
        file.type === "application/octet-stream"
          ? file.type
          : "application/zip";
      const mimeForPresign = isZip
        ? zipMime
        : file.type || "application/octet-stream";

      setBusy(true);
      setUploadPct(0);
      try {
        const presign = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            mime_type: mimeForPresign,
            size: file.size,
            event_id: props.eventId,
          }),
        });
        const presignBody = (await presign.json().catch(() => null)) as
          | {
              putUrl?: string;
              fileId?: string;
              uploadJobId?: string;
              kind?: string;
              error?: string;
            }
          | null;

        if (!presign.ok) {
          toast.error(presignBody?.error ?? "Could not start upload.");
          return;
        }

        const putUrl = presignBody?.putUrl;
        if (!putUrl) {
          toast.error("Invalid presign response.");
          return;
        }

        await putToPresignedUrl(file, putUrl, setUploadPct, mimeForPresign);

        if (presignBody?.kind === "zip" && presignBody.uploadJobId) {
          const complete = await fetch("/api/uploads/zip-complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              upload_job_id: presignBody.uploadJobId,
            }),
          });
          const completeBody = (await complete.json().catch(() => null)) as
            | { error?: string }
            | null;
          if (!complete.ok) {
            toast.error(
              completeBody?.error ?? "Zip could not be queued for processing."
            );
            return;
          }
          setJobSnapshots((prev) => [
            {
              id: presignBody.uploadJobId!,
              status: "pending",
              originalFilename: file.name,
              totalFilesInArchive: null,
              filesProcessed: 0,
              filesSucceeded: 0,
              filesFailed: 0,
              errorMessage: null,
              errorDetails: null,
              createdAt: new Date().toISOString(),
              completedAt: null,
            },
            ...prev.filter((j) => j.id !== presignBody.uploadJobId),
          ]);
          toast.success("Zip uploaded — processing started.");
          router.refresh();
        } else {
          const fileId = presignBody?.fileId;
          if (!fileId) {
            toast.error("Invalid presign response.");
            return;
          }
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
        }
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
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {props.eventName}
          </h1>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground rounded-md p-1.5 hover:bg-muted"
            aria-label="Edit event details"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-muted-foreground text-sm">
              <span className="text-foreground">{props.eventTypeLabel}</span>
              {" · "}
              {props.eventDateLabel}
              {" · "}Client {props.retailClientName} ({props.retailClientEmail})
              {" · "}Slug{" "}
              <button
                type="button"
                className="group inline-flex cursor-pointer items-center gap-1 align-baseline rounded-sm border-0 bg-transparent p-0 font-inherit text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Copy client gallery URL for ${props.retailClientSlug}`}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(props.retailPublicUrl);
                    toast.success("Copied", { duration: 1500 });
                  } catch {
                    toast.error("Could not copy.");
                  }
                }}
              >
                <code
                  className={cn(
                    "rounded bg-muted px-1 py-0.5 text-xs transition-colors",
                    "group-hover:bg-muted/80 group-hover:text-primary"
                  )}
                >
                  {props.retailClientSlug}
                </code>
                <Copy
                  className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden
                />
              </button>
            </p>
            {props.retailLinkLastSentAtIso ? (
              <LinkSentIndicator
                iso={props.retailLinkLastSentAtIso}
                sendCount={props.retailLinkSendCount}
              />
            ) : null}
          </div>
          <SendLinkComposer
            eventId={props.eventId}
            companyName={props.companyName}
            retailClientEmail={props.retailClientEmail}
            mergeFieldValues={props.mergeFieldValues}
            canUseCustomTemplates={props.canUseCustomEmailTemplates}
            templates={props.composerTemplates}
          />
        </div>
        {props.metadataOnlyAfterLabel && props.permanentRemovalLabel ? (
          <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-amber-950 text-sm dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
            Files were deleted on {props.metadataOnlyAfterLabel}. This event
            will be permanently removed on {props.permanentRemovalLabel}.
          </div>
        ) : (
          <div className="space-y-3">
            {props.showRetentionWarning ? (
              <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-amber-950 text-sm dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                Retention is approaching. Extend now if you need recordings
                available longer (within your plan limits).
              </div>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground text-sm">
                Files retained until {props.retentionUntilLabel} (per{" "}
                <span className="text-foreground font-medium">
                  {props.planName}
                </span>{" "}
                plan).
              </p>
              <button
                type="button"
                disabled={extendPending}
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "shrink-0"
                )}
                onClick={() => {
                  startExtendTransition(async () => {
                    const r = await extendRetentionAction(props.eventId);
                    if (r.ok) {
                      toast.success("Retention extended by up to 12 months.");
                      router.refresh();
                    } else {
                      toast.error(r.message);
                    }
                  });
                }}
              >
                {extendPending ? "Extending…" : "Extend retention by 12 months"}
              </button>
            </div>
          </div>
        )}
      </header>

      <div
        className="flex gap-2 border-border border-b pb-3"
        role="tablist"
        aria-label="Event sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={dashTab === "overview"}
          className={cn(
            buttonVariants({
              variant: dashTab === "overview" ? "default" : "ghost",
              size: "sm",
            })
          )}
          onClick={() => setDashTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={dashTab === "analytics"}
          className={cn(
            buttonVariants({
              variant: dashTab === "analytics" ? "default" : "ghost",
              size: "sm",
            })
          )}
          onClick={() => setDashTab("analytics")}
        >
          Analytics
        </button>
      </div>

      <EventEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        patchUrl={`/api/events/${props.eventId}`}
        initial={editInitial}
        passwordProtectionAllowed={props.retailPasswordProtection}
      />

      <EventDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        eventName={props.eventName}
        softDeleteUrl={`/api/events/${props.eventId}/soft-delete`}
        hardDeleteNowUrl={`/api/events/${props.eventId}/hard-delete-now`}
        redirectAfterDelete="/dashboard"
      />

      {dashTab === "analytics" ? (
        <EventAnalyticsPanel eventId={props.eventId} />
      ) : (
        <>
      <EventRetailAppearanceSection
        eventId={props.eventId}
        customBranding={props.retailCustomBranding}
        passwordProtection={props.retailPasswordProtection}
        coverPreviewUrl={props.retailCoverPreviewUrl}
        passwordActive={props.retailPasswordActive}
        passwordSetAtLabel={props.retailPasswordSetAtLabel}
      />

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
            accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac,.aiff,.aif,.zip"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              void processFile(f);
            }}
          />
          <p className="font-medium">Drag and drop an audio file or a .zip archive</p>
          <p className="mt-2 text-muted-foreground text-sm">
            or click to browse · audio max 100 MB · zip max 1 GB · one file at a
            time
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
          Audio: MP3, M4A, AAC, OGG, Opus on Free/Pro; WAV, FLAC, AIFF on
          Ultimate. Zip archives: audio is extracted in the background (see
          below). Non-audio entries in zips are skipped; plan limits and formats
          are enforced when the archive is processed.
        </p>
      </section>

      {visibleZipJobs.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-medium">Zip processing</h2>
          <p className="text-muted-foreground text-sm">
            Status updates every few seconds while a job is running. Finished
            jobs hide after 10 minutes or when dismissed.
          </p>
          <ul className="space-y-4">
            {visibleZipJobs.map((job) => {
              const total = job.totalFilesInArchive;
              const pct =
                total !== null && total > 0
                  ? Math.min(
                      100,
                      Math.round((job.filesProcessed / total) * 100)
                    )
                  : job.status === "processing" || job.status === "pending"
                    ? null
                    : 100;
              const active =
                job.status === "pending" || job.status === "processing";
              const showDismiss =
                job.status === "succeeded" ||
                job.status === "partial" ||
                job.status === "failed";
              return (
                <li
                  key={job.id}
                  className={cn(
                    "relative rounded-lg border bg-card p-4 shadow-sm",
                    showDismiss && "pr-11"
                  )}
                >
                  {showDismiss ? (
                    <button
                      type="button"
                      className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-2 right-2 rounded-md p-1.5"
                      aria-label={`Dismiss ${job.originalFilename}`}
                      onClick={() => dismissZipJob(job.id)}
                    >
                      <X className="size-4 shrink-0" aria-hidden />
                    </button>
                  ) : null}
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {job.originalFilename}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {total !== null
                          ? `${job.filesProcessed} / ${total} audio files processed · ${job.filesSucceeded} ok · ${job.filesFailed} failed`
                          : active
                            ? "Scanning archive…"
                            : `${job.filesSucceeded} ok · ${job.filesFailed} failed`}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                        job.status === "succeeded" &&
                          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                        job.status === "partial" &&
                          "bg-amber-500/15 text-amber-800 dark:text-amber-400",
                        job.status === "failed" &&
                          "bg-destructive/15 text-destructive",
                        active && "bg-primary/10 text-primary"
                      )}
                    >
                      {job.status}
                    </span>
                  </div>
                  {active ? (
                    <div className="mx-auto mt-3 max-w-md">
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-2 bg-primary transition-[width] duration-300"
                          style={{
                            width: pct !== null ? `${pct}%` : "40%",
                          }}
                        />
                      </div>
                      {pct !== null ? (
                        <p className="mt-1 text-muted-foreground text-xs">
                          {pct}%
                        </p>
                      ) : (
                        <p className="mt-1 text-muted-foreground text-xs">
                          Indeterminate
                        </p>
                      )}
                    </div>
                  ) : null}
                  {job.errorMessage ? (
                    <p className="mt-3 text-destructive text-sm">
                      {job.errorMessage}
                    </p>
                  ) : null}
                  {job.errorDetails && job.errorDetails.length > 0 ? (
                    <ul className="mt-2 list-inside list-disc text-muted-foreground text-xs">
                      {job.errorDetails.map((d) => (
                        <li key={`${d.filename}-${d.reason}`}>
                          <span className="font-medium text-foreground">
                            {d.filename}
                          </span>
                          : {d.reason}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-medium">
              Files ({sourceFileCount} source file
              {sourceFileCount !== 1 ? "s" : ""}, {sortedFiles.length} total)
            </h2>
            {props.canDragReorderFiles ? (
              <p className="mt-1 text-muted-foreground text-xs">
                Drag the grip beside a source file to reorder. Transcoded copies
                stay with their original.
              </p>
            ) : null}
          </div>
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
                reorder={
                  props.canDragReorderFiles && f.isOriginal
                    ? {
                        isDragging: draggingFileId === f.id,
                        isDropTarget:
                          dropTargetId === f.id &&
                          draggingFileId != null &&
                          draggingFileId !== f.id,
                        onGripDragStart: (e) => {
                          e.dataTransfer.setData("text/plain", f.id);
                          e.dataTransfer.effectAllowed = "move";
                          dragSourceIdRef.current = f.id;
                          setDraggingFileId(f.id);
                        },
                        onGripDragEnd: () => {
                          dragSourceIdRef.current = null;
                          setDraggingFileId(null);
                          setDropTargetId(null);
                        },
                        onRowDragOver: (e) => {
                          const src = dragSourceIdRef.current;
                          if (!src || src === f.id) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          setDropTargetId(f.id);
                        },
                        onRowDragLeave: () => {
                          setDropTargetId((cur) => (cur === f.id ? null : cur));
                        },
                        onRowDrop: (e) => {
                          e.preventDefault();
                          const dragged = e.dataTransfer.getData("text/plain");
                          dragSourceIdRef.current = null;
                          setDropTargetId(null);
                          setDraggingFileId(null);
                          if (dragged && dragged !== f.id) {
                            void commitReorder(dragged, f.id);
                          }
                        },
                      }
                    : undefined
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-destructive/40 bg-background p-5">
        <h2 className="font-semibold text-destructive">Danger zone</h2>
        <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
          Delete this event. The default delete is recoverable for 30 days; you
          can also choose to wipe everything immediately.
        </p>
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "destructive", size: "sm" }),
            "mt-4"
          )}
          onClick={() => setDeleteOpen(true)}
        >
          Delete event
        </button>
      </section>
        </>
      )}

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
