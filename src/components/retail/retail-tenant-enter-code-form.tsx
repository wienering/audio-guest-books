"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Matches dashboard validation for retail client URL slugs. */
const RETAIL_CLIENT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function RetailTenantEnterCodeForm() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = value.trim().toLowerCase();
    const code = raw.replace(/^\/+/, "").split("/")[0] ?? "";
    if (
      code.length < 2 ||
      code.length > 80 ||
      !RETAIL_CLIENT_SLUG.test(code)
    ) {
      return;
    }
    router.push(`/${encodeURIComponent(code)}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="event-code">Event code</Label>
        <Input
          id="event-code"
          name="eventCode"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="e.g. jordan-alex-wedding"
          value={value}
          onChange={(ev) => setValue(ev.target.value)}
          className={cn(
            "border shadow-none bg-transparent focus-visible:border-[var(--brand-button-primary-bg)] focus-visible:ring-[var(--brand-button-primary-bg)]/25"
          )}
          style={{
            borderColor: "var(--brand-body-border)",
            color: "var(--brand-body-text)",
          }}
        />
      </div>
      <Button
        type="submit"
        className={cn(
          "w-full border-2 shadow-none transition-colors hover:[background-color:var(--brand-button-primary-hover-bg)]"
        )}
        disabled={(() => {
          const code =
            value
              .trim()
              .toLowerCase()
              .replace(/^\/+/, "")
              .split("/")[0] ?? "";
          return (
            code.length < 2 ||
            code.length > 80 ||
            !RETAIL_CLIENT_SLUG.test(code)
          );
        })()}
        style={{
          borderColor: "var(--brand-button-primary-bg)",
          color: "var(--brand-button-primary-text)",
          backgroundColor: "var(--brand-button-primary-bg)",
        }}
      >
        Open guest book
      </Button>
      <p
        className="text-center text-sm"
        style={{ color: "var(--brand-body-muted)" }}
      >
        If you&apos;re unsure of the code, check your invitation email or contact
        the host below.
      </p>
    </form>
  );
}
