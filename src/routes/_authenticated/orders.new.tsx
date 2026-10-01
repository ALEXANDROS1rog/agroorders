import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Mic, Minus, Plus, Sparkles, Square, Trash2 } from "lucide-react";
import { AppShell, Card } from "@/components/AppShell";
import { Field, GhostButton, PrimaryButton, Select, TextArea } from "@/components/Field";
import { availableProducts, createOrder, fetchCustomers, fetchProducts, saveCustomer, type NewOrderItem } from "@/lib/api";
import { extractOrderFromText, transcribeAudio } from "@/lib/ai.functions";
import { formatCurrency } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/orders/new")({
  validateSearch: (s: Record<string, unknown>): { customer?: string; route?: string } => ({
    ...(typeof s["customer"] === "string" ? { customer: s["customer"] } : {}),
    ...(typeof s["route"] === "string" ? { route: s["route"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Νέα παραγγελία — FarmOrders" },
      { name: "description", content: "Καταχώριση παραγγελίας χειροκίνητα ή με AI από κείμενο." },
      { property: "og:title", content: "Νέα παραγγελία — FarmOrders" },
      { property: "og:description", content: "Νέα παραγγελία με AI ή χειροκίνητα." },
    ],
  }),
  component: NewOrderPage,
});

type Line = NewOrderItem & { matched: boolean };

function NewOrderPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const extract = useServerFn(extractOrderFromText);
  const products = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const customers = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });

  const [mode, setMode] = useState<"ai" | "voice" | "manual">(search.customer ? "manual" : "ai");
  const [text, setText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [uncertain, setUncertain] = useState<string[]>([]);
  const [customerId, setCustomerId] = useState<string>(search.customer ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = customers.data?.find((x) => x.id === customerId);
    if (c) { setName(c.full_name); setPhone(c.phone); setAddress(c.address); }
  }, [customerId, customers.data]);

  const catalog = availableProducts(products.data ?? []);
  const total = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);

  const transcribe = useServerFn(transcribeAudio);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || mime || "audio/webm";
        const blob = new Blob(chunks, { type });
        const buf = new Uint8Array(await blob.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        const format = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : "webm";
        setAiBusy(true);
        try {
          const t = await transcribe({ data: { audio: btoa(bin), format } });
          setText(t.text);
          await runAi(t.text, "voice");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Σφάλμα ηχογράφησης");
          setAiBusy(false);
        }
      };
      rec.start();
      recRef.current = rec;
      setSeconds(0);
      setRecording(true);
    } catch {
      toast.error("Δεν δόθηκε άδεια για το μικρόφωνο.");
    }
  }

  function stopRecording() {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
  }

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds((s) => { if (s >= 299) stopRecording(); return s + 1; }), 1000);
    return () => clearInterval(id);
  }, [recording]);

  async function runAi(input: string = text, source: "text" | "voice" = "text") {
    setAiBusy(true);
    try {
      const r = await extract({ data: { text: input, source } });
      const match = r.phone ? customers.data?.find((c) => c.phone && r.phone!.endsWith(c.phone.slice(-10))) : undefined;
      setCustomerId(match?.id ?? "");
      setName(r.customer_name ?? match?.full_name ?? "");
      setPhone(r.phone ?? match?.phone ?? "");
      setAddress(r.address ?? match?.address ?? "");
      setLines(r.products.map((p) => ({ product_id: p.product_id, product_name: p.product_name, unit: p.unit, unit_price: p.unit_price, quantity: p.quantity, matched: p.matched })));
      setUncertain(r.uncertain);
      setReview(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Σφάλμα AI");
    } finally {
      setAiBusy(false);
    }
  }

  function addProduct(id: string) {
    const p = catalog.find((x) => x.id === id);
    if (!p) return;
    setLines((ls) => [...ls, { product_id: p.id, product_name: p.name, unit: p.unit, unit_price: Number(p.price), quantity: 1, matched: true }]);
  }

  async function confirmOrder() {
    if (lines.length === 0) { toast.error("Πρόσθεσε τουλάχιστον ένα προϊόν."); return; }
    if (lines.some((l) => !l.matched || !l.product_id)) { toast.error("Αντιστοίχισε ή αφαίρεσε τα προϊόντα που δεν βρέθηκαν."); return; }
    if (!customerId && !name.trim()) { toast.error("Γράψε όνομα πελάτη."); return; }
    setBusy(true);
    try {
      let cid = customerId;
      if (!cid) {
        const c = await saveCustomer({ full_name: name.trim(), phone, address, latitude: null, longitude: null, notes: "" });
        cid = c.id;
      }
      const id = await createOrder({
        customer_id: cid,
        phone,
        address,
        notes,
        status: "new",
        source: mode === "ai" ? "ai_text" : mode === "voice" ? "ai_voice" : "manual",
        items: lines.map(({ matched: _m, ...l }) => l),
      });
      toast.success("Η παραγγελία δημιουργήθηκε.");
      qc.invalidateQueries();
      navigate({ to: "/orders/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Σφάλμα");
    } finally {
      setBusy(false);
    }
  }

  const showForm = mode === "manual" || review;

  return (
    <AppShell title="Νέα παραγγελία" back="/orders">
      <div className="glass-soft mb-4 flex rounded-2xl p-1">
        {(["voice", "ai", "manual"] as const).map((m) => (
          <button key={m} disabled={recording} onClick={() => { setMode(m); setReview(false); }} className={`press flex-1 rounded-xl px-1 py-3 text-sm font-semibold ${mode === m ? "bg-brand/20 text-brand ring-1 ring-brand/30" : "text-muted-foreground"}`}>
            {m === "voice" ? "Ηχογράφηση" : m === "ai" ? "Από κείμενο" : "Χειροκίνητα"}
          </button>
        ))}
      </div>

      {mode === "ai" && !review ? (
        <Card className="space-y-3">
          <TextArea label="Επικόλλησε τη συνομιλία" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="π.χ. Γεια σας, θέλω 2 καρτέλες αυγά και μια μαύρη κότα, στη Λεωφ. Κηφισίας 10, τηλ 6912345678" />
          <PrimaryButton disabled={aiBusy || text.trim().length < 5} onClick={() => runAi()}>
            <span className="inline-flex items-center gap-2"><Sparkles className="h-5 w-5" /> {aiBusy ? "Ανάλυση…" : "Ανάλυση παραγγελίας"}</span>
          </PrimaryButton>
        </Card>
      ) : null}

      {mode === "voice" && !review ? (
        <Card className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">Πάτα το κουμπί και άφησε τον πελάτη να πει τι θέλει: όνομα, τηλέφωνο, διεύθυνση και προϊόντα. Ενημέρωσε τον πελάτη ότι ηχογραφείται.</p>
          <button
            disabled={aiBusy}
            onClick={recording ? stopRecording : startRecording}
            aria-label={recording ? "Διακοπή ηχογράφησης" : "Έναρξη ηχογράφησης"}
            className={`press mx-auto grid h-32 w-32 place-items-center rounded-full ${recording ? "animate-pulse-soft bg-destructive text-destructive-foreground" : "bg-brand text-brand-foreground"} disabled:opacity-50`}
          >
            {recording ? <Square className="h-12 w-12" /> : <Mic className="h-14 w-14" />}
          </button>
          <p className="font-display text-lg font-semibold">
            {aiBusy ? "Ανάλυση ηχογράφησης…" : recording ? `Ηχογράφηση ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} — πάτα για τέλος` : "Πάτα για ηχογράφηση"}
          </p>
        </Card>
      ) : null}

      {showForm ? (
        <div className="space-y-3">
          {review ? <h2 className="font-display text-lg font-semibold text-brand">Βρέθηκε η παρακάτω παραγγελία</h2> : null}
          {uncertain.length ? (
            <Card className="border border-warning/40">
              <p className="mb-1 text-sm font-semibold text-warning">Αβέβαιες πληροφορίες — έλεγξε:</p>
              <ul className="list-disc pl-5 text-sm">{uncertain.map((u, i) => <li key={i}>{u}</li>)}</ul>
            </Card>
          ) : null}
          <Card className="space-y-3">
            <Select label="Πελάτης" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Νέος πελάτης —</option>
              {(customers.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.full_name} {c.phone ? `· ${c.phone}` : ""}</option>)}
            </Select>
            {!customerId ? <Field label="Όνομα πελάτη" value={name} onChange={(e) => setName(e.target.value)} /> : null}
            <Field label="Τηλέφωνο" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Field label="Διεύθυνση" value={address} onChange={(e) => setAddress(e.target.value)} />
          </Card>
          <Card className="space-y-3">
            {lines.map((l, idx) => (
              <div key={idx} className={`rounded-2xl p-3 ${l.matched ? "glass-soft" : "border border-warning/50"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{l.product_name}</p>
                    <p className="text-xs text-muted-foreground">{l.matched ? `${formatCurrency(l.unit_price)} / ${l.unit}` : "Δεν υπάρχει στον κατάλογο"}</p>
                  </div>
                  <button aria-label="Αφαίρεση" onClick={() => setLines(lines.filter((_, i) => i !== idx))} className="grid h-10 w-10 place-items-center rounded-xl text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
                {!l.matched ? (
                  <select className="glass-soft mt-2 h-12 w-full rounded-xl bg-[oklch(0.21_0.03_264)] px-3" value="" onChange={(e) => {
                    const p = catalog.find((x) => x.id === e.target.value);
                    if (p) setLines(lines.map((x, i) => (i === idx ? { ...x, product_id: p.id, product_name: p.name, unit: p.unit, unit_price: Number(p.price), matched: true } : x)));
                  }}>
                    <option value="">Αντιστοίχιση με προϊόν…</option>
                    {catalog.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                ) : null}
                <div className="mt-2 flex items-center gap-3">
                  <button aria-label="Λιγότερο" onClick={() => setLines(lines.map((x, i) => (i === idx ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))} className="glass press grid h-11 w-11 place-items-center rounded-xl"><Minus className="h-4 w-4" /></button>
                  <span className="font-display w-10 text-center text-xl font-bold">{l.quantity}</span>
                  <button aria-label="Περισσότερο" onClick={() => setLines(lines.map((x, i) => (i === idx ? { ...x, quantity: x.quantity + 1 } : x)))} className="glass press grid h-11 w-11 place-items-center rounded-xl"><Plus className="h-4 w-4" /></button>
                  <span className="ml-auto font-semibold">{formatCurrency(l.unit_price * l.quantity)}</span>
                </div>
              </div>
            ))}
            <select className="glass-soft h-14 w-full rounded-2xl bg-[oklch(0.21_0.03_264)] px-4" value="" onChange={(e) => addProduct(e.target.value)}>
              <option value="">+ Προσθήκη προϊόντος</option>
              {catalog.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatCurrency(p.price)}</option>)}
            </select>
            <div className="flex justify-between text-lg font-bold"><span>Σύνολο</span><span>{formatCurrency(total)}</span></div>
          </Card>
          <TextArea label="Σημειώσεις" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <PrimaryButton disabled={busy} onClick={confirmOrder}>{busy ? "Αποθήκευση…" : review ? "ΕΠΙΒΕΒΑΙΩΣΗ" : "Δημιουργία παραγγελίας"}</PrimaryButton>
          {review ? <GhostButton onClick={() => setReview(false)}>ΔΙΟΡΘΩΣΗ κειμένου</GhostButton> : null}
        </div>
      ) : null}
    </AppShell>
  );
}
