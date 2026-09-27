import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { AppShell, Card, EmptyState, Loading } from "@/components/AppShell";
import { MapPanel } from "@/components/MapPanel";
import { GhostButton, PrimaryButton } from "@/components/Field";
import { CallNavButtons, StatusChip } from "@/components/ui-bits";
import { fetchDeliveries, markDelivered, orderTotal, saveRoutePositions, type DeliveryWithOrder } from "@/lib/api";
import { distanceKm, formatCurrency } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/deliveries")({
  head: () => ({
    meta: [
      { title: "Διανομές — AgroOrders" },
      { name: "description", content: "Εκκρεμείς διανομές και σχεδιασμός διαδρομής." },
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

/** Simple nearest-neighbour ordering by straight-line distance. A real routing API
 * (e.g. Google Routes / OpenRouteService) can replace this later for road distance & traffic. */
function nearestFirst(list: DeliveryWithOrder[], start: { lat: number; lng: number } | null) {
  const withC = list.filter(coords);
  const without = list.filter((d) => !coords(d));
  const out: DeliveryWithOrder[] = [];
  let cur = start ?? (withC[0] ? coords(withC[0]) : null);
  const rest = [...withC];
  while (rest.length && cur) {
    let bi = 0;
    rest.forEach((d, i) => { if (distanceKm(cur!, coords(d)!) < distanceKm(cur!, coords(rest[bi]!)!)) bi = i; });
    const [n] = rest.splice(bi, 1);
    out.push(n!);
    cur = coords(n!);
  }
  return [...out, ...without];
}

function DeliveriesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["deliveries"], queryFn: fetchDeliveries });
  const [planning, setPlanning] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const pending = (data ?? [])
    .filter((d) => (d.status === "pending" || d.status === "in_progress") && d.order.status !== "cancelled")
    .sort((a, b) => (a.route_position ?? 999) - (b.route_position ?? 999));
  const route = picked.map((id) => pending.find((d) => d.id === id)).filter(Boolean) as DeliveryWithOrder[];

  async function deliver(d: DeliveryWithOrder) {
    try { await markDelivered(d.id, d.order.id); toast.success("Παραδόθηκε!"); qc.invalidateQueries(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Σφάλμα"); }
  }

  function order() {
    const run = (start: { lat: number; lng: number } | null) => setPicked(nearestFirst(route, start).map((d) => d.id));
    navigator.geolocation?.getCurrentPosition((p) => run({ lat: p.coords.latitude, lng: p.coords.longitude }), () => run(null), { timeout: 5000 });
  }

  async function save() {
    try { await saveRoutePositions(route.map((d, i) => ({ id: d.id, position: i + 1 }))); toast.success("Η σειρά αποθηκεύτηκε."); qc.invalidateQueries(); setPlanning(false); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Σφάλμα"); }
  }

  const stops = route.map((d) => { const c = coords(d); return c ? `${c.lat},${c.lng}` : d.order.address; }).filter(Boolean);
  const gmaps = stops.length
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stops[stops.length - 1]!)}${stops.length > 1 ? `&waypoints=${encodeURIComponent(stops.slice(0, -1).join("|"))}` : ""}`
    : "";

  return (
    <AppShell title="Διανομές" subtitle={`${pending.length} εκκρεμείς`}>
      {pending.length > 1 ? (
        <GhostButton className="mb-4" onClick={() => { setPlanning(!planning); setPicked([]); }}>{planning ? "Κλείσιμο σχεδιασμού" : "Σχεδιασμός διαδρομής"}</GhostButton>
      ) : null}

      {planning ? (
        <Card className="mb-4 space-y-3">
          <p className="text-sm text-muted-foreground">Επίλεξε διανομές με τη σειρά που θέλεις. Η «Ταξινόμηση» βάζει πρώτα την κοντινότερη (ευθεία απόσταση, χωρίς κίνηση).</p>
          <MapPanel className="h-[260px]" markers={route.filter(coords).map((d) => ({ id: d.id, ...coords(d)!, label: String(route.indexOf(d) + 1), tone: "accent" as const }))} route={route.map(coords).filter(Boolean).map((c) => [c!.lat, c!.lng] as [number, number])} />
          <ol className="space-y-1 text-[15px]">{route.map((d, i) => <li key={d.id}>{i + 1}. {d.order.customer?.full_name} — {d.order.address || "χωρίς διεύθυνση"}{coords(d) ? "" : " (χωρίς τοποθεσία)"}</li>)}</ol>
          <div className="grid grid-cols-2 gap-2">
            <GhostButton disabled={route.length < 2} onClick={order}>Ταξινόμηση</GhostButton>
            <PrimaryButton disabled={!route.length} onClick={save}>Αποθήκευση σειράς</PrimaryButton>
          </div>
          {gmaps ? <a href={gmaps} target="_blank" rel="noreferrer" className="glass press flex h-12 items-center justify-center rounded-2xl font-semibold">Άνοιγμα διαδρομής στο Google Maps</a> : null}
        </Card>
      ) : null}

      {isLoading ? <Loading /> : !pending.length ? <EmptyState title="Δεν υπάρχουν εκκρεμείς διανομές" /> : (
        <div className="space-y-3">
          {pending.map((d) => {
            const o = d.order;
            const sel = picked.includes(d.id);
            return (
              <Card key={d.id} className={sel ? "ring-2 ring-accent" : ""}>
                <div className="flex items-start justify-between gap-2">
                  <Link to="/orders/$id" params={{ id: o.id }} className="min-w-0">
                    <p className="text-lg font-semibold">{d.route_position ? `${d.route_position}. ` : ""}{o.customer?.full_name ?? "Πελάτης"}</p>
                    <p className="text-sm">{o.phone}</p>
                    <p className="text-sm text-muted-foreground">{o.address}</p>
                  </Link>
                  <StatusChip status={o.status} />
                </div>
                <p className="mt-2 text-sm">{o.order_items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}</p>
                <p className="font-display mt-1 text-xl font-bold">{formatCurrency(orderTotal(o))}</p>
                {planning ? (
                  <GhostButton className="mt-3" onClick={() => setPicked(sel ? picked.filter((x) => x !== d.id) : [...picked, d.id])}>{sel ? `Στάση ${picked.indexOf(d.id) + 1} — αφαίρεση` : "Προσθήκη στη διαδρομή"}</GhostButton>
                ) : (
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
