import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isAuthConfigured } from "@/lib/supabase";

export interface CompanyProfile {
  company_name?: string;
  contact_name?: string;
  phone?: string;
  address?: string;
  // Mitgliedschaftsstufe: 0 = kein Mitglied, 1/2/3 = Level. Wird von Alex in Supabase gesetzt.
  membership_level?: number;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: CompanyProfile;
  loading: boolean;
  configured: boolean;
  signUp: (email: string, password: string, profile: CompanyProfile) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (profile: CompanyProfile) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function readProfile(user: User | null): CompanyProfile {
  const m = (user?.user_metadata ?? {}) as CompanyProfile;
  return {
    company_name: m.company_name ?? "",
    contact_name: m.contact_name ?? "",
    phone: m.phone ?? "",
    address: m.address ?? "",
    membership_level: typeof m.membership_level === "number" ? m.membership_level : 0,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp: AuthState["signUp"] = async (email, password, profile) => {
    if (!supabase) return { error: "Login ist noch nicht konfiguriert." };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { ...profile, membership_level: 0 } },
    });
    return error ? { error: error.message } : {};
  };

  const signIn: AuthState["signIn"] = async (email, password) => {
    if (!supabase) return { error: "Login ist noch nicht konfiguriert." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  const updateProfile: AuthState["updateProfile"] = async (profile) => {
    if (!supabase) return { error: "Login ist noch nicht konfiguriert." };
    const { data, error } = await supabase.auth.updateUser({ data: profile });
    if (error) return { error: error.message };
    setUser(data.user);
    return {};
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile: readProfile(user),
        loading,
        configured: isAuthConfigured,
        signUp,
        signIn,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
