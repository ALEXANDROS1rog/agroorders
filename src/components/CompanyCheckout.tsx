import { useCallback, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { createCompanyCheckout } from "@/lib/payments.functions";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import type { PlanSlug } from "@/lib/subscription-rules";
export function CompanyCheckout({ plan }: { plan: PlanSlug }) {
  const create = useServerFn(createCompanyCheckout);
  const [error, setError] = useState("");
  const fetchClientSecret = useCallback(async () => {
    const result = await create({
      data: { plan, environment: getStripeEnvironment(), origin: window.location.origin },
    });
    if ("error" in result) {
      setError(result.error);
      throw new Error(result.error);
    }
    return result.clientSecret;
  }, [create, plan]);
  return (
    <section className="space-y-3">
      {error ? (
        <p role="alert" className="text-sm text-destructive" data-no-translate>
          {error}
        </p>
      ) : null}
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </section>
  );
}
