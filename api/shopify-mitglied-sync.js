/**
 * Einmalig: aktive Mitglieder im Shopify-Kundenstamm mit dem Tag "mitglied"
 * versehen. Teststunden zählen nicht — nur app_metadata.membership_level 1–3.
 *
 * POST https://www.alex-autoshop.de/api/shopify-mitglied-sync
 * Header: Authorization: Bearer <Supabase-Sitzung eines Admins>
 *         x-admin-pin: <ADMIN_PIN>
 *
 * Mehrfach aufrufen ist unkritisch: wer den Tag schon hat, wird übersprungen.
 * Fehlt der Kunde in Shopify, wird er angelegt.
 *
 * Env:
 *   ADMIN_PIN
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_SUPABASE_URL oder SUPABASE_URL
 *   SHOPIFY_ADMIN_TOKEN          — Admin-API, Scopes read_customers + write_customers
 *   SHOPIFY_STORE_DOMAIN         — optional, sonst shop.alex-autoshop.de
 *
 * Die Antwort enthält shopifyKonfiguriert (nur ja/nein, nie den Token).
 */

export const config = { runtime: "nodejs", maxDuration: 60 };

import { adminPruefen } from "./_admin.js";
import { shopifyConfigured, shopifyMitgliedTag } from "./_shopify-order.js";

const SUPABASE_URL = (
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://zasbdvtsxgimcezotlsi.supabase.co"
).replace(/\/+$/, "");

function send(res, status, obj) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).end(JSON.stringify(obj));
}

async function aktiveMitglieder() {
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svc) throw new Error("SUPABASE_SERVICE_ROLE_KEY fehlt");
  const mails = [];
  for (let page = 1; page <= 20; page++) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: { apikey: svc, Authorization: `Bearer ${svc}` },
    });
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 160)}`);
    const data = await r.json();
    const batch = Array.isArray(data) ? data : data.users || [];
    for (const u of batch) {
      const level = Number(u?.app_metadata?.membership_level);
      const email = String(u?.email || "").trim().toLowerCase();
      if ([1, 2, 3].includes(level) && email) mails.push(email);
    }
    if (batch.length < 200) break;
  }
  return [...new Set(mails)];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  const zugang = await adminPruefen(req);
  if (!zugang.ok) {
    return send(res, zugang.pinFalsch ? 401 : zugang.status, { error: zugang.pinFalsch ? "Falscher PIN" : zugang.error });
  }

  const konfiguriert = shopifyConfigured();
  let mails = [];
  try {
    mails = await aktiveMitglieder();
  } catch (e) {
    return send(res, 502, { error: String(e?.message || e).slice(0, 200), shopifyKonfiguriert: konfiguriert });
  }

  if (!konfiguriert) {
    return send(res, 200, {
      shopifyKonfiguriert: false,
      aktiv: mails.length,
      hinweis: "SHOPIFY_ADMIN_TOKEN fehlt — es wurde niemand markiert.",
    });
  }

  const zaehler = { gesetzt: 0, angelegt: 0, unverändert: 0, keinKunde: 0, fehler: 0 };
  const fehler = [];
  for (const email of mails) {
    const r = await shopifyMitgliedTag(email, true);
    if (!r.ok) {
      zaehler.fehler += 1;
      if (fehler.length < 30) fehler.push({ email, grund: r.grund || "fehler" });
      continue;
    }
    if (r.aktion === "gesetzt") zaehler.gesetzt += 1;
    else if (r.aktion === "angelegt") zaehler.angelegt += 1;
    else if (r.aktion === "kein-kunde") zaehler.keinKunde += 1;
    else zaehler.unverändert += 1;
  }

  return send(res, 200, {
    shopifyKonfiguriert: true,
    tag: "mitglied",
    aktiv: mails.length,
    ...zaehler,
    fehler,
  });
}
