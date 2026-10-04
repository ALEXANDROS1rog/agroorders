import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AppShell, Card, EmptyState, Loading } from "@/components/AppShell";
import { Field, GhostButton, PrimaryButton, Select, TextArea } from "@/components/Field";
import { fetchOrder, fetchProducts, updateOrder, type NewOrderItem } from "@/lib/api";
import { formatCurrency } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/orders/$id/edit")({
  head: () => ({
    meta: [
      { title: "Επεξεργασία παραγγελίας — VoiceOrders" },
      { name: "description", content: "Αλλαγή στοιχείων και προϊόντων παραγγελίας." },
      { property: "og:title", content: "Επεξεργασία παραγγελίας — VoiceOrders" },
      { property: "og:description", content: "Αλλαγή στοιχείων και προϊόντων παραγγελίας." },
    ],
  }),
  component: EditOrderPage,
});

function EditOrderPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: o, isLoading } = useQuery({ queryKey: ["order", id], queryFn: () => fetchOrder(id) });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<NewOrderItem[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!o || ready) return;
    setPhone(o.phone);
    setAddress(o.address);
    setNotes(o.notes);
    setItems(o.order_items.map((i) => ({ product_id: i.product_id, product_name: i.product_name, unit: i.unit, unit_price: Number(i.unit_price), quantity: Number(i.quantity) })));
    setReady(true);
  }, [o, ready]);

  const patch = (idx: number, p: Partial<NewOrderItem>) => setItems((list) => list.map((it, i) => (i === idx ? { ...it, ...p } : it)));
  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  async function save() {
    const clean = items.filter((i) => i.product_name.trim() && i.quantity > 0);
    if (!clean.length) { toast.error("Πρόσθεσε τουλάχιστον ένα προϊόν."); return; }
    setSaving(true);
    try {
      await updateOrder(id, { phone, address, notes, items: clean });
      await qc.invalidateQueries();
      toast.success("Η παραγγελία αποθηκεύτηκε.");
      navigate({ to: "/orders/$id", params: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Σφάλμα");
    } finally { setSaving(false); }
  }

  return (
    <AppShell title={o ? `Επεξεργασία #${o.order_number}` : "Επεξεργασία"} back="/orders">
      {isLoading ? <Loading /> : !o ? <EmptyState title="Η παραγγελία δεν βρέθηκε" /> : (
        <div className="space-y-3">
          <Field label="Τηλέφωνο" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Field label="Διεύθυνση" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Card className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="space-y-2 border-b border-border/40 pb-3 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{it.product_name} <span className="text-sm text-muted-foreground">({it.unit})</span></p>
                  <button type="button" aria-label="Αφαίρεση" onClick={() => setItems((l) => l.filter((_, i) => i !== idx))} className="press grid h-11 w-11 place-items-center rounded-2xl text-destructive glass-soft">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Ποσότητα" type="number" inputMode="decimal" min={0} step="any" value={it.quantity} onChange={(e) => patch(idx, { quantity: Number(e.target.value) })} />
                  <Field label="Τιμή (€)" type="number" inputMode="decimal" min={0} step="any" value={it.unit_price} onChange={(e) => patch(idx, { unit_price: Number(e.target.value) })} />
                </div>
              </div>
            ))}
            <Select
              label="Προσθήκη προϊόντος"
              value=""
              onChange={(e) => {
                const p = products?.find((x) => x.id === e.target.value);
                if (p) setItems((l) => [...l, { product_id: p.id, product_name: p.name, unit: p.unit, unit_price: Number(p.price), quantity: 1 }]);
              }}
            >
              <option value="">Επίλεξε προϊόν…</option>
              {(products ?? []).filter((p) => p.available).map((p) => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>)}
            </Select>
            <div className="flex justify-between pt-1 text-lg font-bold"><span>Σύνολο</span><span>{formatCurrency(total)}</span></div>
          </Card>
          <TextArea label="Σημειώσεις" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <PrimaryButton disabled={saving} onClick={save}>{saving ? "Αποθήκευση…" : "Αποθήκευση αλλαγών"}</PrimaryButton>
          <GhostButton onClick={() => navigate({ to: "/orders/$id", params: { id } })}>Ακύρωση</GhostButton>
        </div>
      )}
    </AppShell>
  );
}
