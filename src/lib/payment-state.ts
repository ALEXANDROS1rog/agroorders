/** Payment history belongs to a particular provider subscription and customer. */
export type PreviousPaymentState = {
  subscription_id?: string;
  customer_id?: string;
  paid?: boolean;
  period_end?: string | null;
};

export function verifiedPaidPeriod(
  previous: PreviousPaymentState | undefined,
  current: { subscriptionId: string; customerId: string; invoicePaid: boolean; periodEnd: string },
) {
  if (current.invoicePaid) return { paid: true, period_end: current.periodEnd };
  const sameSubscription = previous?.subscription_id === current.subscriptionId &&
    previous.customer_id === current.customerId;
  return {
    paid: sameSubscription && previous?.paid === true,
    period_end: sameSubscription ? previous?.period_end ?? null : null,
  };
}