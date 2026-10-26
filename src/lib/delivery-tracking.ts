import { useSyncExternalStore } from "react";
export type Tracking = { deliveryId: string | null; status: "stopped" | "active" | "paused" };
const empty: Tracking = { deliveryId: null, status: "stopped" };
let current: Tracking = empty;
const listeners = new Set<() => void>();
export function getTracking() { return current; }
export function setTracking(deliveryId: string | null, status: Tracking["status"]) {
  current = { deliveryId, status };
  listeners.forEach(l => l());
}
export function stopTracking() { setTracking(null, "stopped"); }
export function useDeliveryTracking() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, getTracking, () => empty);
}
export const GEOFENCE = { radiusMeters: 60, maximumAccuracy: 30, dwellMs: 20_000, maximumGapMs: 10_000 };
export type Dwell = { since: number; last: number; samples: number } | null;
export function arrivalSample(previous: Dwell, distance: number, accuracy: number, now: number) {
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > GEOFENCE.maximumAccuracy || distance + accuracy > GEOFENCE.radiusMeters) return { dwell: null, arrived: false };
  const continuous = previous && now > previous.last && now - previous.last <= GEOFENCE.maximumGapMs;
  const dwell = continuous ? { since: previous.since, last: now, samples: previous.samples + 1 } : { since: now, last: now, samples: 1 };
  return { dwell, arrived: dwell.samples >= 3 && now - dwell.since >= GEOFENCE.dwellMs };
}