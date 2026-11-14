import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { linkVorholen } from "@/lib/katalogVorholen";
import { lazySeite } from "@/lib/lazySeite";
import { ChunkGrenze } from "@/components/ChunkGrenze";
import { BrowserRouter, Routes, Route, useLocation, useNavigationType, Navigate, useParams } from "react-router-dom";
import { empfehlungMerken } from "@/lib/empfehlung";
import { empfehlungOffen } from "../shared/empfehlung.js";
import { PRODUKT_WEITERLEITUNG } from "../shared/produkt-weiterleitung.js";
import { istListenPfad } from "../shared/listen-zustand.js";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { NurAdmin } from "@/components/NurAdmin";
import { TeileboerseTor } from "@/components/TeileboerseTor";
import { Besuch } from "@/components/Besuch";
import { CookieConsent } from "@/components/CookieConsent";
import { AboUebersicht } from "@/components/AboUebersicht";
import { AboRueckkehr } from "@/components/AboAnmeldung";

const Toaster = lazySeite(() => import("sonner").then((m) => ({ default: m.Toaster })));
const Home = lazySeite(() => import("@/pages/Home"));
const Shop = lazySeite(() => import("@/pages/Shop"));
const Kategorie = lazySeite(() => import("@/pages/Kategorie"));
const ProductDetail = lazySeite(() => import("@/pages/ProductDetail"));
const Mitgliedschaft = lazySeite(() => import("@/pages/Mitgliedschaft"));
const Teileportal = lazySeite(() => import("@/pages/Teileportal"));
const TeilArtikel = lazySeite(() => import("@/pages/TeilArtikel"));
const AdminMembers = lazySeite(() => import("@/pages/AdminMembers"));
const Fahrzeugmarkt = lazySeite(() => import("@/pages/Fahrzeugmarkt"));
const FahrzeugDetail = lazySeite(() => import("@/pages/FahrzeugDetail"));
const Mieten = lazySeite(() => import("@/pages/Mieten"));
const Vermieten = lazySeite(() => import("@/pages/Vermieten"));
const Finanzierung = lazySeite(() => import("@/pages/Finanzierung"));
const Kreditvermittlung = lazySeite(() => import("@/pages/Kreditvermittlung"));
const Foerdermittel = lazySeite(() => import("@/pages/Foerdermittel"));
const Merkliste = lazySeite(() => import("@/pages/Merkliste"));
const Laden = lazySeite(() => import("@/pages/Laden"));
const TeileAgent = lazySeite(() => import("@/pages/TeileAgent"));
const Konto = lazySeite(() => import("@/pages/Konto"));
const Dashboard = lazySeite(() => import("@/pages/Dashboard"));
const Impressum = lazySeite(() => import("@/pages/Impressum"));
const Datenschutz = lazySeite(() => import("@/pages/Datenschutz"));
const AGB = lazySeite(() => import("@/pages/AGB"));
const Versand = lazySeite(() => import("@/pages/Versand"));
const Widerruf = lazySeite(() => import("@/pages/Widerruf"));
const Kuendigen = lazySeite(() => import("@/pages/Kuendigen"));
const Gefahrstoffe = lazySeite(() => import("@/pages/Gefahrstoffe"));
const Marke = lazySeite(() => import("@/pages/Marke"));
const GefahrstoffBericht = lazySeite(() => import("@/pages/GefahrstoffBericht"));
const NotFound = lazySeite(() => import("@/pages/NotFound"));
const Warenkorb = lazySeite(() => import("@/pages/Warenkorb"));
const AdminChat = lazySeite(() => import("@/pages/AdminChat"));

/** Scroll einer Produktseite, Schlüssel ist der History-Eintrag. */
const seitenScroll = new Map<string, number>();

function scrollSofort(y: number) {
  const top = Math.max(0, Math.round(y));
  const wurzel = document.documentElement;
  wurzel.style.scrollBehavior = "auto";
  wurzel.scrollTop = top;
  document.body.scrollTop = top;
  window.scrollTo(0, top);
}

function ScrollToTop() {
  const { pathname, hash, key, state } = useLocation();
  const navigationType = useNavigationType();
  const shopZurueck = Boolean((state as { shopZurueck?: boolean } | null)?.shopZurueck);
  const listeZurueck = istListenPfad(pathname) && (navigationType === "POP" || shopZurueck);

  // Vor dem ersten Bild: neuer Produktaufruf startet oben. Die CSS-Angabe
  // scroll-behavior:smooth würde sonst vom tiefen Listen-Offset aus animieren
  // und auf der kürzeren Produktseite bei den Empfehlungen stehen bleiben.
  useLayoutEffect(() => {
    if (hash || listeZurueck) return;
    if (navigationType === "POP" && !istListenPfad(pathname)) {
      const gemerkt = seitenScroll.get(key);
      if (typeof gemerkt === "number") {
        scrollSofort(gemerkt);
        return;
      }
    }
    scrollSofort(0);
  }, [pathname, hash, key, navigationType, listeZurueck]);

  useLayoutEffect(() => {
    return () => {
      if (!istListenPfad(pathname)) seitenScroll.set(key, window.scrollY);
    };
  }, [pathname, key]);

  useEffect(() => {
    if (!hash) return;
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
        scrollSofort(0);
      }
    };
    suchen();
    return () => window.clearTimeout(id);
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

/** Daten und Seitenstück vorholen, sobald der Zeiger oder der Finger den Link berührt. */
function Vorholen() {
  useEffect(() => {
    const ziel = (event: Event) => {
      const el = event.target instanceof Element ? event.target : null;
      const link = el?.closest("a[href]");
      if (!link) return;
      linkVorholen(link.getAttribute("href") || "");
    };
    document.addEventListener("pointerover", ziel);
    document.addEventListener("pointerdown", ziel);
    document.addEventListener("focusin", ziel);
    return () => {
      document.removeEventListener("pointerover", ziel);
      document.removeEventListener("pointerdown", ziel);
      document.removeEventListener("focusin", ziel);
    };
  }, []);
  return null;
}

/** Dünner Balken, wenn ein Seitenwechsel länger als einen Moment dauert. */
function Navigationsbalken() {
  const { pathname } = useLocation();
  const [sichtbar, setSichtbar] = useState(false);
  const zeigen = useRef(0);
  const verstecken = useRef(0);
  useEffect(() => {
    setSichtbar(false);
    window.clearTimeout(zeigen.current);
    window.clearTimeout(verstecken.current);
  }, [pathname]);
  useEffect(() => {
    const start = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const el = event.target instanceof Element ? event.target : null;
      const link = el?.closest("a[href]");
      if (!link || link.getAttribute("target") === "_blank") return;
      const href = link.getAttribute("href") || "";
      if (!href.startsWith("/") || href.startsWith("//")) return;
      const pfad = href.split(/[?#]/)[0] || "/";
      if (pfad === window.location.pathname) return;
      window.clearTimeout(zeigen.current);
      window.clearTimeout(verstecken.current);
      zeigen.current = window.setTimeout(() => setSichtbar(true), 180);
      verstecken.current = window.setTimeout(() => setSichtbar(false), 8000);
    };
    document.addEventListener("click", start);
    return () => document.removeEventListener("click", start);
  }, []);
  if (!sichtbar) return null;
  return <div className="fixed inset-x-0 top-0 z-[80] h-1 bg-primary animate-pulse" role="progressbar" aria-label="Seite lädt" />;
}

function SchaleWeg() {
  useLayoutEffect(() => {
    const shell = document.getElementById("aa-shell");
    const root = document.getElementById("root");
    let timer = 0;
    const weg = () => {
      if (!shell || shell.classList.contains("aa-weg")) return;
      // Finger noch auf einem Link der Schale: den Klick nicht verschlucken.
      if (shell.getAttribute("data-druck")) return;
      if (!root?.querySelector("h1")) return;
      shell.classList.add("aa-weg");
      beobachter.disconnect();
    };
    const spaeter = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(weg, 0);
    };
    const beobachter = new MutationObserver(weg);
    if (root) beobachter.observe(root, { childList: true, subtree: true });
    weg();
    shell?.addEventListener("pointerup", spaeter);
    shell?.addEventListener("pointercancel", spaeter);
    return () => {
      beobachter.disconnect();
      window.clearTimeout(timer);
      shell?.removeEventListener("pointerup", spaeter);
      shell?.removeEventListener("pointercancel", spaeter);
    };
  }, []);
  return null;
}

function SpaeterToaster() {
  const [an, setAn] = useState(false);
  useEffect(() => {
    const start = () => setAn(true);
    const fenster = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (fenster.requestIdleCallback) {
      const id = fenster.requestIdleCallback(start, { timeout: 2500 });
      return () => fenster.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(start, 1200);
    return () => window.clearTimeout(id);
  }, []);
  if (!an) return null;
  return (
    <Suspense fallback={null}>
      <Toaster position="top-center" richColors />
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Besuch />
      <AuthProvider>
        <SchaleWeg />
        <Vorholen />
        <Navigationsbalken />
        <ScrollToTop />
        <EmpfehlungMerken />
        <AboRueckkehr />
        <ChunkGrenze>
          <Routes>
            {/* Admin-Chat: kein Header, kein Footer, kein Widget */}
            <Route path="/admin/chat" element={<Suspense fallback={<PageFallback />}><AdminChat /></Suspense>} />
            <Route path="/admin/mitglieder" element={<Suspense fallback={<PageFallback />}><AdminMembers /></Suspense>} />
            {/* Alle anderen Seiten mit normalem Layout */}
            <Route path="*" element={
              <div className="abo-shop-frei min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">
                  <Suspense fallback={<PageFallback />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/shop/:category" element={<Shop />} />
                    <Route path="/kategorie/:handle" element={<Kategorie />} />
                    {Object.entries(PRODUKT_WEITERLEITUNG).map(([handle, ziel]) => (
                      <Route key={handle} path={`/produkt/${handle}`} element={<Navigate to={ziel} replace />} />
                    ))}
                    <Route path="/produkt/:handle" element={<ProductDetail />} />
                    <Route path="/warenkorb" element={<Warenkorb />} />
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
                    <Route path="/teile-agent" element={<TeileAgent />} />
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
                  </Suspense>
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
                <AboUebersicht />
              </div>
            } />
          </Routes>
        </ChunkGrenze>
        <SpaeterToaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
