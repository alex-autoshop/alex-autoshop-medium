export const config = { runtime: 'edge' };

/**
 * AutoPartsAPI Proxy (apiprofile.com — TecDoc 2025 Q3 Dataset)
 * Docs: https://auto-parts-catalog.apiprofile.com/documentation
 * Auth: x-apiprofile-key Header (bleibt serverseitig!)
 *
 * Multi-Base: probiert erreichbare Hosts mit 9s-Timeout durch
 * (api.autopartsapi.com hing am 2026-07-11 → nie wieder 25s-504).
 *
 * Aufruf:  GET /api/autoparts?p=/manufacturers/list/type-id/1
 * Diagnose: GET /api/autoparts?diag=1
 */

const AUTOPARTS_KEY = process.env.AUTOPARTS_API_KEY; // NUR Env-Var — Repo ist PUBLIC, kein Key im Code!

const BASES = [
  'https://api.autopartsapi.com/api',
  'https://auto-parts-catalog.apiprofile.com/api',
  'https://auto-parts-catalog.apiprofile.com/api/v1',
  'https://api.autopartsapi.com/api/v1',
];
let preferredBase = null; // sticky pro warmer Edge-Instanz

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function cacheSeconds(path) {
  if (/^\/(languages|countries|manufacturers|models|suppliers|category)\//.test(path)) return 86400;
  if (/^\/(types|engines)\//.test(path)) return 43200;
  return 3600;
}

async function tryFetch(base, path, qs, method, bodyText, timeoutMs = 9000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}${qs ? `?${qs}` : ''}`, {
      method,
      headers: {
        'x-apiprofile-key': AUTOPARTS_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: method === 'POST' ? bodyText : undefined,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    return { _netError: String(e && e.message ? e.message : e) };
  }
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (!AUTOPARTS_KEY) {
    return new Response(JSON.stringify({ error: 'AUTOPARTS_API_KEY nicht gesetzt — Vercel → Settings → Environment Variables' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const url = new URL(req.url);
  const search = new URLSearchParams(url.search);

  // ── Diagnose-Modus: alle Bases testen ──
  if (search.get('diag') === '1') {
    const results = {};
    for (const base of BASES) {
      const r = await tryFetch(base, '/languages/list', '', 'GET', undefined, 8000);
      results[base] = r._netError
        ? { error: r._netError }
        : { status: r.status, body: (await r.text()).slice(0, 180) };
    }
    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS, 'Cache-Control': 'no-store' },
    });
  }

  let apiPath = search.get('p') || '';
  search.delete('p');
  if (!apiPath) {
    const m = url.pathname.match(/\/api\/autoparts(\/.+)/);
    apiPath = m && m[1] ? m[1] : '';
  }
  if (!apiPath || !apiPath.startsWith('/')) {
    return new Response(JSON.stringify({ error: 'Pfad fehlt: ?p=/manufacturers/list/type-id/1' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const qs = search.toString();
  const bodyText = req.method === 'POST' ? await req.text() : undefined;
  const order = preferredBase
    ? [preferredBase, ...BASES.filter((b) => b !== preferredBase)]
    : BASES;

  let lastErr = 'alle Hosts unerreichbar';
  for (const base of order) {
    const res = await tryFetch(base, apiPath, qs, req.method, bodyText);
    if (res._netError) { lastErr = `${base}: ${res._netError}`; continue; }
    // 5xx oder Timeout → nächsten Host probieren; alles andere ist eine echte Antwort
    if (res.status >= 500) { lastErr = `${base}: HTTP ${res.status}`; continue; }
    preferredBase = base;
    const data = await res.text();
    const ttl = cacheSeconds(apiPath);
    return new Response(data, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        ...CORS,
        'X-AP-Base': base,
        'Cache-Control': res.ok && req.method === 'GET'
          ? `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`
          : 'no-store',
      },
    });
  }

  return new Response(JSON.stringify({ error: `AutoPartsAPI nicht erreichbar — ${lastErr}` }), {
    status: 502,
    headers: { 'Content-Type': 'application/json', ...CORS, 'Cache-Control': 'no-store' },
  });
}
