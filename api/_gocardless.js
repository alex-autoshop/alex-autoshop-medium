// Gehostete SEPA-Seite (Billing Request Flow).
// Customers, Customer Bank Accounts und Mandates legt GoCardless auf dieser
// Seite an. Die direkten Endpunkte sind ohne genehmigte Custom Payment Pages
// gesperrt (403). Wir rufen sie nicht auf und folgen auch keiner Weiterleitung
// auf die GoCardless-Website — die liefert sonst eine HTML-Fehlerseite.

import { SEPA_KUNDENTEXT, sepaJson, sepaNetzLog } from "./_sepa-fehler.js";

const LIVE = "https://api.gocardless.com";
const SANDBOX = "https://api-sandbox.gocardless.com";
const USER_AGENT = "AlexAutoshop/1.0 (+https://www.alex-autoshop.de)";
const DIREKT = /^\/(customers|customer_bank_accounts|mandates)(\/|$)/;

export function gocardlessHost(token) {
  return String(token || "").startsWith("live_") ? LIVE : SANDBOX;
}

export function gocardlessKopf(token) {
  return {
    Authorization: `Bearer ${token}`,
    "User-Agent": USER_AGENT,
    "GoCardless-Version": "2015-07-06",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Exakt Live- oder Sandbox-Host, ein Schrägstrich, ohne Query und ohne Rest-Slash. */
export function gocardlessAdresse(url) {
  const u = new URL(url);
  if (u.origin !== LIVE && u.origin !== SANDBOX) return "";
  let pfad = u.pathname.replace(/\/{2,}/g, "/");
  if (!pfad.startsWith("/")) pfad = `/${pfad}`;
  if (pfad.length > 1) pfad = pfad.replace(/\/+$/, "");
  if (DIREKT.test(pfad)) return "";
  return `${u.origin}${pfad}`;
}

function huelle(pfad, daten) {
  const roh = daten && typeof daten === "object" ? daten : {};
  if (pfad === "/billing_requests") {
    const innen = roh.billing_requests;
    return { billing_requests: innen && typeof innen === "object" ? innen : roh };
  }
  if (pfad === "/billing_request_flows") {
    const innen = roh.billing_request_flows;
    return { billing_request_flows: innen && typeof innen === "object" ? innen : roh };
  }
  return roh;
}

function kopfBauen(headers, post, idempotenz) {
  const h = new Headers(headers || {});
  h.set("User-Agent", USER_AGENT);
  h.set("Accept", "application/json");
  h.set("Content-Type", "application/json");
  h.set("GoCardless-Version", "2015-07-06");
  if (post) h.set("Idempotency-Key", idempotenz);
  return h;
}

export async function gocardlessPost(url, headers, daten, stelle) {
  let adresse = "";
  try { adresse = gocardlessAdresse(url); } catch { adresse = ""; }
  if (!adresse) {
    sepaNetzLog(stelle, new Error("Ziel nicht erlaubt"));
    throw new Error(SEPA_KUNDENTEXT);
  }
  const pfad = new URL(adresse).pathname;
  const body = JSON.stringify(huelle(pfad, daten));
  const idempotenz = crypto.randomUUID();
  const kopf = kopfBauen(headers, true, idempotenz);
  let res = await fetch(adresse, {
    method: "POST",
    headers: kopf,
    body,
    redirect: "manual",
  });
  if (res.status >= 300 && res.status < 400) {
    let nach = "";
    try {
      nach = gocardlessAdresse(new URL(res.headers.get("location") || "", adresse).href);
    } catch { nach = ""; }
    // Nur innerhalb derselben API einmal nachziehen. pay./www. nicht abrufen.
    if (nach && new URL(nach).origin === new URL(adresse).origin) {
      const nochmalPost = res.status === 307 || res.status === 308;
      res = await fetch(nach, {
        method: nochmalPost ? "POST" : "GET",
        headers: kopfBauen(headers, nochmalPost, idempotenz),
        body: nochmalPost ? body : undefined,
        redirect: "manual",
      });
    }
  }
  return sepaJson(res, stelle, adresse);
}
