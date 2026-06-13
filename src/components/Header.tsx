import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, ShoppingCart, Phone } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { CartDrawer } from "@/components/CartDrawer";
import { SHOP_INFO } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/shop", label: "Shop" },
  { to: "/teileportal", label: "Teileportal" },
  { to: "/fahrzeugmarkt", label: "Fahrzeugmarkt" },
  { to: "/mitgliedschaft", label: "Mitgliedschaft" },
  { to: "/laden", label: "Laden & Kontakt" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const itemCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16 sm:h-20 gap-2">
          <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setMobileOpen(false)}>
            <img src="/images/logo-dark.png" alt="Alex Autoshop" className="h-9 sm:h-11 w-auto" />
            <span className="font-display font-bold text-lg sm:text-xl tracking-tight hidden xs:block">
              Alex <span className="text-primary">Autoshop</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "px-4 py-3 rounded-lg font-medium transition-colors min-h-[48px] flex items-center",
                    isActive ? "text-primary bg-secondary" : "text-foreground/80 hover:text-foreground hover:bg-secondary"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${SHOP_INFO.phoneIntl}`}
              className="hidden lg:flex items-center gap-2 text-sm font-semibold text-foreground/80 hover:text-primary transition-colors px-3 min-h-[48px]"
            >
              <Phone className="w-4 h-4" />
              {SHOP_INFO.phone}
            </a>
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center justify-center w-12 h-12 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Warenkorb öffnen"
            >
              <ShoppingCart className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden flex items-center justify-center w-12 h-12 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Menü"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden border-t border-border bg-background animate-fade-up">
            <div className="container py-3 flex flex-col gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "px-4 py-4 rounded-lg font-semibold text-lg min-h-[52px] flex items-center",
                      isActive ? "text-primary bg-secondary" : "hover:bg-secondary"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <a
                href={`tel:${SHOP_INFO.phoneIntl}`}
                className="px-4 py-4 rounded-lg font-semibold text-lg min-h-[52px] flex items-center gap-2 text-primary"
              >
                <Phone className="w-5 h-5" /> {SHOP_INFO.phone}
              </a>
            </div>
          </nav>
        )}
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
