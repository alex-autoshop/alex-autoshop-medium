import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// Auth ist nur aktiv, wenn die Supabase-Zugangsdaten als Env-Vars gesetzt sind.
export const isAuthConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = isAuthConfigured
  ? createClient(url!, key!)
  : null;
