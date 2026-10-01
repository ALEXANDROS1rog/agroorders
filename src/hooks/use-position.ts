import { useEffect, useState } from "react";

export type PositionState =
  | { status: "waiting" }
  | { status: "denied" }
  | { status: "ok"; lat: number; lng: number; accuracy: number };

/** Watches the device GPS position. Works without GPS (status "denied"). */
export function useMyPosition(enabled = true): PositionState {
  const [state, setState] = useState<PositionState>({ status: "waiting" });
  useEffect(() => {
    if (!enabled) return;
    if (!("geolocation" in navigator)) { setState({ status: "denied" }); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => setState({ status: "ok", lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => setState({ status: "denied" }),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);
  return state;
}
