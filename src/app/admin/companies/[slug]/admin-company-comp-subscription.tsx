"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/date-format";

type LastComplimentaryEnd = {
  endedAt: string;
  actionType: string;
  previousPlanCode: string | null;
  previousExpiresAt: string | null;
} | null;

type Props = {
  companyId: string;
  companyName: string;
  isDeleted: boolean;
  stripePaidActive: boolean;
  complimentaryActive: boolean;
  showComplimentaryEnded: boolean;
  compSubscriptionPlanCode: string | null;
  compSubscriptionGrantedAt: string | null;
  compSubscriptionExpiresAt: string | null;
  compSubscriptionGrantedByAdminId: string | null;
  grantedByAdminEmail: string | null;
  compSubscriptionNotes: string | null;
  lastComplimentaryEnd: LastComplimentaryEnd;
};

function tierLabel(code: string | null): string {
  if (code === "pro_comp") return "Pro";
  if (code === "ultimate_comp") return "Ultimate";
  return code ?? "—";
}

function addUtcDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

async function postJson(
  url: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!res.ok) {
      const errMsg =
        typeof data.error === "string"
          ? data.error
          : `Request failed (${res.status})`;
      return { ok: false, data, error: errMsg };
    }
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      data: null,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export function AdminCompanyCompSubscription(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [grantPlan, setGrantPlan] = useState<"pro_comp" | "ultimate_comp">(
    "ultimate_comp"
  );
  const [grantExpires, setGrantExpires] = useState("");
  const [grantNotes, setGrantNotes] = useState("");
  const [stripeOverlapAck, setStripeOverlapAck] = useState(false);
  const [extendExpires, setExtendExpires] = useState("");
  const [revokeNotes, setRevokeNotes] = useState("");

  const [modal, setModal] = useState<
    | null
    | "grant"
    | "stripe-warn-grant"
    | "extend"
    | "revoke"
    | "renew"
  >(null);

  useEffect(() => {
    if (modal === "extend" && props.compSubscriptionExpiresAt?.trim()) {
      setExtendExpires(props.compSubscriptionExpiresAt.slice(0, 10));
    }
  }, [modal, props.compSubscriptionExpiresAt]);

  async function submitGrant(forceAfterStripeWarn = false) {
    await runWith("grant-comp", async () => {
      if (props.stripePaidActive && !forceAfterStripeWarn) {
        setModal("stripe-warn-grant");
        return;
      }
      const exp = grantExpires.trim();
      const body: Record<string, unknown> = {
        planCode: grantPlan,
        notes: grantNotes.trim() === "" ? null : grantNotes.trim(),
        expiresAt: exp === "" ? null : exp,
      };
      const r = await postJson(
        `/api/admin/companies/${props.companyId}/grant-comp-subscription`,
        body
      );
      if (!r.ok) {
        toast.error(r.error ?? "Could not grant complimentary subscription.");
        return;
      }
      const resp = r.data as {
        warningOverlappingStripePaidSubscription?: boolean;
      };
      const overlap = Boolean(resp.warningOverlappingStripePaidSubscription);
      if (overlap) {
        toast.message(
          "Complimentary subscription saved. Stripe is still billing this workspace — billing follows Stripe while it is active.",
          { duration: 8000 }
        );
      } else {
        toast.success("Complimentary subscription granted.");
      }
      setModal(null);
      setGrantExpires("");
      setGrantNotes("");
      setStripeOverlapAck(false);
      router.refresh();
    });
  }

  async function submitExtend() {
    if (!extendExpires.trim()) {
      toast.error("Pick an expiry date.");
      return;
    }
    await runWith("extend-comp", async () => {
      const r = await postJson(
        `/api/admin/companies/${props.companyId}/extend-comp-subscription`,
        { expiresAt: extendExpires.trim() }
      );
      if (!r.ok) {
        toast.error(r.error ?? "Could not extend.");
        return;
      }
      toast.success("Complimentary expiry updated.");
      setModal(null);
      setExtendExpires("");
      router.refresh();
    });
  }

  async function submitRevoke() {
    await runWith("revoke-comp", async () => {
      const r = await postJson(
        `/api/admin/companies/${props.companyId}/revoke-comp-subscription`,
        { notes: revokeNotes.trim() === "" ? null : revokeNotes.trim() }
      );
      if (!r.ok) {
        toast.error(r.error ?? "Could not revoke.");
        return;
      }
      toast.success("Complimentary subscription revoked.");
      setModal(null);
      setRevokeNotes("");
      router.refresh();
    });
  }

  async function runWith(name: string, fn: () => Promise<void>) {
    setBusy(name);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  function grantConfirmLabel(): string {
    const plan = tierLabel(grantPlan);
    if (!grantExpires.trim()) {
      return `Grant ${plan} (no expiry)`;
    }
    try {
      const d = grantExpires.includes("T")
        ? new Date(grantExpires)
        : new Date(grantExpires + "T23:59:59.999Z");
      return `Grant ${plan} (expires ${d.toLocaleDateString(undefined, {
        dateStyle: "medium",
      })})`;
    } catch {
      return `Grant ${plan}`;
    }
  }

  if (props.isDeleted) {
    return null;
  }

  let body: React.ReactNode = null;

  if (props.stripePaidActive) {
    body = (
      <div className="space-y-2 text-muted-foreground text-sm">
        <p>
          This company has an active Stripe subscription (paid or grace). Plan
          and billing shown to the workspace follow Stripe. You can still
          record an inactive complimentary entitlement for bookkeeping using
          &quot;Grant complimentary subscription&quot; — it won&apos;t change
          billing while Stripe stays active.
        </p>
        <Button size="sm" onClick={() => setModal("grant")}>
          Grant complimentary subscription…
        </Button>
      </div>
    );
  } else if (props.complimentaryActive) {
    const expiry = props.compSubscriptionExpiresAt
      ? formatDateTime(props.compSubscriptionExpiresAt)
      : null;
    body = (
      <div className="space-y-3 text-sm">
        <div>
          <p className="font-medium">
            Complimentary {tierLabel(props.compSubscriptionPlanCode)}
          </p>
          <p className="text-muted-foreground">
            Granted by{" "}
            <span className="font-mono text-xs">
              {props.grantedByAdminEmail ??
                props.compSubscriptionGrantedByAdminId ??
                "—"}
            </span>{" "}
            on{" "}
            {props.compSubscriptionGrantedAt
              ? formatDateTime(props.compSubscriptionGrantedAt)
              : "—"}
            {expiry ? (
              <>
                {" "}
                · Expires <strong>{expiry}</strong>
              </>
            ) : (
              <> · No expiry</>
            )}
          </p>
          {props.compSubscriptionNotes?.trim() ? (
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground text-xs leading-relaxed">
              <strong>Notes:</strong> {props.compSubscriptionNotes}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {!props.compSubscriptionExpiresAt ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModal("extend")}
              disabled={busy !== null}
            >
              Add expiry date…
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModal("extend")}
              disabled={busy !== null}
            >
              Extend…
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setModal("revoke")}
            disabled={busy !== null}
          >
            Revoke now…
          </Button>
        </div>
      </div>
    );
  } else if (props.showComplimentaryEnded && props.lastComplimentaryEnd) {
    const md = props.lastComplimentaryEnd;
    body = (
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Complimentary {tierLabel(md.previousPlanCode)} ended{" "}
          {md.previousExpiresAt
            ? `on ${formatDateTime(md.previousExpiresAt)}`
            : `(recorded ${formatDateTime(md.endedAt)})`}
          .
        </p>
        <Button size="sm" onClick={() => setModal("renew")}>
          Renew…
        </Button>
      </div>
    );
  } else {
    body = (
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          No active subscription for this workspace.
        </p>
        <Button size="sm" onClick={() => setModal("grant")}>
          Grant complimentary subscription…
        </Button>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            Stripe billing and complimentary Ultimate / Pro overrides.
          </CardDescription>
        </CardHeader>
        <CardContent>{body}</CardContent>
      </Card>

      {modal === "grant" || modal === "renew" ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setModal(null);
              setStripeOverlapAck(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold tracking-tight">
              Grant complimentary subscription
            </h3>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
              Recorded on the company for support and access. Pro is available
              for early programs; production pricing is Ultimate-focused.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Plan
                </label>
                <select
                  className="mt-1 h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={grantPlan}
                  onChange={(e) =>
                    setGrantPlan(e.target.value as "pro_comp" | "ultimate_comp")
                  }
                >
                  <option value="ultimate_comp">Ultimate</option>
                  <option value="pro_comp" className="text-muted-foreground">
                    Pro (beta / internal)
                  </option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Expires (optional calendar date)
                </label>
                <Input
                  type="date"
                  className="mt-1"
                  value={grantExpires.includes("T") ? "" : grantExpires}
                  onChange={(e) => setGrantExpires(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {([
                  ["30 days", () => addUtcDays(new Date(), 30)],
                  ["90 days", () => addUtcDays(new Date(), 90)],
                  ["1 year", () => addUtcDays(new Date(), 365)],
                ] as const).map(([label, fn]) => (
                  <Button
                    key={label}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const d = fn();
                      setGrantExpires(d.toISOString().slice(0, 10));
                    }}
                  >
                    {label}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setGrantExpires("")}
                >
                  No expiry
                </Button>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Notes (optional)
                </label>
                <Textarea
                  className="mt-1 min-h-[72px]"
                  value={grantNotes}
                  onChange={(e) => setGrantNotes(e.target.value)}
                  placeholder="e.g. Granted as part of beta program"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setModal(null);
                  setStripeOverlapAck(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void submitGrant(false)}
                disabled={busy === "grant-comp"}
              >
                {busy === "grant-comp" ? "Saving…" : grantConfirmLabel()}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {modal === "stripe-warn-grant" ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal("grant");
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold tracking-tight">
              Active paid subscription
            </h3>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
              This company has an active paid Stripe subscription. Granting a
              complimentary record will not stop recurring charges — Stripe
              remains the billing source while it is active. Continue only if
              that is intended.
            </p>
            <label className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={stripeOverlapAck}
                onChange={(e) => setStripeOverlapAck(e.target.checked)}
                className="mt-0.5"
              />
              <span>I understand they may still be charged by Stripe.</span>
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setModal("grant")}>
                Back
              </Button>
              <Button
                size="sm"
                disabled={!stripeOverlapAck || busy === "grant-comp"}
                onClick={() => void submitGrant(true)}
              >
                {busy === "grant-comp" ? "Saving…" : "Grant anyway"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {modal === "extend" ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold tracking-tight">
              Set complimentary expiry
            </h3>
            <p className="mt-2 text-muted-foreground text-sm">
              New expiry date (end of UTC day).
            </p>
            <Input
              type="date"
              className="mt-3"
              value={extendExpires}
              onChange={(e) => setExtendExpires(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {([
                ["+30 days", 30],
                ["+90 days", 90],
                ["+1 year", 365],
              ] as const).map(([label, days]) => (
                <Button
                  key={label}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const base = props.compSubscriptionExpiresAt
                      ? new Date(props.compSubscriptionExpiresAt)
                      : new Date();
                    const d = addUtcDays(base, days);
                    setExtendExpires(d.toISOString().slice(0, 10));
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void submitExtend()}
                disabled={busy === "extend-comp"}
              >
                {busy === "extend-comp" ? "Saving…" : "Save expiry"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {modal === "revoke" ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold tracking-tight">
              Revoke complimentary subscription?
            </h3>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
              This returns <strong>{props.companyName}</strong> to the Free plan
              immediately (unless they have an active Stripe subscription) and
              removes complimentary features.
            </p>
            <div className="mt-3">
              <label className="text-xs font-medium text-muted-foreground">
                Notes (optional)
              </label>
              <Textarea
                className="mt-1 min-h-[64px]"
                value={revokeNotes}
                onChange={(e) => setRevokeNotes(e.target.value)}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void submitRevoke()}
                disabled={busy === "revoke-comp"}
              >
                {busy === "revoke-comp" ? "Revoking…" : "Revoke"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
