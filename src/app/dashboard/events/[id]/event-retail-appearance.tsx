"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { UpgradeTooltipLock } from "@/components/dashboard/upgrade-tooltip-lock";
import {
  clearEventRetailPassword,
  setEventRetailPassword,
} from "../password-actions";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

async function putFileToPresignedUrl(
  file: File,
  url: string,
  contentType: string
): Promise<void> {
  const r = await fetch(url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": contentType },
  });
  if (!r.ok) throw new Error(`Upload failed (${r.status}).`);
}

const COVER_ACCEPT = "image/png,image/jpeg,image/webp";

export function EventRetailAppearanceSection(props: {
  eventId: string;
  customBranding: boolean;
  passwordProtection: boolean;
  coverPreviewUrl: string | null;
  passwordActive: boolean;
  passwordSetAtLabel: string | null;
}) {
  const router = useRouter();
  const coverInputId = useId();
  const coverRef = useRef<HTMLInputElement | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [dragCover, setDragCover] = useState(false);

  const [requirePassword, setRequirePassword] = useState(props.passwordActive);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setRequirePassword(props.passwordActive);
    if (!props.passwordActive) {
      setChangingPassword(false);
      setPasswordDraft("");
    }
  }, [props.passwordActive]);

  const processCover = useCallback(
    async (file: File | undefined) => {
      if (!file || !props.customBranding) return;
      const mime =
        file.type === "image/png" ||
        file.type === "image/jpeg" ||
        file.type === "image/webp"
          ? file.type
          : null;
      if (!mime) {
        toast.error("Use PNG, JPG, or WebP.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Cover must be 10 MB or smaller.");
        return;
      }
      setCoverBusy(true);
      try {
        const presign = await fetch("/api/uploads/branding-presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "cover",
            event_id: props.eventId,
            filename: file.name,
            mime_type: mime,
            size: file.size,
          }),
        });
        const body = (await presign.json().catch(() => null)) as
          | { putUrl?: string; storageKey?: string; error?: string }
          | null;
        if (!presign.ok) {
          toast.error(body?.error ?? "Could not start upload.");
          return;
        }
        const putUrl = body?.putUrl;
        const storageKey = body?.storageKey;
        if (!putUrl || !storageKey) {
          toast.error("Invalid presign response.");
          return;
        }
        await putFileToPresignedUrl(file, putUrl, mime);
        const complete = await fetch("/api/uploads/branding-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "cover",
            event_id: props.eventId,
            storage_key: storageKey,
          }),
        });
        const cBody = (await complete.json().catch(() => null)) as
          | { error?: string }
          | null;
        if (!complete.ok) {
          toast.error(cBody?.error ?? "Could not finalize cover.");
          return;
        }
        toast.success("Cover image updated.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setCoverBusy(false);
        if (coverRef.current) coverRef.current.value = "";
      }
    },
    [props.customBranding, props.eventId, router]
  );

  async function removeCover() {
    if (!props.customBranding) return;
    setCoverBusy(true);
    try {
      const r = await fetch("/api/uploads/branding-remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "cover", event_id: props.eventId }),
      });
      const j = (await r.json().catch(() => null)) as { error?: string } | null;
      if (!r.ok) {
        toast.error(j?.error ?? "Could not remove cover.");
        return;
      }
      toast.success("Cover removed.");
      router.refresh();
    } finally {
      setCoverBusy(false);
    }
  }

  async function onTogglePassword(next: boolean) {
    if (!props.passwordProtection) return;
    if (next) {
      setRequirePassword(true);
      return;
    }
    setRequirePassword(false);
    setChangingPassword(false);
    setPasswordDraft("");
    if (!props.passwordActive) return;
    setPasswordBusy(true);
    try {
      const res = await clearEventRetailPassword(props.eventId);
      if (!res.ok) {
        toast.error(res.error);
        setRequirePassword(true);
        return;
      }
      toast.success("Password removed.");
      router.refresh();
    } finally {
      setPasswordBusy(false);
    }
  }

  async function submitPassword() {
    if (!props.passwordProtection) return;
    setPasswordBusy(true);
    try {
      const res = await setEventRetailPassword(props.eventId, passwordDraft);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Password saved.");
      setPasswordDraft("");
      setChangingPassword(false);
      router.refresh();
    } finally {
      setPasswordBusy(false);
    }
  }

  const coverInner = (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        Shown at the top of the public guest book page (max 10 MB). Formats:
        PNG, JPG, WebP.
      </p>
      <div className="flex flex-wrap gap-4">
        <div
          role="button"
          tabIndex={props.customBranding ? 0 : -1}
          onKeyDown={(e) => {
            if (!props.customBranding) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              coverRef.current?.click();
            }
          }}
          onClick={() => props.customBranding && coverRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            if (props.customBranding) setDragCover(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (props.customBranding) setDragCover(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragCover(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragCover(false);
            if (!props.customBranding) return;
            void processCover(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex min-h-[140px] min-w-[200px] flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center text-muted-foreground text-sm transition-colors",
            dragCover && props.customBranding
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/30",
            !props.customBranding && "cursor-not-allowed opacity-60"
          )}
        >
          <input
            ref={coverRef}
            id={coverInputId}
            type="file"
            accept={COVER_ACCEPT}
            className="sr-only"
            disabled={coverBusy || !props.customBranding}
            onChange={(e) => void processCover(e.target.files?.[0])}
          />
          {props.coverPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.coverPreviewUrl}
              alt="Event cover preview"
              className="max-h-40 max-w-full rounded-md object-contain"
            />
          ) : (
            <span>Drag and drop or click to upload a cover image</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={
              coverBusy || !props.customBranding || !props.coverPreviewUrl
            }
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={() => coverRef.current?.click()}
          >
            Replace cover
          </button>
          <button
            type="button"
            disabled={
              coverBusy || !props.customBranding || !props.coverPreviewUrl
            }
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-destructive/40 text-destructive"
            )}
            onClick={() => void removeCover()}
          >
            Remove cover
          </button>
        </div>
      </div>
    </div>
  );

  const passwordInner = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          id={`req-pw-${props.eventId}`}
          type="checkbox"
          checked={requirePassword}
          disabled={passwordBusy || !props.passwordProtection}
          onChange={(e) => void onTogglePassword(e.target.checked)}
          className="size-4"
        />
        <Label htmlFor={`req-pw-${props.eventId}`} className="font-normal">
          Require password to access this page
        </Label>
      </div>

      {requirePassword ? (
        <div className="space-y-3 rounded-lg border bg-card/50 p-4">
          {props.passwordActive && !changingPassword ? (
            <div className="space-y-3">
              {props.passwordSetAtLabel ? (
                <p className="text-muted-foreground text-sm">
                  Password set on {props.passwordSetAtLabel}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={passwordBusy || !props.passwordProtection}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  onClick={() => {
                    setChangingPassword(true);
                    setPasswordDraft("");
                  }}
                >
                  Change password
                </button>
                <button
                  type="button"
                  disabled={passwordBusy || !props.passwordProtection}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "border-destructive/40 text-destructive"
                  )}
                  onClick={() => void onTogglePassword(false)}
                >
                  Remove password
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor={`pw-input-${props.eventId}`}>New password</Label>
              <Input
                id={`pw-input-${props.eventId}`}
                type="password"
                value={passwordDraft}
                onChange={(e) => setPasswordDraft(e.target.value)}
                autoComplete="new-password"
                disabled={passwordBusy || !props.passwordProtection}
                className="max-w-md"
              />
              <p className="text-muted-foreground text-xs">
                At least 4 characters — something easy to share with guests.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={passwordBusy || !props.passwordProtection}
                  className={cn(buttonVariants({ size: "sm" }))}
                  onClick={() => void submitPassword()}
                >
                  {props.passwordActive && changingPassword
                    ? "Update password"
                    : "Set password"}
                </button>
                {props.passwordActive && changingPassword ? (
                  <button
                    type="button"
                    disabled={passwordBusy}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    onClick={() => {
                      setChangingPassword(false);
                      setPasswordDraft("");
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );

  return (
    <section className="space-y-8 rounded-xl border bg-card p-5 shadow-sm">
      <div>
        <h2 className="font-medium">Client page appearance</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Cover image and optional password apply to the client-facing guest book
          link for this event.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Cover image</h3>
        <UpgradeTooltipLock
          locked={!props.customBranding}
          message="Upgrade to Pro to customize your branding."
        >
          {coverInner}
        </UpgradeTooltipLock>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Password protection</h3>
        <UpgradeTooltipLock
          locked={!props.passwordProtection}
          message="Upgrade to Pro to protect client pages with a password."
        >
          {passwordInner}
        </UpgradeTooltipLock>
      </div>
    </section>
  );
}
