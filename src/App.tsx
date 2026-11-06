import { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigationType, Navigate, useParams } from "react-router-dom";
import { empfehlungMerken } from "@/lib/empfehlung";
import { empfehlungOffen } from "../shared/empfehlung.js";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { NurAdmin } from "@/components/NurAdmin";
import { TeileboerseTor } from "@/components/TeileboerseTor";
import { CookieConsent } from "@/components/CookieConsent";

const Toaster = lazy(() => import("sonner").then((m) => ({ default: m.Toaster })));
const Home = lazy(() => import("@/pages/Home"));
const Shop = lazy(() => import("@/pages/Shop"));
const Kategorie = lazy(() => import("@/pages/Kategorie"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const Mitgliedschaft = lazy(() => import("@/pages/Mitgliedschaft"));
const Teileportal = lazy(() => import("@/pages/Teileportal"));
const TeilArtikel = lazy(() => import("@/pages/TeilArtikel"));
const AdminMembers = lazy(() => import("@/pages/AdminMembers"));
const Fahrzeugmarkt = lazy(() => import("@/pages/Fahrzeugmarkt"));
const FahrzeugDetail = lazy(() => import("@/pages/FahrzeugDetail"));
const Mieten = lazy(() => import("@/pages/Mieten"));
const Vermieten = lazy(() => import("@/pages/Vermieten"));
const Finanzierung = lazy(() => import("@/pages/Finanzierung"));
const Kreditvermittlung = lazy(() => import("@/pages/Kreditvermittlung"));
const Foerdermittel = lazy(() => import("@/pages/Foerdermittel"));
const Merkliste = lazy(() => import("@/pages/Merkliste"));
const Laden = lazy(() => import("@/pages/Laden"));
const Konto = lazy(() => import("@/pages/Konto"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Impressum = lazy(() => import("@/pages/Impressum"));
const Datenschutz = lazy(() => import("@/pages/Datenschutz"));
const AGB = lazy(() => import("@/pages/AGB"));
const Versand = lazy(() => import("@/pages/Versand"));
const Widerruf = lazy(() => import("@/pages/Widerruf"));
const Kuendigen = lazy(() => import("@/pages/Kuendigen"));
const Gefahrstoffe = lazy(() => import("@/pages/Gefahrstoffe"));
const Marke = lazy(() => import("@/pages/Marke"));
const GefahrstoffBericht = lazy(() => import("@/pages/GefahrstoffBericht"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const AdminChat = lazy(() => import("@/pages/AdminChat"));

function ScrollToTop() {
  const { pathname, hash, state } = useLocation();
  const navigationType = useNavigationType();
  useEffect(() => {
    // Shop stellt Position und Filter selbst wieder her. Ein Sprung nach oben
    // würde die Lackierbedarf-Ansicht wie einen frischen Einstieg aussehen lassen.
    const shopPfad = pathname === "/shop" || pathname.startsWith("/shop/") || pathname.startsWith("/kategorie/");
    const shopZurueck = shopPfad && (
      navigationType === "POP"
      || Boolean((state as { shopZurueck?: boolean } | null)?.shopZurueck)
    );
    if (shopZurueck && !hash) return;
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    // Links wie /vermieten#gewerblich: das Ziel steht erst im DOM, wenn die
    // per lazy() geladene Seite gerendert ist — deshalb ein paar Frames warten.
    let versuche = 0;
    let id = 0;
    const suchen = () => {
      const ziel = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (ziel) {
        ziel.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (versuche++ < 40) {
        id = window.setTimeout(suchen, 50);
      } else {
        window.scrollTo(0, 0);
      }
    };
    suchen();
    return () => window.clearTimeout(id);
    // navigationType/state nur beim Pfadwechsel lesen. Filter ändern die Query
    // per replace — das darf die Scrollposition nicht nach oben werfen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, hash]);
  return null;
}

/** Empfehlungslink (?ref=CODE) auf JEDER Seite merken — eingetragen wird
 *  der Werber später auf dem Server. */
function EmpfehlungMerken() {
  const { search } = useLocation();
  useEffect(() => { if (empfehlungOffen()) empfehlungMerken(search); }, [search]);
  return null;
}

const PageFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
    Lädt …
  </div>
);

/** /fahrzeugmarkt/<auto> leitet auf die neue Adresse um — alte Links bleiben gueltig. */
function AltesFahrzeug() {
  const { slug } = useParams();
  return <Navigate to={`/fahrzeugboerse/${slug ?? ""}`} replace />;
}

function SchaleWeg() {
  useLayoutEffect(() => {
    const weg = () => {
      if (document.querySelector("#root h1")) document.getElementById("aa-shell")?.classList.add("aa-weg");
    };
    weg();
    const root = document.getElementById("root");
    if (!root) return;
    const beobachter = new MutationObserver(weg);
    beobachter.observe(root, { childList: true, subtree: true });
    return () => beobachter.disconnect();
  }, []);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SchaleWeg />
        <ScrollToTop />
        <EmpfehlungMerken />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Admin-Chat: kein Header, kein Footer, kein Widget */}
            <Route path="/admin/chat" element={<AdminChat />} />
            <Route path="/admin/mitglieder" element={<AdminMembers />} />
            {/* Alle anderen Seiten mit normalem Layout */}
            <Route path="*" element={
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/shop/:category" element={<Shop />} />
                    <Route path="/kategorie/:handle" element={<Kategorie />} />
                    <Route path="/produkt/:handle" element={<ProductDetail />} />
                    <Route path="/mitgliedschaft" element={<Mitgliedschaft />} />
                    <Route path="/teile/:slug" element={<TeileboerseTor><TeilArtikel /></TeileboerseTor>} />
                    <Route path="/teileboerse/artikel" element={<TeileboerseTor><TeilArtikel /></TeileboerseTor>} />
                    <Route path="/teileboerse" element={<TeileboerseTor><Teileportal /></TeileboerseTor>} />
                    <Route path="/fahrzeugboerse" element={<NurAdmin><Fahrzeugmarkt /></NurAdmin>} />
                    <Route path="/fahrzeugboerse/:slug" element={<NurAdmin><FahrzeugDetail /></NurAdmin>} />
                    <Route path="/mieten" element={<NurAdmin><Mieten /></NurAdmin>} />
                    <Route path="/vermieten" element={<NurAdmin><Vermieten /></NurAdmin>} />
                    <Route path="/finanzierung" element={<NurAdmin><Finanzierung /></NurAdmin>} />
                    <Route path="/kreditvermittlung" element={<NurAdmin><Kreditvermittlung /></NurAdmin>} />
                    <Route path="/foerdermittel" element={<NurAdmin><Foerdermittel /></NurAdmin>} />
                    <Route path="/merkliste" element={<NurAdmin><Merkliste /></NurAdmin>} />
                    {/* alte Adressen bleiben gueltig */}
                    <Route path="/fahrzeugmarkt" element={<Navigate to="/fahrzeugboerse" replace />} />
                    <Route path="/fahrzeugmarkt/:slug" element={<AltesFahrzeug />} />
                    <Route path="/laden" element={<Laden />} />
                    <Route path="/konto" element={<Konto />} />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/impressum" element={<Impressum />} />
                    <Route path="/datenschutz" element={<Datenschutz />} />
                    <Route path="/agb" element={<AGB />} />
                    <Route path="/versand" element={<Versand />} />
                    <Route path="/widerruf" element={<Widerruf />} />
                    <Route path="/kuendigen" element={<Kuendigen />} />
                    <Route path="/gefahrstoffe" element={<Gefahrstoffe />} />
                    <Route path="/marken/:slug" element={<Marke />} />
                    <Route path="/intern/gefahrstoffe" element={<GefahrstoffBericht />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
                {/* Materialplaner-Fenster vorerst abgehaengt — das Symbol oben ist raus.
                    Die Komponente liegt weiter unter components/MaterialPlannerWidget.tsx,
                    im Dashboard bleibt der Reiter Materialplaner. Zurueckholen ist eine Zeile. */}
                {/* Live-Chat vorerst abgehaengt — die Ecke bleibt leer.
                    Die Komponente liegt weiter unter components/LiveChatWidget.tsx
                    und die Admin-Seite unter /admin/chat: zurueckholen ist eine
                    Zeile. Solange nichts eingehaengt ist, entsteht auch keine
                    neue Chat-Sitzung mehr. */}
                <CookieConsent />
              </div>
            } />
          </Routes>
        </Suspense>
        <Suspense fallback={null}>
          <Toaster position="top-center" richColors />
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
