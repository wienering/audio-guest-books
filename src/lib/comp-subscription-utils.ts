export const COMP_SUBSCRIPTION_PLAN_CODES = ["pro_comp", "ultimate_comp"] as const;

export type CompSubscriptionPlanCode =
  (typeof COMP_SUBSCRIPTION_PLAN_CODES)[number];

export function parseCompSubscriptionPlanCode(
  raw: string | null | undefined
): CompSubscriptionPlanCode | null {
  if (raw === "pro_comp" || raw === "ultimate_comp") {
    return raw;
  }
  return null;
}

export function mapCompSubscriptionToPlanRowCode(
  comp: CompSubscriptionPlanCode
): "pro" | "ultimate" {
  return comp === "pro_comp" ? "pro" : "ultimate";
}

export function isStripePaidSubscriptionActive<
  Row extends {
    stripeSubscriptionId: string | null;
    subscriptionStatus: string | null;
  },
>(company: Row): boolean {
  if (!company.stripeSubscriptionId?.trim()) {
    return false;
  }
  const s = company.subscriptionStatus ?? "";
  return (
    s === "active" ||
    s === "trialing" ||
    s === "past_due" ||
    s === "unpaid"
  );
}

export function isComplimentarySubscriptionActiveNow<
  Row extends {
    compSubscriptionPlanCode: string | null;
    compSubscriptionExpiresAt: Date | null;
  },
>(company: Row, now = new Date()): boolean {
  if (!company.compSubscriptionPlanCode?.trim()) {
    return false;
  }
  const exp = company.compSubscriptionExpiresAt;
  if (exp == null) {
    return true;
  }
  return exp.getTime() > now.getTime();
}

export function deriveEffectiveSubscriptionPlanCode<
  Row extends {
    stripeSubscriptionId: string | null;
    subscriptionStatus: string | null;
    subscriptionPlanCode: string | null;
    compSubscriptionPlanCode: string | null;
    compSubscriptionExpiresAt: Date | null;
  },
>(company: Row): string | null {
  if (isStripePaidSubscriptionActive(company)) {
    return company.subscriptionPlanCode ?? null;
  }
  if (isComplimentarySubscriptionActiveNow(company)) {
    return company.compSubscriptionPlanCode ?? null;
  }
  return null;
}

export function isComplimentarySubscriptionDisplayCode(
  code: string | null | undefined
): boolean {
  return code === "pro_comp" || code === "ultimate_comp";
}
