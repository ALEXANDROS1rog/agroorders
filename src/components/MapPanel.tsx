import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { MapMarker } from "@/components/LeafletMap";

const LeafletMap = lazy(() => import("@/components/LeafletMap"));

export type { MapMarker };

export function MapPanel(props: {
  markers: MapMarker[];
  route?: [number, number][];
  encodedRoute?: string | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  showTraffic?: boolean;
  trackMe?: boolean;
  onMyLocation?: (p: { lat: number; lng: number }) => void;
  className?: string;
}) {
  const fallback = (
    <div className={`glass-soft w-full animate-pulse rounded-3xl ${props.className ?? "h-[320px]"}`} />
  );
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <LeafletMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
