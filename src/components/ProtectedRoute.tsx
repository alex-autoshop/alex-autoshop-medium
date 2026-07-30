import { Navigate, useLocation, Link } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({
  children,
  preview,
}: {
  children: React.ReactNode;
  preview?: boolean;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        Lädt …
      </div>
    );
  }

  if (!user) {
    if (preview) {
      return (
        <div className="relative overflow-hidden">
          {/* Seiteninhalt — weichgezeichnet, nicht anklickbar */}
          <div
            className="pointer-events-none select-none"
            style={{ filter: "blur(7px)", opacity: 0.45 }}
            aria-hidden="true"
          >
            {children}
          </div>

          {/* Login-Overlay */}
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center px-4"
            style={{
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(3px)",
              backgroundColor: "rgba(8,8,8,0.65)",
            }}
          >
            <div className="w-full max-w-[370px] bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-7 pt-7 pb-5 text-center">
                <img
                  src="/images/logo-cropped.png"
                  alt="Alex Autoshop"
                  className="h-10 mx-auto mb-5"
                />
                <h2 className="text-2xl font-bold text-white mb-1.5">Teilebörse</h2>
                <p className="text-sm text-white/50 leading-snug">
                  Melde dich an, um Autoteile zu suchen,<br />
                  Preise zu vergleichen und zu bestellen.
                </p>
              </div>

              <div className="px-7 pb-7 flex flex-col gap-3">
                <Link
                  to="/konto"
                  state={{ from: location.pathname }}
                  className="flex items-center justify-center gap-2 w-full bg-gold-bright text-night font-bold py-3.5 rounded-xl hover:brightness-95 active:scale-[0.98] transition-all text-[15px]"
                >
                  <LogIn className="w-4 h-4" />
                  Anmelden
                </Link>
                <Link
                  to="/konto"
                  state={{ from: location.pathname, tab: "register" }}
                  className="flex items-center justify-center gap-2 w-full bg-white/10 text-white font-semibold py-3.5 rounded-xl hover:bg-white/15 active:scale-[0.98] transition-all text-[15px] border border-white/10"
                >
                  <UserPlus className="w-4 h-4" />
                  Konto erstellen
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return <Navigate to="/konto" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
