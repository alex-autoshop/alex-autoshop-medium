// Zentrale Freischaltung nach bestätigter Zahlung — von beiden Webhooks genutzt.
// 1) ruft den bestehenden /api/membership-email Endpoint auf
//    (legt Supabase-Nutzer an, speichert membership_requests, sendt Willkommens-
//     + Admin-Benachrichtigungs-Mails) — unverändert wiederverwendet.
// 2) markiert den Shopify-Kunden mit dem Tag "mitglied" (Versand im Shop).
// 3) legt die Mitgliedschaft als echte Shopify-Bestellung an (Betrag sichtbar).

import { createShopifyOrder, shopifyMitgliedTag, shopifyAboStufen } from "./_shopify-order.js";
import { internSignatur } from "./_intern.js";
import { rabattName } from "../shared/mitgliedspreise.js";
import { erfuellungGesperrt } from "../shared/zahlungs-isolation.js";

const BASE = () => process.env.PUBLIC_BASE_URL || "https://alex-autoshop.de";

/**
 * @param {Object} meta  { email, level, modules(string[]|string), price, provider, providerId, ref }
 */
export async function activateMembership(meta) {
  if (erfuellungGesperrt()) {
    return { gesperrt: true, email: String(meta?.email || ""), shopifyOrder: null, shopifyTag: null, errors: [] };
  }
  const email = String(meta.email || "").trim().toLowerCase();
  const level = Number(meta.level);
  const price = Number(meta.price);
  const modules = Array.isArray(meta.modules)
    ? meta.modules
    : String(meta.modules || "").split(",").map((s) => s.trim()).filter(Boolean);
  const provider = meta.provider || "unbekannt";

  const results = { email, level, membershipEmail: false, shopifyOrder: null, shopifyTag: null, errors: [] };

  // 1) Freischaltung + E-Mails (bestehender Flow)
  try {
    // Signiert: nur so akzeptiert membership-email die Werte aus der Zahlung
    // (und legt ohne Missbrauchsbremse Konto + Mails an).
    const r = await fetch(`${BASE()}/api/membership-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-intern": await internSignatur("membership-email", email, String(level)),
      },
      body: JSON.stringify({ email, level, modules, price, paid: true, provider, ref: meta.ref || "" }),
    });
    results.membershipEmail = r.ok;
    if (!r.ok) results.errors.push(`membership-email ${r.status}`);
  } catch (e) {
    results.errors.push(`membership-email: ${String(e.message).slice(0, 120)}`);
  }

  // 2) Shopify-Kunde trägt das Tag "mitglied" (Versandregel im Shop).
  //    Fehler hier dürfen die Freischaltung nicht abbrechen.
  try {
    const tag = await shopifyMitgliedTag(email, true);
    results.shopifyTag = tag?.aktion || tag?.grund || null;
    if (tag && tag.ok === false) results.errors.push(`shopify-tag: ${tag.grund || "fehler"}`);
  } catch (e) {
    console.error("[mitglied] shopify-tag:", String(e?.message || e).slice(0, 200));
    results.errors.push(`shopify-tag: ${String(e?.message || e).slice(0, 160)}`);
  }

  // 3) Shopify-Bestellung (eigenes Bestell-Tag, unverändert)
  try {
    const order = await createShopifyOrder({
      email,
      title: `Alex Autoshop Mitgliedschaft — ${rabattName(level)}`,
      amount: price,
      tags: ["mitgliedschaft", `level-${level}`, provider],
      note: `Mitgliedschaft ${rabattName(level)} · Module: ${modules.join(", ") || "Basis"} · Zahlung: ${provider}${meta.providerId ? " · " + meta.providerId : ""}`,
      paid: true,
    });
    results.shopifyOrder = order?.name || null;
  } catch (e) {
    results.errors.push(`shopify: ${String(e.message).slice(0, 160)}`);
  }

  return results;
}

/**
 * Produkt-Abo: jede Position hat ihre Stufe. Wir setzen das Versand-Tag
 * "mitglied" und die Stufen-Tags abo-15 / abo-28 / abo-40.
 * membership_level (1–3) bleibt unangetastet, damit bestehende Mitglieder
 * ihren einen Shop-Rabatt behalten.
 */
export async function activateProduktAbo(meta) {
  if (erfuellungGesperrt()) {
    return { gesperrt: true, email: String(meta?.email || ""), shopifyTag: null, aboTags: null, errors: [] };
  }
  const email = String(meta.email || "").trim().toLowerCase();
  const price = Number(meta.price);
  const stufen = String(meta.stufen || "")
    .split(/[,;]/)
    .map((s) => {
      const teile = String(s).split(":");
      return Math.floor(Number(teile[teile.length - 1]));
    })
    .filter((n) => [15, 28, 40].includes(n));
  const results = { email, price, shopifyTag: null, aboTags: null, errors: [] };
  try {
    const tag = await shopifyMitgliedTag(email, true);
    results.shopifyTag = tag?.aktion || tag?.grund || null;
    if (tag && tag.ok === false) results.errors.push(`shopify-tag: ${tag.grund || "fehler"}`);
  } catch (e) {
    results.errors.push(`shopify-tag: ${String(e?.message || e).slice(0, 160)}`);
  }
  try {
    const stufe = await shopifyAboStufen(email, stufen);
    results.aboTags = stufe?.tags || stufe?.grund || null;
    if (stufe && stufe.ok === false) results.errors.push(`abo-stufen: ${stufe.grund || "fehler"}`);
  } catch (e) {
    results.errors.push(`abo-stufen: ${String(e?.message || e).slice(0, 160)}`);
  }
  console.log("[mitglied] produkt-abo", email, "stufen", stufen.join(","), "positionen", String(meta.positionen || "").slice(0, 300));
  return results;
}
