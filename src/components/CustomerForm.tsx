import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/AppShell";
import { Field, GhostButton, PrimaryButton, TextArea } from "@/components/Field";
import { saveCustomer, type CustomerInput } from "@/lib/api";

export const EMPTY_CUSTOMER: CustomerInput = { full_name: "", phone: "", address: "", latitude: null, longitude: null, notes: "" };

export function CustomerForm({ initial, onDone }: { initial: CustomerInput; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function geocode() {
    if (!f.address.trim()) { toast.error("Γράψε πρώτα διεύθυνση."); return; }
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gr&q=${encodeURIComponent(f.address)}`);
      const j = (await r.json()) as { lat: string; lon: string }[];
      if (!j[0]) { toast.error("Δεν βρέθηκε η διεύθυνση στον χάρτη."); return; }
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
          if (!f.full_name.trim()) { toast.error("Γράψε ονοματεπώνυμο."); return; }
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

