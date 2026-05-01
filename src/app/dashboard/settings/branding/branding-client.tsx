"use client";

import { HexColorPicker } from "react-colorful";
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
import { Label } from "@/components/ui/label";
import { buildRetailThemeCssVars } from "@/lib/retail-theme-vars";
import { cn } from "@/lib/utils";

import { resetCompanyTheme, saveCompanyTheme } from "./actions";

export type BrandingClientProps = {
  locked: boolean;
  logoPreviewUrl: string | null;
  initialPrimary: string | null;
  initialSecondary: string | null;
  initialAccent: string | null;
  initialBackground: string | null;
};

type Channel = "primary" | "secondary" | "accent" | "background";

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

export function BrandingClient(props: BrandingClientProps) {
  const router = useRouter();
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploadBusy, setUploadBusy] = useState(false);

  const [primary, setPrimary] = useState(
    props.initialPrimary ?? "#1a1a1a"
  );
  const [secondary, setSecondary] = useState(
    props.initialSecondary ?? "#e6e3dc"
  );
  const [accent, setAccent] = useState(props.initialAccent ?? "#c9a96e");
  const [background, setBackground] = useState(
    props.initialBackground ?? "#f6f4ef"
  );

  useEffect(() => {
    setPrimary(props.initialPrimary ?? "#1a1a1a");
    setSecondary(props.initialSecondary ?? "#e6e3dc");
    setAccent(props.initialAccent ?? "#c9a96e");
    setBackground(props.initialBackground ?? "#f6f4ef");
  }, [
    props.initialPrimary,
    props.initialSecondary,
    props.initialAccent,
    props.initialBackground,
  ]);

  const [channel, setChannel] = useState<Channel>("primary");

  const activeHex = useMemo(() => {
    switch (channel) {
      case "primary":
        return primary;
      case "secondary":
        return secondary;
      case "accent":
        return accent;
      default:
        return background;
    }
  }, [accent, background, channel, primary, secondary]);

  const setActiveHex = useCallback(
    (hex: string) => {
      switch (channel) {
        case "primary":
          setPrimary(hex);
          break;
        case "secondary":
          setSecondary(hex);
          break;
        case "accent":
          setAccent(hex);
          break;
        default:
          setBackground(hex);
      }
    },
    [channel]
  );

  const previewVars = useMemo(() => {
    return buildRetailThemeCssVars({
      useCustomTheme: true,
      themePrimary: primary,
      themeSecondary: secondary,
      themeAccent: accent,
      themeBackground: background,
      themeText: null,
    });
  }, [accent, background, primary, secondary]);

  function save() {
    startTransition(async () => {
      const res = await saveCompanyTheme({
        themePrimary: primary,
        themeSecondary: secondary,
        themeAccent: accent,
        themeBackground: background,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Theme saved.");
      router.refresh();
    });
  }

  function reset() {
    startTransition(async () => {
      const res = await resetCompanyTheme();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Theme reset to defaults.");
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
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <p className="font-medium text-sm">Palette</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["primary", "Primary"],
                ["secondary", "Secondary"],
                ["accent", "Accent"],
                ["background", "Background"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                disabled={props.locked}
                onClick={() => setChannel(key)}
                className={cn(
                  buttonVariants({
                    variant: channel === key ? "default" : "outline",
                    size: "sm",
                  }),
                  "min-h-11 touch-manipulation"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className="relative mx-auto w-full max-w-[min(100%,280px)] overflow-hidden rounded-xl border bg-muted p-3 shadow-inner touch-manipulation sm:p-4"
            style={{ aspectRatio: "1" }}
          >
            <HexColorPicker
              color={activeHex}
              onChange={setActiveHex}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Label htmlFor={`${channel}-${inputId}`} className="sr-only">
              Hex value
            </Label>
            <Input
              id={`${channel}-${inputId}`}
              value={activeHex}
              onChange={(e) => setActiveHex(e.target.value)}
              disabled={props.locked}
              className="max-w-[10rem] font-mono text-sm"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-medium text-sm">Live preview</p>
          <div
            className="overflow-hidden rounded-xl border shadow-sm"
            style={previewVars as React.CSSProperties}
          >
            <div
              className="border-b px-4 py-3 text-sm font-semibold"
              style={{
                borderColor: "var(--retail-border)",
                color: "var(--retail-primary)",
              }}
            >
              Client guest book
            </div>
            <div className="space-y-4 px-4 py-5">
              <button
                type="button"
                className="min-h-11 w-full rounded-lg px-4 py-2 text-base font-medium text-white touch-manipulation"
                style={{ background: "var(--retail-accent)" }}
              >
                Download all (ZIP)
              </button>
              <div
                className="rounded-lg border px-3 py-3 text-base touch-manipulation"
                style={{
                  borderColor: "var(--retail-border)",
                  background: "var(--retail-row-active)",
                  color: "var(--retail-text)",
                }}
              >
                Message from Sarah.wav
              </div>
              <div
                className="rounded-lg border px-3 py-3 text-base opacity-90 touch-manipulation"
                style={{
                  borderColor: "var(--retail-border)",
                  color: "var(--retail-text)",
                }}
              >
                Message from Jordan.mp3
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={props.locked || pending}
          className={cn(buttonVariants())}
          onClick={() => save()}
        >
          {pending ? "Saving…" : "Save theme"}
        </button>
        <button
          type="button"
          disabled={props.locked || pending}
          className={cn(buttonVariants({ variant: "outline" }))}
          onClick={() => reset()}
        >
          Reset to default
        </button>
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Client page branding
        </h1>
        <p className="text-muted-foreground text-sm">
          Logo and colors appear on client-facing guest book pages when your plan
          includes custom branding.
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
        <h2 className="font-medium">Color palette</h2>
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
