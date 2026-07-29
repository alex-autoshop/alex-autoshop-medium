// Zentrale Freischaltung nach bestätigter Zahlung — von beiden Webhooks genutzt.
// 1) ruft den bestehenden /api/membership-email Endpoint auf
//    (legt Supabase-Nutzer an, speichert membership_requests, sendt Willkommens-
//     + Admin-Benachrichtigungs-Mails) — unverändert wiederverwendet.
// 2) legt die Mitgliedschaft als echte Shopify-Bestellung an (Betrag sichtbar).

import { createShopifyOrder } from "./_shopify-order.js";

const BASE = () => process.env.PUBLIC_BASE_URL || "https://alex-autoshop.de";

/**
 * @param {Object} meta  { email, level, modules(string[]|string), price, provider, providerId }
 */
export async function activateMembership(meta) {
  const email = meta.email;
  const level = Number(meta.level);
  const price = Number(meta.price);
  const modules = Array.isArray(meta.modules)
    ? meta.modules
    : String(meta.modules || "").split(",").map((s) => s.trim()).filter(Boolean);
  const provider = meta.provider || "unbekannt";

  const results = { email, level, membershipEmail: false, shopifyOrder: null, errors: [] };

  // 1) Freischaltung + E-Mails (bestehender Flow)
  try {
    const r = await fetch(`${BASE()}/api/membership-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, level, modules, price, paid: true, provider }),
    });
    results.membershipEmail = r.ok;
    if (!r.ok) results.errors.push(`membership-email ${r.status}`);
  } catch (e) {
    results.errors.push(`membership-email: ${String(e.message).slice(0, 120)}`);
  }

  // 2) Shopify-Bestellung
  try {
    const order = await createShopifyOrder({
      email,
      title: `Alex Autoshop Mitgliedschaft Level ${level}`,
      amount: price,
      tags: ["mitgliedschaft", `level-${level}`, provider],
      note: `Mitgliedschaft Level ${level} · Module: ${modules.join(", ") || "Basis"} · Zahlung: ${provider}${meta.providerId ? " · " + meta.providerId : ""}`,
      paid: true,
    });
    results.shopifyOrder = order?.name || null;
  } catch (e) {
    results.errors.push(`shopify: ${String(e.message).slice(0, 160)}`);
  }

  return results;
}
