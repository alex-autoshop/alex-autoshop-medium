import { useAuth } from "@/context/AuthContext";
import { istTeileboerseAdminMail, teileboerseOeffentlich, TEILEBOERSE_COOKIE } from "../../shared/teileboerse-schalter.js";

/** Sichtbar für alle, wenn der Schalter an ist — sonst nur das eine Admin-Konto. */
export function useTeileboerseSichtbar() {
  const { user, loading } = useAuth();
  if (teileboerseOeffentlich()) return { sichtbar: true, loading: false };
  return { sichtbar: istTeileboerseAdminMail(user?.email), loading };
}

/** Cookie, den die Edge-Middleware bei einem direkten Aufruf prüft. */
export function teileboerseCookieSetzen(token: string | null | undefined, email: string | null | undefined) {
  if (typeof document === "undefined") return;
  const sicher = location.protocol === "https:" ? "; Secure" : "";
  if (!teileboerseOeffentlich() && istTeileboerseAdminMail(email) && token) {
    document.cookie = `${TEILEBOERSE_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=3600; SameSite=Lax${sicher}`;
  } else {
    document.cookie = `${TEILEBOERSE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${sicher}`;
  }
}
