export const ANNUAL_PLANS = {
  basic: { price: 350, seats: 2, rank: 1, lookupKey: "voiceorders_basic_yearly", livePriceId: "price_1UUwPhKmzqfVZ3iXD1bBfvEY" },
  pro: { price: 420, seats: 5, rank: 2, lookupKey: "voiceorders_pro_yearly", livePriceId: "price_1UUwQGKmzqfVZ3iXiJGX6D2A" },
  business: { price: 550, seats: 10, rank: 3, lookupKey: "voiceorders_business_yearly", livePriceId: "price_1UUwR7KmzqfVZ3iXyIhUhUbi" },
} as const;
export type PlanSlug = keyof typeof ANNUAL_PLANS;
export function isPlanSlug(value: unknown): value is PlanSlug {
  return typeof value === "string" && Object.hasOwn(ANNUAL_PLANS, value);
}
/** Stable plan key for a Stripe price: lookup key, or the known live price ID. */
export function planKeyForPrice(price: { id: string; lookup_key?: string | null }): string | null {
  const plan = Object.values(ANNUAL_PLANS).find(p => p.lookupKey === price.lookup_key || p.livePriceId === price.id);
  return plan?.lookupKey ?? null;
}
export function planSlugForKey(key: string | null | undefined): PlanSlug | null {
  const entry = Object.entries(ANNUAL_PLANS).find(([, p]) => p.lookupKey === key);
  return (entry?.[0] as PlanSlug | undefined) ?? null;
}
/** Only moves to a higher tier are self-service upgrades. */
export function canUpgrade(from: string | null | undefined, to: string) {
  if (!isPlanSlug(from) || !isPlanSlug(to)) return false;
  return ANNUAL_PLANS[to].rank > ANNUAL_PLANS[from].rank;
}
// Only features with implemented UI/operation checks are advertised at checkout.
export const CHECKOUT_FEATURES = new Set([
  "orders", "customers", "products", "routes", "deliveries", "voice_ai",
  "gps_delivery", "auto_arrival", "advanced_finance",
]);
export function needsPlanSelection(org: { role: string; subscription_status: string | null; features: string[] } | null) {
  return org?.role === "owner" && org.subscription_status === "unpaid" && org.features.length === 0;
}
export function canEnterAfterPayment(
  state: { paid?: boolean; status?: string; period_end?: string | null; price_id?: string } | null | undefined,
  paymentStatus: string | null | undefined,
  features: string[],
  now = Date.now(),
) {
  return paymentStatus === "paid" && !!state &&
    Object.values(ANNUAL_PLANS).some(plan => plan.lookupKey === state.price_id) &&
    subscriptionAccess(state.status ?? "", state.period_end ?? null, state.paid === true, now) &&
    features.includes("orders");
}
export function subscriptionAccess(
  status: string,
  periodEnd: string | null,
  paid: boolean,
  now = Date.now(),
) {
  if (!paid || !periodEnd || Date.parse(periodEnd) <= now) return false;
  return ["active", "past_due", "canceled"].includes(status);
}
