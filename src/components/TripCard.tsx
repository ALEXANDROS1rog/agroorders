import { Link } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { formatTripDate, tripNumbers, type TripWithOrders } from "@/lib/api";
import { formatCurrency } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";

export function TripCard({ trip }: { trip: TripWithOrders }) {
  const { t } = useI18n();
  const n = tripNumbers(trip);
  return (
    <Link to="/trips/$id" params={{ id: trip.id }} className="glass press block rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/15">
          <Truck className="h-6 w-6 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold">{formatTripDate(trip.route_date)}</p>
          <p className="text-sm text-muted-foreground">{n.count} {t("c.orders")}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="glass-soft rounded-2xl p-2">
          <p className="text-[11px] text-muted-foreground">{t("r.revenue")}</p>
          <p className="font-semibold">{formatCurrency(n.revenue)}</p>
        </div>
        <div className="glass-soft rounded-2xl p-2">
          <p className="text-[11px] text-muted-foreground">{t("r.expenses")}</p>
          <p className="font-semibold text-destructive">{formatCurrency(n.expenses)}</p>
        </div>
        <div className="glass-soft rounded-2xl p-2">
          <p className="text-[11px] text-muted-foreground">{t("r.net")}</p>
          <p className="font-semibold text-brand">{formatCurrency(n.net)}</p>
        </div>
      </div>
    </Link>
  );
}

export function LoadingList({ items, empty }: { items: { name: string; unit: string; qty: number }[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.name} className="glass-soft flex items-center justify-between rounded-2xl px-4 py-3">
          <span className="font-semibold">{i.name}</span>
          <span className="font-display text-xl font-bold">{i.qty} <span className="text-xs font-normal text-muted-foreground">{i.unit}</span></span>
        </li>
      ))}
    </ul>
  );
}
