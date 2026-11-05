import { useEffect } from "react";
import { einwilligungLesen, trackingLaden } from "@/lib/tracking";

/**
 * Der sichtbare Hinweis steht im statischen HTML und setzt nur
 * localStorage. Tracking startet hier, und nur nach „Alle akzeptieren“.
 */
export function CookieConsent() {
  useEffect(() => {
    const laden = () => {
      if (einwilligungLesen() === "all") trackingLaden();
    };
    laden();
    window.addEventListener("aa-consent-all", laden);
    return () => window.removeEventListener("aa-consent-all", laden);
  }, []);
  return null;
}
