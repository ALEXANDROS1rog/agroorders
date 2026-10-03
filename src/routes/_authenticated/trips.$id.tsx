import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AppShell, Card, EmptyState, Loading } from "@/components/AppShell";
import { GhostButton, PrimaryButton } from "@/components/Field";
import { ExpenseFields, toAmount, type Expenses } from "@/components/ExpenseFields";
import { LoadingList } from "@/components/TripCard";
import { DeliveryCard, GpsBanner, sortByDistance } from "@/components/DeliveryCard";
import { AutoDeliver } from "@/components/AutoDeliver";
import { useMyPosition } from "@/hooks/use-position";
import { deleteTrip, fetchTrip, formatTripDate, loadingList, tripNumbers, updateTripExpenses } from "@/lib/api";
import { formatCurrency } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/trips/$id")({
  head: () => ({
    meta: [
      { title: "Δρομολόγιο — FarmOrders" },
      { name: "description", content: "Λεπτομέρειες δρομολογίου: έξοδα, έσοδα, καθαρά, παραγγελίες και προϊόντα για φόρτωμα." },
      { property: "og:title", content: "Δρομολόγιο — FarmOrders" },
      { property: "og:description", content: "Λεπτομέρειες δρομολογίου." },
    ],
  }),
  component: TripPage,
});

const str = (n: number) => (Number(n) ? String(Number(n)).replace(".", ",") : "");

function TripPage() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: trip, isLoading } = useQuery({ queryKey: ["trip", id], queryFn: () => fetchTrip(id) });
  const pos = useMyPosition();
  const [editing, setEditing] = useState(false);
  const [exp, setExp] = useState<Expenses>({ fuel: "", tolls: "", wear: "", food: "" });
  useEffect(() => {
    if (trip) setExp({ fuel: str(trip.fuel), tolls: str(trip.tolls), wear: str(trip.wear), food: str(trip.food) });
  }, [trip]);

  if (isLoading) return <AppShell title={t("r.route")} back="/trips"><Loading /></AppShell>;
  if (!trip) return <AppShell title={t("r.route")} back="/trips"><EmptyState title={t("r.none")} /></AppShell>;

  const n = tripNumbers(trip);
  const open = trip.orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
  const closed = trip.orders.filter((o) => o.status === "delivered" || o.status === "cancelled");
  const sorted = sortByDistance(open, (o) => o, pos);

  async function saveExp() {
    try {
      await updateTripExpenses(id, { fuel: toAmount(exp.fuel), tolls: toAmount(exp.tolls), wear: toAmount(exp.wear), food: toAmount(exp.food) });
      toast.success(t("p.saved")); setEditing(false); qc.invalidateQueries();
    } catch (e) { toast.error(e instanceof Error ? e.message : t("c.error")); }
  }
  async function remove() {
    if (!confirm(t("r.deleteAsk"))) return;
    try { await deleteTrip(id); qc.invalidateQueries(); navigate({ to: "/trips" }); }
    catch (e) { toast.error(e instanceof Error ? e.message : t("c.error")); }
  }

  const rows = [
    ["⛽", t("r.fuel"), trip.fuel], ["🛣️", t("r.tolls"), trip.tolls], ["🔧", t("r.wear"), trip.wear], ["🍴", t("r.food"), trip.food],
  ] as const;

  return (
    <AppShell title={`🚚 ${formatTripDate(trip.route_date)}`} subtitle={`${n.count} ${t("c.orders")}`} back="/trips">
      <div className="space-y-4">
        <Card>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-xs text-muted-foreground">{t("r.revenue")}</p><p className="font-display text-xl font-bold">{formatCurrency(n.revenue)}</p></div>
            <div><p className="text-xs text-muted-foreground">{t("r.expenses")}</p><p className="font-display text-xl font-bold text-destructive">{formatCurrency(n.expenses)}</p></div>
            <div><p className="text-xs text-muted-foreground">{t("r.net")}</p><p className="font-display text-xl font-bold text-brand">{formatCurrency(n.net)}</p></div>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold">{t("r.expTitle")}</h2>
          {editing ? (
            <>
              <ExpenseFields value={exp} onChange={setExp} />
              <PrimaryButton onClick={saveExp}>{t("c.save")}</PrimaryButton>
            </>
          ) : (
            <>
              <ul className="space-y-1">
                {rows.map(([icon, label, v]) => (
                  <li key={label} className="flex justify-between text-[15px]"><span>{label}</span><span className="font-semibold">{formatCurrency(v)}</span></li>
                ))}
                <li className="flex justify-between border-t border-border pt-2 font-bold"><span>{t("r.totalExp")}</span><span className="text-destructive">{formatCurrency(n.expenses)}</span></li>
              </ul>
              <GhostButton onClick={() => setEditing(true)}>{t("r.editExp")}</GhostButton>
            </>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold">📦 {t("r.load")}</h2>
          <LoadingList items={loadingList(trip.orders)} empty={t("r.noOrders")} />
        </Card>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{t("r.ordersOf")}</h2>
            <Link to="/orders/new" search={{ route: trip.id }} aria-label={t("d.newOrder")} className="press grid h-11 w-11 place-items-center rounded-2xl bg-brand text-brand-foreground"><Plus className="h-5 w-5" /></Link>
          </div>
          {open.length ? <><GpsBanner pos={pos} /><AutoDeliver /></> : null}
          {!trip.orders.length ? <EmptyState title={t("r.noOrders")} /> : (
            <div className="space-y-3">
              {sorted.map(({ item: o, km }, i) => <DeliveryCard key={o.id} o={o} deliveryId={o.deliveries[0]?.id} index={i + 1} km={km} />)}
              {closed.map((o, i) => <DeliveryCard key={o.id} o={o} deliveryId={o.deliveries[0]?.id} index={open.length + i + 1} km={null} />)}
            </div>
          )}
        </section>

        <button onClick={remove} className="press flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-destructive">
          <Trash2 className="h-4 w-4" /> {t("r.delete")}
        </button>
      </div>
    </AppShell>
  );
}
