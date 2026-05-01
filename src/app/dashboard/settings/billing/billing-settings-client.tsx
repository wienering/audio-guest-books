"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/date-format";

export type BillingAuditRow = {
  id: string;
  event_type: string;
  from_state: string | null;
  to_state: string | null;
  created_at: string;
};

export type BillingSettingsClientProps = {
  companyName: string;
  planCode: string;
  planDisplayName: string;
  foundingSpotsRemaining: number;
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
  isFoundingMember: boolean;
  subscriptionPlanCode: string | null;
  stripeSubscriptionId: string | null;
  auditRows: BillingAuditRow[];
};

type StatusPayload = {
  planCode: string;
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
  isFoundingMember: boolean;
  subscriptionPlanCode: string | null;
  stripeSubscriptionId: string | null;
  isPaid: boolean;
};

export function BillingSettingsClient(props: BillingSettingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [polled, setPolled] = useState<Partial<StatusPayload> | null>(null);

  const planCode = polled?.planCode ?? props.planCode;
  const subscriptionStatus =
    polled?.subscriptionStatus ?? props.subscriptionStatus;
  const subscriptionCurrentPeriodEnd =
    polled?.subscriptionCurrentPeriodEnd ??
    props.subscriptionCurrentPeriodEnd;
  const subscriptionCancelAtPeriodEnd =
    polled?.subscriptionCancelAtPeriodEnd ??
    props.subscriptionCancelAtPeriodEnd;
  const isFoundingMember = polled?.isFoundingMember ?? props.isFoundingMember;
  const subscriptionPlanCode =
    polled?.subscriptionPlanCode ?? props.subscriptionPlanCode;
  const stripeSubscriptionId =
    polled?.stripeSubscriptionId ?? props.stripeSubscriptionId;

  const isUltimate = planCode === "ultimate";

  const clearBillingQueryParams = useCallback(() => {
    router.replace("/dashboard/settings/billing", { scroll: false });
  }, [router]);

  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      toast.message("Checkout canceled.");
      clearBillingQueryParams();
    }
  }, [searchParams, clearBillingQueryParams]);

  useEffect(() => {
    if (searchParams.get("success") !== "true") {
      return;
    }
    toast.success("Payment received. Syncing your subscription…");
    let cancelled = false;
    const start = Date.now();

    const finish = () => {
      if (!cancelled) {
        clearBillingQueryParams();
      }
    };

    const tick = async () => {
      try {
        const r = await fetch("/api/billing/status");
        if (!r.ok) return;
        const data = (await r.json()) as StatusPayload;
        if (cancelled) return;
        setPolled(data);
        if (data.isPaid && data.planCode === "ultimate") {
          toast.success("Ultimate is active on your workspace.");
          finish();
          return;
        }
        if (Date.now() - start >= 5000) {
          toast.message(
            "Subscription is still updating. Refresh this page in a moment if needed."
          );
          finish();
          return;
        }
        setTimeout(tick, 500);
      } catch {
        if (!cancelled && Date.now() - start < 5000) {
          setTimeout(tick, 500);
        } else if (!cancelled) {
          finish();
        }
      }
    };

    void tick();
    return () => {
      cancelled = true;
    };
  }, [searchParams, clearBillingQueryParams]);

  async function startCheckout() {
    setBusy("checkout");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not start checkout.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not open billing portal.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setBusy(null);
    }
  }

  let planTitle = props.planDisplayName;
  if (isUltimate) {
    if (
      isFoundingMember ||
      subscriptionPlanCode === "ultimate_founding"
    ) {
      planTitle = "Ultimate (Founding member)";
    } else {
      planTitle = "Ultimate";
    }
  }

  const periodLabel = subscriptionCurrentPeriodEnd
    ? formatDate(subscriptionCurrentPeriodEnd)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Billing</h1>
        <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
          Subscription and payments for{" "}
          <strong>{props.companyName}</strong>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current plan</CardTitle>
          <CardDescription>
            {isUltimate && isFoundingMember ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="rounded-md border bg-muted px-2 py-0.5 font-medium text-xs">
                  Founding member
                </span>
                <span className="text-muted-foreground text-sm">
                  $5/month forever
                </span>
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-medium text-lg">{planTitle}</p>

          {isUltimate ? (
            <div className="space-y-2 text-muted-foreground text-sm">
              <p>
                Status:{" "}
                <span className="text-foreground">
                  {subscriptionStatus ?? "—"}
                </span>
              </p>
              {periodLabel ? (
                <p>
                  Next billing date:{" "}
                  <span className="text-foreground">{periodLabel}</span>
                </p>
              ) : null}
              {subscriptionCancelAtPeriodEnd ? (
                <p className="text-amber-700 dark:text-amber-500">
                  Subscription ends after this period. Use the billing portal
                  to resume or manage payment details.
                </p>
              ) : null}
              {stripeSubscriptionId ? (
                <Button
                  type="button"
                  onClick={() => void openPortal()}
                  disabled={busy !== null}
                >
                  {busy === "portal" ? "Opening…" : "Manage subscription"}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Ultimate is <strong>$5/month</strong> with Stripe (USD).
              </p>
              {props.foundingSpotsRemaining > 0 ? (
                <p className="text-muted-foreground text-sm">
                  Founding member pricing: $5/month for life —{" "}
                  <strong>{props.foundingSpotsRemaining}</strong> spots
                  remaining.
                </p>
              ) : null}
              <Button
                type="button"
                onClick={() => void startCheckout()}
                disabled={busy !== null}
              >
                {busy === "checkout" ? "Redirecting…" : "Upgrade to Ultimate"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent billing activity</CardTitle>
          <CardDescription>
            Last five events (support / debugging).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.auditRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No entries yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {props.auditRows.map((row) => (
                <li
                  key={row.id}
                  className="border-b border-border/60 pb-2 last:border-0"
                >
                  <span className="font-medium">{row.event_type}</span>
                  {row.from_state != null || row.to_state != null ? (
                    <span className="text-muted-foreground">
                      {" "}
                      ({row.from_state ?? "—"} → {row.to_state ?? "—"})
                    </span>
                  ) : null}
                  <span className="block text-muted-foreground text-xs">
                    {formatDateTime(row.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
