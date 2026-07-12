/**
 * Inter Cars API Edge Function
 *
 * Secure backend proxy for IC API.
 * Token is cached in DB (ic_tokens table).
 *
 * Actions:
 *   - search: products by categoryId with pagination
 *   - product: single product by SKU (stock + pricing)
 *   - categories: browse catalog categories
 *   - stock: single SKU stock check
 *   - pricing: get price quote for SKU(s)
 *   - product-detail: combined stock + pricing for a single SKU
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── CONFIG ─────────────────────────────────────────────────

const IC_TOKEN_URL = "https://is.webapi.intercars.eu/oauth2/token";
const IC_BASE_URL = "https://api.webapi.intercars.eu/ic";
const IC_PAYER_ID = "F00099";
const IC_RECIPIENT_ID = "F00100";
const IC_BRANCH = "FA1";

// ─── SUPABASE CLIENT (service role for token table) ─────────

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

// ─── AUTH (OAuth2 client_credentials with DB caching) ───────

async function getAccessToken(): Promise<string> {
  const sb = getSupabaseAdmin();

  // Check DB for valid cached token
  const { data: tokens } = await sb
    .from("ic_tokens")
    .select("access_token, expires_at")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1);

  if (tokens && tokens.length > 0) {
    console.log("[auth] Using cached token from DB");
    return tokens[0].access_token;
  }

  // Fetch new token
  const clientId = Deno.env.get("INTERCARS_CLIENT_ID");
  const clientSecret = Deno.env.get("INTERCARS_CLIENT_SECRET");
  if (!clientId) throw new Error("INTERCARS_CLIENT_ID not configured");
  if (!clientSecret) throw new Error("INTERCARS_CLIENT_SECRET not configured");

  console.log("[auth] Requesting new token from:", IC_TOKEN_URL);
  const res = await fetch(IC_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`IC Auth failed [${res.status}]: ${body}`);
  }

  const data = await res.json();
  const expiresIn = data.expires_in ?? 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000 - 60_000).toISOString(); // 1 min buffer

  // Store token in DB
  await sb.from("ic_tokens").insert({
    access_token: data.access_token,
    expires_in: expiresIn,
    expires_at: expiresAt,
  });

  // Cleanup old expired tokens
  await sb.from("ic_tokens").delete().lt("expires_at", new Date().toISOString());

  return data.access_token;
}

// ─── API HELPERS ────────────────────────────────────────────

function icHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Payer-Id": IC_PAYER_ID,
    "Recipient-Id": IC_RECIPIENT_ID,
    Accept: "application/json",
    "Accept-Language": "en",
  };
}

async function icGet(path: string, params?: Record<string, string>): Promise<unknown> {
  const token = await getAccessToken();
  const url = new URL(`${IC_BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    }
  }

  console.log("[icGet]", url.toString());
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: icHeaders(token),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`IC API [${res.status}] ${path}: ${errBody}`);
  }
  return res.json();
}

async function icPost(path: string, body: unknown, queryParams?: Record<string, string>): Promise<unknown> {
  const token = await getAccessToken();
  const url = new URL(`${IC_BASE_URL}${path}`);
  if (queryParams) {
    for (const [k, v] of Object.entries(queryParams)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  console.log("[icPost]", url.toString());
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      ...icHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`IC API POST [${res.status}] ${path}: ${errBody}`);
  }
  return res.json();
}

// ─── HANDLERS ───────────────────────────────────────────────

/**
 * Get categories
 * GET /catalog/category?categoryId=optional
 */
async function handleCategories(body: { categoryId?: string }) {
  const params: Record<string, string> = {};
  if (body.categoryId) params.categoryId = body.categoryId;
  return await icGet("/catalog/category", params);
}

/**
 * Get products by category with pagination
 * GET /catalog/products?categoryId=...&pageNumber=0&pageSize=25
 */
async function handleSearch(body: {
  query?: string;
  categoryId?: string;
  index?: string;
  sku?: string;
  brands?: string;
  pageNumber?: number;
  pageSize?: number;
}) {
  // Detect whether free-text query is actually an SKU/index lookup token.
  // IC `index` is an article number / IC-SKU, NOT a general full-text search.
  // Heuristic: SKU-like = alphanumeric (incl. dot/dash/slash), length 5..30, contains a digit,
  // no spaces, no umlauts/diacritics.
  const isSkuLike = (s: string): boolean => {
    const t = s.trim();
    if (!t || t.length < 5 || t.length > 30) return false;
    if (/\s/.test(t)) return false;
    if (/[äöüß]/i.test(t)) return false;
    if (!/^[A-Za-z0-9._\-\/]+$/.test(t)) return false;
    if (!/[0-9]/.test(t)) return false;
    return true;
  };

  const rawQuery = (body.query || "").trim();
  const queryAsIndex = body.index || (rawQuery && isSkuLike(rawQuery) ? rawQuery : undefined);

  const effectiveIndex = queryAsIndex;
  const effectiveSku = body.sku || undefined;
  const effectiveCategoryId = body.categoryId || undefined;

  if (!effectiveCategoryId && !effectiveIndex && !effectiveSku) {
    // Free-text query without SKU/category cannot be served by IC catalog/products.
    // Return an empty product list instead of throwing — TecDoc handles the search.
    console.log("[handleSearch] skipping IC search — non-SKU query, no category", {
      query: rawQuery || null,
    });
    return { products: [], totalResults: 0, pageNumber: 0, pageSize: body.pageSize ?? 25, skipped: true };
  }

  const params: Record<string, string> = {};
  if (effectiveCategoryId) params.categoryId = effectiveCategoryId;
  if (effectiveIndex) params.index = effectiveIndex;
  if (effectiveSku) params.sku = effectiveSku;
  if (body.brands) params.brands = body.brands;
  params.pageNumber = String(body.pageNumber ?? 0);
  params.pageSize = String(body.pageSize ?? 25);

  console.log("[handleSearch] params:", JSON.stringify(params), "rawQuery:", rawQuery || null);
  return await icGet("/catalog/products", params);
}

/**
 * Get stock for a single SKU
 * POST /inventory/stock?location=FA1  body: {"sku":"..."}
 */
async function handleStock(body: { sku: string }) {
  if (!body.sku) throw new Error("sku required");
  return await icPost("/inventory/stock", { sku: body.sku }, { location: IC_BRANCH });
}

/**
 * Get pricing quote
 * POST /pricing/quote  body: {"lines":[{"sku":"...","quantity":1}]}
 */
async function handlePricing(body: { lines: Array<{ sku: string; quantity: number }> }) {
  if (!body.lines || !Array.isArray(body.lines)) throw new Error("lines required");
  return await icPost("/pricing/quote", { lines: body.lines });
}

/**
 * Get full product detail: stock + pricing combined
 */
async function handleProductDetail(body: { sku: string }) {
  if (!body.sku) throw new Error("sku required");

  const [stockData, pricingData] = await Promise.all([
    icPost("/inventory/stock", { sku: body.sku }, { location: IC_BRANCH }),
    icPost("/pricing/quote", { lines: [{ sku: body.sku, quantity: 1 }] }),
  ]);

  return { stock: stockData, pricing: pricingData };
}

/**
 * Batch: get stock + pricing for multiple SKUs (for product list enrichment)
 * Fetches stock one by one (API limitation) and pricing in one call
 */
async function handleBatchEnrich(body: { skus: string[] }) {
  if (!body.skus || !Array.isArray(body.skus) || body.skus.length === 0) {
    throw new Error("skus array required");
  }

  // Limit batch size
  const skus = body.skus.slice(0, 25);

  // Fetch stock for each SKU individually (API doesn't accept arrays)
  const stockPromises = skus.map(sku =>
    icPost("/inventory/stock", { sku }, { location: IC_BRANCH })
      .then(data => ({ sku, data, error: null }))
      .catch(err => ({ sku, data: null, error: err.message }))
  );

  // Fetch pricing for all SKUs in one call
  const pricingPromise = icPost("/pricing/quote", {
    lines: skus.map(sku => ({ sku, quantity: 1 })),
  }).catch(err => ({ error: err.message }));

  const [stockResults, pricingResult] = await Promise.all([
    Promise.all(stockPromises),
    pricingPromise,
  ]);

  return { stocks: stockResults, pricing: pricingResult };
}

// ─── MAIN HANDLER ───────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST required" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    let result: unknown;

    switch (action) {
      case "categories":
        result = await handleCategories(body);
        break;
      case "search":
        result = await handleSearch(body);
        break;
      case "stock":
        result = await handleStock(body);
        break;
      case "pricing":
        result = await handlePricing(body);
        break;
      case "product-detail":
        result = await handleProductDetail(body);
        break;
      case "batch-enrich":
        result = await handleBatchEnrich(body);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("intercars-api error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
