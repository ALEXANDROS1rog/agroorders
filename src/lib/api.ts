import { supabase } from "@/integrations/supabase/client";
import type { Customer, Order, OrderItem, OrderStatus, Product } from "@/lib/domain";
import { normalizePhone } from "@/lib/domain";

export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Δεν είσαι συνδεδεμένος.");
  return data.user.id;
}

/* ---------------------------------- profile --------------------------------- */

export async function fetchProfile() {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/* --------------------------------- products -------------------------------- */

export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type ProductInput = {
  id?: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  available: boolean;
};

export async function saveProduct(input: ProductInput) {
  const userId = await requireUserId();
  if (input.id) {
    const { error } = await supabase
      .from("products")
      .update({
        name: input.name,
        category: input.category,
        price: input.price,
        unit: input.unit,
        available: input.available,
      })
      .eq("id", input.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("products").insert({
    user_id: userId,
    name: input.name,
    category: input.category,
    price: input.price,
    unit: input.unit,
    available: input.available,
  });
  if (error) throw error;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleProductAvailable(id: string, available: boolean) {
  const { error } = await supabase.from("products").update({ available }).eq("id", id);
  if (error) throw error;
}

/* --------------------------------- customers -------------------------------- */

export async function fetchCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchCustomer(id: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("phone", normalized)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type CustomerInput = {
  id?: string;
  full_name: string;
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  notes: string;
};

export async function saveCustomer(input: CustomerInput): Promise<Customer> {
  const userId = await requireUserId();
  const payload = {
    full_name: input.full_name,
    phone: normalizePhone(input.phone),
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    notes: input.notes,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("customers")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  // Duplicate protection: same phone for the same farmer reuses the customer.
  const existing = await findCustomerByPhone(payload.phone);
  if (existing) {
    const { data, error } = await supabase
      .from("customers")
      .update({
        full_name: payload.full_name || existing.full_name,
        address: payload.address || existing.address,
        latitude: payload.latitude ?? existing.latitude,
        longitude: payload.longitude ?? existing.longitude,
        notes: payload.notes || existing.notes,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({ ...payload, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCustomer(id: string) {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------------- orders ---------------------------------- */

export type OrderWithRelations = Order & {
  customer: Customer | null;
  order_items: OrderItem[];
  deliveries: { id: string; status: string; delivered_at: string | null }[];
};

const ORDER_SELECT =
  "*, customer:customers(*), order_items(*), deliveries(id, status, delivered_at)";

export async function fetchOrders(): Promise<OrderWithRelations[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("order_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as OrderWithRelations[];
}

export async function fetchOrder(id: string): Promise<OrderWithRelations | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as OrderWithRelations | null;
}

export async function fetchCustomerOrders(customerId: string): Promise<OrderWithRelations[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("customer_id", customerId)
    .order("order_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as OrderWithRelations[];
}

export type NewOrderItem = {
  product_id: string | null;
  product_name: string;
  unit: string;
  unit_price: number;
  quantity: number;
};

export type NewOrderInput = {
  customer_id: string | null;
  address: string;
  phone: string;
  notes: string;
  status: OrderStatus;
  source?: string;
  route_id?: string | null;
  items: NewOrderItem[];
};

export async function createOrder(input: NewOrderInput): Promise<string> {
  const userId = await requireUserId();
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      customer_id: input.customer_id,
      address: input.address,
      phone: normalizePhone(input.phone),
      notes: input.notes,
      status: input.status,
      source: input.source ?? "manual",
      route_id: input.route_id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  if (input.items.length > 0) {
    // Unit prices are copied into the order, so historical totals never change.
    const { error: itemsError } = await supabase.from("order_items").insert(
      input.items.map((item) => ({
        user_id: userId,
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        unit: item.unit,
        unit_price: item.unit_price,
        quantity: item.quantity,
      })),
    );
    if (itemsError) throw itemsError;
  }

  const { error: deliveryError } = await supabase.from("deliveries").insert({
    user_id: userId,
    order_id: order.id,
    status: "pending",
  });
  if (deliveryError) throw deliveryError;

  return order.id;
}

const DELIVERY_STATUS_FOR_ORDER: Record<OrderStatus, string> = {
  new: "pending",
  preparing: "pending",
  ready: "pending",
  delivering: "in_progress",
  delivered: "delivered",
  cancelled: "cancelled",
};

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw error;

  const deliveryStatus = DELIVERY_STATUS_FOR_ORDER[status];
  const { error: deliveryError } = await supabase
    .from("deliveries")
    .update({
      status: deliveryStatus,
      delivered_at: status === "delivered" ? new Date().toISOString() : null,
    })
    .eq("order_id", orderId);
  if (deliveryError) throw deliveryError;
}

export async function deleteOrder(orderId: string) {
  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) throw error;
}

/* -------------------------------- deliveries -------------------------------- */

export type DeliveryWithOrder = {
  id: string;
  status: string;
  delivered_at: string | null;
  route_position: number | null;
  order: OrderWithRelations;
};

export async function fetchDeliveries(): Promise<DeliveryWithOrder[]> {
  const { data, error } = await supabase
    .from("deliveries")
    .select(`id, status, delivered_at, route_position, order:orders(${ORDER_SELECT})`)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as DeliveryWithOrder[]).filter((d) => d.order);
}

export async function markDelivered(
  deliveryId: string,
  orderId: string,
  gps?: { lat: number; lng: number; auto: boolean },
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("deliveries")
    .update({
      status: "delivered",
      delivered_at: now,
      delivered_lat: gps?.lat ?? null,
      delivered_lng: gps?.lng ?? null,
      auto_confirmed: gps?.auto ?? false,
    })
    .eq("id", deliveryId);
  if (error) throw error;
  const { error: orderError } = await supabase
    .from("orders")
    .update({ status: "delivered" })
    .eq("id", orderId);
  if (orderError) throw orderError;
}

export async function saveRoutePositions(entries: { id: string; position: number }[]) {
  for (const entry of entries) {
    const { error } = await supabase
      .from("deliveries")
      .update({ route_position: entry.position })
      .eq("id", entry.id);
    if (error) throw error;
  }
}

/* ------------------------------ helper selectors ----------------------------- */

export function orderTotal(order: { order_items?: OrderItem[]; total?: number | string }) {
  if (order.order_items && order.order_items.length > 0) {
    return order.order_items.reduce(
      (sum, item) => sum + Number(item.unit_price) * Number(item.quantity),
      0,
    );
  }
  return Number(order.total ?? 0);
}

export function isToday(value: string | null | undefined): boolean {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export function availableProducts(products: Product[]) {
  return products.filter((p) => p.available);
}

/* ---------------------------------- trips ----------------------------------- */
// "Δρομολόγια" are stored in delivery_routes. Totals are kept by database triggers.

export type Trip = {
  id: string;
  route_date: string;
  fuel: number;
  tolls: number;
  wear: number;
  food: number;
  total_expenses: number;
  total_order_value: number;
  net_route_value: number;
  created_at: string;
};

export type TripWithOrders = Trip & { orders: OrderWithRelations[] };

/** Local calendar date as YYYY-MM-DD (no timezone shift). */
export function localDateKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function formatTripDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}/${y}`;
}

export async function fetchTrips(): Promise<TripWithOrders[]> {
  const { data, error } = await supabase
    .from("delivery_routes")
    .select(`*, orders(${ORDER_SELECT})`)
    .order("route_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TripWithOrders[];
}

export async function fetchTrip(id: string): Promise<TripWithOrders | null> {
  const { data, error } = await supabase
    .from("delivery_routes")
    .select(`*, orders(${ORDER_SELECT})`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as TripWithOrders | null;
}

export type TripInput = { route_date: string; fuel: number; tolls: number; wear: number; food: number };

export async function createTrip(input: TripInput): Promise<string> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("delivery_routes")
    .insert({ ...input, user_id: userId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateTripExpenses(id: string, input: Omit<TripInput, "route_date">) {
  const { error } = await supabase.from("delivery_routes").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteTrip(id: string) {
  const { error } = await supabase.from("delivery_routes").delete().eq("id", id);
  if (error) throw error;
}

export async function setOrderTrip(orderId: string, tripId: string | null) {
  const { error } = await supabase.from("orders").update({ route_id: tripId }).eq("id", orderId);
  if (error) throw error;
}

/** Live trip numbers computed from its (non-cancelled) orders. */
export function tripNumbers(t: TripWithOrders) {
  const valid = t.orders.filter((o) => o.status !== "cancelled");
  const revenue = valid.reduce((s, o) => s + orderTotal(o), 0);
  const expenses = Number(t.fuel) + Number(t.tolls) + Number(t.wear) + Number(t.food);
  return { count: valid.length, revenue, expenses, net: revenue - expenses };
}

/** Groups identical products of non-cancelled orders and sums quantities. */
export function loadingList(orders: OrderWithRelations[]) {
  const map = new Map<string, { name: string; unit: string; qty: number }>();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    for (const i of o.order_items) {
      const k = i.product_id ?? i.product_name;
      const cur = map.get(k) ?? { name: i.product_name, unit: i.unit, qty: 0 };
      cur.qty += Number(i.quantity);
      map.set(k, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty);
}

export async function updateProfile(input: { first_name: string; last_name: string; business_name: string; phone: string; email: string; preferred_language: string }) {
  const userId = await requireUserId();
  const { error } = await supabase.from("profiles").update(input).eq("id", userId);
  if (error) throw error;
}

export async function startDelivery(orderId: string) {
  await updateOrderStatus(orderId, "delivering");
}
