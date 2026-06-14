import { supabase } from "@/lib/supabase";

// Admin-Konten (sehen eingehende Mitgliedschaftsanfragen + können freischalten).
// Muss mit den E-Mails in supabase-admin-approve.sql übereinstimmen.
export const ADMIN_EMAILS = ["alexanderharitopoulos@gmail.com", "info@alex-autoshop.de"];

export interface Message {
  id: string;
  recipient: string;
  sender_name: string | null;
  type: "system" | "membership" | "offer" | "dealer";
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

export interface MembershipRequest {
  id: string;
  user_id: string | null;
  email: string;
  level: number;
  modules: string[] | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export async function getMessages(userId: string): Promise<Message[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("recipient", userId)
    .order("created_at", { ascending: false });
  return (data as Message[]) ?? [];
}

export async function getUnreadCount(userId: string): Promise<number> {
  if (!supabase) return 0;
  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("recipient", userId)
    .eq("read", false);
  return count ?? 0;
}

export async function markRead(id: string) {
  if (!supabase) return;
  await supabase.from("messages").update({ read: true }).eq("id", id);
}

export async function markAllRead(userId: string) {
  if (!supabase) return;
  await supabase.from("messages").update({ read: true }).eq("recipient", userId).eq("read", false);
}

export async function sendMessage(msg: {
  recipient: string;
  title: string;
  body?: string;
  type?: Message["type"];
  sender_name?: string;
}) {
  if (!supabase) return { error: "nicht konfiguriert" };
  const { error } = await supabase.from("messages").insert({
    recipient: msg.recipient,
    title: msg.title,
    body: msg.body ?? null,
    type: msg.type ?? "system",
    sender_name: msg.sender_name ?? null,
  });
  return { error: error?.message };
}

// Mitgliedschaftsanfrage absenden (auch ohne Login möglich).
export async function requestMembership(req: {
  level: number;
  modules: string[];
  email: string;
  userId?: string | null;
}): Promise<{ error?: string }> {
  if (!supabase) return { error: "Login/Datenbank ist noch nicht konfiguriert." };
  const { error } = await supabase.from("membership_requests").insert({
    user_id: req.userId ?? null,
    email: req.email,
    level: req.level,
    modules: req.modules,
  });
  if (error) return { error: error.message };

  // Bestätigung in die eigene Inbox (nur wenn eingeloggt)
  if (req.userId) {
    await sendMessage({
      recipient: req.userId,
      type: "membership",
      title: `Anfrage für Level ${req.level} eingegangen`,
      body: `Danke! Wir haben deine Mitgliedschaftsanfrage (Level ${req.level}, Module: ${req.modules.join(", ") || "alle"}) erhalten und melden uns. Sobald sie freigeschaltet ist, erscheint dein Rabatt hier im Dashboard.`,
    });
  }
  return {};
}

// --- Admin ---
export async function getPendingRequests(): Promise<MembershipRequest[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("membership_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data as MembershipRequest[]) ?? [];
}

export async function acceptRequest(req: MembershipRequest): Promise<{ error?: string }> {
  if (!supabase) return { error: "nicht konfiguriert" };
  // Sichere DB-Funktion: setzt die Rabattstufe + schickt die Bestätigung.
  const { error } = await supabase.rpc("approve_membership_request", { req_id: req.id });
  return error ? { error: error.message } : {};
}
