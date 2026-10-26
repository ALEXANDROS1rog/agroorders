import { createFileRoute } from "@tanstack/react-router";
import { createStripeClient, verifyWebhook, type StripeEnv } from "@/lib/stripe.server";
import type Stripe from "stripe";
import { verifiedPaidPeriod, type PreviousPaymentState } from "@/lib/payment-state";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = new URL(request.url).searchParams.get("env");
        if (env !== "sandbox" && env !== "live")
          return new Response("Invalid environment", { status: 400 });
        let event: Stripe.Event;
        try {
          event = await verifyWebhook(request, env);
        } catch {
          return new Response("Invalid signature", { status: 400 });
        }
        try {
          const stripe = createStripeClient(env);
          const object = event.data.object as unknown as {
            id: string;
            subscription?: string | { id: string };
            parent?: { subscription_details?: { subscription?: string | { id: string } } };
          };
          const related = object.subscription ?? object.parent?.subscription_details?.subscription;
          const id = event.type.startsWith("customer.subscription.")
            ? object.id
            : typeof related === "string"
              ? related
              : related?.id;
          if (id) await synchronizeSubscription(stripe, id, env, event.id);
          return Response.json({ received: true });
        } catch (error) {
          console.error(
            "Payment synchronization failed",
            error instanceof Error ? error.message : "Unknown error",
          );
          return new Response("Payment synchronization failed", { status: 500 });
        }
      },
    },
  },
});
async function synchronizeSubscription(
  stripe: ReturnType<typeof createStripeClient>,
  id: string,
  env: StripeEnv,
  eventId: string,
) {
  // Retrieve current provider state instead of trusting potentially out-of-order payloads.
  const sub = await stripe.subscriptions.retrieve(id, {
    expand: ["latest_invoice", "items.data.price"],
  });
  const org = sub.metadata["organizationId"];
  if (!org || !/^[0-9a-f-]{36}$/i.test(org)) throw new Error("Missing organization metadata");
  const item = sub.items.data[0];
  if (!item?.price.lookup_key) throw new Error("Unknown subscription price");
  const invoice = typeof sub.latest_invoice === "object" ? sub.latest_invoice : null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing, error: readError } = await supabaseAdmin
    .from("organization_subscriptions")
    .select("payment_states")
    .eq("organization_id", org)
    .single();
  if (readError) throw readError;
  const old = (existing.payment_states as Record<string, PreviousPaymentState>)[
    env
  ];
  // A failed renewal must not extend access past the last actually paid period.
  const paidNow = invoice?.status === "paid";
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const state = {
    subscription_id: sub.id,
    customer_id: customerId,
    price_id: item.price.lookup_key,
    status: sub.status,
    period_start: new Date(item.current_period_start * 1000).toISOString(),
    ...verifiedPaidPeriod(old, {
      subscriptionId: sub.id,
      customerId,
      invoicePaid: paidNow,
      periodEnd: new Date(item.current_period_end * 1000).toISOString(),
    }),
    cancel_at_period_end: sub.cancel_at_period_end,
  };
  const { error } = await supabaseAdmin.rpc("apply_company_payment", {
    _env: env,
    _event: eventId,
    _org: org,
    _state: state,
  });
  if (error) throw error;
}
