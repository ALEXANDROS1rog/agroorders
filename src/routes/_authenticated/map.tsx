import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, Card, EmptyState } from "@/components/AppShell";
import { MapPanel, type MapMarker } from "@/components/MapPanel";
import { CallNavButtons, StatusChip } from "@/components/ui-bits";
import { fetchCustomers, fetchOrders, orderTotal } from "@/lib/api";
import { formatCurrency, initialsOf } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({
    meta: [
      { title: "Χάρτης — FarmOrders" },
      { name: "description", content: "Πελάτες και εκκρεμείς διανομές στον χάρτη." },
      { property: "og:title", content: "Χάρτης — FarmOrders" },
      { property: "og:description", content: "Χάρτης πελατών και διανομών." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const orders = useQuery({ queryKey: ["orders"], queryFn: fetchOrders });
  const [selected, setSelected] = useState<string | null>(null);

  const located = (customers.data ?? []).filter((c) => c.latitude != null && c.longitude != null);
  const openOrder = (cid: string) => (orders.data ?? []).find((o) => o.customer_id === cid && !["delivered", "cancelled"].includes(o.status));
  const markers: MapMarker[] = located.map((c) => ({ id: c.id, lat: c.latitude!, lng: c.longitude!, label: initialsOf(c.full_name), tone: openOrder(c.id) ? "warning" : "brand" }));
  const c = located.find((x) => x.id === selected);
  const o = c ? openOrder(c.id) : undefined;

  return (
    <AppShell title="Χάρτης" subtitle="Πορτοκαλί: εκκρεμής διανομή">
      <MapPanel className="h-[55vh]" markers={markers} selectedId={selected} onSelect={setSelected} />
      {!located.length ? <div className="mt-3"><EmptyState title="Κανένας πελάτης με τοποθεσία" hint="Πρόσθεσε τοποθεσία στον πελάτη." /></div> : null}
      {c ? (
        <Card className="mt-3 space-y-2">
          <p className="text-lg font-semibold">{c.full_name}</p>
          <p className="text-sm">{c.phone}</p>
          <p className="text-sm text-muted-foreground">{c.address}</p>
          {o ? (
            <div className="flex items-center justify-between">
              <span className="text-sm">#{o.order_number} · {formatCurrency(orderTotal(o))}</span>
              <StatusChip status={o.status} />
            </div>
          ) : <p className="text-sm text-muted-foreground">Χωρίς ανοιχτή παραγγελία</p>}
          <div className="flex gap-2">
            <CallNavButtons phone={c.phone} address={c.address} latitude={c.latitude} longitude={c.longitude} />
          </div>
          {o ? (
            <Link to="/orders/$id" params={{ id: o.id }} className="press flex h-12 items-center justify-center rounded-2xl bg-brand font-semibold text-brand-foreground">Παραγγελία</Link>
          ) : (
            <Link to="/orders/new" search={{ customer: c.id }} className="press flex h-12 items-center justify-center rounded-2xl bg-brand font-semibold text-brand-foreground">Παραγγελία</Link>
          )}
        </Card>
      ) : null}
    </AppShell>
  );
}
