import { lazy, Suspense, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingCart, Phone, LayoutDashboard, LogIn, LogOut, ChevronDown } from "lucide-react";
import { SHOP_CATEGORIES, kategoriePfad, menueKinder, unterkategoriePfad } from "@/lib/shopCategories";
import { useCartStore } from "@/stores/cartStore";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_EMAILS } from "@/lib/adminEmails";
import { useTeileboerseSichtbar } from "@/lib/teileboerseSichtbar";
import { SHOP_INFO } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

const CartDrawer = lazy(() => import("@/components/CartDrawer").then((m) => ({ default: m.CartDrawer })));

type NavPunkt = { to: string; label: string; href?: string; beta?: boolean };

// Die Fahrzeugbörse ist noch nicht öffentlich — sie taucht nur im Menü des
// Admin-Kontos auf. Zum Freischalten: Eintrag nach NAV verschieben.
const NAV_ADMIN: NavPunkt[] = [
  { to: "/fahrzeugboerse", label: "Fahrzeugbörse" },
  { to: "/intern/gefahrstoffe", label: "Gefahrstoffe" },
];

const NAV: NavPunkt[] = [
  { to: "/shop", label: "Shop" },
  { to: "/teile-agent", label: "Teile-Agent" },
  { to: "/teileboerse", label: "Teilebörse" },
  { to: "/mitgliedschaft", label: "Mitgliedschaft" },
  { to: "/laden", label: "Laden & Kontakt" },
];

const NAV_BASE = "px-3 py-3 rounded-lg font-medium transition-colors min-h-[48px] flex items-center whitespace-nowrap shrink-0";

const BetaBadge = ({ className = "" }: { className?: string }) => (
  <span
    className={cn(
      "ml-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest",
      "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
      className
    )}
  >
    NEU
  </span>
);

/** Kategorieleiste (Desktop): Hauptkategorien, Hover öffnet die Unterkategorien. */
function KategorieLeiste() {
  const [offen, setOffen] = useState<string | null>(null);
  return (
    <div className="hidden lg:block border-t border-white/10">
      <nav aria-label="Kategorien" className="container flex items-stretch justify-between">
        {SHOP_CATEGORIES.map((cat, i) => {
          const kinder = menueKinder(cat.children);
          const rechts = i >= SHOP_CATEGORIES.length - 2;
          return (
            <div
              key={cat.handle}
              className="relative"
              onMouseEnter={() => setOffen(cat.handle)}
              onMouseLeave={() => setOffen((o) => (o === cat.handle ? null : o))}
              onFocus={() => setOffen(cat.handle)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOffen(null);
              }}
            >
              <NavLink
                to={kategoriePfad(cat.handle)}
                onClick={() => setOffen(null)}
                aria-haspopup={kinder.length > 0 || undefined}
                aria-expanded={kinder.length > 0 ? offen === cat.handle : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1 px-2 min-h-[44px] text-sm font-semibold whitespace-nowrap transition-colors border-b-2",
                    isActive || offen === cat.handle
                      ? "text-gold-bright border-gold-bright"
                      : "text-white/80 border-transparent hover:text-white"
                  )
                }
              >
                {cat.label}
                {kinder.length > 0 && <ChevronDown className="w-3.5 h-3.5 opacity-70" />}
              </NavLink>
              {kinder.length > 0 && offen === cat.handle && (
                <div className={cn("absolute top-full z-50 pt-1", rechts ? "right-0" : "left-0")}>
                  <div className="w-72 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card text-foreground shadow-2xl p-2">
                    <Link
                      to={kategoriePfad(cat.handle)}
                      onClick={() => setOffen(null)}
                      className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-primary hover:bg-muted/60"
                    >
                      Alle {cat.label}
                    </Link>
                    <div className="h-px bg-border/60 mx-2 my-1" />
                    {kinder.map((sub) => (
                      <NavLink
                        key={sub.handle}
                        to={unterkategoriePfad(sub)}
                        onClick={() => setOffen(null)}
                        className={({ isActive }) =>
                          cn(
                            "block px-3 py-2.5 rounded-xl text-sm transition-colors",
                            sub.accent
                              ? "font-semibold text-primary hover:bg-muted/60"
                              : isActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-muted/60 text-foreground/85",
                            sub.accent && isActive && "bg-primary/10"
                          )
                        }
                      >
                        {sub.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

/** Kategorien im Burger-Menü: aufklappbare Hauptkategorien. */
function KategorieAkkordeon({ onNavigate }: { onNavigate: () => void }) {
  const [offen, setOffen] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1 pb-2 mb-1 border-b border-white/10">
      <p className="px-4 pt-1 pb-1 text-[11px] font-bold uppercase tracking-widest text-white/45">Kategorien</p>
      {SHOP_CATEGORIES.map((cat) => {
        const kinder = menueKinder(cat.children);
        const auf = offen === cat.handle;
        if (kinder.length === 0) {
          return (
            <NavLink
              key={cat.handle}
              to={kategoriePfad(cat.handle)}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn("px-4 py-3 rounded-lg font-semibold text-base min-h-[48px] flex items-center", isActive ? "text-gold-bright bg-white/10" : "text-white/85 hover:bg-white/10")
              }
            >
              {cat.label}
            </NavLink>
          );
        }
        return (
          <div key={cat.handle}>
            <button
              type="button"
              onClick={() => setOffen(auf ? null : cat.handle)}
              aria-expanded={auf}
              className="w-full px-4 py-3 rounded-lg font-semibold text-base min-h-[48px] flex items-center justify-between text-white/85 hover:bg-white/10"
            >
              {cat.label}
              <ChevronDown className={cn("w-5 h-5 transition-transform", auf && "rotate-180")} />
            </button>
            {auf && (
              <div className="ml-4 pl-3 border-l border-white/15 flex flex-col">
                <NavLink
                  to={kategoriePfad(cat.handle)}
                  end
                  onClick={onNavigate}
                  className="px-3 py-2.5 min-h-[44px] flex items-center text-sm font-semibold text-gold-bright"
                >
                  Alle {cat.label}
                </NavLink>
                {kinder.map((sub) => (
                  <NavLink
                    key={sub.handle}
                    to={unterkategoriePfad(sub)}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "px-3 py-2.5 min-h-[44px] flex items-center text-sm rounded-lg",
                        sub.accent
                          ? "font-semibold text-gold-bright"
                          : isActive
                            ? "text-gold-bright bg-white/10"
                            : "text-white/75 hover:bg-white/10",
                        sub.accent && isActive && "bg-white/10"
                      )
                    }
                  >
                    {sub.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const cartOpen = useCartStore((s) => s.isOpen);
  const openCart = useCartStore((s) => s.openCart);
  const closeCart = useCartStore((s) => s.closeCart);
  const itemCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const { user, signOut } = useAuth();
  const istAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);
  const { sichtbar: teileSichtbar } = useTeileboerseSichtbar();
  const navPunkte = NAV.flatMap((item) => {
    if (item.to === "/teileboerse" && !teileSichtbar) return [];
    if (item.to === "/laden" && istAdmin) return [...NAV_ADMIN, item];
    return [item];
  });
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    setMobileOpen(false);
    navigate("/");
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-night/95 backdrop-blur-md border-b border-white/10 text-white pt-[env(safe-area-inset-top)]">
        <div className="container flex items-center justify-between h-20 sm:h-24 gap-2">
          <Link to="/" className="flex items-center shrink-0" onClick={() => setMobileOpen(false)}>
            {/* Eng zugeschnittenes farbiges Logo (leerer Rand entfernt) fuer dunkle Navbar */}
            <img src="/images/opt/logo.webp" alt="Alex Autoshop" width={107} height={56} className="h-11 sm:h-14 w-auto" />
          </Link>

          <nav className="hidden xl:flex items-center gap-0.5">
            {navPunkte.map((item) =>
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
                  className={({ isActive }) => cn(
                    "inline-flex items-center gap-2 px-3 min-h-[48px] rounded-lg font-medium transition-colors whitespace-nowrap",
                    isActive ? "text-gold-bright bg-white/10" : "text-white/75 hover:text-white hover:bg-white/10"
                  )}
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

        <KategorieLeiste />

        {mobileOpen && (
          <nav className="xl:hidden border-t border-white/10 bg-night animate-fade-up">
            <div className="container py-3 flex flex-col gap-1 max-h-[calc(100dvh-6rem)] overflow-y-auto">
              <KategorieAkkordeon onNavigate={() => setMobileOpen(false)} />
              {navPunkte.map((item) => {
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
                      className={({ isActive }) => cn(
                        "px-4 py-4 rounded-lg font-semibold text-lg min-h-[52px] flex items-center gap-2 hover:bg-white/10",
                        isActive ? "text-gold-bright bg-white/10" : "text-white/85"
                      )}
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

      {cartOpen && (
        <Suspense fallback={null}>
          <CartDrawer open={cartOpen} onClose={closeCart} />
        </Suspense>
      )}
    </>
  );
}
