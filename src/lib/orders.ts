import { supabase } from "@/lib/supabase";

export interface OrderItem {
  variantId: string;
  variantTitle: string;
  title: string;
  handle: string;
  image: string;
  price: { amount: string; currencyCode: string };
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  total: number;
  currency: string;
  status: string; // gestartet | bestaetigt | storniert
  created_at: string;
}

export async function recordOrder(order: {
  userId: string;
  items: OrderItem[];
  total: number;
  currency: string;
  status?: string;
}): Promise<{ error?: string; orderId?: string }> {
  if (!supabase) return { error: "nicht konfiguriert" };
  const { data, error } = await supabase.from("orders").insert({
    user_id: order.userId,
    items: order.items,
    total: order.total,
    currency: order.currency,
    ...(order.status ? { status: order.status } : {}),
  }).select("id").single();
  return { error: error?.message, orderId: data?.id };
}

export async function getOrders(userId: string): Promise<Order[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as Order[]) ?? [];
}
