export const ANNUAL_PLANS = {
  basic: { price: 350, seats: 2, lookupKey: "voiceorders_basic_yearly" },
  pro: { price: 420, seats: 5, lookupKey: "voiceorders_pro_yearly" },
  business: { price: 550, seats: 10, lookupKey: "voiceorders_business_yearly" },
} as const;
export type PlanSlug = keyof typeof ANNUAL_PLANS;
export function isPlanSlug(value: unknown): value is PlanSlug {
  return typeof value === "string" && value in ANNUAL_PLANS;
}
export function subscriptionAccess(status: string, periodEnd: string | null, paid: boolean, now = Date.now()) {
  if (!paid || !periodEnd || Date.parse(periodEnd) <= now) return false;
  return ["active", "past_due", "canceled"].includes(status);
}