import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Sparkles, Truck, Clock, Euro, Package, History, Plus, LogOut } from "lucide-react";
import { AppShell, Card, Loading } from "@/components/AppShell";
import { fetchDeliveries, fetchOrders, fetchProfile, isToday, orderTotal } from "@/lib/api";
import { formatCurrency } from "@/lib/domain";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Αρχική — AgroOrders" },
      { name: "description", content: "Σύνοψη ημέρας: παραγγελίες, διανομές και αξία." },
      { property: "og:title", content: "Αρχική — AgroOrders" },
      { property: "og:description", content: "Σύνοψη ημέρας για τον παραγωγό." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const profile = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const orders = useQuery({ queryKey: ["orders"], queryFn: fetchOrders });
  const deliveries = useQuery({ queryKey: ["deliveries"], queryFn: fetchDeliveries });

  const list = orders.data ?? [];
  const today = list.filter((o) => isToday(o.order_date) && o.status !== "cancelled");
  const stats = [
    { label: "Παραγγελίες σήμερα", value: String(today.length), icon: ClipboardList, tone: "text-brand" },
    { label: "Νέες παραγγελίες", value: String(list.filter((o) => o.status === "new").length), icon: Sparkles, tone: "text-accent" },
    { label: "Διανομές σήμερα", value: String((deliveries.data ?? []).filter((d) => d.status === "delivered" && isToday(d.delivered_at)).length), icon: Truck, tone: "text-brand" },
    { label: "Εκκρεμείς διανομές", value: String((deliveries.data ?? []).filter((d) => d.status === "pending" || d.status === "in_progress").length), icon: Clock, tone: "text-warning" },
  ];
  const value = today.reduce((s, o) => s + orderTotal(o), 0);

  return (
    <AppShell
      title={profile.data?.business_name || "AgroOrders"}
      subtitle={profile.data ? `Καλώς ήρθες, ${profile.data.first_name}` : undefined}
      action={
        <button
          aria-label="Αποσύνδεση"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/auth";
          }}
          className="glass press grid h-11 w-11 place-items-center rounded-2xl"
        >
          <LogOut className="h-5 w-5" />
        </button>
      }
    >
      {orders.isLoading ? (
        <Loading />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {stats.map((s) => (
              <Card key={s.label}>
                <s.icon className={`h-7 w-7 ${s.tone}`} />
                <p className="font-display mt-3 text-3xl font-bold">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </Card>
            ))}
          </div>
          <Card>
            <Euro className="h-7 w-7 text-brand" />
            <p className="font-display mt-3 text-3xl font-bold">{formatCurrency(value)}</p>
            <p className="mt-1 text-sm text-muted-foreground">Συνολική αξία σήμερα</p>
          </Card>
          <Link to="/orders/new" className="press flex h-16 items-center justify-center gap-2 rounded-2xl bg-brand text-lg font-semibold text-brand-foreground">
            <Plus className="h-6 w-6" /> Νέα παραγγελία
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/products" className="glass press flex h-16 items-center justify-center gap-2 rounded-2xl font-semibold">
              <Package className="h-5 w-5" /> Προϊόντα
            </Link>
            <Link to="/history" className="glass press flex h-16 items-center justify-center gap-2 rounded-2xl font-semibold">
              <History className="h-5 w-5" /> Ιστορικό
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}
