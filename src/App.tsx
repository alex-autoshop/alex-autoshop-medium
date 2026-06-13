import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Home = lazy(() => import("@/pages/Home"));
const Shop = lazy(() => import("@/pages/Shop"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const Mitgliedschaft = lazy(() => import("@/pages/Mitgliedschaft"));
const Teileportal = lazy(() => import("@/pages/Teileportal"));
const Fahrzeugmarkt = lazy(() => import("@/pages/Fahrzeugmarkt"));
const Laden = lazy(() => import("@/pages/Laden"));
const Konto = lazy(() => import("@/pages/Konto"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Impressum = lazy(() => import("@/pages/Impressum"));
const Datenschutz = lazy(() => import("@/pages/Datenschutz"));
const AGB = lazy(() => import("@/pages/AGB"));
const Versand = lazy(() => import("@/pages/Versand"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const PageFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
    Lädt …
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/shop/:category" element={<Shop />} />
                <Route path="/produkt/:handle" element={<ProductDetail />} />
                <Route path="/mitgliedschaft" element={<Mitgliedschaft />} />
                <Route
                  path="/teileportal"
                  element={
                    <ProtectedRoute>
                      <Teileportal />
                    </ProtectedRoute>
                  }
                />
                <Route path="/fahrzeugmarkt" element={<Fahrzeugmarkt />} />
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
