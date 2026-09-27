import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { AppShell, Card, EmptyState, Loading } from "@/components/AppShell";
import { Field, GhostButton, PrimaryButton, TextArea } from "@/components/Field";
import { SearchBox } from "@/components/ui-bits";
import { fetchCustomers, saveCustomer, type CustomerInput } from "@/lib/api";
import { initialsOf } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/customers/")({
  head: () => ({
    meta: [
      { title: "Πελάτες — AgroOrders" },
      { name: "description", content: "Λίστα πελατών με αναζήτηση ονόματος, τηλεφώνου, διεύθυνσης." },
      { property: "og:title", content: "Πελάτες — AgroOrders" },
      { property: "og:description", content: "Οι πελάτες του παραγωγού." },
    ],
  }),
  component: CustomersPage,
});

export const EMPTY_CUSTOMER: CustomerInput = { full_name: "", phone: "", address: "", latitude: null, longitude: null, notes: "" };

export function CustomerForm({ initial, onDone }: { initial: CustomerInput; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function geocode() {
    if (!f.address.trim()) return toast.error("Γράψε πρώτα διεύθυνση.");
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gr&q=${encodeURIComponent(f.address)}`);
      const j = (await r.json()) as { lat: string; lon: string }[];
      if (!j[0]) return toast.error("Δεν βρέθηκε η διεύθυνση στον χάρτη.");
      setF({ ...f, latitude: Number(j[0].lat), longitude: Number(j[0].lon) });
      toast.success("Βρέθηκε η τοποθεσία.");
    } catch {
      toast.error("Αποτυχία εύρεσης τοποθεσίας.");
    }
  }
  function here() {
    navigator.geolocation.getCurrentPosition(
      (p) => setF((x) => ({ ...x, latitude: p.coords.latitude, longitude: p.coords.longitude })),
      () => toast.error("Δεν δόθηκε άδεια τοποθεσίας."),
    );
  }

  return (
    <Card className="mb-4 space-y-3">
      <Field label="Ονοματεπώνυμο" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
      <Field label="Τηλέφωνο" type="tel" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <Field label="Διεύθυνση" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude" inputMode="decimal" value={f.latitude ?? ""} onChange={(e) => setF({ ...f, latitude: e.target.value === "" ? null : Number(e.target.value) })} />
        <Field label="Longitude" inputMode="decimal" value={f.longitude ?? ""} onChange={(e) => setF({ ...f, longitude: e.target.value === "" ? null : Number(e.target.value) })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <GhostButton type="button" onClick={geocode}>Εύρεση από διεύθυνση</GhostButton>
        <GhostButton type="button" onClick={here}>Τρέχουσα θέση</GhostButton>
      </div>
      <TextArea label="Σημειώσεις" rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      <PrimaryButton
        disabled={busy}
        onClick={async () => {
          if (!f.full_name.trim()) return toast.error("Γράψε ονοματεπώνυμο.");
          setBusy(true);
          try {
            await saveCustomer(f);
            toast.success("Ο πελάτης αποθηκεύτηκε.");
            qc.invalidateQueries({ queryKey: ["customers"] });
            qc.invalidateQueries({ queryKey: ["customer"] });
            onDone();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Σφάλμα");
          } finally {
            setBusy(false);
          }
        }}
      >
        Αποθήκευση
      </PrimaryButton>
      <GhostButton onClick={onDone}>Ακύρωση</GhostButton>
    </Card>
  );
}

function CustomersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const term = q.trim().toLowerCase();
  const list = (data ?? []).filter((c) => !term || [c.full_name, c.phone, c.address].some((v) => (v ?? "").toLowerCase().includes(term)));

  return (
    <AppShell
      title="Πελάτες"
      subtitle={data ? `${data.length} πελάτες` : undefined}
      action={
        <button aria-label="Νέος πελάτης" onClick={() => setAdding(true)} className="press grid h-11 w-11 place-items-center rounded-2xl bg-brand text-brand-foreground">
          <Plus className="h-5 w-5" />
        </button>
      }
    >
      {adding ? <CustomerForm initial={EMPTY_CUSTOMER} onDone={() => setAdding(false)} /> : null}
      <SearchBox value={q} onChange={setQ} placeholder="Αναζήτηση: όνομα, τηλέφωνο, διεύθυνση" />
      {isLoading ? <Loading /> : !list.length ? (
        <EmptyState title="Δεν βρέθηκαν πελάτες" />
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <Link key={c.id} to="/customers/$id" params={{ id: c.id }} className="glass press flex items-center gap-3 rounded-3xl p-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/20 font-bold text-accent">{initialsOf(c.full_name)}</div>
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold">{c.full_name}</p>
                <p className="truncate text-sm text-muted-foreground">{c.phone || "—"} · {c.address || "χωρίς διεύθυνση"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
