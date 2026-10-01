import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "FarmOrders — Παραγγελίες & Διανομές" },
      {
        name: "description",
        content: "Οργάνωσε παραγγελίες, πελάτες, προϊόντα και διανομές από το κινητό σου.",
      },
      { property: "og:title", content: "FarmOrders" },
      {
        property: "og:description",
        content: "Οργάνωσε παραγγελίες, πελάτες, προϊόντα και διανομές από το κινητό σου.",
      },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/dashboard" : "/auth" });
  },
  component: () => null,
});
