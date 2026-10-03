import { CustomerForm, EMPTY_CUSTOMER } from "@/components/CustomerForm";
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
      { title: "Πελάτες — VoiceOrders" },
      { name: "description", content: "Λίστα πελατών με αναζήτηση ονόματος, τηλεφώνου, διεύθυνσης." },
      { property: "og:title", content: "Πελάτες — VoiceOrders" },
      { property: "og:description", content: "Οι πελάτες του παραγωγού." },
    ],
  }),
  component: CustomersPage,
});

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
