import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Volume2, Square } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { AppShell, Card, EmptyState, Loading } from "@/components/AppShell";
import { MapPanel } from "@/components/MapPanel";
import { CallNavButtons, StatusChip } from "@/components/ui-bits";
import { GhostButton } from "@/components/Field";
import { deleteCustomer, fetchCustomer, fetchCustomerOrders, orderTotal } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/domain";
import { CustomerForm } from "@/components/CustomerForm";
import { speakGreek, stopSpeaking } from "@/lib/tts";

export const Route = createFileRoute("/_authenticated/customers/$id")({
  head: () => ({
    meta: [
      { title: "Πελάτης — FarmOrders" },
      { name: "description", content: "Στοιχεία πελάτη και ιστορικό παραγγελιών." },
      { property: "og:title", content: "Πελάτης — FarmOrders" },
      { property: "og:description", content: "Στοιχεία πελάτη." },
    ],
  }),
  component: CustomerPage,
});

function CustomerPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const customer = useQuery({
    queryKey: ["customer", id],
    queryFn: () => fetchCustomer(id),
  });
  const orders = useQuery({
    queryKey: ["customer-orders", id],
    queryFn: () => fetchCustomerOrders(id),
  });
  const [editing, setEditing] = useState(false);
  const c = customer.data;
  const valid = (orders.data ?? []).filter((o) => o.status !== "cancelled");
  const total = valid.reduce((s, o) => s + orderTotal(o), 0);

  return (
    <AppShell title={c?.full_name ?? "Πελάτης"} back="/customers">
      {customer.isLoading ? <Loading /> : !c ? <EmptyState title="Ο πελάτης δεν βρέθηκε" /> : (
        <div className="space-y-3">
          {editing ? (
            <CustomerForm initial={{ id: c.id, full_name: c.full_name, phone: c.phone, address: c.address, latitude: c.latitude, longitude: c.longitude, notes: c.notes }} onDone={() => setEditing(false)} />
          ) : (
            <Card className="space-y-2">
              <p className="text-lg font-semibold">{c.phone || "Χωρίς τηλέφωνο"}</p>
              <p className="text-[15px] text-muted-foreground">{c.address || "Χωρίς διεύθυνση"}</p>
              {c.notes ? <p className="text-sm">{c.notes}</p> : null}
              <div className="flex flex-col gap-2 pt-2">
  <CallNavButtons
    phone={o.phone}
    address={o.address}
    latitude={o.customer?.latitude}
    longitude={o.customer?.longitude}
  />

  <GhostButton
    type="button"
    onClick={() => {
      if (isSpeaking) {
        stopSpeaking();
        setIsSpeaking(false);
        return;
      }

      const customerName = o.customer?.full_name ?? "Χωρίς πελάτη";

      const itemsText = o.order_items
        .map(
          (item) =>
            `${formatQuantity(item.quantity)} ${item.unit} ${item.product_name}`,
        )
        .join(", ");

      const total = formatCurrency(orderTotal(o));

      const notesText = o.notes
        ? ` Σημειώσεις: ${o.notes}.`
        : "";

      const text = `Παραγγελία ${o.order_number}.
        Πελάτης: ${customerName}.
        ${itemsText ? `Προϊόντα: ${itemsText}.` : ""}
        Σύνολο: ${total}.
        ${notesText}`;

      const started = speakGreek(text);

      if (started) {
        setIsSpeaking(true);

        window.setTimeout(() => {
          setIsSpeaking(false);
        }, Math.max(3000, text.length * 80));
      } else {
        toast.error("Η συσκευή σας δεν υποστηρίζει εκφώνηση κειμένου.");
      }
    }}
  >
    {isSpeaking ? (
      <>
        <Square className="mr-2 inline h-5 w-5" />
        Σταμάτημα εκφώνησης
      </>
    ) : (
      <>
        <Volume2 className="mr-2 inline h-5 w-5" />
        Εκφώνηση παραγγελίας
      </>
    )}
  </GhostButton>
</div>
              <Link to="/orders/new" search={{ customer: c.id }} className="press flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-semibold text-brand-foreground">
                <Plus className="h-4 w-4" /> Νέα παραγγελία
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <GhostButton onClick={() => setEditing(true)}>Επεξεργασία</GhostButton>
                <GhostButton
                  className="text-destructive"
                  onClick={async () => {
                    if (!confirm("Διαγραφή πελάτη;")) return;
                    try { await deleteCustomer(c.id); navigate({ to: "/customers" }); } catch (e) { toast.error(e instanceof Error ? e.message : "Σφάλμα"); }
                  }}
                >
                  Διαγραφή
                </GhostButton>
              </div>
            </Card>
          )}
          {c.latitude != null && c.longitude != null ? (
            <MapPanel className="h-[220px]" markers={[{ id: c.id, lat: c.latitude, lng: c.longitude, label: "●" }]} />
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Card><p className="font-display text-2xl font-bold">{valid.length}</p><p className="text-sm text-muted-foreground">Σύνολο παραγγελιών</p></Card>
            <Card><p className="font-display text-2xl font-bold">{formatCurrency(total)}</p><p className="text-sm text-muted-foreground">Συνολική αξία</p></Card>
          </div>
          <h2 className="font-display pt-2 text-base font-semibold">Ιστορικό παραγγελιών</h2>
          {(orders.data ?? []).length === 0 ? <EmptyState title="Καμία παραγγελία ακόμα" /> : (orders.data ?? []).map((o) => (
            <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="glass press flex items-center justify-between rounded-3xl p-4">
              <div><p className="font-semibold">#{o.order_number} · {formatDate(o.order_date)}</p><StatusChip status={o.status} /></div>
              <p className="font-display text-lg font-bold">{formatCurrency(orderTotal(o))}</p>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
