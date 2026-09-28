import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPinCheck } from "lucide-react";
import { fetchDeliveries, markDelivered } from "@/lib/api";
import { distanceKm } from "@/lib/domain";

const STORAGE = "agro-auto-deliver";
/** Distance from the customer's saved location that counts as "arrived". */
const ARRIVE_METERS = 60;
/** Must stay within range this long, to avoid marking while just driving past. */
const DWELL_MS = 20_000;

/** Toggle + GPS watcher: marks a pending delivery as delivered when the farmer
 * arrives at (and briefly stays at) the customer's saved location. */
export function AutoDeliver() {
  const qc = useQueryClient();
  const [on, setOn] = useState(false);
  const [hint, setHint] = useState("");
  const { data } = useQuery({ queryKey: ["deliveries"], queryFn: fetchDeliveries, enabled: on });
  const since = useRef<Record<string, number>>({});
  const done = useRef<Set<string>>(new Set());
  const listRef = useRef(data);
  listRef.current = data;

  useEffect(() => { setOn(localStorage.getItem(STORAGE) === "1"); }, []);

  useEffect(() => {
    if (!on) return;
    if (!("geolocation" in navigator)) { setHint("Η συσκευή δεν δίνει τοποθεσία."); return; }
    setHint("Αναμονή για τοποθεσία…");
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setHint("Ενεργό — παρακολουθώ τη θέση σου.");
        const pending = (listRef.current ?? []).filter(
          (d) => (d.status === "pending" || d.status === "in_progress") && d.order.status !== "cancelled",
        );
        const now = Date.now();
        for (const d of pending) {
          const c = d.order.customer;
          if (c?.latitude == null || c?.longitude == null || done.current.has(d.id)) continue;
          const m = distanceKm(me, { lat: c.latitude, lng: c.longitude }) * 1000;
          if (m > ARRIVE_METERS + Math.min(pos.coords.accuracy, 60)) { delete since.current[d.id]; continue; }
          since.current[d.id] ??= now;
          if (now - since.current[d.id]! < DWELL_MS) continue;
          done.current.add(d.id);
          try {
            await markDelivered(d.id, d.order.id);
            toast.success(`✔ Παραδόθηκε αυτόματα: ${c.full_name}`);
            qc.invalidateQueries();
          } catch {
            done.current.delete(d.id);
          }
        }
      },
      () => setHint("Δεν δόθηκε άδεια τοποθεσίας."),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [on, qc]);

  function toggle() {
    const next = !on;
    setOn(next);
    localStorage.setItem(STORAGE, next ? "1" : "0");
    if (!next) setHint("");
  }

  return (
    <button onClick={toggle} className={`press mb-4 flex w-full items-center gap-3 rounded-2xl p-4 text-left ${on ? "bg-brand/20 ring-1 ring-brand/40" : "glass-soft"}`}>
      <MapPinCheck className={`h-6 w-6 shrink-0 ${on ? "text-brand" : "text-muted-foreground"}`} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Αυτόματο «Παραδόθηκε» {on ? "ΑΝΟΙΧΤΟ" : "ΚΛΕΙΣΤΟ"}</span>
        <span className="block text-xs text-muted-foreground">{hint || "Τσεκάρει μόνο του την παραγγελία όταν φτάνεις στον πελάτη (η εφαρμογή πρέπει να είναι ανοιχτή)."}</span>
      </span>
    </button>
  );
}
