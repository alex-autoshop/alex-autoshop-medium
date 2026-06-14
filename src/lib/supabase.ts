import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// Werte säubern (Leerzeichen, Anführungszeichen, Schrägstrich am Ende, versehentlich
// mitkopierte "NAME=" Präfixe) — verhindert Abstürze durch kleine Tippfehler.
function clean(v: string | undefined): string | undefined {
  if (!v) return undefined;
  let s = v.trim().replace(/^["']|["']$/g, "");
  if (s.includes("=")) s = s.split("=").slice(1).join("=").trim(); // "VITE_..=https://x" -> "https://x"
  return s || undefined;
}

const url = clean(rawUrl);
const key = clean(rawKey);

let client: SupabaseClient | null = null;
let configured = false;

// createClient kann bei ungültiger URL werfen — abfangen, damit die Seite nie weiß wird.
try {
  if (url && /^https?:\/\//i.test(url) && key) {
    client = createClient(url, key);
    configured = true;
  } else if (url || key) {
    console.error("Supabase: URL/Key ungültig oder unvollständig.", { url });
  }
} catch (e) {
  console.error("Supabase-Init fehlgeschlagen:", e);
  client = null;
  configured = false;
}

export const supabase = client;
export const isAuthConfigured = configured;
