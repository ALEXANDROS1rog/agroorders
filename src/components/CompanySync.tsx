import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/org";
export function CompanySync() {
  const qc = useQueryClient();
  const { org } = useOrg();
  const orgId = org?.organization_id;
  useEffect(() => {
    if (!orgId) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void qc.invalidateQueries();
    };
    const channel = supabase.channel(`company-${orgId}`);
    for (const table of [
      "orders",
      "order_items",
      "deliveries",
      "delivery_routes",
      "customers",
      "products",
      "organization_members",
      "organization_subscriptions",
    ]) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `organization_id=eq.${orgId}` },
        refresh,
      );
    }
    channel.subscribe();
    // Polling is also required for deletes/revocations and projects without realtime publication.
    const interval = window.setInterval(refresh, 10000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      void supabase.removeChannel(channel);
    };
  }, [orgId, qc]);
  return null;
}
