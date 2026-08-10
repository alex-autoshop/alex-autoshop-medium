// Serverless (nicht Edge) — Intercars OAuth blockt Cloudflare/Edge IPs.
// Redeploy 2026-08-10: INTERCARS_PAYER_ID=F00100, RECIPIENT_ID, BRANCH gesetzt.
// WICHTIG: Node-Runtime nutzt die (req, res)-Signatur! Der frühere Web-API-Handler
// (Request→Response) wurde nie beantwortet → JEDER Request lief in den 25s-Timeout.
export const config = { maxDuration: 25 };

/**
 * Intercars IC API Proxy — Vercel Edge Function
 *
 * IC API Documentation: https://docs.webapi.intercars.eu/ic-api/en/
 *
 * REQUIRED env vars (Vercel → Settings → Environment Variables):
 *   INTERCARS_CLIENT_ID      — OAuth2 client_id
 *   INTERCARS_CLIENT_SECRET  — OAuth2 client_secret
 *   INTERCARS_PAYER_ID       — IC customer/payer number (e.g. "F12345")
 *   INTERCARS_RECIPIENT_ID   — Usually same as payer id
 *   INTERCARS_BRANCH         — Branch code (e.g. "FA1" for Germany)
 *
 * OPTIONAL (for legacy invoice XML API — Verwaltung module):
 *   INTERCARS_KH_KOD         — Old IC Katalog customer number
 *   INTERCARS_CATALOG_TOKEN  — Old IC Katalog API token
 *
 * ─── VERIFIZIERTE Endpoints (IC-Postman-Collection PROD, getestet 08/2026) ───
 *
 * PFLICHT-HEADER auf ALLEN Calls: Accept-Language: de
 *   Ohne diesen Header antwortet IC mit 400 / ICF311. Nur der reine Sprachcode
 *   ("de"), NICHT "de-DE,de;q=0.9".
 *
 * GET /catalog/products?index=…  |  ?sku=…  |  ?categoryId=…
 *   → { totalResults, hasNextPage, products: [{ sku, index, brand, description, gtuCode }] }
 *   ACHTUNG: Freitextsuche (?search=) gibt es NICHT → 400 / ICF101
 *   ("CategoryId, sku or index is required"). Text → erst Kategorie auflösen.
 *   Paginierung: pageNumber / pageSize (nicht limit/offset).
 *
 * GET /inventory/quote?sku=A,B,C   ← Preis UND Bestand in einem Call, max 30 SKUs
 *   → [{ sku, quantity,
 *        price: { currencyCode, listPriceNet, listPriceGross, vatPercentage,
 *                 vatAmount, refundableAmount, customerPriceNet, customerPriceGross },
 *        lines: [{ location, sku, availability, latestDeliveryDate }] }]
 *   customerPriceGross = EK nach Rabattstufe · listPriceGross = UVP
 *   Ohne &location= liefert IC alle Lager der Logistikkette.
 *
 * GET /inventory/stock?sku=A,B,C  → [{ location, sku, availability, latestDeliveryDate }]
 * GET /catalog/category?categoryId=…  (EINZAHL! /catalog/categories → 404)
 *
 * Frühere Fassung nutzte /catalog/products/pricing und /catalog/products/{sku}/stock —
 * beide existieren nicht und lieferten still 0 € / "auf Anfrage".
 */

// ── API Constants ─────────────────────────────────────────────────────────────
const IC_TOKEN_URL   = "https://is.webapi.intercars.eu/oauth2/token";
const IC_BASE_URL    = "https://api.webapi.intercars.eu/ic";
const IC_CATALOG_URL = "https://katalog.intercars.com.pl/api/v2/External";

// ── Token cache ────────────────────────────────────────────────────────────────
let _token  = null;
let _expiry = 0;

// Harter Timeout auch wenn fetch-abort hängt (Cloudflare hält Verbindungen offen)
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} Timeout nach ${ms}ms`)), ms)),
  ]);
}

async function getToken(clientId, clientSecret) {
  if (_token && Date.now() < _expiry) return _token;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  const res = await withTimeout(fetch(IC_TOKEN_URL, {
    signal: ctrl.signal,
    method:  "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "Accept":       "application/json",
      "Accept-Language": "de-DE,de;q=0.9",
    },
    body:    new URLSearchParams({
      grant_type:    "client_credentials",
      client_id:     clientId,
      client_secret: clientSecret,
    }),
    // Cloudflare bot protection on is.webapi.intercars.eu requires a real User-Agent
    // Without it, the OAuth endpoint returns 403 "Just a moment..."
  }), 9000, "IC OAuth");
  clearTimeout(timer);
  if (!res.ok) throw new Error(`IC OAuth (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  _token  = data.access_token;
  _expiry = Date.now() + (data.expires_in - 60) * 1000;
  return _token;
}

// ── Authenticated REST fetch ──────────────────────────────────────────────────
async function icFetch(path, token, payerId, recipientId, branch) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  const res = await withTimeout(fetch(`${IC_BASE_URL}${path}`, {
    signal: ctrl.signal,
    headers: {
      Authorization:    `Bearer ${token}`,
      "X-Payer-Id":     payerId,
      "X-Recipient-Id": recipientId,
      "X-Branch":       branch,
      Accept:           "application/json",
      // PFLICHT: IC lehnt Requests ohne gültiges Accept-Language ab (Fehler ICF311).
      // Nur "de" — NICHT "de-DE,de;q=0.9" (IC akzeptiert nur den reinen Sprachcode).
      "Accept-Language": "de",
      "User-Agent":     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    },
  }), 8000, `IC ${path.slice(0, 40)}`).finally(() => clearTimeout(timer));
  if (!res.ok) {
    console.error(`[IC] ${path} → HTTP ${res.status}`, (await res.text()).slice(0, 200));
    return null;
  }
  return res.json();
}

// ── Authenticated REST POST ───────────────────────────────────────────────────
async function icPost(path, body, token, payerId, recipientId, branch) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  const res = await withTimeout(fetch(`${IC_BASE_URL}${path}`, {
    signal: ctrl.signal,
    method: "POST",
    headers: {
      Authorization:    `Bearer ${token}`,
      "X-Payer-Id":     payerId,
      "X-Recipient-Id": recipientId,
      "X-Branch":       branch,
      "Content-Type":   "application/json",
      Accept:           "application/json",
      "Accept-Language": "de", // PFLICHT (ICF311)
      "User-Agent":     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    },
    body: JSON.stringify(body),
  }), 8000, `IC POST ${path.slice(0, 40)}`).finally(() => clearTimeout(timer));
  if (!res.ok) {
    console.error(`[IC] POST ${path} → HTTP ${res.status}`, (await res.text()).slice(0, 200));
    return null;
  }
  return res.json();
}

// ── Parallel in Batches (schont IC Rate-Limits) ──────────────────────────────
async function inChunks(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = await Promise.all(items.slice(i, i + size).map(fn));
    out.push(...chunk);
  }
  return out;
}

// ── Preis UND Bestand in EINEM Call ──────────────────────────────────────────
// GET /inventory/quote?sku=A,B,C  (offizieller Endpoint laut IC-Postman-Collection)
// Antwort: [{ sku, quantity, price:{listPriceGross, customerPriceGross, ...},
//             lines:[{ location, sku, availability, latestDeliveryDate }] }]
// Ohne "location" liefert IC alle Lager der Logistikkette des Kunden.
// Ersetzt die alten (falschen) Pfade /catalog/products/pricing + /{sku}/stock.
async function fetchQuotes(skus, token, payerId, recipientId, branch) {
  const map = new Map();
  const list = [...new Set(skus.filter(Boolean))];
  if (!list.length) return map;
  // IC verarbeitet laut Doku max. 30 Artikel pro Anfrage
  for (let i = 0; i < list.length; i += 30) {
    const batch = list.slice(i, i + 30);
    const r = await icFetch(
      `/inventory/quote?sku=${encodeURIComponent(batch.join(","))}`,
      token, payerId, recipientId, branch
    ).catch(() => null);
    const arr = Array.isArray(r) ? r : (Array.isArray(r?.lines) ? r.lines : []);
    for (const q of arr) if (q?.sku) map.set(String(q.sku), q);
  }
  return map;
}

// ── Nur Bestand (ohne Preise) — GET /inventory/stock?sku=A,B,C ───────────────
// Antwort: [{ location, sku, availability, latestDeliveryDate }]
async function fetchStock(skus, token, payerId, recipientId, branch) {
  const map = new Map();
  const list = [...new Set(skus.filter(Boolean))];
  if (!list.length) return map;
  for (let i = 0; i < list.length; i += 30) {
    const batch = list.slice(i, i + 30);
    const r = await icFetch(
      `/inventory/stock?sku=${encodeURIComponent(batch.join(","))}`,
      token, payerId, recipientId, branch
    ).catch(() => null);
    for (const l of (Array.isArray(r) ? r : [])) {
      if (!l?.sku) continue;
      const k = String(l.sku);
      map.set(k, [...(map.get(k) || []), l]);
    }
  }
  return map;
}

// ── Normalize confirmed IC API response shapes ────────────────────────────────
//
// ICProduct (from GET /catalog/products):
//   sku, index, brand, shortDescription, description, blockedReturn, gtuCode (new Sep2025)
//
// ICStockItem (from GET /catalog/products/{sku}/stock):
//   sku, location, availability, index, name, description, blockedReturn, eans
//
// ICPriceLine (from GET /catalog/products/pricing):
//   sku, quantity, price.customerPriceGross, price.listPriceGross, price.vatPercentage,
//   price.currencyCode, index, name, description, blockedReturn, eans
//
/** quote = Eintrag aus /inventory/quote: { sku, price:{...}, lines:[{location, availability, latestDeliveryDate}] }
 *  stockLines = alternativ Zeilen aus /inventory/stock (wenn kein Quote vorliegt). */
function normalizeProduct(product, quote = null, stockLines = null) {
  if (!product) return null;

  const sku   = product.sku   || product.index || "";
  const name  = product.description || product.shortDescription || product.name || "Artikel";
  const brand = product.brand || "Inter Cars";

  // ── Bestand: über alle Lager der Logistikkette summieren ──────────────────
  const lines = Array.isArray(quote?.lines) ? quote.lines
              : Array.isArray(stockLines)   ? stockLines
              : [];
  const perLocation = lines
    .map((l) => ({
      location: String(l?.location || ""),
      qty: Math.max(0, Math.floor(Number(l?.availability) || 0)),
      until: l?.latestDeliveryDate || null,
    }))
    .filter((l) => l.qty > 0);
  const qty     = perLocation.reduce((s, l) => s + l.qty, 0);
  const tenPlus = qty >= 10;
  const avail   = qty > 0
    ? (tenPlus ? "sofort (10+ Stück)" : `sofort (${qty} Stück)`)
    : "auf Anfrage";
  const days    = qty > 0 ? 1 : 3;

  const eans   = Array.isArray(product.eans) ? product.eans : [];
  const images = []; // IC API liefert in dieser Version keine Bilder

  // ── Preise: customerPriceGross = Alex' EK nach Rabattstufe ────────────────
  const p              = quote?.price || {};
  const customerPrice  = Number(p.customerPriceGross) || 0;
  const listPrice      = Number(p.listPriceGross)     || 0;
  const vatPct         = p.vatPercentage ?? 19;
  const currency       = p.currencyCode  ?? "EUR";

  const price         = customerPrice || listPrice || 0;
  const priceOriginal = listPrice > customerPrice && listPrice > 0 ? listPrice : undefined;

  const specs = {};
  if (product.index)   specs["Index"]    = product.index;
  if (eans[0])         specs["EAN"]      = eans[0];
  if (product.gtuCode) specs["GTU-Code"] = product.gtuCode;
  if (vatPct)          specs["MwSt"]     = `${vatPct}%`;
  if (currency)        specs["Währung"]  = currency;
  if (qty > 0)         specs["Lager"]    = tenPlus ? "≥10 Stück" : `${qty} Stück`;
  if (perLocation.length) specs["Lagerorte"] = perLocation.map((l) => `${l.location}: ${l.qty}`).join(" · ");
  if (perLocation[0]?.until) specs["Lieferung bis"] = perLocation[0].until;
  if (product.blockedReturn) specs["Rückgabe"] = "nicht möglich";

  return {
    id:            `ic-${sku}`,
    name,
    brand,
    price,
    priceOriginal,
    priceNet:      Number(p.customerPriceNet) || undefined,
    availability:  avail,
    deliveryDays:  days,
    specs,
    oemNumber:     eans[0] || "",
    oemNumbers:    eans,
    images,
    stockQuantity: qty,
    stockByLocation: perLocation,
    tenPlusInStock: tenPlus,
    categoryId:    "",
    categoryLabel: "",
    _sku:          sku,
    _index:        product.index || "",
  };
}

// ── Build pricing request payload ─────────────────────────────────────────────
function buildPricingBody(items) {
  // IC pricing endpoint expects: { lines: [{ sku, quantity }] }
  return { lines: items.map(({ sku, quantity = 1 }) => ({ sku, quantity })) };
}

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER — Node-Serverless-Signatur (req, res)
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  // ── GET ?diag=1 — Token-Test via Browser/web_fetch ───────────────────────
  if (req.method === "GET") {
    const qs = new URLSearchParams(req.url?.split("?")[1] || "");
    if (qs.get("diag") !== "1") { res.status(405).send("Use POST or GET ?diag=1"); return; }
    const cIdRaw  = process.env.INTERCARS_CLIENT_ID  || "";
    const cSecRaw = process.env.INTERCARS_CLIENT_SECRET || "";
    const cId  = cIdRaw.trim();
    const cSec = cSecRaw.trim();
    if (!cId || !cSec) { res.status(500).json({ ok: false, error: "env vars missing" }); return; }
    // Diagnose-Info: Länge + ob Whitespace drin war (häufigste Fehlerquelle beim Einfügen)
    const credInfo = {
      clientIdLength: cId.length,
      clientIdHadWhitespace: cIdRaw !== cId,
      clientSecretLength: cSec.length,
      clientSecretHadWhitespace: cSecRaw !== cSec,
    };
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    try {
      const r = await fetch(IC_TOKEN_URL, {
        signal: ctrl.signal,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
        "Origin": "https://www.alex-autoshop.de",
        "Referer": "https://www.alex-autoshop.de/" },
        body: new URLSearchParams({ grant_type: "client_credentials", client_id: cId, client_secret: cSec }),
      });
      clearTimeout(timer);
      const text = await r.text();
      let parsed = null;
      try { parsed = JSON.parse(text); } catch {}
      res.status(200).json({
        ok: r.ok, httpStatus: r.status,
        tokenUrl: IC_TOKEN_URL,
        ...credInfo,
        clientIdPrefix: cId.slice(0, 8) + "…",
        payerId: process.env.INTERCARS_PAYER_ID || "F00099 (default)",
        branch:  process.env.INTERCARS_BRANCH   || "FA1 (default)",
        hasToken: !!(parsed?.access_token),
        tokenType: parsed?.token_type,
        expiresIn: parsed?.expires_in,
        icError:   parsed?.error,
        icErrorDesc: parsed?.error_description,
        rawSnippet: text.slice(0, 300),
      });
    } catch(e) {
      clearTimeout(timer);
      res.status(500).json({ ok: false, error: String(e.message), tokenUrl: IC_TOKEN_URL });
    }
    return;
  }

  if (req.method !== "POST") { res.status(405).send("Method not allowed"); return; }

  const json = (data, status = 200) => { res.status(status).json(data); };

  // .trim() → schützt vor versehentlichen Leerzeichen/Zeilenumbrüchen beim Einfügen in Vercel
  const clientId     = (process.env.INTERCARS_CLIENT_ID     || "").trim();
  const clientSecret = (process.env.INTERCARS_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    return json({ error: "Intercars credentials not configured", hint: "Set INTERCARS_CLIENT_ID + INTERCARS_CLIENT_SECRET in Vercel env vars" }, 500);
  }

  const payerId     = process.env.INTERCARS_PAYER_ID     || "F00099";
  const recipientId = process.env.INTERCARS_RECIPIENT_ID || payerId;
  const branch      = process.env.INTERCARS_BRANCH       || "FA1";

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { return json({ error: "Invalid JSON" }, 400); } }
  if (!body || typeof body !== "object") return json({ error: "Invalid JSON" }, 400);

  const { action, query, sku, index: productIndex, categoryId, limit = 12, offset = 0, items, orderId, from, to } = body;

  // ── DIAGNOSE: wo genau klemmt es? (Credentials → OAuth → Catalog) ──────────
  if (action === "diag") {
    const out = { hasCreds: true, payerId, branch, runtime: "nodejs" };
    const t0 = Date.now();
    try {
      const token = await getToken(clientId, clientSecret);
      out.oauth = { ok: true, ms: Date.now() - t0, tokenLen: (token || "").length };
      // Roh-Fetch damit wir HTTP-Status + Body sehen (icFetch schluckt Fehler)
      const probe = async (path, hdrs) => {
        const t = Date.now();
        try {
          const r = await withTimeout(fetch(`${IC_BASE_URL}${path}`, { headers: hdrs }), 9000, "probe");
          const txt = (await r.text()).slice(0, 300);
          return { status: r.status, ms: Date.now() - t, body: txt };
        } catch (e) { return { status: 0, ms: Date.now() - t, body: String(e.message).slice(0, 200) }; }
      };
      const H = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Accept-Language": "de",
        "X-Payer-Id": payerId, "X-Recipient-Id": recipientId, "X-Branch": branch,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      };
      // Korrigierte Endpoints verifizieren
      out.pCategory = await probe(`/catalog/category`, H);
      out.pQuote    = await probe(`/inventory/quote?sku=G0QF5M`, H);
      out.pStock    = await probe(`/inventory/stock?sku=G0QF5M`, H);
      out.pIndex    = await probe(`/catalog/products?index=G7B014PC`, H);
    } catch (e) {
      out.oauth = { ok: false, ms: Date.now() - t0, error: String(e.message).slice(0, 250) };
    }
    return json(out);
  }

  try {
    const token = await getToken(clientId, clientSecret);

    // ──────────────────────────────────────────────────────────────────────────
    // SEARCH — GET /catalog/products?search=&limit=&offset=
    // Returns: { totalResults, hasNextPage, products: ICProduct[] }
    // Then enriches with stock + pricing in parallel
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "search") {
      // Bis zu 50 Produkte pro Suche — alle Marken sichtbar, nicht nur 12
      const cap = Math.min(Math.max(Number(limit) || 24, 1), 50);
      const qs = new URLSearchParams({ limit: String(cap), offset: String(offset) });
      if (query)      qs.set("search",     query);
      if (categoryId) qs.set("categoryId", categoryId);

      let catalogRaw = await icFetch(`/catalog/products?${qs}`, token, payerId, recipientId, branch);
      let products   = catalogRaw?.products || (Array.isArray(catalogRaw) ? catalogRaw : []);

      // Wenn Text-Suche leer → Artikel-Nummer-Fallback (?index= dann ?sku=)
      // Betrifft z.B. "S410485006024" — IC findet das nur über index/sku, nicht Freitext.
      if (!products.length && query && !categoryId) {
        const stripped = query.replace(/\s+/g, "").toUpperCase();
        // 1) index-Suche (Hersteller-Artikelnummer)
        const idxRaw = await icFetch(
          `/catalog/products?index=${encodeURIComponent(stripped)}&limit=${cap}`,
          token, payerId, recipientId, branch
        ).catch(() => null);
        products = idxRaw?.products || (Array.isArray(idxRaw) ? idxRaw : []);

        // 2) SKU-Suche (IC-interner Code)
        if (!products.length) {
          const skuRaw = await icFetch(
            `/catalog/products?sku=${encodeURIComponent(stripped)}&limit=${cap}`,
            token, payerId, recipientId, branch
          ).catch(() => null);
          products = skuRaw?.products || (Array.isArray(skuRaw) ? skuRaw : []);
        }

        // 3) Nochmal Text-Suche ohne Sonderzeichen (z.B. "HU716/2X" → "HU7162X")
        if (!products.length) {
          const norm = query.replace(/[^a-zA-Z0-9]/g, "");
          if (norm && norm !== query.replace(/\s/g, "")) {
            const normRaw = await icFetch(
              `/catalog/products?search=${encodeURIComponent(norm)}&limit=${cap}`,
              token, payerId, recipientId, branch
            ).catch(() => null);
            products = normRaw?.products || (Array.isArray(normRaw) ? normRaw : []);
          }
        }
      }

      if (!products.length) return json([]);

      const slice = products.slice(0, cap);
      const skus  = slice.map(p => p.sku).filter(Boolean);

      // EIN Call liefert Preise UND Bestand für alle SKUs
      const quotes = await fetchQuotes(skus, token, payerId, recipientId, branch);

      const normalized = slice
        .map((p) => normalizeProduct(p, quotes.get(String(p.sku)) ?? null))
        .filter(Boolean);

      return json(normalized);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SEARCH BY SKU — GET /catalog/products?sku=  (added Jul 2024)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "searchBySku" && sku) {
      const raw = await icFetch(`/catalog/products?sku=${encodeURIComponent(sku)}`, token, payerId, recipientId, branch);
      const products = raw?.products || (Array.isArray(raw) ? raw : []);
      if (!products.length) return json([]);

      const quotes = await fetchQuotes(products.map(x => x.sku).filter(Boolean), token, payerId, recipientId, branch);
      return json(products.map(prod =>
        normalizeProduct(prod, quotes.get(String(prod.sku)) ?? null)
      ).filter(Boolean));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SEARCH BY INDEX — GET /catalog/products?index=  (added Jul 2024)
    // IC speichert Artikel-Nummern oft ohne Leerzeichen (z.B. "HU716/2X").
    // Daher: mehrere Varianten probieren + Text-Search als Fallback.
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "searchByIndex" && productIndex) {
      // Varianten: original, uppercase, ohne Leerzeichen, ohne Leerzeichen+uppercase
      const variants = [...new Set([
        productIndex,
        productIndex.toUpperCase(),
        productIndex.replace(/\s+/g, ""),
        productIndex.replace(/\s+/g, "").toUpperCase(),
      ])];

      let products = [];

      // Erst alle Index-Varianten probieren
      for (const v of variants) {
        const raw = await icFetch(`/catalog/products?index=${encodeURIComponent(v)}&limit=10`, token, payerId, recipientId, branch);
        const prods = raw?.products || (Array.isArray(raw) ? raw : []);
        if (prods.length) { products = prods; break; }
      }

      // Fallback: Text-Search → nach Artikel-Nummer filtern
      if (!products.length) {
        const normQuery = productIndex.replace(/\s+/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const searchRaw = await icFetch(`/catalog/products?search=${encodeURIComponent(productIndex.replace(/\s+/g, ""))}&limit=10`, token, payerId, recipientId, branch);
        const searchProds = searchRaw?.products || (Array.isArray(searchRaw) ? searchRaw : []);

        // Erst exakter Treffer (normalisiert), dann erster Treffer
        products = searchProds.filter(p => {
          const normIdx = (p.index || "").replace(/\s+/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
          return normIdx === normQuery;
        });
        if (!products.length && searchProds.length > 0) products = [searchProds[0]];
      }

      if (!products.length) return json([]);

      // Bestand + Preise für gefundene Artikel holen (ein Call)
      const quotes = await fetchQuotes(products.map(x => x.sku).filter(Boolean), token, payerId, recipientId, branch);
      return json(products.map(prod =>
        normalizeProduct(prod, quotes.get(String(prod.sku)) ?? null)
      ).filter(Boolean));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRODUCT DETAIL — stock + pricing for one SKU
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "product" && sku) {
      const rawSku = sku.replace(/^ic-/, "");
      const encoded = encodeURIComponent(rawSku);

      const [catalogRaw, quotes] = await Promise.all([
        icFetch(`/catalog/products?sku=${encoded}`, token, payerId, recipientId, branch),
        fetchQuotes([rawSku], token, payerId, recipientId, branch),
      ]);

      const products = catalogRaw?.products || (Array.isArray(catalogRaw) ? catalogRaw : []);
      const product  = products[0] || { sku: rawSku, description: rawSku };

      return json(normalizeProduct(product, quotes.get(String(rawSku)) ?? null));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORIES — GET /catalog/categories
    // ──────────────────────────────────────────────────────────────────────────
    // Korrekter Pfad ist /catalog/category (Einzahl!) — /catalog/categories gibt 404.
    // Ohne categoryId → oberste Ebene; mit → Unterkategorien dieser Ebene.
    if (action === "categories") {
      const qs = new URLSearchParams();
      if (categoryId) qs.set("categoryId", categoryId);
      const raw = await icFetch(`/catalog/category${qs.toString() ? "?" + qs : ""}`, token, payerId, recipientId, branch);
      const cats = raw?.categories || raw?.data || (Array.isArray(raw) ? raw : []);
      return json(cats.map(c => ({
        categoryId: String(c.id || c.categoryId || ""),
        label:      c.name || c.label || c.description || "",
        children:   Array.isArray(c.children)
          ? c.children.map(ch => ({ categoryId: String(ch.id || ch.categoryId || ""), label: ch.name || ch.label || "" }))
          : undefined,
      })));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STOCK CHECK — batch availability for multiple SKUs
    // Note: IC shows max 10 (means "≥10 in reality")
    // ──────────────────────────────────────────────────────────────────────────
    // Ein Batch-Call für alle Positionen: GET /inventory/stock?sku=A,B,C
    if (action === "stock-check" && Array.isArray(items)) {
      const skus     = items.map(it => String(it.productId).replace(/^ic-/, ""));
      const stockMap = await fetchStock(skus, token, payerId, recipientId, branch);
      return json(items.map((it, i) => {
        const lines = stockMap.get(skus[i]) || [];
        const avail = lines.reduce((s, l) => s + Math.max(0, Math.floor(Number(l.availability) || 0)), 0);
        const want  = Number(it.quantity) || 1;
        return {
          productId:         it.productId,
          name:              it.name,
          available:         avail >= want,
          stockQuantity:     avail,
          requestedQuantity: want,
          tenPlusInStock:    avail >= 10,
        };
      }));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ORDER — POST /orders
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "order" && Array.isArray(items)) {
      const res = await fetch(`${IC_BASE_URL}/orders`, {
        method:  "POST",
        headers: {
          Authorization:    `Bearer ${token}`,
          "X-Payer-Id":     payerId,
          "X-Recipient-Id": recipientId,
          "X-Branch":       branch,
          "Content-Type":   "application/json",
          Accept:           "application/json",
        },
        body: JSON.stringify({
          payerId,
          recipientId,
          items: items.map(({ productId, quantity }) => ({
            sku:      String(productId).replace(/^ic-/, ""),
            quantity: Number(quantity) || 1,
          })),
        }),
      });
      const data = res.ok ? await res.json() : null;
      return json({
        success:          res.ok,
        orderId:          data?.orderId || data?.id || data?.orderNumber || null,
        deliveryEstimate: data?.deliveryDate || data?.estimatedDelivery || null,
        totalItems:       items.length,
        error:            !res.ok ? `Bestellung fehlgeschlagen (${res.status})` : undefined,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // DELIVERY STATUS — GET /delivery/{orderId}
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "delivery" && orderId) {
      const raw = await icFetch(`/delivery/${encodeURIComponent(orderId)}`, token, payerId, recipientId, branch);
      return json(raw || { error: "Lieferstatus nicht gefunden" });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // INVOICES — legacy IC Katalog XML API (for Verwaltung module)
    // Headers: kh_kod + token (NOT OAuth2)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "invoices" || action === "invoice") {
      const khKod        = process.env.INTERCARS_KH_KOD;
      const catalogToken = process.env.INTERCARS_CATALOG_TOKEN;
      if (!khKod || !catalogToken) {
        return json({ error: "IC Katalog credentials not set (INTERCARS_KH_KOD, INTERCARS_CATALOG_TOKEN)" }, 500);
      }
      const url = action === "invoices"
        ? `${IC_CATALOG_URL}/GetInvoices?from=${(from || "").replace(/-/g, "")}&to=${(to || "").replace(/-/g, "")}`
        : `${IC_CATALOG_URL}/GetInvoice?id=${encodeURIComponent(orderId || "")}`;

      const r = await fetch(url, { headers: { kh_kod: khKod, token: catalogToken } });
      if (!r.ok) return json({ error: `IC Katalog API: ${r.status}` }, r.status);
      const xml = await r.text();
      res.status(200).setHeader("Content-Type", "application/xml").send(xml);
      return;
    }

    return json({ error: `Unbekannte Aktion: "${action}"` }, 400);

  } catch (err) {
    console.error("[IC] Error:", err.message);
    return json({ error: err.message }, 500);
  }
}
