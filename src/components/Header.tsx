import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingCart, Phone, LayoutDashboard, LogIn, LogOut, Bell } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { CartDrawer } from "@/components/CartDrawer";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/context/AuthContext";
import { useUnread } from "@/hooks/useUnread";
import { SHOP_INFO } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

// Karo Fahrzeugmarkt — eigenständige App auf GitHub Pages
const FAHRZEUGMARKT_URL = "https://alex-autoshop.github.io/fahrzeugmarkt/";

const NAV: Array<{ to: string; label: string; href?: string; beta?: boolean }> = [
  { to: "/shop", label: "Shop" },
  { to: "/teileportal", label: "Teileportal", beta: true },
  // Fahrzeugmarkt bewusst ausgeblendet (in Arbeit) — Seite bleibt unter /fahrzeugmarkt erreichbar
  { to: "/mitgliedschaft", label: "Mitgliedschaft" },
  { to: "/laden", label: "Laden & Kontakt" },
];

const NAV_BASE = "px-3 py-3 rounded-lg font-medium transition-colors min-h-[48px] flex items-center whitespace-nowrap shrink-0";

const BetaBadge = ({ className = "" }: { className?: string }) => (
  <span
    className={cn(
      "ml-1.5 rounded bg-gold-bright/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gold-bright",
      className
    )}
  >
    Beta
  </span>
);

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const cartOpen = useCartStore((s) => s.isOpen);
  const openCart = useCartStore((s) => s.openCart);
  const closeCart = useCartStore((s) => s.closeCart);
  const itemCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const { user, signOut } = useAuth();
  const unread = useUnread();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    setMobileOpen(false);
    navigate("/");
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-night/95 backdrop-blur-md border-b border-white/10 text-white">
        <div className="container flex items-center justify-between h-20 sm:h-24 gap-2">
          <Link to="/" className="flex items-center shrink-0" onClick={() => setMobileOpen(false)}>
            {/* Eng zugeschnittenes farbiges Logo (leerer Rand entfernt) fuer dunkle Navbar */}
            <img src="/images/logo-cropped.png" alt="Alex Autoshop" className="h-11 sm:h-14 w-auto" />
          </Link>

          <nav className="hidden xl:flex items-center gap-0.5">
            {NAV.map((item) =>
              item.href ? (
                <a
                  key={item.to}
                  href={item.href}
                  className={cn(NAV_BASE, "text-white/75 hover:text-white hover:bg-white/10")}
                >
                  {item.label}
                  {item.beta && <BetaBadge />}
                </a>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      NAV_BASE,
                      isActive
                        ? "text-gold-bright bg-white/10"
                        : "text-white/75 hover:text-white hover:bg-white/10"
                    )
                  }
                >
                  {item.label}
                  {item.beta && <BetaBadge />}
                </NavLink>
              )
            )}
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            <a
              href={`tel:${SHOP_INFO.phoneIntl}`}
              className="hidden 2xl:flex items-center gap-2 text-sm font-semibold text-white/75 hover:text-gold-bright transition-colors px-3 min-h-[48px] whitespace-nowrap"
            >
              <Phone className="w-4 h-4" />
              {SHOP_INFO.phone}
            </a>
            {user ? (
              <div className="hidden xl:flex items-center gap-1">
                <NavLink
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-3 min-h-[48px] rounded-lg font-medium text-white/75 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                  <LayoutDashboard className="w-5 h-5" /> Dashboard
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center w-12 h-12 rounded-lg text-white/75 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Abmelden"
                  title="Abmelden"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/konto"
                className="hidden xl:inline-flex items-center gap-2 px-4 min-h-[48px] rounded-lg font-semibold bg-gold-bright text-night hover:brightness-95 transition-all whitespace-nowrap"
              >
                <LogIn className="w-4 h-4" /> Login / Registrieren
              </Link>
            )}

            {user && (
              <Link
                to="/dashboard?tab=inbox"
                className="relative flex items-center justify-center w-12 h-12 rounded-lg text-white hover:bg-white/10 transition-colors"
                aria-label="Nachrichten"
                title="Nachrichten"
              >
                <Bell className="w-6 h-6" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gold-bright text-night text-xs font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            )}

            <LanguageSwitcher tone="dark" />

            <button
              onClick={openCart}
              className="relative flex items-center justify-center w-12 h-12 rounded-lg text-white hover:bg-white/10 transition-colors"
              aria-label="Warenkorb öffnen"
            >
              <ShoppingCart className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-gold-bright text-night text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="xl:hidden flex items-center justify-center w-12 h-12 rounded-lg text-white hover:bg-white/10 transition-colors"
              aria-label="Menü"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="xl:hidden border-t border-white/10 bg-night animate-fade-up">
            <div className="container py-3 flex flex-col gap-1">
              {NAV.map((item) => {
                const mBase = "px-4 py-4 rounded-lg font-semibold text-lg min-h-[52px] flex items-center";
                return item.href ? (
                  <a
                    key={item.to}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(mBase, "text-white/85 hover:bg-white/10")}
                  >
                    {item.label}
                    {item.beta && <BetaBadge />}
                  </a>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(mBase, isActive ? "text-gold-bright bg-white/10" : "text-white/85 hover:bg-white/10")
                    }
                  >
                    {item.label}
                    {item.beta && <BetaBadge />}
                  </NavLink>
                );
              })}
              <a
                href={`tel:${SHOP_INFO.phoneIntl}`}
                className="px-4 py-4 rounded-lg font-semibold text-lg min-h-[52px] flex items-center gap-2 text-gold-bright"
              >
                <Phone className="w-5 h-5" /> {SHOP_INFO.phone}
              </a>

              <div className="border-t border-white/10 mt-1 pt-2">
                {user ? (
                  <>
                    <NavLink
                      to="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="px-4 py-4 rounded-lg font-semibold text-lg min-h-[52px] flex items-center gap-2 text-white/85 hover:bg-white/10"
                    >
                      <LayoutDashboard className="w-5 h-5" /> Dashboard
                    </NavLink>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-4 rounded-lg font-semibold text-lg min-h-[52px] flex items-center gap-2 text-white/85 hover:bg-white/10"
                    >
                      <LogOut className="w-5 h-5" /> Abmelden
                    </button>
                  </>
                ) : (
                  <NavLink
                    to="/konto"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-4 rounded-lg font-semibold text-lg min-h-[52px] flex items-center gap-2 text-gold-bright"
                  >
                    <LogIn className="w-5 h-5" /> Login / Registrieren
                  </NavLink>
                )}
              </div>
            </div>
          </nav>
        )}
      </header>

      <CartDrawer open={cartOpen} onClose={closeCart} />
    </>
  );
}
