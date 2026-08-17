/**
 * YQ Service OEM-Katalog Proxy  (oem-api.yqservice.eu, REST API v2)
 *
 * Liefert Original-Herstellerdaten: VIN-Suche, Baugruppen und vor allem die
 * echten EXPLOSIONSZEICHNUNGEN inkl. anklickbarer Bildbereiche (imageMaps).
 *
 * Auth: HTTP Basic — Zugangsdaten NUR als Vercel-Env (Repo ist PUBLIC!):
 *   YQ_LOGIN, YQ_PASSWORD
 *
 * WICHTIG (Lehre aus api/intercars.js): Node-Runtime braucht die (req,res)-
 * Signatur. Mit der Web-API-Signatur wird NIE geantwortet -> 25s-Timeout.
 *
 * Aufruf:
 *   GET  /api/yqcat?action=whoAreMeInfo
 *   POST /api/yqcat?action=findVehicle        Body = JSON der YQ-Anfrage
 *   GET  /api/yqcat?diag=1                    Konfig-/Erreichbarkeitstest
 */

const BASE = process.env.YQ_BASE || 'https://oem-api.yqservice.eu/restApi/v2';
const LOGIN = process.env.YQ_LOGIN;
const PASSWORD = process.env.YQ_PASSWORD;

// Nur dokumentierte Funktionen durchlassen — kein offener Proxy.
const ACTIONS = new Set([
  'whoAreMeInfo',
  'catalogs',
  'getCatalogShort',
  'getCatalogInfo',
  'findVehicle',
  'findVehicleOperation',
  'getOperationForm',
  'findPartReferences',
  'findByPlateNumber',
  'findApplicableVehicles',
  'getVehicleInfo',
  'getNavigationTree',
  'getUnits',
  'getFilter',
  'getUnitInfo',
  'getUnitParts',
  'getGroups',
  'getGroupParts',
  'getGroupPartsAll',
  'getPartApplicability',
]);

// Stammdaten dürfen im CDN liegen, Fahrzeugsuchen nicht.
const CACHE_SECONDS = {
  catalogs: 86400,
  getCatalogShort: 86400,
  getCatalogInfo: 86400,
  getNavigationTree: 3600,
  getGroups: 3600,
  getUnits: 3600,
  getUnitInfo: 3600,
  getUnitParts: 3600,
};

function send(res, status, obj, cacheSec) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader(
    'Cache-Control',
    cacheSec ? `public, s-maxage=${cacheSec}, stale-while-revalidate=86400` : 'no-store'
  );
  res.status(status).end(JSON.stringify(obj));
}

async function callYq(action, body, language, timeoutMs = 25000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const upstream = await fetch(`${BASE}/${action}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64'),
        'Content-Type': 'application/json',
        'Accept-Language': language || 'de-DE',
        Accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await upstream.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* kein JSON — Rohtext zurückgeben */
    }
    return { status: upstream.status, ms: Date.now() - started, json, text: json ? null : text.slice(0, 400) };
  } catch (err) {
    return {
      status: err.name === 'AbortError' ? 504 : 502,
      ms: Date.now() - started,
      json: null,
      text: err.name === 'AbortError' ? 'YQ antwortet nicht (Timeout)' : String(err).slice(0, 200),
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const action = url.searchParams.get('action') || '';
  const language = url.searchParams.get('lang') || 'de-DE';

  if (!LOGIN || !PASSWORD) {
    return send(res, 500, {
      error: 'YQ_LOGIN / YQ_PASSWORD fehlen in den Vercel-Umgebungsvariablen',
      hinweis: 'Zugangsdaten gehören NUR in die Vercel-Env, niemals ins Repo.',
    });
  }

  // Diagnose: erreichbar? Zugang gültig? Welche Kataloge?
  if (url.searchParams.get('diag')) {
    const who = await callYq('whoAreMeInfo', undefined, language, 12000);
    const cat = await callYq('catalogs', {}, language, 20000);
    return send(res, 200, {
      base: BASE,
      loginGesetzt: !!LOGIN,
      whoAreMeInfo: { status: who.status, ms: who.ms, antwort: who.json || who.text },
      catalogs: {
        status: cat.status,
        ms: cat.ms,
        anzahl: cat.json?.data?.catalogs?.length ?? null,
        ersteMarken: (cat.json?.data?.catalogs || []).slice(0, 12).map((c) => c.name || c.code),
        fehler: cat.json?.error || cat.text || null,
      },
    });
  }

  if (!ACTIONS.has(action)) {
    return send(res, 400, { error: `Unbekannte action "${action}"`, erlaubt: [...ACTIONS] });
  }

  let body;
  if (action === 'whoAreMeInfo') {
    body = undefined; // einzige GET-Funktion
  } else if (req.method === 'POST') {
    body = req.body && typeof req.body === 'object' ? req.body : {};
    if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch {
        body = {};
      }
    }
  } else {
    body = {}; // GET auf eine POST-Funktion = leerer Einstieg (z.B. catalogs)
  }

  const out = await callYq(action, body, language);
  if (out.json) return send(res, out.status, out.json, out.status === 200 ? CACHE_SECONDS[action] : 0);
  return send(res, out.status, { error: out.text || 'Keine Antwort von YQ', ms: out.ms });
};
