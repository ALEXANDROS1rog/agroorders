/* Google Maps renderer (file name kept for the lazy import in MapPanel). */
import { useEffect, useRef, useState } from "react";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  tone?: "brand" | "accent" | "warning";
};

type G = any; // eslint-disable-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    google?: G;
    __agroMapsInit?: () => void;
  }
}

let loader: Promise<G> | null = null;
function loadGoogle(): Promise<G> {
  if (window.google?.maps?.Map) return Promise.resolve(window.google);
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    window.__agroMapsInit = () => resolve(window.google);
    const env = import.meta.env as Record<string, string | undefined>;
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"]}&loading=async&libraries=geometry&language=el&region=GR&callback=__agroMapsInit&channel=${env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"]}`;
    s.async = true;
    s.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(s);
  });
  return loader;
}

const TONE: Record<string, string> = { brand: "#10b981", accent: "#0ea5e9", warning: "#f5b93a" };

export default function LeafletMap({
  markers,
  route,
  encodedRoute,
  selectedId,
  onSelect,
  showTraffic = true,
  trackMe = true,
  onMyLocation,
  className = "h-[320px]",
}: {
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
  const el = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<G>(null);
  const [error, setError] = useState(false);
  const [traffic, setTraffic] = useState(showTraffic);
  const [satellite, setSatellite] = useState(false);
  const trafficLayer = useRef<G>(null);
  const markerRefs = useRef<G[]>([]);
  const line = useRef<G>(null);
  const me = useRef<G>(null);
  const meRing = useRef<G>(null);
  const follow = useRef(false);
  const fitted = useRef("");
  const cb = useRef(onMyLocation);
  cb.current = onMyLocation;

  useEffect(() => {
    let alive = true;
    loadGoogle()
      .then((g) => {
        if (!alive || !el.current) return;
        const m = new g.maps.Map(el.current, {
          center: { lat: 37.9838, lng: 23.7275 },
          zoom: 11,
          clickableIcons: false,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
        });
        trafficLayer.current = new g.maps.TrafficLayer();
        setMap(m);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    trafficLayer.current?.setMap(map && traffic ? map : null);
  }, [map, traffic]);

  useEffect(() => {
    map?.setMapTypeId(satellite ? "hybrid" : "roadmap");
  }, [map, satellite]);

  // markers
  useEffect(() => {
    if (!map) return;
    const g = window.google;
    markerRefs.current.forEach((mk) => mk.setMap(null));
    markerRefs.current = markers.map((mk) => {
      const active = selectedId === mk.id;
      const marker = new g.maps.Marker({
        map,
        position: { lat: mk.lat, lng: mk.lng },
        label: { text: mk.label, color: "#04120b", fontWeight: "700", fontSize: active ? "14px" : "12px" },
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: active ? 18 : 14,
          fillColor: TONE[mk.tone ?? "brand"],
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        zIndex: active ? 10 : 1,
      });
      marker.addListener("click", () => onSelect?.(mk.id));
      return marker;
    });
    const sig = markers.map((m) => m.id).join(",");
    if (markers.length && fitted.current !== sig) {
      fitted.current = sig;
      if (markers.length === 1) {
        map.setCenter({ lat: markers[0]!.lat, lng: markers[0]!.lng });
        map.setZoom(14);
      } else {
        const b = new g.maps.LatLngBounds();
        markers.forEach((m) => b.extend({ lat: m.lat, lng: m.lng }));
        map.fitBounds(b, 50);
      }
    }
  }, [map, markers, selectedId, onSelect]);

  // route line
  useEffect(() => {
    if (!map) return;
    const g = window.google;
    line.current?.setMap(null);
    line.current = null;
    let path: G[] | null = null;
    if (encodedRoute) path = g.maps.geometry.encoding.decodePath(encodedRoute);
    else if (route && route.length > 1) path = route.map(([lat, lng]) => ({ lat, lng }));
    if (path) {
      line.current = new g.maps.Polyline({ map, path, strokeColor: "#0ea5e9", strokeOpacity: 0.95, strokeWeight: 6 });
      if (encodedRoute) {
        const b = new g.maps.LatLngBounds();
        path.forEach((p: G) => b.extend(p));
        map.fitBounds(b, 50);
      }
    }
  }, [map, route, encodedRoute]);

  // live location
  useEffect(() => {
    if (!map || !trackMe || !navigator.geolocation) return;
    const g = window.google;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        cb.current?.(pos);
        if (!me.current) {
          meRing.current = new g.maps.Circle({ map, center: pos, radius: p.coords.accuracy, fillColor: "#3b82f6", fillOpacity: 0.15, strokeOpacity: 0 });
          me.current = new g.maps.Marker({
            map,
            position: pos,
            zIndex: 20,
            icon: { path: g.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#3b82f6", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 },
          });
        } else {
          me.current.setPosition(pos);
          meRing.current?.setCenter(pos);
          meRing.current?.setRadius(p.coords.accuracy);
        }
        if (follow.current) map.panTo(pos);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => {
      navigator.geolocation.clearWatch(id);
      me.current?.setMap(null);
      meRing.current?.setMap(null);
      me.current = null;
      meRing.current = null;
    };
  }, [map, trackMe]);

  const btn = "press glass rounded-xl px-3 py-2 text-xs font-semibold";
  return (
    <div className={`relative w-full overflow-hidden rounded-3xl ${className}`}>
      <div ref={el} className="h-full w-full" />
      {error ? (
        <div className="absolute inset-0 grid place-items-center bg-card p-4 text-center text-sm text-muted-foreground">
          Ο χάρτης δεν φόρτωσε. Δοκίμασε ξανά αργότερα.
        </div>
      ) : (
        <div className="absolute left-2 top-2 flex gap-2">
          <button type="button" className={`${btn} ${traffic ? "ring-2 ring-brand" : ""}`} onClick={() => setTraffic(!traffic)}>Κίνηση</button>
          <button type="button" className={`${btn} ${satellite ? "ring-2 ring-brand" : ""}`} onClick={() => setSatellite(!satellite)}>Δορυφόρος</button>
          {trackMe ? (
            <button
              type="button"
              className={btn}
              onClick={() => {
                follow.current = true;
                const p = me.current?.getPosition();
                if (p && map) { map.panTo(p); map.setZoom(15); }
              }}
            >
              Η θέση μου
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
