import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from "@/lib/stripe.server";
import { isPlanSlug, ANNUAL_PLANS, type PlanSlug } from "@/lib/subscription-rules";

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  if (options.userId) {
    const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, { metadata: { ...customer.metadata, userId: options.userId } });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({ ...(options.email && { email: options.email }), ...(options.userId && { metadata: { userId: options.userId } }) });
  return created.id;
}
function validate(data: { environment: StripeEnv }) {
  if (data.environment !== "sandbox" && data.environment !== "live") throw new Error("Invalid environment");
  return data;
}
async function billingOrg(context: { supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database> }) {
  const { data, error } = await context.supabase.rpc("my_org_context");
  const org = data?.[0];
  if (error || !org?.permissions.includes("billing.manage")) throw new Error("Δεν έχετε δικαίωμα διαχείρισης συνδρομής.");
  return org;
}

export const createCompanyCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { plan: PlanSlug; environment: StripeEnv; origin: string }) => {
    validate(data);
    if (!isPlanSlug(data.plan)) throw new Error("Invalid plan");
    const url = new URL(data.origin);
    if (!((url.protocol === "https:" && (url.hostname === "voiceorder.lovable.app" || url.hostname.endsWith(".lovable.app") || url.hostname.endsWith(".lovableproject.com"))) || url.origin === "http://localhost:8080")) throw new Error("Invalid return origin");
    return { ...data, origin: url.origin };
  })
  .handler(async ({ data, context }) => {
    try {
      const org = await billingOrg(context);
      const plan = ANNUAL_PLANS[data.plan];
      if (org.active_users + org.pending_invites > plan.seats) throw new Error("Το πλάνο δεν χωρά τα ενεργά μέλη και τις εκκρεμείς προσκλήσεις.");
      const stripe = createStripeClient(data.environment);
      const { data: { user } } = await context.supabase.auth.getUser();
      const customer = await resolveOrCreateCustomer(stripe, { userId: context.userId, email: user?.email });
      const subscriptions = await stripe.subscriptions.list({ customer, status: "all", limit: 100 });
      if (subscriptions.data.some(s => s.metadata.organizationId === org.organization_id && ["active", "trialing", "past_due", "incomplete"].includes(s.status))) throw new Error("Υπάρχει ήδη συνδρομή. Διαχειριστείτε την υπάρχουσα συνδρομή.");
      const prices = await stripe.prices.list({ lookup_keys: [plan.lookupKey], active: true, limit: 1 });
      const price = prices.data[0];
      if (!price || price.unit_amount !== plan.price * 100 || price.currency !== "eur" || price.recurring?.interval !== "year") throw new Error("Η τιμή συνδρομής δεν είναι διαθέσιμη.");
      const session = await stripe.checkout.sessions.create({
        customer, mode: "subscription", ui_mode: "embedded_page",
        line_items: [{ price: price.id, quantity: 1 }],
        return_url: `${data.origin}/plans?session_id={CHECKOUT_SESSION_ID}`,
        metadata: { userId: context.userId, organizationId: org.organization_id },
        subscription_data: { metadata: { userId: context.userId, organizationId: org.organization_id } },
        managed_payments: { enabled: true },
      } as import("stripe").default.Checkout.SessionCreateParams);
      if (!session.client_secret) throw new Error("Missing checkout client secret");
      return { clientSecret: session.client_secret };
    } catch (error) { return { error: getStripeErrorMessage(error) }; }
  });

export const companyBillingState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv; sessionId?: string }) => { validate(data); if (data.sessionId && !/^cs_[a-zA-Z0-9_]{1,250}$/.test(data.sessionId)) throw new Error("Invalid session"); return data; })
  .handler(async ({ data, context }) => {
    try {
      const org = await billingOrg(context);
      const { data: sub, error } = await context.supabase.from("organization_subscriptions").select("payment_states").eq("organization_id", org.organization_id).single();
      if (error) throw error;
      const states = sub.payment_states as Record<string, { status?: string; paid?: boolean; price_id?: string; customer_id?: string; period_end?: string; cancel_at_period_end?: boolean }>;
      let paymentStatus: string | null = null;
      if (data.sessionId) {
        const session = await createStripeClient(data.environment).checkout.sessions.retrieve(data.sessionId);
        if (session.metadata?.organizationId !== org.organization_id || session.metadata?.userId !== context.userId) throw new Error("Forbidden session");
        paymentStatus = session.status === "expired" ? "expired" : session.payment_status;
      }
      return { state: states[data.environment] ?? null, paymentStatus };
    } catch (error) { return { error: getStripeErrorMessage(error) }; }
  });
export const createCompanyPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((data: { environment: StripeEnv }) => validate(data))
  .handler(async ({ data, context }) => {
    try {
      const org = await billingOrg(context);
      const { data: sub, error } = await context.supabase.from("organization_subscriptions").select("payment_states").eq("organization_id", org.organization_id).single();
      if (error) throw error;
      const states = sub.payment_states as Record<string, { customer_id?: string }>;
      const customer = states[data.environment]?.customer_id;
      if (!customer) throw new Error("Δεν βρέθηκε πληρωμένη συνδρομή.");
      const portal = await createStripeClient(data.environment).billingPortal.sessions.create({ customer });
      return { url: portal.url };
    } catch (error) { return { error: getStripeErrorMessage(error) }; }
  });