// Dieselbe Zustellung (Stripe-Event-ID bzw. GoCardless-Event-ID) nur einmal
// ausführen. Wiederholungen antworten 200, ohne die Zahlung nochmal anzulegen.
//
// Hält der Prozess die ID schon, reicht das. Liegt die Tabelle
// webhook_ereignisse in Supabase, gilt das auch über Instanzen hinweg.
// Fehlt die Tabelle oder der Service-Schlüssel, läuft die Zahlung trotzdem
// durch — die Wiederholung ist dann nur innerhalb dieser Instanz geschützt.
// GoCardless-Abos setzen zusätzlich einen Idempotency-Key.

const fertig = new Set();
const laufend = new Set();
let tabelleFehlt = false;

export function webhookErinnerungLeeren() {
  fertig.clear();
  laufend.clear();
  tabelleFehlt = false;
}

function schluessel(anbieter, id) {
  return `${anbieter}:${String(id)}`;
}

function datenbank() {
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  if (!key || !url || tabelleFehlt) return null;
  return { key, url };
}

async function gespeichert(id) {
  const db = datenbank();
  if (!db) return false;
  const r = await fetch(
    `${db.url}/rest/v1/webhook_ereignisse?id=eq.${encodeURIComponent(id)}&select=id`,
    { headers: { apikey: db.key, Authorization: `Bearer ${db.key}` } },
  ).catch(() => null);
  if (!r) return false;
  if (r.status === 404) {
    tabelleFehlt = true;
    return false;
  }
  if (!r.ok) return false;
  const rows = await r.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}

async function merken(id) {
  fertig.add(id);
  laufend.delete(id);
  const db = datenbank();
  if (!db) return;
  const r = await fetch(`${db.url}/rest/v1/webhook_ereignisse`, {
    method: "POST",
    headers: {
      apikey: db.key,
      Authorization: `Bearer ${db.key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify({ id }),
  }).catch(() => null);
  if (r && r.status === 404) tabelleFehlt = true;
}

/**
 * @param {string} anbieter
 * @param {string} id
 * @param {() => Promise<void>} arbeit
 * @returns {Promise<{ doppelt: boolean }>}
 */
export async function webhookEinmal(anbieter, id, arbeit) {
  if (!id) {
    await arbeit();
    return { doppelt: false };
  }
  const key = schluessel(anbieter, id);
  if (fertig.has(key) || await gespeichert(key)) return { doppelt: true };
  if (laufend.has(key)) {
    const err = new Error("Webhook-Ereignis wird schon verarbeitet");
    err.status = 500;
    throw err;
  }
  laufend.add(key);
  try {
    await arbeit();
    await merken(key);
    return { doppelt: false };
  } catch (e) {
    laufend.delete(key);
    throw e;
  }
}
