import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell, Card, EmptyState, Loading } from "@/components/AppShell";
import { Field, GhostButton, PrimaryButton, Select } from "@/components/Field";
import { deleteProduct, fetchProducts, saveProduct, toggleProductAvailable, type ProductInput } from "@/lib/api";
import { PRODUCT_CATEGORIES, UNITS, formatCurrency } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Προϊόντα — AgroOrders" },
      { name: "description", content: "Κατάλογος προϊόντων, τιμές και διαθεσιμότητα." },
      { property: "og:title", content: "Προϊόντα — AgroOrders" },
      { property: "og:description", content: "Διαχείριση καταλόγου προϊόντων." },
    ],
  }),
  component: ProductsPage,
});

const EMPTY: ProductInput = { name: "", category: PRODUCT_CATEGORIES[0] ?? "", price: 0, unit: UNITS[0]!, available: true };

function ProductsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const [form, setForm] = useState<ProductInput | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["products"] });

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Σφάλμα");
    }
  }

  return (
    <AppShell
      title="Προϊόντα"
      back="/dashboard"
      action={
        <button aria-label="Νέο προϊόν" onClick={() => setForm({ ...EMPTY })} className="press grid h-11 w-11 place-items-center rounded-2xl bg-brand text-brand-foreground">
          <Plus className="h-5 w-5" />
        </button>
      }
    >
      {form ? (
        <Card className="mb-4 space-y-3">
          <Field label="Όνομα" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Κατηγορία" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Τιμή (€)" type="number" inputMode="decimal" step="0.01" min="0" value={String(form.price)} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            <Select label="Μονάδα" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </Select>
          </div>
          <label className="flex items-center gap-3 text-[15px]">
            <input type="checkbox" className="h-6 w-6" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
            Διαθέσιμο
          </label>
          <PrimaryButton
            onClick={() => {
              if (!form.name.trim()) { toast.error("Γράψε όνομα προϊόντος."); return; }
              run(() => saveProduct({ ...form, name: form.name.trim() }), "Αποθηκεύτηκε").then(() => setForm(null));
            }}
          >
            Αποθήκευση
          </PrimaryButton>
          <GhostButton onClick={() => setForm(null)}>Ακύρωση</GhostButton>
        </Card>
      ) : null}

      {isLoading ? <Loading /> : !data?.length ? (
        <EmptyState title="Δεν υπάρχουν προϊόντα" hint="Πάτα + για να προσθέσεις π.χ. Καρτέλα αυγά 5€." />
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <Card key={p.id} className={p.available ? "" : "opacity-60"}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.category} · {formatCurrency(p.price)} / {p.unit}</p>
                </div>
                <div className="flex gap-2">
                  <button aria-label="Επεξεργασία" onClick={() => setForm({ id: p.id, name: p.name, category: p.category, price: Number(p.price), unit: p.unit, available: p.available })} className="glass press grid h-11 w-11 place-items-center rounded-2xl"><Pencil className="h-4 w-4" /></button>
                  <button aria-label="Διαγραφή" onClick={() => confirm(`Διαγραφή «${p.name}»;`) && run(() => deleteProduct(p.id), "Διαγράφηκε")} className="glass press grid h-11 w-11 place-items-center rounded-2xl text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <button onClick={() => run(() => toggleProductAvailable(p.id, !p.available), p.available ? "Απενεργοποιήθηκε" : "Ενεργοποιήθηκε")} className="glass-soft press mt-3 h-11 w-full rounded-2xl text-sm font-semibold">
                {p.available ? "Διαθέσιμο — πάτα για απενεργοποίηση" : "Μη διαθέσιμο — πάτα για ενεργοποίηση"}
              </button>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
