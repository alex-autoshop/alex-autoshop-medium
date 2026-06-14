import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Öffentliche Zugangsdaten (anon/publishable key — von Supabase bewusst für den
// Browser gedacht, geschützt durch Row Level Security). Dienen als Fallback,
// falls die Vercel-Env-Variablen fehlen oder fehlerhaft eingetragen wurden.
const FALLBACK_URL = "https://zasbdvtsxgimcezotlsi.supabase.co";
const FALLBACK_KEY = "sb_publishable_hMoY8Rgjjb9cvmeMaTEJoQ_AkBoF3FX";

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// Werte säubern (Leerzeichen, Anführungszeichen, mitkopiertes "NAME=").
function clean(v: string | undefined): string | undefined {
  if (!v) return undefined;
  let s = v.trim().replace(/^["']|["']$/g, "");
  if (s.includes("=")) s = s.split("=").slice(1).join("=").trim();
  return s.replace(/\/+$/, "") || undefined; // Schrägstrich am Ende entfernen
}

const envUrl = clean(rawUrl);
const envKey = clean(rawKey);

// Env-Wert nur nutzen, wenn er plausibel ist — sonst Fallback (verhindert die
// ganze "falsche URL"-Problematik).
const url = envUrl && /^https:\/\/.+\.supabase\.co$/i.test(envUrl) ? envUrl : FALLBACK_URL;
const key = envKey && envKey.startsWith("sb_") ? envKey : FALLBACK_KEY;

let client: SupabaseClient | null = null;
try {
  client = createClient(url, key);
} catch (e) {
  console.error("Supabase-Init fehlgeschlagen:", e);
  client = null;
}

export const supabase = client;
export const isAuthConfigured = client !== null;
