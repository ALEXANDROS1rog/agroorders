import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Point = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

export type RouteResult = {
  polyline: string;
  distanceMeters: number;
  durationSeconds: number;
  staticDurationSeconds: number;
  order: number[] | null;
};

/** Real road route with live traffic via Google Routes API (through the Lovable gateway). */
export const computeDeliveryRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ origin: Point, stops: z.array(Point).min(1).max(25), optimize: z.boolean() }).parse(d),
  )
  .handler(async ({ data }): Promise<RouteResult> => {
    const LOVABLE_API_KEY = process.env["LOVABLE_API_KEY"];
    const GOOGLE_MAPS_API_KEY = process.env["GOOGLE_MAPS_API_KEY"];
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) throw new Error("Δεν έχουν ρυθμιστεί οι χάρτες Google.");
    const wp = (p: { lat: number; lng: number }) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });
    const dest = data.stops[data.stops.length - 1]!;
    const inter = data.stops.slice(0, -1);
    const res = await fetch("https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration,routes.staticDuration,routes.optimizedIntermediateWaypointIndex",
      },
      body: JSON.stringify({
        origin: wp(data.origin),
        destination: wp(dest),
        intermediates: inter.map(wp),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        optimizeWaypointOrder: data.optimize && inter.length > 1,
        languageCode: "el",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Routes failed [${res.status}]: ${body}`);
      throw new Error(`Αποτυχία υπολογισμού διαδρομής (${res.status}).`);
    }
    const json = (await res.json()) as {
      routes?: Array<{
        polyline?: { encodedPolyline?: string };
        distanceMeters?: number;
        duration?: string;
        staticDuration?: string;
        optimizedIntermediateWaypointIndex?: number[];
      }>;
    };
    const r = json.routes?.[0];
    if (!r?.polyline?.encodedPolyline) throw new Error("Δεν βρέθηκε διαδρομή.");
    const secs = (s?: string) => Number((s ?? "0s").replace("s", ""));
    const idx = r.optimizedIntermediateWaypointIndex;
    return {
      polyline: r.polyline.encodedPolyline,
      distanceMeters: r.distanceMeters ?? 0,
      durationSeconds: secs(r.duration),
      staticDurationSeconds: secs(r.staticDuration),
      order: idx && idx.length && idx[0] !== -1 ? [...idx, inter.length] : null,
    };
  });
