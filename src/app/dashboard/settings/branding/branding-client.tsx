"use client";

import { HexColorPicker } from "react-colorful";
import { ChevronDown } from "lucide-react";
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
} from "react";
import { toast } from "sonner";

import { UpgradeTooltipLock } from "@/components/dashboard/upgrade-tooltip-lock";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PillNav } from "@/components/ui/pill-nav";
import { Label } from "@/components/ui/label";
import {
  COMPANY_BRANDING_KEYS,
  type CompanyBranding,
  DEFAULT_COMPANY_BRANDING,
  mergeCompanyBranding,
} from "@/lib/company-branding";
import { normalizeHex } from "@/lib/branding-colors";
import { cn } from "@/lib/utils";

import { resetCompanyBranding, saveCompanyBranding } from "./actions";
import { BrandingLivePreview } from "./branding-live-preview";

export type BrandingClientProps = {
  locked: boolean;
  logoPreviewUrl: string | null;
  brandingFromServer: unknown;
  /** Bump when company row changes so local draft resets after save/refresh */
  brandingRevision: number;
};

type SectionDef = {
  id: string;
  title: string;
  fields: { key: keyof CompanyBranding; label: string }[];
};

const SECTIONS: SectionDef[] = [
  {
    id: "header",
    title: "Header",
    fields: [
      { key: "headerCoverFallbackBg", label: "Cover background (no cover image)" },
      { key: "headerTitleColor", label: "Title (event / main heading)" },
      { key: "headerSubtitleColor", label: "Subtitle & eyebrow text" },
      { key: "headerLogoBorderColor", label: "Logo border ring" },
    ],
  },
  {
    id: "body",
    title: "Body",
    fields: [
      { key: "bodyPageBg", label: "Page background" },
      { key: "bodyCardBg", label: "Card / panel background" },
      { key: "bodyTextColor", label: "Body text" },
      { key: "bodyHeadingColor", label: "Heading text" },
      { key: "bodyBorderColor", label: "Borders / dividers" },
    ],
  },
  {
    id: "player",
    title: "Audio player",
    fields: [
      { key: "playerBg", label: "Player background" },
      { key: "playerTextColor", label: "Track name & timers" },
      { key: "playerProgressFill", label: "Progress bar (filled)" },
      { key: "playerProgressTrack", label: "Progress bar (empty track)" },
      { key: "playerControlBg", label: "Play / pause button background" },
      { key: "playerControlIcon", label: "Play / pause icon color" },
    ],
  },
  {
    id: "buttons",
    title: "Buttons & interactive",
    fields: [
      { key: "buttonPrimaryBg", label: "Primary button background" },
      { key: "buttonPrimaryText", label: "Primary button text" },
      { key: "buttonPrimaryHoverBg", label: "Primary button hover background" },
      { key: "linkColor", label: "Link color" },
      { key: "linkHoverColor", label: "Link hover color" },
    ],
  },
  {
    id: "footer",
    title: "Footer",
    fields: [
      { key: "footerBg", label: "Footer background" },
      { key: "footerTextColor", label: "Footer text" },
      { key: "footerLinkColor", label: "Footer link" },
    ],
  },
];

const BRANDING_TABS = [
  { label: "Header", value: "header" },
  { label: "Body", value: "body" },
  { label: "Audio player", value: "player" },
  { label: "Buttons", value: "buttons" },
  { label: "Footer", value: "footer" },
] as const;

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

function ColorFieldRow(props: {
  id: string;
  fieldKey: keyof CompanyBranding;
  label: string;
  value: string;
  locked: boolean;
  onChange: (key: keyof CompanyBranding, hex: string) => void;
}) {
  const pickId = `${props.id}-${props.fieldKey}`;
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_minmax(0,200px)] sm:items-start">
      <div className="space-y-2">
        <Label htmlFor={`hex-${pickId}`} className="text-sm font-medium">
          {props.label}
        </Label>
        <Input
          id={`hex-${pickId}`}
          value={props.value}
          autoComplete="off"
          disabled={props.locked}
          className="max-w-[11rem] font-mono text-sm"
          onChange={(e) => props.onChange(props.fieldKey, e.target.value)}
          onBlur={() => {
            const n = normalizeHex(props.value);
            if (n) props.onChange(props.fieldKey, n);
          }}
        />
      </div>
      <div
        className={cn(
          "relative h-28 w-full overflow-hidden rounded-xl border bg-muted p-2 shadow-inner touch-manipulation",
          props.locked && "pointer-events-none opacity-60"
        )}
      >
        <HexColorPicker
          color={normalizeHex(props.value) ?? DEFAULT_COMPANY_BRANDING[props.fieldKey]}
          onChange={(hex) => props.onChange(props.fieldKey, hex)}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}

export function BrandingClient(props: BrandingClientProps) {
  const router = useRouter();
  const formId = useId();
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const resetDialogRef = useRef<HTMLDialogElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploadBusy, setUploadBusy] = useState(false);
  const [activeColorTab, setActiveColorTab] = useState("header");

  const baseline = useMemo(
    () => mergeCompanyBranding(props.brandingFromServer),
    [props.brandingFromServer]
  );

  const [draft, setDraft] = useState<CompanyBranding>(baseline);

  useEffect(() => {
    setDraft(mergeCompanyBranding(props.brandingFromServer));
  }, [props.brandingRevision]);

  const dirty = COMPANY_BRANDING_KEYS.some((k) => draft[k] !== baseline[k]);

  const setField = useCallback((key: keyof CompanyBranding, raw: string) => {
    setDraft((prev) => ({ ...prev, [key]: raw }));
  }, []);

  function discard() {
    setDraft(mergeCompanyBranding(props.brandingFromServer));
  }

  function save() {
    const merged = mergeCompanyBranding(draft);
    setDraft(merged);
    startTransition(async () => {
      const res = await saveCompanyBranding({ branding: merged });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Branding saved.");
      router.refresh();
    });
  }

  function resetAfterConfirm() {
    startTransition(async () => {
      resetDialogRef.current?.close();
      const res = await resetCompanyBranding();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Colors reset to defaults.");
      router.refresh();
    });
  }

  async function onLogoPick(file: File | undefined) {
    if (!file || props.locked) return;
    const mime =
      file.type === "image/png" ||
      file.type === "image/jpeg" ||
      file.type === "image/svg+xml"
        ? file.type
        : null;
    if (!mime) {
      toast.error("Use PNG, JPG, or SVG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be 5 MB or smaller.");
      return;
    }
    setUploadBusy(true);
    try {
      const presign = await fetch("/api/uploads/branding-presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "logo",
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
        body: JSON.stringify({ kind: "logo", storage_key: storageKey }),
      });
      const cBody = (await complete.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!complete.ok) {
        toast.error(cBody?.error ?? "Could not finalize logo.");
        return;
      }
      toast.success("Logo updated.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploadBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeLogo() {
    if (props.locked) return;
    setUploadBusy(true);
    try {
      const r = await fetch("/api/uploads/branding-remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "logo" }),
      });
      const j = (await r.json().catch(() => null)) as { error?: string } | null;
      if (!r.ok) {
        toast.error(j?.error ?? "Could not remove logo.");
        return;
      }
      toast.success("Logo removed.");
      router.refresh();
    } finally {
      setUploadBusy(false);
    }
  }

  const paletteInner = (
    <div id={formId} className="space-y-6">
      <div className="lg:hidden">
        <details className="group sticky top-0 z-20 rounded-lg border bg-background">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-sm font-medium touch-manipulation [&::-webkit-details-marker]:hidden">
            <span>Live preview</span>
            <ChevronDown className="size-4 transition group-open:rotate-180" />
          </summary>
          <div className="border-t p-3">
            <BrandingLivePreview
              branding={mergeCompanyBranding(draft)}
              logoPreviewUrl={props.logoPreviewUrl}
              className="max-h-[70vh] min-h-[340px] shadow-sm"
            />
          </div>
        </details>
      </div>

      <div className="flex flex-col gap-10 lg:flex-row-reverse lg:items-start">
        <div className="hidden min-h-[min(560px,75vh)] lg:sticky lg:top-24 lg:block lg:w-[60%] xl:top-28">
          <p className="mb-3 font-medium text-muted-foreground text-sm">Live preview</p>
          <BrandingLivePreview
            branding={mergeCompanyBranding(draft)}
            logoPreviewUrl={props.logoPreviewUrl}
            className="min-h-[480px] shadow-sm"
          />
        </div>

        <div className="min-w-0 flex-1 lg:w-[40%] lg:flex-none">
          <PillNav
            ariaLabel="Branding color sections"
            items={[...BRANDING_TABS]}
            activeValue={activeColorTab}
            onChange={setActiveColorTab}
          />

          <div className="mt-4 rounded-lg border bg-card">
            <div className="space-y-6 px-4 py-4">
              {(SECTIONS.find((s) => s.id === activeColorTab) ?? SECTIONS[0]).fields.map(
                ({ key, label }) => (
                  <ColorFieldRow
                    key={key}
                    id={inputId}
                    fieldKey={key}
                    label={label}
                    value={draft[key]}
                    locked={props.locked}
                    onChange={setField}
                  />
                )
              )}
            </div>
          </div>

          {dirty ? (
            <p className="mt-4 text-amber-700 text-sm dark:text-amber-400">
              You have unsaved changes.
            </p>
          ) : (
            <p className="mt-4 text-muted-foreground text-sm">All changes saved.</p>
          )}

          <div className="mt-6 flex flex-wrap gap-2 border-t pt-6">
            <button
              type="button"
              disabled={props.locked || pending || !dirty}
              className={cn(buttonVariants())}
              onClick={() => save()}
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              disabled={props.locked || !dirty}
              className={cn(buttonVariants({ variant: "outline" }))}
              onClick={() => discard()}
            >
              Discard changes
            </button>
            <button
              type="button"
              disabled={props.locked || pending}
              className={cn(buttonVariants({ variant: "outline" }))}
              onClick={() => resetDialogRef.current?.showModal()}
            >
              Reset to defaults
            </button>
          </div>

          <dialog
            ref={resetDialogRef}
            className="max-w-md rounded-lg border bg-background p-0 text-foreground shadow-lg backdrop:bg-black/40"
          >
            <div className="p-6">
              <h2 className="text-lg font-semibold">Reset branding colors?</h2>
              <p className="mt-2 text-muted-foreground text-sm">
                This restores every color to the system default. Your logo is not
                removed. This cannot be undone unless you re-enter your colors.
              </p>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "outline" }))}
                  onClick={() => resetDialogRef.current?.close()}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "destructive" }))}
                  disabled={pending}
                  onClick={() => resetAfterConfirm()}
                >
                  Reset colors
                </button>
              </div>
            </div>
          </dialog>
        </div>
      </div>
    </div>
  );

  const logoInner = (
    <div className="space-y-4">
      <p className="font-medium text-sm">Logo</p>
      <div className="flex flex-wrap items-start gap-4">
        <div
          role="button"
          tabIndex={props.locked ? -1 : 0}
          onKeyDown={(e) => {
            if (props.locked) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
          onClick={() => !props.locked && fileRef.current?.click()}
          className={cn(
            "flex min-h-[120px] min-w-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center text-muted-foreground text-sm transition-colors touch-manipulation",
            props.locked ? "cursor-not-allowed" : "hover:border-foreground/40"
          )}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="sr-only"
            disabled={uploadBusy || props.locked}
            onChange={(e) => void onLogoPick(e.target.files?.[0])}
          />
          {props.logoPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.logoPreviewUrl}
              alt="Company logo"
              className="max-h-24 max-w-full object-contain"
            />
          ) : (
            <span>Drag and drop or click to upload PNG, JPG, or SVG (max 5 MB)</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={uploadBusy || props.locked || !props.logoPreviewUrl}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={() => fileRef.current?.click()}
          >
            Replace logo
          </button>
          <button
            type="button"
            disabled={uploadBusy || props.locked || !props.logoPreviewUrl}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-destructive/40 text-destructive"
            )}
            onClick={() => void removeLogo()}
          >
            Remove logo
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex text-muted-foreground text-sm hover:text-foreground"
        >
          ← Back to events
        </Link>
      </div>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Client page branding</h1>
        <p className="text-muted-foreground text-sm">
          Logo and colors appear on client-facing guest book pages when your plan
          includes custom branding. Adjust colors on the left — the preview updates as
          you go. Save when you are happy with the result.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-medium">Logo</h2>
        <UpgradeTooltipLock
          locked={props.locked}
          message="Upgrade to Pro to customize your branding."
        >
          {logoInner}
        </UpgradeTooltipLock>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Colors</h2>
        <UpgradeTooltipLock
          locked={props.locked}
          message="Upgrade to Pro to customize your branding."
        >
          {paletteInner}
        </UpgradeTooltipLock>
      </section>
    </div>
  );
}
