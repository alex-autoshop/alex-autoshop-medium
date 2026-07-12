// Serverless (nicht Edge) — Intercars OAuth blockt Cloudflare/Edge IPs
export const config = { runtime: 'nodejs', maxDuration: 25 };

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
 * IC API response shapes (confirmed from SDK):
 *
 * GET /catalog/products → { totalResults, hasNextPage, requestProcessingTime, products: ICProduct[] }
 * ICProduct: { sku, index, brand, shortDescription, description, blockedReturn }
 *
 * GET /catalog/products/{sku}/stock → ICStockItem[]
 * ICStockItem: { sku, location, availability, index, name, description, blockedReturn, eans }
 *
 * GET /catalog/products/pricing → { lines: ICPriceLine[] }
 * ICPriceLine.price: { currencyCode, listPriceNet, listPriceGross, vatPercentage, vatAmount,
 *   refundableAmountNet, refundableAmountGross, customerPriceNet, customerPriceGross }
 *
 * New field (Sep 2025): gtuCode in GET /catalog/products
 * New query params (Jul 2024): ?sku= and ?index= on GET /catalog/products
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

// ── Pricing: POST mit SKU-Liste zuerst, GET als Fallback ─────────────────────
async function fetchPricing(skus, token, payerId, recipientId, branch) {
  if (!skus.length) return null;
  const body = buildPricingBody(skus.map((sku) => ({ sku, quantity: 1 })));
  const viaPost = await icPost(`/catalog/products/pricing`, body, token, payerId, recipientId, branch)
    .catch(() => null);
  if (viaPost?.lines?.length) return viaPost;
  return icFetch(`/catalog/products/pricing?${new URLSearchParams({ skus: skus.join(",") })}`, token, payerId, recipientId, branch)
    .catch(() => null);
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
function normalizeProduct(product, stockItem = null, priceLine = null) {
  if (!product) return null;

  const sku   = product.sku   || product.index || "";
  const name  = product.description || product.shortDescription || product.name || "Artikel";
  const brand = product.brand || "Inter Cars";

  // Stock: field is `availability` (not `quantity`)
  const stockAvail = stockItem?.availability ?? 0;
  // IC API: shows max 10 — "10" means "10 or more in stock"
  const tenPlus = stockAvail >= 10;
  const qty     = stockAvail;
  const avail   = qty > 0
    ? (tenPlus ? "sofort (10+ Stück)" : `sofort (${qty} Stück)`)
    : "auf Anfrage";
  const days    = qty > 0 ? 1 : 3;

  // EAN codes (on stock item)
  const eans    = Array.isArray(stockItem?.eans) ? stockItem.eans : [];
  const images  = []; // IC API doesn't return images directly in this version

  // Pricing: customerPriceGross is what Alex's account pays (B2B price!)
  const customerPrice  = priceLine?.price?.customerPriceGross  ?? 0;
  const listPrice      = priceLine?.price?.listPriceGross      ?? 0;
  const vatPct         = priceLine?.price?.vatPercentage       ?? 19;
  const currency       = priceLine?.price?.currencyCode        ?? "EUR";

  const price         = Number(customerPrice) || Number(listPrice) || 0;
  const priceOriginal = Number(listPrice) > Number(customerPrice) && Number(listPrice) > 0
    ? Number(listPrice)
    : undefined;

  const specs = {};
  if (product.index)   specs["Index"]    = product.index;
  if (eans[0])         specs["EAN"]      = eans[0];
  if (product.gtuCode) specs["GTU-Code"] = product.gtuCode; // new Sep 2025
  if (vatPct)          specs["MwSt"]     = `${vatPct}%`;
  if (currency)        specs["Währung"]  = currency;
  if (qty > 0)         specs["Lager"]    = tenPlus ? "≥10 Stück" : `${qty} Stück`;
  if (stockItem?.location) specs["Lagerort"] = stockItem.location;
  if (product.blockedReturn) specs["Rückgabe"] = "nicht möglich";

  return {
    id:            `ic-${sku}`,
    name,
    brand,
    price,
    priceOriginal,
    availability:  avail,
    deliveryDays:  days,
    specs,
    oemNumber:     eans[0] || "",
    oemNumbers:    eans,
    images,
    stockQuantity: qty,
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
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")   return new Response("Method not allowed", { status: 405, headers: CORS });

  const clientId     = process.env.INTERCARS_CLIENT_ID;
  const clientSecret = process.env.INTERCARS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return json({ error: "Intercars credentials not configured", hint: "Set INTERCARS_CLIENT_ID + INTERCARS_CLIENT_SECRET in Vercel env vars" }, 500);
  }

  const payerId     = process.env.INTERCARS_PAYER_ID     || "F00099";
  const recipientId = process.env.INTERCARS_RECIPIENT_ID || payerId;
  const branch      = process.env.INTERCARS_BRANCH       || "FA1";

  let body;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const { action, query, sku, index: productIndex, categoryId, limit = 12, offset = 0, items, orderId, from, to } = body;

  // ── DIAGNOSE: wo genau klemmt es? (Credentials → OAuth → Catalog) ──────────
  if (action === "diag") {
    const out = { hasCreds: true, payerId, branch, runtime: "nodejs" };
    const t0 = Date.now();
    try {
      const token = await getToken(clientId, clientSecret);
      out.oauth = { ok: true, ms: Date.now() - t0, tokenLen: (token || "").length };
      const t1 = Date.now();
      try {
        const cat = await icFetch(`/catalog/products?search=filter&limit=1`, token, payerId, recipientId, branch);
        out.catalog = { ok: !!cat, ms: Date.now() - t1, total: cat?.totalResults, sampleSku: cat?.products?.[0]?.sku };
      } catch (e) {
        out.catalog = { ok: false, ms: Date.now() - t1, error: String(e.message).slice(0, 200) };
      }
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

      const catalogRaw = await icFetch(`/catalog/products?${qs}`, token, payerId, recipientId, branch);
      const products   = catalogRaw?.products || (Array.isArray(catalogRaw) ? catalogRaw : []);

      if (!products.length) return json([]);

      const slice = products.slice(0, cap);
      const skus  = slice.map(p => p.sku).filter(Boolean);

      const [stockResults, pricingRaw] = await Promise.all([
        // Stock: parallel in 10er-Batches (Rate-Limit-schonend)
        inChunks(skus, 10, s =>
          icFetch(`/catalog/products/${encodeURIComponent(s)}/stock`, token, payerId, recipientId, branch)
            .then(r => Array.isArray(r) ? r[0] : r)
            .catch(() => null)
        ),
        // Pricing: Batch-Call mit SKU-Liste
        fetchPricing(skus, token, payerId, recipientId, branch),
      ]);

      // Pricing map: sku → priceLine
      const priceMap = new Map();
      if (pricingRaw?.lines) {
        for (const line of pricingRaw.lines) priceMap.set(line.sku, line);
      }

      const normalized = slice.map((p, i) =>
        normalizeProduct(p, stockResults[i] ?? null, priceMap.get(p.sku) ?? null)
      ).filter(Boolean);

      return json(normalized);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SEARCH BY SKU — GET /catalog/products?sku=  (added Jul 2024)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "searchBySku" && sku) {
      const raw = await icFetch(`/catalog/products?sku=${encodeURIComponent(sku)}`, token, payerId, recipientId, branch);
      const products = raw?.products || (Array.isArray(raw) ? raw : []);
      if (!products.length) return json([]);

      const p = products[0];
      const [stockRaw, pricingRaw] = await Promise.all([
        icFetch(`/catalog/products/${encodeURIComponent(p.sku)}/stock`, token, payerId, recipientId, branch),
        fetchPricing(products.map(x => x.sku).filter(Boolean), token, payerId, recipientId, branch),
      ]);
      const stockItem = Array.isArray(stockRaw) ? stockRaw[0] : stockRaw;
      const priceMap  = new Map();
      if (pricingRaw?.lines) for (const l of pricingRaw.lines) priceMap.set(l.sku, l);

      return json(products.map(prod =>
        normalizeProduct(prod, prod.sku === p.sku ? stockItem : null, priceMap.get(prod.sku) ?? null)
      ).filter(Boolean));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SEARCH BY INDEX — GET /catalog/products?index=  (added Jul 2024)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "searchByIndex" && productIndex) {
      const raw = await icFetch(`/catalog/products?index=${encodeURIComponent(productIndex)}`, token, payerId, recipientId, branch);
      const products = raw?.products || (Array.isArray(raw) ? raw : []);
      if (!products.length) return json([]);

      // Same enrich flow as SKU search
      const p = products[0];
      const [stockRaw, pricingRaw] = await Promise.all([
        icFetch(`/catalog/products/${encodeURIComponent(p.sku || p.index)}/stock`, token, payerId, recipientId, branch),
        fetchPricing(products.map(x => x.sku).filter(Boolean), token, payerId, recipientId, branch),
      ]);
      const stockItem = Array.isArray(stockRaw) ? stockRaw[0] : stockRaw;
      const priceMap  = new Map();
      if (pricingRaw?.lines) for (const l of pricingRaw.lines) priceMap.set(l.sku, l);

      return json(products.map(prod =>
        normalizeProduct(prod, prod.sku === p.sku ? stockItem : null, priceMap.get(prod.sku) ?? null)
      ).filter(Boolean));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRODUCT DETAIL — stock + pricing for one SKU
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "product" && sku) {
      const rawSku = sku.replace(/^ic-/, "");
      const encoded = encodeURIComponent(rawSku);

      const [catalogRaw, stockRaw, pricingRaw] = await Promise.all([
        icFetch(`/catalog/products?sku=${encoded}`, token, payerId, recipientId, branch),
        icFetch(`/catalog/products/${encoded}/stock`, token, payerId, recipientId, branch),
        fetchPricing([rawSku], token, payerId, recipientId, branch),
      ]);

      const products  = catalogRaw?.products || (Array.isArray(catalogRaw) ? catalogRaw : []);
      const product   = products[0] || { sku: rawSku, description: rawSku };
      const stockItem = Array.isArray(stockRaw) ? stockRaw[0] : stockRaw;

      const priceMap = new Map();
      if (pricingRaw?.lines) for (const l of pricingRaw.lines) priceMap.set(l.sku, l);

      return json(normalizeProduct(product, stockItem, priceMap.get(rawSku) ?? null));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CATEGORIES — GET /catalog/categories
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "categories") {
      const qs = new URLSearchParams();
      if (categoryId) qs.set("parentId", categoryId);
      const raw = await icFetch(`/catalog/categories${qs.toString() ? "?" + qs : ""}`, token, payerId, recipientId, branch);
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
    if (action === "stock-check" && Array.isArray(items)) {
      const results = await Promise.allSettled(
        items.map(async ({ productId, quantity, name }) => {
          const skuId   = String(productId).replace(/^ic-/, "");
          const stockRaw = await icFetch(`/catalog/products/${encodeURIComponent(skuId)}/stock`, token, payerId, recipientId, branch);
          const stockArr = Array.isArray(stockRaw) ? stockRaw : (stockRaw ? [stockRaw] : []);
          const avail    = stockArr.reduce((sum, s) => sum + (s.availability || 0), 0);
          return {
            productId,
            name,
            available:         avail >= quantity,
            stockQuantity:     avail,
            requestedQuantity: quantity,
            tenPlusInStock:    avail >= 10,
          };
        })
      );
      return json(results.map((r, i) =>
        r.status === "fulfilled" ? r.value : {
          productId: items[i]?.productId, name: items[i]?.name,
          available: false, stockQuantity: 0, requestedQuantity: items[i]?.quantity || 1,
        }
      ));
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

      const res = await fetch(url, { headers: { kh_kod: khKod, token: catalogToken } });
      if (!res.ok) return json({ error: `IC Katalog API: ${res.status}` }, res.status);
      const xml = await res.text();
      return new Response(xml, { status: 200, headers: { ...CORS, "Content-Type": "application/xml" } });
    }

    return json({ error: `Unbekannte Aktion: "${action}"` }, 400);

  } catch (err) {
    console.error("[IC] Error:", err.message);
    return json({ error: err.message }, 500);
  }
}
