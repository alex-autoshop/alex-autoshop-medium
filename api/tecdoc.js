export const config = { runtime: 'edge' };

const PEG_BASE = "https://webservice.tecalliance.services/pegasus-3-0/services/TecdocToCatDLB.jsonEndpoint";
const VRM_BASE = "https://vehicle-identification.tecalliance.services/api/v1";
const PROVIDER_ID = 25876;

async function peg(call, payload) {
  const apiKey = process.env.TECALLIANCE_API_KEY;
  const url = `${PEG_BASE}?api_key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [call]: { provider: PROVIDER_ID, lang: "de", articleCountry: "DE", ...payload } }),
  });
  if (!res.ok) return { error: `Pegasus error: ${res.status}` };
  return res.json();
}

async function vrmLookup(plate, country = "DE") {
  const apiKey = process.env.TECALLIANCE_API_KEY;
  const url = `${VRM_BASE}/vrm/${country}/${encodeURIComponent(plate)}?lang=de`;
  const res = await fetch(url, { headers: { "x-api-key": apiKey } });
  if (!res.ok) return { error: `VRM error: ${res.status}` };
  return res.json();
}

export default async function handler(req) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const { action, plate, vin, ktype, query, productGroupIds, mfrId, page = 1 } = await req.json();
    let result = null;

    if (action === 'plate' && plate) {
      // Kennzeichen → Fahrzeugdaten (Deutschland)
      result = await vrmLookup(plate, 'DE');
    } else if (action === 'vin' && vin) {
      // VIN lookup
      const apiKey = process.env.TECALLIANCE_API_KEY;
      const res = await fetch(`${VRM_BASE}/vehicles/vin/${encodeURIComponent(vin)}?lang=de`, {
        headers: { "x-api-key": apiKey }
      });
      result = res.ok ? await res.json() : { error: `VIN error: ${res.status}` };
    } else if (action === 'search' && query) {
      // Artikel-Suche
      result = await peg('LIST_ARTICLES_BY_QUICK_SEARCH', {
        searchQuery: query, page, perPage: 20,
        includeAll: true,
      });
    } else if (action === 'articles' && ktype) {
      // Teile für Fahrzeug (ktype ID)
      result = await peg('LIST_ARTICLES_BY_LINKAGE_TARGET', {
        linkageTargetId: ktype,
        linkageTargetType: 'P',
        productGroupIds: productGroupIds || [],
        page, perPage: 20,
        includeAll: true,
      });
    } else if (action === 'vehicles' && (mfrId || query)) {
      // Fahrzeuge suchen
      result = await peg('GET_LINKAGE_TARGETS', {
        linkageTargetType: 'P',
        mfrIds: mfrId ? [mfrId] : undefined,
        perPage: 20, page,
      });
    } else if (action === 'manufacturers') {
      result = await peg('GET_LINKAGE_TARGETS', {
        linkageTargetType: 'P',
        perPage: 0,
        includeMfrFacets: true,
      });
    }

    return new Response(JSON.stringify(result || { error: 'No result' }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
}
