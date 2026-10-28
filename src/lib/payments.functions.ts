import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from "@/lib/stripe.server";
import { isPlanSlug, ANNUAL_PLANS, purchasedSeats, stripeUnitAmount, planKeyForPrice, planSlugForKey, canUpgrade, type PlanSlug } from "@/lib/subscription-rules";

/** Finds the plan's annual price by lookup key, falling back to the known live price ID. */
async function resolvePlanPrice(stripe: ReturnType<typeof createStripeClient>, slug: PlanSlug) {
  const plan = ANNUAL_PLANS[slug];
  const prices = await stripe.prices.list({ lookup_keys: [plan.lookupKey], active: true, limit: 1 });
  let price = prices.data[0];
  if (!price) {
    try { price = await stripe.prices.retrieve(plan.livePriceId); } catch { /* not in this account */ }
  }
  if (
    !price || !price.active ||
    price.unit_amount !== stripeUnitAmount(slug) ||
    price.currency !== "eur" ||
    price.recurring?.interval !== "year"
  )
    throw new Error("Η τιμή συνδρομής δεν είναι διαθέσιμη.");
  return price;
}

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    const match = found.data[0];
    if (match) return match.id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (options.userId && customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}
function validate(data: { environment: StripeEnv }) {
  if (data.environment !== "sandbox" && data.environment !== "live")
    throw new Error("Invalid environment");
  return data;
}
async function billingOrg(context: {
  supabase: import("@supabase/supabase-js").SupabaseClient<
    import("@/integrations/supabase/types").Database
  >;
}) {
  const { data, error } = await context.supabase.rpc("my_org_context");
  const org = data?.[0];
  if (error || !org?.permissions.includes("billing.manage"))
    throw new Error("Δεν έχετε δικαίωμα διαχείρισης συνδρομής.");
  return org;
}

export const createCompanyCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { plan: PlanSlug; seats?: number; environment: StripeEnv; origin: string }) => {
    validate(data);
    if (!isPlanSlug(data.plan)) throw new Error("Invalid plan");
    purchasedSeats(data.plan, data.seats);
    const url = new URL(data.origin);
    if (!(
      (url.protocol === "https:" &&
        (url.hostname === "voiceorders.eu" || url.hostname === "www.voiceorders.eu" || url.hostname === "voiceorder.lovable.app" ||
          url.hostname.endsWith(".lovable.app") ||
          url.hostname.endsWith(".lovableproject.com"))) ||
      url.origin === "http://localhost:8080"
    ))
      throw new Error("Invalid return origin");
    return { ...data, origin: url.origin };
  })
  .handler(async ({ data, context }) => {
    try {
      const org = await billingOrg(context);
      const plan = ANNUAL_PLANS[data.plan];
      const seats = purchasedSeats(data.plan, data.seats);
      const quantity = data.plan === "business" ? seats : 1;
      if (org.active_users + org.pending_invites > seats)
        throw new Error("Το πλάνο δεν χωρά τα ενεργά μέλη και τις εκκρεμείς προσκλήσεις.");
      const stripe = createStripeClient(data.environment);
      const {
        data: { user },
      } = await context.supabase.auth.getUser();
      const customer = await resolveOrCreateCustomer(stripe, {
        userId: context.userId,
        ...(user?.email ? { email: user.email } : {}),
      });
      const subscriptions = await stripe.subscriptions.list({
        customer,
        status: "all",
        limit: 100,
      });
      const incomplete = subscriptions.data.find(s =>
        s.metadata["organizationId"] === org.organization_id && s.status === "incomplete",
      );
      if (incomplete) {
        const sessions = await stripe.checkout.sessions.list({ subscription: incomplete.id, limit: 100 });
        const open = sessions.data.find(s => s.status === "open" && s.client_secret);
        const samePlan = incomplete.items.data.some(item => planKeyForPrice(item.price) === plan.lookupKey && item.price.unit_amount === stripeUnitAmount(data.plan) && item.quantity === quantity);
        if (open?.client_secret && samePlan) return { clientSecret: open.client_secret };
      }
      if (
        subscriptions.data.some(
          (s) =>
            s.metadata["organizationId"] === org.organization_id &&
            ["active", "trialing", "past_due", "incomplete"].includes(s.status),
        )
      )
        throw new Error("Υπάρχει ήδη συνδρομή. Διαχειριστείτε την υπάρχουσα συνδρομή.");
      const price = await resolvePlanPrice(stripe, data.plan);
      if (
        !price ||
        price.unit_amount !== stripeUnitAmount(data.plan) ||
        price.currency !== "eur" ||
        price.recurring?.interval !== "year"
      )
        throw new Error("Η τιμή συνδρομής δεν είναι διαθέσιμη.");
      const session = await stripe.checkout.sessions.create({
        customer,
        mode: "subscription",
        ui_mode: "embedded_page",
        line_items: [{ price: price.id, quantity }],
        return_url: `${data.origin}/plans?session_id={CHECKOUT_SESSION_ID}`,
        metadata: { userId: context.userId, organizationId: org.organization_id },
        subscription_data: {
          metadata: { userId: context.userId, organizationId: org.organization_id },
        },
        managed_payments: { enabled: true },
      } as import("stripe").default.Checkout.SessionCreateParams);
      if (!session.client_secret) throw new Error("Missing checkout client secret");
      return { clientSecret: session.client_secret };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const companyBillingState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv; sessionId?: string }) => {
    validate(data);
    if (data.sessionId && !/^cs_[a-zA-Z0-9_]{1,250}$/.test(data.sessionId))
      throw new Error("Invalid session");
    return data;
  })
  .handler(async ({ data, context }) => {
    try {
      const org = await billingOrg(context);
      const { data: sub, error } = await context.supabase
        .from("organization_subscriptions")
        .select("payment_states")
        .eq("organization_id", org.organization_id)
        .single();
      if (error) throw error;
      const states = sub.payment_states as Record<
        string,
        {
          status?: string;
          paid?: boolean;
          price_id?: string;
          customer_id?: string;
          period_end?: string;
          cancel_at_period_end?: boolean;
          seats?: number;
        }
      >;
      let paymentStatus: string | null = null;
      if (data.sessionId) {
        const session = await createStripeClient(data.environment).checkout.sessions.retrieve(
          data.sessionId,
        );
        if (
          session.metadata?.["organizationId"] !== org.organization_id ||
          session.metadata?.["userId"] !== context.userId
        )
          throw new Error("Forbidden session");
        paymentStatus = session.status === "expired" ? "expired" : session.payment_status;
      }
      return { state: states[data.environment] ?? null, paymentStatus };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
export const createCompanyPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => validate(data))
  .handler(async ({ data, context }) => {
    try {
      const org = await billingOrg(context);
      const { data: sub, error } = await context.supabase
        .from("organization_subscriptions")
        .select("payment_states")
        .eq("organization_id", org.organization_id)
        .single();
      if (error) throw error;
      const states = sub.payment_states as Record<string, { customer_id?: string }>;
      const customer = states[data.environment]?.customer_id;
      if (!customer) throw new Error("Δεν βρέθηκε πληρωμένη συνδρομή.");
      const portal = await createStripeClient(data.environment).billingPortal.sessions.create({
        customer,
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Upgrades the organization's existing subscription to a higher tier. The prorated
 * difference is invoiced immediately; Stripe only applies the new price once that invoice
 * is paid (pending_if_incomplete), and access changes arrive through the signed webhook. */
export const upgradeCompanyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { plan: PlanSlug; seats?: number; environment: StripeEnv }) => {
    validate(data);
    if (!isPlanSlug(data.plan)) throw new Error("Invalid plan");
    purchasedSeats(data.plan, data.seats);
    return data;
  })
  .handler(async ({ data, context }) => {
    try {
      const org = await billingOrg(context);
      const seats = purchasedSeats(data.plan, data.seats);
      if (org.active_users + org.pending_invites > seats)
        throw new Error("Το πλάνο δεν χωρά τα ενεργά μέλη και τις εκκρεμείς προσκλήσεις.");
      const { data: row, error } = await context.supabase
        .from("organization_subscriptions")
        .select("payment_states")
        .eq("organization_id", org.organization_id)
        .single();
      if (error) throw error;
      const state = (row.payment_states as Record<string, { subscription_id?: string; paid?: boolean }>)[data.environment];
      if (!state?.subscription_id || !state.paid) throw new Error("Δεν βρέθηκε πληρωμένη συνδρομή.");
      const stripe = createStripeClient(data.environment);
      const sub = await stripe.subscriptions.retrieve(state.subscription_id);
      if (sub.metadata["organizationId"] !== org.organization_id) throw new Error("Forbidden subscription");
      if (!["active", "past_due"].includes(sub.status)) throw new Error("Η συνδρομή δεν είναι ενεργή.");
      const item = sub.items.data[0];
      const current = item ? planSlugForKey(planKeyForPrice(item.price)) : null;
      if (!item || !canUpgrade(current, data.plan)) throw new Error("Επιτρέπεται μόνο αναβάθμιση σε ανώτερο πλάνο.");
      const price = await resolvePlanPrice(stripe, data.plan);
      const updated = await stripe.subscriptions.update(sub.id, {
        items: [{ id: item.id, price: price.id, quantity: data.plan === "business" ? seats : 1 }],
        proration_behavior: "always_invoice",
        payment_behavior: "pending_if_incomplete",
        cancel_at_period_end: false,
      });
      return { pending: !!updated.pending_update };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
