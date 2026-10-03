import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, Card, EmptyState, Loading } from "@/components/AppShell";
import { Field, Select } from "@/components/Field";
import { fetchOrders, orderTotal } from "@/lib/api";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, formatCurrency } from "@/lib/domain";
import { OrderRow } from "@/components/OrderRow";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Ιστορικό — VoiceOrders" },
      { name: "description", content: "Ιστορικό παραγγελιών με φίλτρα και σύνολα πωλήσεων." },
      { property: "og:title", content: "Ιστορικό — VoiceOrders" },
      { property: "og:description", content: "Ιστορικό παραγγελιών." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data, isLoading } = useQuery({ queryKey: ["orders"], queryFn: fetchOrders });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customer, setCustomer] = useState("");
  const [status, setStatus] = useState("");
  const [product, setProduct] = useState("");
  const all = data ?? [];
  const customers = [...new Map(all.filter((o) => o.customer).map((o) => [o.customer!.id, o.customer!.full_name])).entries()];
  const products = [...new Set(all.flatMap((o) => o.order_items.map((i) => i.product_name)))];

  const list = all.filter((o) => {
    const d = o.order_date.slice(0, 10);
    return (!from || d >= from) && (!to || d <= to) && (!customer || o.customer_id === customer) && (!status || o.status === status) && (!product || o.order_items.some((i) => i.product_name === product));
  });
  const sales = list.filter((o) => o.status !== "cancelled").reduce((s, o) => s + orderTotal(o), 0);

  return (
    <AppShell title="Ιστορικό παραγγελιών" back="/dashboard">
      <Card className="mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Από" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Field label="Έως" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Select label="Πελάτης" value={customer} onChange={(e) => setCustomer(e.target.value)}>
          <option value="">Όλοι</option>
          {customers.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </Select>
        <Select label="Κατάσταση" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Όλες</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
        </Select>
        <Select label="Προϊόν" value={product} onChange={(e) => setProduct(e.target.value)}>
          <option value="">Όλα</option>
          {products.map((p) => <option key={p}>{p}</option>)}
        </Select>
      </Card>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card><p className="font-display text-2xl font-bold">{list.length}</p><p className="text-sm text-muted-foreground">Σύνολο παραγγελιών</p></Card>
        <Card><p className="font-display text-2xl font-bold">{formatCurrency(sales)}</p><p className="text-sm text-muted-foreground">Συνολικές πωλήσεις</p></Card>
        <Card><p className="font-display text-2xl font-bold">{list.filter((o) => o.status === "delivered").length}</p><p className="text-sm text-muted-foreground">Παραδομένες</p></Card>
        <Card><p className="font-display text-2xl font-bold">{list.filter((o) => o.status === "cancelled").length}</p><p className="text-sm text-muted-foreground">Ακυρωμένες</p></Card>
      </div>
      {isLoading ? <Loading /> : !list.length ? <EmptyState title="Καμία παραγγελία" /> : <div className="space-y-3">{list.map((o) => <OrderRow key={o.id} o={o} />)}</div>}
    </AppShell>
  );
}
