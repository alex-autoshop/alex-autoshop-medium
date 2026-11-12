import { useLocation } from "react-router-dom";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { pfadOhnePersonen, routeMuster, urlOhneAbfrage } from "@/lib/besuch";

function analyticsVorDemSenden(event: BeforeSendEvent): BeforeSendEvent {
  return { ...event, url: urlOhneAbfrage(event.url) };
}

function speedVorDemSenden(event: { type: "vital"; url: string; route?: string }) {
  const route = event.route ? routeMuster(event.route) : event.route;
  return { ...event, url: urlOhneAbfrage(event.url), route };
}

/**
 * Web Analytics und Speed Insights auf jeder Seite, inklusive Wechsel
 * über den Client-Router. Nur im Produktionsbuild; beide Skripte sind
 * cookielos. route + path schalten das automatische pushState-Tracking
 * aus und melden den Seitenwechsel selbst, ohne Query-String.
 */
export function Besuch() {
  const { pathname } = useLocation();
  if (!import.meta.env.PROD) return null;
  const pfad = pfadOhnePersonen(pathname);
  const route = routeMuster(pfad);
  return (
    <>
      <Analytics
        mode="production"
        path={pfad}
        route={route}
        beforeSend={analyticsVorDemSenden}
      />
      <SpeedInsights route={route} beforeSend={speedVorDemSenden} />
    </>
  );
}
