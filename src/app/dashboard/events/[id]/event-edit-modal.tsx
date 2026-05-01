"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "birthday", label: "Birthday" },
  { value: "corporate", label: "Corporate" },
  { value: "anniversary", label: "Anniversary" },
  { value: "other", label: "Other" },
] as const;

type EventTypeValue = (typeof EVENT_TYPES)[number]["value"];

export type EventEditInitial = {
  name: string;
  eventType: EventTypeValue;
  eventTypeOther: string | null;
  /** YYYY-MM-DD */
  eventDate: string;
  retailClientName: string;
  retailClientEmail: string;
  retailClientSlug: string;
  passwordActive: boolean;
};

type FieldErrors = Partial<
  Record<
    | "name"
    | "eventType"
    | "eventTypeOther"
    | "eventDate"
    | "retailClientName"
    | "retailClientEmail"
    | "retailClientSlug"
    | "password",
    string
  >
>;

export function EventEditModal(props: {
  open: boolean;
  onClose: () => void;
  /** Endpoint that accepts the PATCH body (company or admin). */
  patchUrl: string;
  initial: EventEditInitial;
  passwordProtectionAllowed: boolean;
  /** When true, edits redirect to admin event detail; otherwise dashboard event detail. */
  isAdmin?: boolean;
  /** When isAdmin, used to compose redirect URL after slug change. */
  redirectBaseUrl?: string;
  /** When set, shown above the modal as context (e.g., admin override). */
  hint?: string;
}) {
  const router = useRouter();
  const formId = useId();

  const [name, setName] = useState(props.initial.name);
  const [eventType, setEventType] = useState<EventTypeValue>(
    props.initial.eventType
  );
  const [eventTypeOther, setEventTypeOther] = useState(
    props.initial.eventTypeOther ?? ""
  );
  const [eventDate, setEventDate] = useState(props.initial.eventDate);
  const [retailClientName, setRetailClientName] = useState(
    props.initial.retailClientName
  );
  const [retailClientEmail, setRetailClientEmail] = useState(
    props.initial.retailClientEmail
  );
  const [retailClientSlug, setRetailClientSlug] = useState(
    props.initial.retailClientSlug
  );
  const [editSlug, setEditSlug] = useState(false);

  const [passwordEnabled, setPasswordEnabled] = useState(
    props.initial.passwordActive
  );
  const [passwordDraft, setPasswordDraft] = useState("");
  const [changingPassword, setChangingPassword] = useState(
    !props.initial.passwordActive
  );

  const [busy, setBusy] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!props.open) return;
    setName(props.initial.name);
    setEventType(props.initial.eventType);
    setEventTypeOther(props.initial.eventTypeOther ?? "");
    setEventDate(props.initial.eventDate);
    setRetailClientName(props.initial.retailClientName);
    setRetailClientEmail(props.initial.retailClientEmail);
    setRetailClientSlug(props.initial.retailClientSlug);
    setEditSlug(false);
    setPasswordEnabled(props.initial.passwordActive);
    setPasswordDraft("");
    setChangingPassword(!props.initial.passwordActive);
    setGeneralError(null);
    setFieldErrors({});
  }, [props.open, props.initial]);

  if (!props.open) return null;

  const slugChanged = retailClientSlug !== props.initial.retailClientSlug;

  async function onSubmit() {
    setBusy(true);
    setGeneralError(null);
    setFieldErrors({});

    const body: Record<string, unknown> = {};

    if (name.trim() !== props.initial.name) body.name = name.trim();
    if (eventType !== props.initial.eventType) body.eventType = eventType;
    if (eventType === "other") {
      const v = eventTypeOther.trim();
      if (v !== (props.initial.eventTypeOther ?? "")) {
        body.eventTypeOther = v;
      }
    } else if (props.initial.eventType === "other") {
      body.eventTypeOther = null;
    }
    if (eventDate !== props.initial.eventDate) body.eventDate = eventDate;
    if (retailClientName.trim() !== props.initial.retailClientName) {
      body.retailClientName = retailClientName.trim();
    }
    if (retailClientEmail.trim() !== props.initial.retailClientEmail) {
      body.retailClientEmail = retailClientEmail.trim();
    }
    if (slugChanged) {
      body.retailClientSlug = retailClientSlug.trim().toLowerCase();
    }

    // Password handling: when toggle off & it was active → clear; when enabled
    // and a draft was typed (or it's currently inactive and they entered one) → set.
    if (props.passwordProtectionAllowed) {
      if (props.initial.passwordActive && !passwordEnabled) {
        body.password = null;
      } else if (passwordEnabled && passwordDraft.trim().length > 0) {
        body.password = passwordDraft;
      }
    }

    if (Object.keys(body).length === 0) {
      props.onClose();
      setBusy(false);
      return;
    }

    try {
      const res = await fetch(props.patchUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        fieldErrors?: FieldErrors;
      };

      if (!res.ok) {
        setGeneralError(data.error ?? `Update failed (${res.status}).`);
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        return;
      }

      toast.success("Event updated.");

      // If admin and slug+slug page applied, no need to redirect — slug isn't part of the admin URL.
      // If company and slug changed, the URL is /dashboard/events/[id] (id-based) so no redirect needed.
      props.onClose();
      router.refresh();
    } catch (e) {
      setGeneralError(
        e instanceof Error ? e.message : "Network error during update."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) props.onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        className="w-full max-w-xl rounded-xl border bg-card p-6 shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3
              id={`${formId}-title`}
              className="text-lg font-semibold tracking-tight"
            >
              Edit event
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              File uploads, retention, and analytics are managed elsewhere.
            </p>
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => !busy && props.onClose()}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {props.hint ? (
          <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-900 dark:text-red-200">
            {props.hint}
          </div>
        ) : null}

        <form
          className="mt-5 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor={`${formId}-name`}>Event name</Label>
            <Input
              id={`${formId}-name`}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name ? (
              <p className="text-destructive text-sm">{fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-type`}>Event type</Label>
              <select
                id={`${formId}-type`}
                value={eventType}
                onChange={(e) => setEventType(e.target.value as EventTypeValue)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                aria-invalid={!!fieldErrors.eventType}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {fieldErrors.eventType ? (
                <p className="text-destructive text-sm">
                  {fieldErrors.eventType}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-date`}>Event date</Label>
              <Input
                id={`${formId}-date`}
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                aria-invalid={!!fieldErrors.eventDate}
              />
              {fieldErrors.eventDate ? (
                <p className="text-destructive text-sm">
                  {fieldErrors.eventDate}
                </p>
              ) : null}
            </div>
          </div>

          {eventType === "other" ? (
            <div className="space-y-2">
              <Label htmlFor={`${formId}-other`}>Custom type</Label>
              <Input
                id={`${formId}-other`}
                value={eventTypeOther}
                onChange={(e) => setEventTypeOther(e.target.value)}
                placeholder="e.g. Baby shower, fundraiser…"
                aria-invalid={!!fieldErrors.eventTypeOther}
              />
              {fieldErrors.eventTypeOther ? (
                <p className="text-destructive text-sm">
                  {fieldErrors.eventTypeOther}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={`${formId}-cname`}>Client first name</Label>
            <Input
              id={`${formId}-cname`}
              required
              value={retailClientName}
              onChange={(e) => setRetailClientName(e.target.value)}
              aria-invalid={!!fieldErrors.retailClientName}
            />
            {fieldErrors.retailClientName ? (
              <p className="text-destructive text-sm">
                {fieldErrors.retailClientName}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-cemail`}>Client email</Label>
            <Input
              id={`${formId}-cemail`}
              type="email"
              required
              value={retailClientEmail}
              onChange={(e) => setRetailClientEmail(e.target.value)}
              aria-invalid={!!fieldErrors.retailClientEmail}
            />
            {fieldErrors.retailClientEmail ? (
              <p className="text-destructive text-sm">
                {fieldErrors.retailClientEmail}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${formId}-slug`}>Client URL slug</Label>
              {!editSlug ? (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setEditSlug(true)}
                >
                  Edit URL
                </button>
              ) : null}
            </div>
            {editSlug ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                Changing the URL will break any links you&apos;ve already
                shared. The old URL will return a &ldquo;not found&rdquo; page.
              </div>
            ) : null}
            <Input
              id={`${formId}-slug`}
              value={retailClientSlug}
              readOnly={!editSlug}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) =>
                setRetailClientSlug(e.target.value.toLowerCase())
              }
              className={cn(
                "font-mono text-sm",
                !editSlug &&
                  "bg-muted/40 text-muted-foreground"
              )}
              aria-invalid={!!fieldErrors.retailClientSlug}
            />
            {fieldErrors.retailClientSlug ? (
              <p className="text-destructive text-sm">
                {fieldErrors.retailClientSlug}
              </p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-lg border bg-card/50 p-3">
            <div className="flex items-center gap-3">
              <input
                id={`${formId}-pwen`}
                type="checkbox"
                checked={passwordEnabled}
                disabled={!props.passwordProtectionAllowed}
                onChange={(e) => {
                  setPasswordEnabled(e.target.checked);
                  if (!e.target.checked) {
                    setPasswordDraft("");
                    setChangingPassword(false);
                  } else if (!props.initial.passwordActive) {
                    setChangingPassword(true);
                  }
                }}
                className="size-4"
              />
              <Label
                htmlFor={`${formId}-pwen`}
                className="font-normal text-sm"
              >
                Require password to access client page
              </Label>
            </div>
            {!props.passwordProtectionAllowed ? (
              <p className="text-muted-foreground text-xs">
                Upgrade your plan to enable password protection.
              </p>
            ) : null}
            {props.passwordProtectionAllowed && passwordEnabled ? (
              <div className="space-y-2">
                {props.initial.passwordActive && !changingPassword ? (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      setChangingPassword(true);
                      setPasswordDraft("");
                    }}
                  >
                    Change password
                  </button>
                ) : (
                  <>
                    <Label
                      htmlFor={`${formId}-pwval`}
                      className="text-xs font-normal"
                    >
                      {props.initial.passwordActive
                        ? "New password"
                        : "Password"}
                    </Label>
                    <Input
                      id={`${formId}-pwval`}
                      type="password"
                      value={passwordDraft}
                      onChange={(e) => setPasswordDraft(e.target.value)}
                      autoComplete="new-password"
                      aria-invalid={!!fieldErrors.password}
                    />
                    <p className="text-muted-foreground text-xs">
                      At least 4 characters. Leave blank to keep current
                      password.
                    </p>
                  </>
                )}
                {fieldErrors.password ? (
                  <p className="text-destructive text-sm">
                    {fieldErrors.password}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {generalError ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
              {generalError}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => props.onClose()}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Two-mode delete modal: soft (recoverable for 30 days) or hard (irreversible).
 * Used by both company-side detail page and admin event detail.
 */
export function EventDeleteModal(props: {
  open: boolean;
  onClose: () => void;
  eventName: string;
  /** API endpoints */
  softDeleteUrl: string;
  hardDeleteNowUrl: string;
  /** Where to send the user after a successful delete (typically the events list). */
  redirectAfterDelete: string;
  /** When true, the soft-delete copy is hidden / replaced for admin-only override flows. */
  hardOnly?: boolean;
  /** Heading override, e.g. "Hard-delete this event NOW" for admin override. */
  title?: string;
}) {
  const router = useRouter();
  const [showHard, setShowHard] = useState(props.hardOnly ?? false);
  const [confirmName, setConfirmName] = useState("");
  const [busy, setBusy] = useState<"soft" | "hard" | null>(null);

  useEffect(() => {
    if (!props.open) return;
    setShowHard(props.hardOnly ?? false);
    setConfirmName("");
    setBusy(null);
  }, [props.open, props.hardOnly]);

  if (!props.open) return null;

  async function softDelete() {
    setBusy("soft");
    try {
      const r = await fetch(props.softDeleteUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = (await r.json().catch(() => null)) as
        | { error?: string; hardDeleteAfter?: string }
        | null;
      if (!r.ok) {
        toast.error(j?.error ?? "Could not delete event.");
        return;
      }
      toast.success(
        j?.hardDeleteAfter
          ? `Event deleted. Recoverable until ${j.hardDeleteAfter}.`
          : "Event deleted."
      );
      props.onClose();
      router.push(props.redirectAfterDelete);
    } finally {
      setBusy(null);
    }
  }

  async function hardDeleteNow() {
    if (
      confirmName.trim().toLowerCase() !== props.eventName.trim().toLowerCase()
    ) {
      toast.error("Type the event name exactly to confirm.");
      return;
    }
    setBusy("hard");
    try {
      const r = await fetch(props.hardDeleteNowUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName: confirmName.trim() }),
      });
      const j = (await r.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!r.ok) {
        toast.error(j?.error ?? "Could not hard-delete event.");
        return;
      }
      toast.success("Event permanently deleted.");
      props.onClose();
      router.push(props.redirectAfterDelete);
    } finally {
      setBusy(null);
    }
  }

  const title =
    props.title ?? (props.hardOnly ? "Permanently delete event?" : "Delete event?");

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) props.onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>

        {!props.hardOnly ? (
          <>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="font-medium text-sm">
                  Delete (recoverable for 30 days)
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  Hides the event from your dashboard and returns
                  &ldquo;not found&rdquo; on the client page right away. Files
                  stay in storage during the grace period. You can restore the
                  event from the &ldquo;deleted events&rdquo; list within 30
                  days.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  onClick={() => void softDelete()}
                  disabled={busy !== null}
                >
                  {busy === "soft" ? "Deleting…" : "Delete event"}
                </Button>
              </div>

              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => setShowHard((s) => !s)}
              >
                {showHard
                  ? "Hide permanent delete option"
                  : "Or permanently delete now (cannot be undone)"}
              </button>
            </div>
          </>
        ) : null}

        {showHard ? (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <p className="font-medium text-sm text-destructive">
              Permanently delete
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              Removes the event row, all audio files, analytics, sessions, and
              R2 objects right away. There is no recovery.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Type the event name{" "}
              <strong className="text-foreground">{props.eventName}</strong> to
              confirm:
            </p>
            <Input
              autoFocus
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={props.eventName}
              className="mt-2"
              disabled={busy !== null}
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="mt-3"
              onClick={() => void hardDeleteNow()}
              disabled={
                busy !== null ||
                confirmName.trim().toLowerCase() !==
                  props.eventName.trim().toLowerCase()
              }
            >
              {busy === "hard" ? "Deleting…" : "Permanently delete"}
            </Button>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={() => !busy && props.onClose()}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
