import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Play } from "lucide-react";
import { Card } from "@/components/AppShell";
import { GhostButton, PrimaryButton } from "@/components/Field";
import { CallNavButtons, StatusChip } from "@/components/ui-bits";
import { enableAutoDeliver } from "@/components/AutoDeliver";
import { markDelivered, orderTotal, startDelivery, type OrderWithRelations } from "@/lib/api";
import { distanceKm, formatCurrency } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import type { PositionState } from "@/hooks/use-position";

export function orderCoords(o: OrderWithRelations) {
  const c = o.customer;
  return c?.latitude != null && c?.longitude != null ? { lat: c.latitude, lng: c.longitude } : null;
}

/** Sorts by distance from the current GPS position; orders without coordinates go last. */
export function sortByDistance<T>(list: T[], getOrder: (x: T) => OrderWithRelations, pos: PositionState) {
  if (pos.status !== "ok") return list.map((x) => ({ item: x, km: null as number | null }));
  return list
    .map((x) => { const c = orderCoords(getOrder(x)); return { item: x, km: c ? distanceKm(pos, c) : null }; })
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
}

export function GpsBanner({ pos }: { pos: PositionState }) {
  const { t } = useI18n();
  if (pos.status === "ok") return <p className="mb-3 rounded-2xl bg-brand/15 px-4 py-3 text-sm font-semibold text-brand">📍 {t("del.gpsOk")}</p>;
  if (pos.status === "denied") return <p className="mb-3 rounded-2xl bg-warning/15 px-4 py-3 text-sm font-semibold text-warning">{t("del.gpsDenied")}</p>;
  return <p className="glass-soft mb-3 rounded-2xl px-4 py-3 text-sm text-muted-foreground">{t("del.gpsWait")}</p>;
}

export function DeliveryCard({ o, deliveryId, index, km }: { o: OrderWithRelations; deliveryId: string | undefined; index: number; km: number | null }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const done = o.status === "delivered" || o.status === "cancelled";

  async function deliver() {
    if (!deliveryId) return;
    try { await markDelivered(deliveryId, o.id); toast.success(t("del.delivered")); qc.invalidateQueries(); }
    catch (e) { toast.error(e instanceof Error ? e.message : t("c.error")); }
  }
  async function start() {
    try { await startDelivery(o.id); enableAutoDeliver(); toast.success(t("del.started")); qc.invalidateQueries(); }
    catch (e) { toast.error(e instanceof Error ? e.message : t("c.error")); }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <Link to="/orders/$id" params={{ id: o.id }} className="min-w-0">
          <p className="text-lg font-semibold">{index}. {o.customer?.full_name ?? "—"}{km != null ? <span className="ml-2 text-sm font-bold text-accent">{km.toFixed(1)} km</span> : null}</p>
          <p className="text-sm">{o.phone}</p>
          <p className="text-sm text-muted-foreground">{o.address}{orderCoords(o) ? "" : ` (${t("del.noLoc")})`}</p>
        </Link>
        <StatusChip status={o.status} />
      </div>
      <p className="mt-2 text-sm">{o.order_items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}</p>
      <p className="font-display mt-1 text-xl font-bold">{formatCurrency(orderTotal(o))}</p>
      {!done ? (
        <>
          <div className="mt-3 flex gap-2"><CallNavButtons phone={o.phone} address={o.address} latitude={o.customer?.latitude} longitude={o.customer?.longitude} /></div>
          {o.status !== "delivering" ? (
            <GhostButton className="mt-2" onClick={start}><span className="inline-flex items-center gap-2"><Play className="h-5 w-5" /> {t("del.start")}</span></GhostButton>
          ) : null}
          {deliveryId ? <PrimaryButton className="mt-2" onClick={deliver}><span className="inline-flex items-center gap-2"><Check className="h-5 w-5" /> {t("del.delivered")}</span></PrimaryButton> : null}
        </>
      ) : null}
    </Card>
  );
}
