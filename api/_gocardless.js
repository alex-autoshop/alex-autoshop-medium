// Gehostete SEPA-Seite (Billing Request Flow).
// Customers, Customer Bank Accounts und Mandates legt GoCardless auf dieser
// Seite an. Die direkten Endpunkte sind ohne genehmigte Custom Payment Pages
// gesperrt (403). Wir rufen sie nicht auf und folgen auch keiner Weiterleitung
// auf die GoCardless-Website — die liefert sonst eine HTML-Fehlerseite.

import { SEPA_KUNDENTEXT, sepaJson, sepaNetzLog } from "./_sepa-fehler.js";

const API_HOSTS = new Set(["api.gocardless.com", "api-sandbox.gocardless.com"]);
const DIREKT = /^\/(customers|customer_bank_accounts|mandates)(\/|$)/;

export function gocardlessHost(token) {
  return String(token || "").startsWith("live_")
    ? "https://api.gocardless.com"
    : "https://api-sandbox.gocardless.com";
}

export function gocardlessKopf(token) {
  return {
    Authorization: `Bearer ${token}`,
    "GoCardless-Version": "2015-07-06",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export async function gocardlessPost(url, headers, daten, stelle) {
  let ziel;
  try {
    ziel = new URL(url);
  } catch {
    sepaNetzLog(stelle, new Error("Adresse ungültig"));
    throw new Error(SEPA_KUNDENTEXT);
  }
  if (!API_HOSTS.has(ziel.host) || DIREKT.test(ziel.pathname)) {
    sepaNetzLog(stelle, new Error("Ziel nicht erlaubt"));
    throw new Error(SEPA_KUNDENTEXT);
  }
  let res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(daten),
    redirect: "manual",
  });
  if (res.status >= 300 && res.status < 400) {
    let nach = null;
    try { nach = new URL(res.headers.get("location") || "", url); } catch { nach = null; }
    // Nur innerhalb der API einmal nachziehen. Eine Seite (pay./www.) nicht abrufen.
    if (nach && nach.host === ziel.host) {
      const methode = res.status === 307 || res.status === 308 ? "POST" : "GET";
      res = await fetch(nach.href, {
        method: methode,
        headers,
        body: methode === "POST" ? JSON.stringify(daten) : undefined,
        redirect: "manual",
      });
    }
  }
  return sepaJson(res, stelle, url);
}
