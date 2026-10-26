export const ANNUAL_PLANS = {
  basic: { price: 350, seats: 2, lookupKey: "voiceorders_basic_yearly" },
  pro: { price: 420, seats: 5, lookupKey: "voiceorders_pro_yearly" },
  business: { price: 550, seats: 10, lookupKey: "voiceorders_business_yearly" },
} as const;
export type PlanSlug = keyof typeof ANNUAL_PLANS;
export function isPlanSlug(value: unknown): value is PlanSlug {
  return typeof value === "string" && Object.hasOwn(ANNUAL_PLANS, value);
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
