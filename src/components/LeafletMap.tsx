import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  tone?: "brand" | "accent" | "warning";
};

function pinIcon(marker: MapMarker, active: boolean) {
  const tone = marker.tone ?? "brand";
  const color =
    tone === "accent"
      ? "oklch(0.71 0.135 234.5)"
      : tone === "warning"
        ? "oklch(0.83 0.145 84.4)"
        : "oklch(0.72 0.168 162.5)";
  const size = active ? 40 : 32;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};display:grid;place-items:center;color:#04120b;font:700 ${
      active ? 14 : 12
    }px Inter,sans-serif;box-shadow:0 0 0 4px rgba(255,255,255,.14);">${marker.label}</div>`,
  });
}

function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      const first = markers[0]!;
      map.setView([first.lat, first.lng], 14);
      return;
    }
    map.fitBounds(
      markers.map((m) => [m.lat, m.lng] as [number, number]),
      { padding: [40, 40] },
    );
  }, [map, markers]);
  return null;
}

export default function LeafletMap({
  markers,
  route,
  selectedId,
  onSelect,
  className = "h-[320px]",
}: {
  markers: MapMarker[];
  route?: [number, number][];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const center: [number, number] = markers.length
    ? [markers[0]!.lat, markers[0]!.lng]
    : [37.9838, 23.7275];

  return (
    <div className={`w-full overflow-hidden rounded-3xl ${className}`}>
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap, &copy; CARTO'
        />
        {route && route.length > 1 ? (
          <Polyline positions={route} pathOptions={{ color: "oklch(0.72 0.168 162.5)", weight: 4 }} />
        ) : null}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={pinIcon(marker, selectedId === marker.id)}
            eventHandlers={{ click: () => onSelect?.(marker.id) }}
          />
        ))}
        <FitBounds markers={markers} />
      </MapContainer>
    </div>
  );
}
