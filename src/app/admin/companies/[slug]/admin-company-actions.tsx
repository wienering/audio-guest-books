"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import type {
  AdminCompanyDetailFeatureCatalogRow,
  AdminCompanyDetailFeatureRow,
} from "@/lib/admin-company-detail";
import { formatDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";

type Props = {
  companyId: string;
  companySlug: string;
  companyName: string;
  isDeleted: boolean;
  hardDeleteAfter: string | null;
  isFoundingMember: boolean;
  hasActiveSubscription: boolean;
  planCode: string | null;
  featuresGranted: AdminCompanyDetailFeatureRow[];
  featuresCatalog: AdminCompanyDetailFeatureCatalogRow[];
};

type ConfirmModalState =
  | null
  | { kind: "soft-delete" }
  | { kind: "hard-delete-now" }
  | { kind: "cancel-subscription" }
  | { kind: "reset-to-free" };

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
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
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

export function AdminCompanyActions(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [modal, setModal] = useState<ConfirmModalState>(null);
  const [typedSlug, setTypedSlug] = useState("");
  const [acked, setAcked] = useState(false);
  const [grantFeatureKey, setGrantFeatureKey] = useState<string>("");
  const [grantSource, setGrantSource] =
    useState<"admin_grant" | "founding_member">("admin_grant");

  const grantedKeys = new Set(props.featuresGranted.map((f) => f.featureKey));
  const ungrantedFeatures = props.featuresCatalog.filter(
    (f) => !grantedKeys.has(f.key)
  );

  function clearModal() {
    setModal(null);
    setTypedSlug("");
    setAcked(false);
  }

  async function runWith(name: string, fn: () => Promise<void>) {
    setBusy(name);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  async function toggleFounding() {
    await runWith("toggle-founding", async () => {
      const r = await postJson(
        `/api/admin/companies/${props.companyId}/toggle-founding-member`
      );
      if (!r.ok) {
        toast.error(r.error ?? "Could not toggle founding member.");
        return;
      }
      toast.success(
        props.isFoundingMember
          ? "Founding member flag removed."
          : "Marked as founding member."
      );
      router.refresh();
    });
  }

  async function grantFeature() {
    if (!grantFeatureKey) {
      toast.error("Pick a feature first.");
      return;
    }
    await runWith("grant-feature", async () => {
      const r = await postJson(
        `/api/admin/companies/${props.companyId}/grant-feature`,
        { featureKey: grantFeatureKey, source: grantSource }
      );
      if (!r.ok) {
        toast.error(r.error ?? "Could not grant feature.");
        return;
      }
      toast.success("Feature granted.");
      setGrantFeatureKey("");
      router.refresh();
    });
  }

  async function revokeFeature(featureKey: string) {
    await runWith(`revoke-${featureKey}`, async () => {
      const r = await postJson(
        `/api/admin/companies/${props.companyId}/revoke-feature`,
        { featureKey }
      );
      if (!r.ok) {
        toast.error(r.error ?? "Could not revoke feature.");
        return;
      }
      toast.success("Feature revoked.");
      router.refresh();
    });
  }

  async function softDelete() {
    await runWith("soft-delete", async () => {
      const r = await postJson(
        `/api/admin/companies/${props.companyId}/soft-delete`,
        { confirmSlug: typedSlug }
      );
      if (!r.ok) {
        toast.error(r.error ?? "Could not soft-delete.");
        return;
      }
      toast.success("Company soft-deleted.");
      clearModal();
      router.refresh();
    });
  }

  async function hardDeleteNow() {
    await runWith("hard-delete-now", async () => {
      const r = await postJson(
        `/api/admin/companies/${props.companyId}/hard-delete-now`,
        { confirmSlug: typedSlug, acknowledged: true }
      );
      if (!r.ok) {
        toast.error(r.error ?? "Could not hard-delete.");
        return;
      }
      toast.success("Hard-delete completed.");
      clearModal();
      router.push("/admin/companies");
    });
  }

  async function restore() {
    await runWith("restore", async () => {
      const r = await postJson(
        `/api/admin/companies/${props.companyId}/restore`
      );
      if (!r.ok) {
        toast.error(r.error ?? "Could not restore.");
        return;
      }
      toast.success("Company restored.");
      router.refresh();
    });
  }

  async function cancelSubscription() {
    await runWith("cancel-subscription", async () => {
      const r = await postJson(
        `/api/admin/companies/${props.companyId}/cancel-subscription`
      );
      if (!r.ok) {
        toast.error(r.error ?? "Could not cancel subscription.");
        return;
      }
      toast.success("Stripe subscription canceled.");
      clearModal();
      router.refresh();
    });
  }

  async function resetToFree() {
    if (!acked) return;
    await runWith("reset-to-free", async () => {
      const r = await postJson(
        `/api/admin/companies/${props.companyId}/reset-to-free`,
        { acknowledged: true }
      );
      if (!r.ok) {
        toast.error(r.error ?? "Could not reset to Free.");
        return;
      }
      toast.success("Company reset to Free plan.");
      clearModal();
      router.refresh();
    });
  }

  const slugMatches =
    typedSlug.trim().toLowerCase() === props.companySlug.toLowerCase();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Founding member</CardTitle>
          <CardDescription>
            Toggling this flag does <strong>not</strong> change Stripe pricing.
            Migrate to a different price separately if needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => void toggleFounding()}
            disabled={busy === "toggle-founding"}
            variant={props.isFoundingMember ? "outline" : "default"}
            size="sm"
          >
            {busy === "toggle-founding"
              ? "Working…"
              : props.isFoundingMember
                ? "Remove founding member status"
                : "Mark as founding member"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>
            Plan-derived features come from the company&apos;s plan. Admin
            grants and founding-member grants persist across plan changes (until
            revoked).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4 font-medium">Feature</th>
                  <th className="py-2 pr-4 font-medium">Source</th>
                  <th className="py-2 pr-4 font-medium">Granted</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {props.featuresGranted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-3 text-muted-foreground"
                    >
                      No features granted to this company.
                    </td>
                  </tr>
                ) : null}
                {props.featuresGranted.map((f) => (
                  <tr key={f.featureKey} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{f.featureName}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {f.featureKey}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                          f.source === "plan" &&
                            "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200",
                          f.source === "admin_grant" &&
                            "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200",
                          f.source === "founding_member" &&
                            "bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-200"
                        )}
                      >
                        {f.source}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {formatDateTime(f.grantedAt)}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busy === `revoke-${f.featureKey}`}
                        onClick={() => void revokeFeature(f.featureKey)}
                      >
                        {busy === `revoke-${f.featureKey}`
                          ? "Revoking…"
                          : "Revoke"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded border bg-muted/30 px-3 py-3">
            <label className="text-xs font-medium text-muted-foreground">
              Grant feature:
            </label>
            <select
              value={grantFeatureKey}
              onChange={(e) => setGrantFeatureKey(e.target.value)}
              disabled={ungrantedFeatures.length === 0}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              <option value="">
                {ungrantedFeatures.length === 0
                  ? "All features already granted"
                  : "Choose a feature…"}
              </option>
              {ungrantedFeatures.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.name} ({f.key})
                </option>
              ))}
            </select>
            <select
              value={grantSource}
              onChange={(e) =>
                setGrantSource(
                  e.target.value as "admin_grant" | "founding_member"
                )
              }
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="admin_grant">admin_grant</option>
              <option value="founding_member">founding_member</option>
            </select>
            <Button
              size="sm"
              disabled={
                !grantFeatureKey ||
                busy === "grant-feature" ||
                ungrantedFeatures.length === 0
              }
              onClick={() => void grantFeature()}
            >
              {busy === "grant-feature" ? "Granting…" : "Grant"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30 ring-1 ring-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            All actions here are recorded in the admin audit log.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!props.isDeleted ? (
            <ActionRow
              title="Soft-delete this company"
              description="Marks the workspace for deletion with a 30-day grace period. Slug stays reserved until hard-delete."
              button={
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setModal({ kind: "soft-delete" })}
                  disabled={busy !== null}
                >
                  Soft-delete
                </Button>
              }
            />
          ) : (
            <>
              <ActionRow
                title="Restore this company"
                description={
                  props.hardDeleteAfter
                    ? `Soft-deleted; scheduled hard-delete on ${props.hardDeleteAfter}. Restoring clears both fields.`
                    : "Soft-deleted; restoring clears the deleted_at flag."
                }
                button={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void restore()}
                    disabled={busy !== null}
                  >
                    {busy === "restore" ? "Restoring…" : "Restore"}
                  </Button>
                }
              />
              <ActionRow
                title="Hard-delete now (admin override)"
                description="Skips the 30-day grace period. Triggers the retention scheduler immediately. Irreversible."
                button={
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setModal({ kind: "hard-delete-now" })}
                    disabled={busy !== null}
                  >
                    Hard-delete now
                  </Button>
                }
              />
            </>
          )}

          {props.hasActiveSubscription ? (
            <ActionRow
              title="Cancel Stripe subscription (immediate)"
              description="Calls Stripe to cancel right away (not at period end). Webhook will sync local state."
              button={
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setModal({ kind: "cancel-subscription" })}
                  disabled={busy !== null}
                >
                  Cancel subscription
                </Button>
              }
            />
          ) : null}

          {props.planCode !== "free" ? (
            <ActionRow
              title="Reset to Free plan"
              description="Clears Stripe identifiers (customer + subscription), removes plan-source features, sets plan to Free, regrants Free features. Does NOT contact Stripe — pair with cancel subscription if there's an active one."
              button={
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setModal({ kind: "reset-to-free" })}
                  disabled={busy !== null}
                >
                  Reset to Free
                </Button>
              }
            />
          ) : null}
        </CardContent>
      </Card>

      {modal?.kind === "soft-delete" ? (
        <ConfirmModal
          title="Soft-delete company"
          description={`This marks "${props.companyName}" for deletion with a 30-day grace period. Type the slug below to confirm.`}
          onClose={() => clearModal()}
          actionLabel={busy === "soft-delete" ? "Deleting…" : "Soft-delete"}
          actionDisabled={!slugMatches || busy !== null}
          onAction={softDelete}
        >
          <SlugInput
            slug={props.companySlug}
            value={typedSlug}
            onChange={setTypedSlug}
          />
        </ConfirmModal>
      ) : null}

      {modal?.kind === "hard-delete-now" ? (
        <ConfirmModal
          title="Hard-delete this company NOW"
          description={`This permanently destroys all data for "${props.companyName}" — events, audio files, R2 objects, billing rows. There is no undo.`}
          variant="destructive"
          onClose={() => clearModal()}
          actionLabel={
            busy === "hard-delete-now" ? "Working…" : "Hard-delete now"
          }
          actionDisabled={!slugMatches || !acked || busy !== null}
          onAction={hardDeleteNow}
        >
          <SlugInput
            slug={props.companySlug}
            value={typedSlug}
            onChange={setTypedSlug}
          />
          <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={acked}
              onChange={(e) => setAcked(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I understand this is irreversible and will run the retention
              scheduler immediately.
            </span>
          </label>
        </ConfirmModal>
      ) : null}

      {modal?.kind === "cancel-subscription" ? (
        <ConfirmModal
          title="Cancel Stripe subscription"
          description="Stripe will cancel this subscription immediately (no proration, no period grace). The Stripe webhook will fully sync the company state shortly afterwards."
          variant="destructive"
          onClose={() => clearModal()}
          actionLabel={
            busy === "cancel-subscription"
              ? "Canceling…"
              : "Cancel subscription"
          }
          actionDisabled={busy !== null}
          onAction={cancelSubscription}
        />
      ) : null}

      {modal?.kind === "reset-to-free" ? (
        <ConfirmModal
          title="Reset to Free plan"
          description={`Clears Stripe customer + subscription IDs, sets plan_id to Free, removes plan-source features, regrants Free features. This does NOT cancel an active Stripe subscription — handle that separately if needed.`}
          variant="destructive"
          onClose={() => clearModal()}
          actionLabel={busy === "reset-to-free" ? "Working…" : "Reset to Free"}
          actionDisabled={!acked || busy !== null}
          onAction={resetToFree}
        >
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={acked}
              onChange={(e) => setAcked(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I understand this clears Stripe identifiers locally and may
              decouple the company from any live Stripe subscription.
            </span>
          </label>
        </ConfirmModal>
      ) : null}
    </div>
  );
}

function SlugInput({
  slug,
  value,
  onChange,
}: {
  slug: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <>
      <p className="text-sm">
        Type the slug{" "}
        <strong className="font-mono">{slug}</strong> to confirm:
      </p>
      <Input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={slug}
        className="font-mono"
      />
    </>
  );
}

function ActionRow(props: {
  title: string;
  description: string;
  button: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{props.title}</p>
        <p className="text-xs text-muted-foreground">{props.description}</p>
      </div>
      <div className="shrink-0">{props.button}</div>
    </div>
  );
}

function ConfirmModal(props: {
  title: string;
  description: string;
  onClose: () => void;
  onAction: () => void;
  actionLabel: string;
  actionDisabled?: boolean;
  variant?: "default" | "destructive";
  children?: React.ReactNode;
}) {
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold tracking-tight">{props.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {props.description}
        </p>
        {props.children ? (
          <div className="mt-4 space-y-2">{props.children}</div>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={props.onClose}>
            Cancel
          </Button>
          <Button
            variant={props.variant === "destructive" ? "destructive" : "default"}
            size="sm"
            onClick={props.onAction}
            disabled={props.actionDisabled}
          >
            {props.actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
