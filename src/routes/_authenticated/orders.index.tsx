import { OrderRow, matchesOrder } from "@/components/OrderRow";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { AppShell, EmptyState, Loading } from "@/components/AppShell";
import { SearchBox, StatusChip } from "@/components/ui-bits";
import { fetchOrders, orderTotal, type OrderWithRelations } from "@/lib/api";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, formatCurrency, formatDate } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({
    meta: [
      { title: "Παραγγελίες — AgroOrders" },
      { name: "description", content: "Όλες οι παραγγελίες με αναζήτηση και φίλτρο κατάστασης." },
      { property: "og:title", content: "Παραγγελίες — AgroOrders" },
      { property: "og:description", content: "Λίστα παραγγελιών." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["orders"], queryFn: fetchOrders });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const list = (data ?? []).filter((o) => (status === "all" || o.status === status) && matchesOrder(o, q.trim().toLowerCase()));

  return (
    <AppShell
      title="Παραγγελίες"
      action={<Link to="/orders/new" aria-label="Νέα παραγγελία" className="press grid h-11 w-11 place-items-center rounded-2xl bg-brand text-brand-foreground"><Plus className="h-5 w-5" /></Link>}
    >
      <SearchBox value={q} onChange={setQ} placeholder="Πελάτης, προϊόν, αριθμός, ημερομηνία" />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {["all", ...ORDER_STATUSES].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`press h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${status === s ? "bg-brand text-brand-foreground" : "glass-soft"}`}>
            {s === "all" ? "Όλες" : ORDER_STATUS_LABEL[s as keyof typeof ORDER_STATUS_LABEL]}
          </button>
        ))}
      </div>
      {isLoading ? <Loading /> : !list.length ? <EmptyState title="Δεν βρέθηκαν παραγγελίες" /> : (
        <div className="space-y-3">{list.map((o) => <OrderRow key={o.id} o={o} />)}</div>
      )}
    </AppShell>
  );
}
