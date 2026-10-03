import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { speakGreek, stopSpeaking } from "@/lib/tts";
import { TripSelect } from "@/components/TripSelect";
import { AppShell, Card, EmptyState, Loading } from "@/components/AppShell";
import { GhostButton, Select } from "@/components/Field";
import { CallNavButtons, StatusChip } from "@/components/ui-bits";
import { deleteOrder, fetchOrder, orderTotal, setOrderTrip, updateOrderStatus } from "@/lib/api";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, formatCurrency, formatDateTime, formatQuantity, type OrderStatus } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({
    meta: [
      { title: "Παραγγελία — VoiceOrders" },
      { name: "description", content: "Λεπτομέρειες παραγγελίας." },
      { property: "og:title", content: "Παραγγελία — VoiceOrders" },
      { property: "og:description", content: "Λεπτομέρειες παραγγελίας." },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: o, isLoading } = useQuery({ queryKey: ["order", id], queryFn: () => fetchOrder(id) });
  const refresh = () => qc.invalidateQueries();
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => stopSpeaking(), []);

  function readAloud() {
    if (!o) return;
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    const items = o.order_items.map((i) => `${formatQuantity(i.quantity)} ${i.unit} ${i.product_name}`).join(", ");
    const text = [
      `Παραγγελία ${o.order_number}.`,
      `Πελάτης: ${o.customer?.full_name ?? "χωρίς πελάτη"}.`,
      o.address ? `Διεύθυνση: ${o.address}.` : "",
      items ? `Προϊόντα: ${items}.` : "",
      `Σύνολο: ${formatCurrency(orderTotal(o))}.`,
      o.notes ? `Σημειώσεις: ${o.notes}.` : "",
    ].join(" ");
    const started = speakGreek(text, () => setSpeaking(false));
    if (started) setSpeaking(true);
    else toast.error("Η συσκευή σας δεν υποστηρίζει εκφώνηση κειμένου.");
  }

  return (
    <AppShell title={o ? `Παραγγελία #${o.order_number}` : "Παραγγελία"} back="/orders">
      {isLoading ? <Loading /> : !o ? <EmptyState title="Η παραγγελία δεν βρέθηκε" /> : (
        <div className="space-y-3">
          <Card className="space-y-1">
            <div className="flex items-center justify-between"><p className="text-lg font-semibold">{o.customer?.full_name ?? "Χωρίς πελάτη"}</p><StatusChip status={o.status} /></div>
            <p className="text-[15px]">{o.phone || "—"}</p>
            <p className="text-[15px] text-muted-foreground">{o.address || "—"}</p>
            <p className="text-sm text-muted-foreground">{formatDateTime(o.order_date)}</p>
            {o.deliveries[0]?.delivered_at ? <p className="text-sm text-brand">Παραδόθηκε: {formatDateTime(o.deliveries[0].delivered_at)}</p> : null}
            <div className="flex gap-2 pt-2">
              <CallNavButtons phone={o.phone} address={o.address} latitude={o.customer?.latitude} longitude={o.customer?.longitude} />
            </div>
          </Card>
          <Card>
            {o.order_items.map((i) => (
              <div key={i.id} className="flex justify-between border-b border-border/40 py-2 text-[15px] last:border-0">
                <span>{formatQuantity(i.quantity)} {i.unit} × {i.product_name} <span className="text-muted-foreground">({formatCurrency(i.unit_price)})</span></span>
                <span className="font-semibold">{formatCurrency(Number(i.unit_price) * Number(i.quantity))}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 text-lg font-bold"><span>Σύνολο</span><span>{formatCurrency(orderTotal(o))}</span></div>
          </Card>
          <GhostButton onClick={readAloud}>
            <span className="inline-flex items-center gap-2">
              {speaking ? <><Square className="h-5 w-5" /> Σταμάτημα εκφώνησης</> : <><Volume2 className="h-5 w-5" /> Εκφώνηση παραγγελίας</>}
            </span>
          </GhostButton>
          <TripSelect
            value={o.route_id ?? ""}
            onChange={async (v) => {
              try { await setOrderTrip(o.id, v || null); toast.success("Το δρομολόγιο άλλαξε."); refresh(); }
              catch (err) { toast.error(err instanceof Error ? err.message : "Σφάλμα"); }
            }}
          />
          {o.notes ? <Card><p className="text-sm text-muted-foreground">Σημειώσεις</p><p>{o.notes}</p></Card> : null}
          <Select
            label="Κατάσταση"
            value={o.status}
            onChange={async (e) => {
              try { await updateOrderStatus(o.id, e.target.value as OrderStatus); toast.success("Η κατάσταση άλλαξε."); refresh(); }
              catch (err) { toast.error(err instanceof Error ? err.message : "Σφάλμα"); }
            }}
          >
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
          </Select>
          <GhostButton
            className="text-destructive"
            onClick={async () => {
              if (!confirm("Διαγραφή παραγγελίας;")) return;
              try { await deleteOrder(o.id); refresh(); navigate({ to: "/orders" }); } catch (err) { toast.error(err instanceof Error ? err.message : "Σφάλμα"); }
            }}
          >
            Διαγραφή παραγγελίας
          </GhostButton>
        </div>
      )}
    </AppShell>
  );
}
