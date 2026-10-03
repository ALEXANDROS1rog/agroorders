import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AutoDeliver } from "@/components/AutoDeliver";
import { AppShell, EmptyState, Loading } from "@/components/AppShell";
import { DeliveryCard, GpsBanner, sortByDistance } from "@/components/DeliveryCard";
import { useMyPosition } from "@/hooks/use-position";
import { fetchDeliveries } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/deliveries")({
  head: () => ({
    meta: [
      { title: "Διανομές — VoiceOrders" },
      { name: "description", content: "Εκκρεμείς διανομές ταξινομημένες με βάση την απόσταση από τη θέση σου." },
      { property: "og:title", content: "Διανομές — VoiceOrders" },
      { property: "og:description", content: "Εκκρεμείς διανομές με GPS ταξινόμηση." },
    ],
  }),
  component: DeliveriesPage,
});

function DeliveriesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["deliveries"], queryFn: fetchDeliveries });
  const pos = useMyPosition();
  const pending = (data ?? []).filter(
    (d) => (d.status === "pending" || d.status === "in_progress") && d.order.status !== "cancelled",
  );
  const sorted = sortByDistance(pending, (d) => d.order, pos);

  return (
    <AppShell title="Διανομές" subtitle={`${pending.length} εκκρεμείς`}>
      <AutoDeliver />
      <GpsBanner pos={pos} />
      {isLoading ? <Loading /> : !pending.length ? <EmptyState title="Δεν υπάρχουν εκκρεμείς διανομές" /> : (
        <div className="space-y-3">
          {sorted.map(({ item, km }, i) => (
            <DeliveryCard key={item.id} o={item.order} deliveryId={item.id} index={i + 1} km={km} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
