import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type Delivery = Database["public"]["Tables"]["deliveries"]["Row"];

export type OrderStatus =
  | "new"
  | "preparing"
  | "ready"
  | "delivering"
  | "delivered"
  | "cancelled";

export const ORDER_STATUSES: OrderStatus[] = [
  "new",
  "preparing",
  "ready",
  "delivering",
  "delivered",
  "cancelled",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Νέα",
  preparing: "Σε προετοιμασία",
  ready: "Έτοιμη",
  delivering: "Σε διανομή",
  delivered: "Παραδόθηκε",
  cancelled: "Ακυρώθηκε",
};

/** Chip styles per status — all values come from design tokens. */
export const ORDER_STATUS_CHIP: Record<OrderStatus, string> = {
  new: "text-accent bg-accent/15",
  preparing: "text-warning bg-warning/15",
  ready: "text-brand bg-brand/15",
  delivering: "text-info bg-info/15",
  delivered: "text-brand bg-brand/20",
  cancelled: "text-destructive bg-destructive/15",
};

export const OPEN_DELIVERY_STATUSES: OrderStatus[] = ["ready", "delivering", "preparing", "new"];

export const UNITS = ["τεμ.", "καρτέλα", "κιλό", "δέμα", "λίτρο", "σακί"];

export const PRODUCT_CATEGORIES = [
  "Πουλερικά",
  "Αυγά",
  "Κρέας",
  "Λαχανικά",
  "Φρούτα",
  "Γαλακτοκομικά",
  "Άλλο",
];

export function formatCurrency(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return `${amount.toLocaleString("el-GR", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} €`;
}

export function formatQuantity(value: number | string): string {
  const n = Number(value);
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase() || "—"
  );
}

/** Normalises a Greek phone number so duplicates are detected reliably. */
export function normalizePhone(phone: string): string {
  const digits = (phone ?? "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+30")) return digits.slice(3);
  if (digits.startsWith("0030")) return digits.slice(4);
  return digits;
}

export function telHref(phone: string): string {
  return `tel:${normalizePhone(phone)}`;
}

/** Opens Google Maps on Android/desktop and Apple Maps on iOS. */
export function navigationHref(opts: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}): string {
  const hasCoords =
    typeof opts.latitude === "number" && typeof opts.longitude === "number";
  const destination = hasCoords
    ? `${opts.latitude},${opts.longitude}`
    : (opts.address ?? "");
  const isApple =
    typeof navigator !== "undefined" && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  if (isApple) {
    return `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/** Haversine distance in km — used for the simple nearest-first route ordering. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
