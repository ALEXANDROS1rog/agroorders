import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPinCheck } from "lucide-react";
import { fetchDeliveries, markDelivered } from "@/lib/api";
import { distanceKm } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { useOrg } from "@/lib/org";
import { GhostButton } from "@/components/Field";
import { arrivalSample, stopTracking, setTracking, useDeliveryTracking, type Dwell } from "@/lib/delivery-tracking";

/** Call to switch automatic confirmation on from anywhere (e.g. "Έναρξη διανομής"). */
export function enableAutoDeliver(deliveryId: string) { setTracking(deliveryId, "active"); }

/** Toggle + GPS watcher: marks a pending delivery as delivered when the farmer
 * arrives at (and briefly stays at) the customer's saved location. */
export function AutoDeliver() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { can, hasFeature } = useOrg();
  const allowed = can("deliveries.update") && hasFeature("auto_arrival");
  const tracking = useDeliveryTracking();
  const on = tracking.status === "active";
  const [hint, setHint] = useState("");
  const { data } = useQuery({ queryKey: ["deliveries"], queryFn: fetchDeliveries, enabled: on, refetchInterval: on ? 5000 : false });
  const dwell = useRef<Dwell>(null);
  const completing = useRef(false);
  const listRef = useRef(data);
  listRef.current = data;

  useEffect(() => {
    if (!allowed) stopTracking();
    if (!data || !on) return;
    const delivery = data.find(d => d.id === tracking.deliveryId);
    if (!delivery || delivery.status !== "in_progress" || delivery.order.status === "cancelled" || delivery.order.status === "delivered") stopTracking();
  }, [data, on, allowed, tracking.deliveryId]);

  useEffect(() => {
    dwell.current = null;
    if (!on || !allowed || !tracking.deliveryId) return;
    if (!("geolocation" in navigator)) { setHint(t("a.denied")); return; }
    setHint(t("del.gpsWait"));
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setHint(t("a.active"));
        const pending = (listRef.current ?? []).filter(d => d.id === tracking.deliveryId && d.status === "in_progress" && d.order.status === "delivering");
        const now = Date.now();
        for (const d of pending) {
          const c = d.order.customer;
          if (c?.latitude == null || c?.longitude == null) { setHint("Δεν υπάρχει τοποθεσία προορισμού. Χρησιμοποιήστε χειροκίνητη επιβεβαίωση."); continue; }
          if (completing.current) continue;
          const m = distanceKm(me, { lat: c.latitude, lng: c.longitude }) * 1000;
          if (now - pos.timestamp > 5000) { dwell.current = null; continue; }
          const result = arrivalSample(dwell.current, m, pos.coords.accuracy, now);
          dwell.current = result.dwell;
          if (pos.coords.accuracy > 30) setHint("Ανακριβές σήμα GPS — αναμονή καλύτερης θέσης.");
          if (!result.arrived) continue;
          completing.current = true;
          try {
            await markDelivered(d.id, d.order.id, { lat: me.lat, lng: me.lng, auto: true });
            toast.success(`${t("a.done")}: ${c.full_name}`);
            stopTracking();
            qc.invalidateQueries();
          } catch { dwell.current = null; }
          finally { completing.current = false; }
        }
      },
      (error) => { dwell.current = null; setHint(error.code === 1 ? t("a.denied") : "Ανακριβές σήμα GPS — αναμονή καλύτερης θέσης."); },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [on, allowed, tracking.deliveryId, qc, t]);

  function toggle() {
    if (tracking.deliveryId) setTracking(tracking.deliveryId, on ? "paused" : "active");
    dwell.current = null;
    setHint("");
  }

  if (!allowed || !tracking.deliveryId) return null;
  return (
    <GhostButton onClick={toggle} aria-pressed={on} className={`mb-4 flex !h-auto items-center gap-3 p-4 text-left ${on ? "bg-brand/20 ring-1 ring-brand/40" : "surface-subtle"}`}>
      <MapPinCheck className={`h-6 w-6 shrink-0 ${on ? "text-brand" : "text-muted-foreground"}`} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{on ? "Παύση παρακολούθησης" : "Συνέχιση παρακολούθησης"}</span>
        <span className="block text-xs text-muted-foreground">{hint || t("a.hint")}</span>
      </span>
    </GhostButton>
  );
}
