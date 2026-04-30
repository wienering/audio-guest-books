import "server-only";

export function subscriptionPlanCodeFromStripePriceId(
  priceId: string
): "ultimate" | "ultimate_founding" {
  const founding = process.env.STRIPE_PRICE_ID_ULTIMATE_FOUNDING?.trim();
  const ultimate = process.env.STRIPE_PRICE_ID_ULTIMATE?.trim();
  if (founding && priceId === founding) {
    return "ultimate_founding";
  }
  if (ultimate && priceId === ultimate) {
    return "ultimate";
  }
  return "ultimate";
}
