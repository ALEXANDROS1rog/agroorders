import { createFileRoute, Link } from "@tanstack/react-router";
import { AutoDeliver } from "@/components/AutoDeliver";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { AppShell, Card, EmptyState, Loading } from "@/components/AppShell";
import { PrimaryButton } from "@/components/Field";
import { CallNavButtons, StatusChip } from "@/components/ui-bits";
import { fetchDeliveries, markDelivered, orderTotal, type DeliveryWithOrder } from "@/lib/api";
import { distanceKm, formatCurrency } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/deliveries")({
  head: () => ({
    meta: [
      { title: "Διανομές — AgroOrders" },
      { name: "description", content: "Εκκρεμείς διανομές, η πιο κοντινή πρώτη." },
      { property: "og:title", content: "Διανομές — AgroOrders" },
      { property: "og:description", content: "Διανομές και διαδρομή." },
    ],
  }),
  component: DeliveriesPage,
});

const coords = (d: DeliveryWithOrder) => {
  const c = d.order.customer;
  return c?.latitude != null && c?.longitude != null ? { lat: c.latitude, lng: c.longitude } : null;
};

function DeliveriesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["deliveries"], queryFn: fetchDeliveries });
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition((p) => setMyPos({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { enableHighAccuracy: true, maximumAge: 15000 });
    return () => navigator.geolocation.clearWatch(id);
  }, []);
  const dist = (d: DeliveryWithOrder) => { const c = coords(d); return c && myPos ? distanceKm(myPos, c) : Infinity; };
  const pending = (data ?? [])
    .filter((d) => (d.status === "pending" || d.status === "in_progress") && d.order.status !== "cancelled")
    .sort((a, b) => dist(a) - dist(b));

  async function deliver(d: DeliveryWithOrder) {
    try { await markDelivered(d.id, d.order.id); toast.success("Παραδόθηκε!"); qc.invalidateQueries(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Σφάλμα"); }
  }

  return (
    <AppShell title="Διανομές" subtitle={`${pending.length} εκκρεμείς`}>
      <AutoDeliver />
      {isLoading ? <Loading /> : !pending.length ? <EmptyState title="Δεν υπάρχουν εκκρεμείς διανομές" /> : (
        <div className="space-y-3">
          {pending.map((d) => {
            const o = d.order;
            return (
              <Card key={d.id}>
                <div className="flex items-start justify-between gap-2">
                  <Link to="/orders/$id" params={{ id: o.id }} className="min-w-0">
                    <p className="text-lg font-semibold">{o.customer?.full_name ?? "Πελάτης"}</p>
                    <p className="text-sm">{o.phone}</p>
                    <p className="text-sm text-muted-foreground">{o.address}</p>
                  </Link>
                  <StatusChip status={o.status} />
                </div>
                <p className="mt-2 text-sm">{o.order_items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}</p>
                <p className="font-display mt-1 text-xl font-bold">{formatCurrency(orderTotal(o))}{Number.isFinite(dist(d)) ? <span className="ml-2 text-sm font-normal text-muted-foreground">{dist(d).toFixed(1)} χλμ</span> : null}</p>
                {(
                  <>
                    <div className="mt-3 flex gap-2"><CallNavButtons phone={o.phone} address={o.address} latitude={o.customer?.latitude} longitude={o.customer?.longitude} /></div>
                    <PrimaryButton className="mt-2" onClick={() => deliver(d)}><span className="inline-flex items-center gap-2"><Check className="h-5 w-5" /> Παραδόθηκε</span></PrimaryButton>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
