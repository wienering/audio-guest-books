"use client";

import type { CSSProperties } from "react";
import { Download, Pause } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CompanyBranding } from "@/lib/company-branding";
import { companyBrandingToCssVars } from "@/lib/company-branding";

type Props = {
  branding: CompanyBranding;
  logoPreviewUrl: string | null;
  className?: string;
};

/** Miniature client guest book shell for branding settings preview. */
export function BrandingLivePreview(props: Props) {
  const { branding, logoPreviewUrl, className } = props;
  const css = companyBrandingToCssVars(branding) as CSSProperties;

  return (
    <div
      className={cn(
        "branding-preview-mock-scope flex flex-col overflow-hidden rounded-xl border text-[length:clamp(11px,2.2vw,14px)]",
        className
      )}
      style={{
        ...css,
        containerType: "inline-size",
        borderColor: "var(--brand-body-border)",
        background: "var(--brand-body-page-bg)",
        color: "var(--brand-body-text)",
      }}
    >
      <header
        className="border-b px-[4%] pb-[6%] pt-[5%]"
        style={{
          borderColor: "var(--brand-body-border)",
          background: "var(--brand-body-page-bg)",
        }}
      >
        <div
          className="mb-[4%] w-full rounded-md"
          style={{
            height: "clamp(72px, 18cqw, 120px)",
            background: "var(--brand-header-cover-fallback-bg)",
          }}
          aria-hidden
        />
        <div className="flex items-start gap-[3%]">
          <div
            className="size-[clamp(2.25rem,8cqw,3rem)] shrink-0 rounded-md border-[3px] border-solid p-[2px]"
            style={{
              borderColor: "var(--brand-header-logo-border)",
              background: "var(--brand-body-card-bg)",
            }}
          >
            {logoPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreviewUrl}
                alt=""
                className="size-full rounded object-contain"
              />
            ) : (
              <div className="size-full rounded bg-neutral-300/35" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-[0.08em] text-right leading-tight">
            <p
              className="text-[length:clamp(10px,1.9cqw,12px)] font-medium uppercase tracking-wide"
              style={{ color: "var(--brand-header-subtitle)" }}
            >
              Audio guest book
            </p>
            <p
              className="font-serif font-semibold [font-size:length:clamp(15px,3.35cqw,20px)]"
              style={{ color: "var(--brand-header-title)" }}
            >
              Sample Event Name
            </p>
            <p
              style={{ color: "var(--brand-header-subtitle)" }}
              className="[font-size:length:clamp(12px,2.35cqw,14px)]"
            >
              Alex & Morgan
            </p>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-[4%] px-[4%] py-[6%]">
        <div
          className="rounded-lg border px-[4%] py-[4.5%]"
          style={{
            borderColor: "var(--brand-body-border)",
            background: "var(--brand-player-bg)",
          }}
        >
          <p
            className="font-semibold leading-tight"
            style={{ color: "var(--brand-player-text)", fontSize: "1em" }}
          >
            congratulations-message.mp3
          </p>
          <div className="mt-[4%] flex items-center gap-[3%]">
            <span
              className={cn(
                "flex size-[2em] shrink-0 cursor-default items-center justify-center rounded-full border text-[71%]"
              )}
              aria-hidden
              style={{
                borderColor: "var(--brand-body-border)",
                color: "var(--brand-player-text)",
              }}
            >
              «
            </span>
            <span
              className="flex size-[2.35em] shrink-0 cursor-default items-center justify-center rounded-full"
              aria-hidden
              style={{
                background: "var(--brand-player-control-bg)",
                color: "var(--brand-player-control-icon)",
              }}
            >
              <Pause className="size-[42%]" />
            </span>
            <span
              aria-hidden
              className={cn(
                "flex size-[2em] shrink-0 cursor-default items-center justify-center rounded-full border text-[71%]"
              )}
              style={{
                borderColor: "var(--brand-body-border)",
                color: "var(--brand-player-text)",
              }}
            >
              »
            </span>
          </div>
          <div
            className="mt-[4.5%] h-[0.625rem] w-full rounded-full"
            style={{
              background: `linear-gradient(to right, var(--brand-player-progress-fill) 35%, var(--brand-player-progress-track) 35%)`,
            }}
            aria-hidden
          />
          <div
            className="mt-[2%] flex justify-between tabular-nums"
            style={{ color: "var(--brand-player-text)", opacity: 0.92 }}
          >
            <span>0:32</span>
            <span>1:54</span>
          </div>
        </div>

        <section className="space-y-[3%]" aria-hidden>
          <h2
            className="font-semibold text-[length:clamp(13px,2.85cqw,16px)]"
            style={{ color: "var(--brand-body-heading)" }}
          >
            Recordings
          </h2>
          <ul
            className="overflow-hidden rounded-lg border"
            style={{
              borderColor: "var(--brand-body-border)",
              background: "var(--brand-body-card-bg)",
            }}
          >
            {[
              { name: "guest-book-hello.wav", active: true },
              { name: "toast-from-best-friend.wav", active: false },
            ].map(({ name, active }) => (
              <li
                key={name}
                className="flex items-center gap-[3%] border-t px-[3.5%] py-[3.5%] first:border-t-0"
                style={{ borderTopColor: "var(--brand-body-border)" }}
              >
                <div
                  className="min-h-[2rem] flex-1 rounded-sm text-left text-[length:clamp(11px,2.35cqw,14px)] leading-tight"
                  style={
                    active
                      ? {
                          background: "var(--brand-row-active)",
                          color: "var(--brand-body-text)",
                          padding: "0.45em 0.35em",
                        }
                      : { color: "var(--brand-body-text)" }
                  }
                >
                  <span className="font-medium">{name}</span>
                  <span
                    className="mt-[0.2em] block text-[92%]"
                    style={{ color: "var(--brand-body-muted)" }}
                  >
                    45s
                  </span>
                </div>
                <span
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "inline-flex h-[2rem] shrink-0 items-center border px-[4%] text-[92%]"
                  )}
                  style={{
                    borderColor: "var(--brand-body-border)",
                    background: "var(--brand-body-card-bg)",
                    color: "var(--brand-body-text)",
                  }}
                >
                  <Download className="mr-[0.35em] size-[13px]" />
                  DL
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer
        className="border-t px-[4%] py-[4.5%] text-center"
        style={{
          borderColor: "var(--brand-body-border)",
          background: "var(--brand-footer-bg)",
          color: "var(--brand-footer-text)",
        }}
      >
        <span className="text-[92%]">
          Powered by{" "}
          <span style={{ color: "var(--brand-footer-link)", fontWeight: 600 }}>
            Audio Guest Books
          </span>
        </span>
      </footer>
    </div>
  );
}
