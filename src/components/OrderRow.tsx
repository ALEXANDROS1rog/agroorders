import { Link } from "@tanstack/react-router";
import { StatusChip } from "@/components/ui-bits";
import { orderTotal, type OrderWithRelations } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/domain";

export function matchesOrder(o: OrderWithRelations, term: string) {
  if (!term) return true;
  const hay = [String(o.order_number), o.customer?.full_name, o.phone, o.address, formatDate(o.order_date), ...o.order_items.map((i) => i.product_name)]
    .join(" ")
    .toLowerCase();
  return hay.includes(term);
}

export function OrderRow({ o }: { o: OrderWithRelations }) {
  return (
    <Link to="/orders/$id" params={{ id: o.id }} className="glass press block rounded-3xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold">#{o.order_number} · {o.customer?.full_name ?? "Χωρίς πελάτη"}</p>
          <p className="truncate text-sm text-muted-foreground">{o.order_items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ") || "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(o.order_date)}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-bold">{formatCurrency(orderTotal(o))}</p>
          <StatusChip status={o.status} />
        </div>
      </div>
    </Link>
  );
}

