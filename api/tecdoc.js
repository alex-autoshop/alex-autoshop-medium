export const config = { runtime: 'edge' };

const PEG_BASE = "https://webservice.tecalliance.services/pegasus-3-0/services/TecdocToCatDLB.jsonEndpoint";
const VRM_BASE = "https://vehicle-identification.tecalliance.services/api/v1";
const PROVIDER_ID = 25876;

// ─── Fetch mit Timeout ───────────────────────────────────────────────────────
async function fetchT(url, options = {}, ms = 4000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(t);
    return res;
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

async function peg(call, payload) {
  const apiKey = process.env.TECALLIANCE_API_KEY;
  const res = await fetchT(`${PEG_BASE}?api_key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [call]: { provider: PROVIDER_ID, lang: "de", articleCountry: "DE", ...payload } }),
  }, 5000);
  if (!res.ok) return { error: `Pegasus error: ${res.status}` };
  return res.json();
}

// ─── WMI-Map (Sofort-Lookup, kein API-Call) ──────────────────────────────────
const WMI_MAP = {
  'WOL':'Opel','W0L':'Opel','WVW':'Volkswagen','WP0':'Porsche',
  'WBA':'BMW','WBS':'BMW','WBY':'BMW','WMW':'MINI','WME':'smart',
  'WAU':'Audi','TRU':'Audi','WDB':'Mercedes-Benz','WDC':'Mercedes-Benz',
  'WDD':'Mercedes-Benz','W1N':'Mercedes-Benz',
  'VF1':'Renault','VF3':'Peugeot','VF7':'Citroen',
  'ZFA':'Fiat','VSS':'SEAT','TMB':'Skoda','YV1':'Volvo',
  'SAJ':'Jaguar','SAL':'Land Rover','VS6':'Ford','VSE':'Ford','WF0':'Ford','NM0':'Ford',
  'VAN':'Opel','YK1':'Saab',
  'JDA':'Daihatsu','JD1':'Daihatsu','JD2':'Daihatsu',
  'JHM':'Honda','JH4':'Acura','JN1':'Nissan','JN8':'Nissan',
  'JT2':'Toyota','JT3':'Toyota','JT4':'Toyota','JTD':'Toyota','JTK':'Toyota','JTN':'Toyota',
  'JM1':'Mazda','JM3':'Mazda',
  'KNA':'Kia','KND':'Kia','KNM':'Kia',
  'KMH':'Hyundai','KME':'Hyundai',
  'ZAR':'Alfa Romeo','ZFF':'Ferrari','ZCG':'Ferrari',
};

const YEAR_CHARS = {
  'A':2010,'B':2011,'C':2012,'D':2013,'E':2014,'F':2015,'G':2016,'H':2017,
  'J':2018,'K':2019,'L':2020,'M':2021,'N':2022,'P':2023,'R':2024,'S':2025,'T':2026,
  'V':1997,'W':1998,'X':1999,'Y':2000,
  '1':2001,'2':2002,'3':2003,'4':2004,'5':2005,'6':2006,'7':2007,'8':2008,'9':2009,
  'A80':1980,'B81':1981,'C82':1982,'D83':1983,'E84':1984,'F85':1985,
  'G86':1986,'H87':1987,'J88':1988,'K89':1989,'L90':1990,'M91':1991,
  'N92':1992,'P93':1993,'R94':1994,'S95':1995,'T96':1996,
};

function decodeVinLocal(vin) {
  const v = vin.toUpperCase().replace(/\s/g,'').replace(/I/g,'1').replace(/O/g,'0').replace(/Q/g,'0');
  const wmi = v.slice(0, 3);
  const yearChar = v[9] || '';
  const brand = WMI_MAP[wmi] || null;
  const year = YEAR_CHARS[yearChar] || null;
  return { vin: v, brand, year };
}

// ─── Static catalog (fallback) ───────────────────────────────────────────────
const STATIC_CATALOG = [
  { id:'bs001', keywords:['bremse','bremsscheibe','disc','brake'], mfrName:'BOSCH', articleNumber:'0 986 479 B56', name:'Bremsscheibe', category:'Bremse', specs:[{attrName:'Durchmesser',attrValue:'280',attrUnit:'mm'},{attrName:'Einbauseite',attrValue:'Vorderachse'}], oeNumbers:['5Q0615301G'] },
  { id:'bs002', keywords:['bremse','bremsscheibe','disc','brake'], mfrName:'ZIMMERMANN', articleNumber:'100.3300.20', name:'Bremsscheibe belüftet', category:'Bremse', specs:[{attrName:'Durchmesser',attrValue:'300',attrUnit:'mm'},{attrName:'Einbauseite',attrValue:'Vorderachse'}], oeNumbers:['34116756095'] },
  { id:'bs003', keywords:['bremse','bremsscheibe','disc','brake'], mfrName:'BREMBO', articleNumber:'09.B513.11', name:'Bremsscheibe Sport', category:'Bremse', specs:[{attrName:'Durchmesser',attrValue:'312',attrUnit:'mm'}], oeNumbers:['1J0615301H'] },
  { id:'bb001', keywords:['bremse','bremsbelag','bremsbeläge','brake pad'], mfrName:'BOSCH', articleNumber:'0 986 494 565', name:'Bremsbelagsatz', category:'Bremse', specs:[{attrName:'Einbauseite',attrValue:'Vorderachse'}], oeNumbers:['7D0698151A'] },
  { id:'zk001', keywords:['zuendkerze','zündkerze','spark plug'], mfrName:'BOSCH', articleNumber:'FR 7 KPP 33+', name:'Zündkerze Platin', category:'Zündanlage', specs:[{attrName:'Gewindedurchmesser',attrValue:'M14x1,25'}], oeNumbers:['030905601AA'] },
  { id:'zk002', keywords:['zuendkerze','zündkerze','spark plug'], mfrName:'NGK', articleNumber:'BKR6EGP', name:'Zündkerze G-Power Platin', category:'Zündanlage', specs:[{attrName:'Gewindedurchmesser',attrValue:'M14x1,25'}], oeNumbers:['0K2A918110'] },
  { id:'of001', keywords:['oelfilter','ölfilter','oil filter','filter'], mfrName:'BOSCH', articleNumber:'F 026 407 006', name:'Ölfilter', category:'Ölfilter', specs:[{attrName:'Höhe',attrValue:'78',attrUnit:'mm'}], oeNumbers:['15400-PLM-A01'] },
  { id:'of002', keywords:['oelfilter','ölfilter','oil filter','filter'], mfrName:'MANN-FILTER', articleNumber:'W 712/93', name:'Ölfilter', category:'Ölfilter', specs:[{attrName:'Höhe',attrValue:'74',attrUnit:'mm'}], oeNumbers:['0451103316'] },
  { id:'lf001', keywords:['luftfilter','air filter'], mfrName:'BOSCH', articleNumber:'F 026 400 072', name:'Luftfilter', category:'Luftfilter', specs:[{attrName:'Länge',attrValue:'257',attrUnit:'mm'}], oeNumbers:[] },
  { id:'sd001', keywords:['stossdaempfer','stoßdämpfer','shock absorber'], mfrName:'BILSTEIN', articleNumber:'B4 22-229434', name:'Stoßdämpfer Vorderachse', category:'Stoßdämpfer', specs:[{attrName:'Einbauseite',attrValue:'Vorderachse'}], oeNumbers:[] },
  { id:'ku001', keywords:['kupplung','clutch'], mfrName:'LUK', articleNumber:'624 3410 09', name:'Kupplungssatz', category:'Kupplung', specs:[{attrName:'Durchmesser',attrValue:'215',attrUnit:'mm'}], oeNumbers:[] },
  { id:'wp001', keywords:['wasserpumpe','water pump'], mfrName:'DOLZ', articleNumber:'A148', name:'Wasserpumpe', category:'Kühlung', specs:[{attrName:'Anzahl Schaufeln',attrValue:'6'}], oeNumbers:['030121005Q'] },
  { id:'zr001', keywords:['zahnriemen','timing belt','riemen'], mfrName:'GATES', articleNumber:'T38102', name:'Zahnriemensatz', category:'Motor', specs:[{attrName:'Anzahl Zähne',attrValue:'120'}], oeNumbers:['030109119M'] },
  { id:'gt001', keywords:['getriebe','transmission','gearbox'], mfrName:'LUK', articleNumber:'602 0003 00', name:'Kupplungssatz (Getriebe)', category:'Getriebe', specs:[], oeNumbers:[] },
  { id:'bs004', keywords:['bremse','bremsscheibe','disc','brake'], mfrName:'ATE', articleNumber:'24.0120-0156.1', name:'Bremsscheibe', category:'Bremse', specs:[{attrName:'Einbauseite',attrValue:'Hinterachse'}], oeNumbers:['93182185'] },
];

function staticSearch(query) {
  const q = query.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue');
  const tokens = q.split(/\s+/).filter(t => t.length > 2);
  const scored = STATIC_CATALOG.map(item => {
    const score = tokens.reduce((s, t) =>
      s + (item.keywords.some(k => k.includes(t) || t.includes(k)) ? 2 : 0) +
      (item.name.toLowerCase().includes(t) ? 1 : 0), 0);
    return { item, score };
  }).filter(x => x.score > 0).sort((a,b) => b.score - a.score);
  const items = scored.slice(0,20).map(({ item }) => ({
    legacyArticleId: item.id, articleNumber: item.articleNumber, mfrName: item.mfrName,
    articleText: item.name,
    genericArticles: [{ genericArticleDescription: item.name, assemblyGroupDescription: item.category }],
    images: [], oeNumbers: (item.oeNumbers||[]).map(n => ({ oeNumber: n })),
    immediateAttributs: (item.specs||[]).map(s => ({ attrName:s.attrName, attrValue:s.attrValue, attrUnit:s.attrUnit||'' })),
  }));
  return { articles: items, totalMatchingArticles: items.length, source: 'static_catalog' };
}

export default async function handler(req) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const { action, plate, vin, hsn, tsn, ktype, query, productGroupIds, mfrId, page = 1 } = await req.json();
    const apiKey = process.env.TECALLIANCE_API_KEY;
    let result = null;

    // ── Kennzeichen ──────────────────────────────────────────────────────────
    if (action === 'plate' && plate) {
      try {
        const res = await fetchT(`${VRM_BASE}/vrm/DE/${encodeURIComponent(plate)}?lang=de`, {
          headers: { "x-api-key": apiKey }
        }, 5000);
        result = res.ok ? await res.json() : { error: `VRM error: ${res.status}` };
      } catch(e) {
        result = { error: 'Kennzeichen-Suche Timeout — bitte VIN verwenden' };
      }

    // ── VIN / FIN ────────────────────────────────────────────────────────────
    } else if (action === 'vin' && vin) {
      const { vin: vinNorm, brand: localBrand, year: localYear } = decodeVinLocal(vin);

      // 1. TecAlliance mit 4s Timeout versuchen
      try {
        const res = await fetchT(`${VRM_BASE}/vehicles/vin/${encodeURIComponent(vinNorm)}?lang=de`, {
          headers: { "x-api-key": apiKey }
        }, 4000);
        if (res.ok) {
          result = await res.json();
        }
      } catch(e) { /* timeout → lokaler Fallback */ }

      // 2. Fallback: WMI-Map (sofort, kein API-Call) + evtl. NHTSA nur wenn Marke unbekannt
      if (!result) {
        let brand = localBrand;
        let year = localYear;

        // NHTSA nur wenn Marke NICHT in WMI-Map (z.B. seltene US-Hersteller)
        if (!brand) {
          try {
            const nhtsaRes = await fetchT(
              `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(vinNorm)}?format=json`,
              {}, 3000
            );
            if (nhtsaRes.ok) {
              const nhtsa = await nhtsaRes.json();
              const get = (n) => (nhtsa.Results||[]).find(r => r.Variable===n)?.Value || '';
              const nm = get('Make'), ny = get('Model Year');
              if (nm && nm !== 'Not Applicable') brand = nm;
              if (ny && ny !== 'Not Applicable') year = parseInt(ny) || year;
            }
          } catch(e) { /* NHTSA Timeout */ }
        }

        if (brand) {
          result = {
            source: 'vin_decoded', vin: vinNorm, vinBrand: brand, vinYear: year || null,
            vehicles: [{ vehicleInformation: {
              ktype: null, manuName: brand, modelName: '', typeName: brand + (year ? ' ' + year : ''),
              yearOfConstrFrom: year || null, yearOfConstrTo: null,
            }}]
          };
        } else {
          result = { error: `VIN-Hersteller nicht erkannt (WMI: ${vinNorm.slice(0,3)})`, vin: vinNorm };
        }
      }

    // ── Schlüsselnummer (KBA) ────────────────────────────────────────────────
    } else if (action === 'kba' && hsn) {
      const hsnClean = hsn.trim().padStart(4, '0');
      const tsnClean = (tsn||'').trim().padStart(3, '0');
      try {
        const res = await fetchT(
          `${VRM_BASE}/vehicles/kba/${encodeURIComponent(hsnClean)}/${encodeURIComponent(tsnClean)}?lang=de`,
          { headers: { "x-api-key": apiKey } }, 5000
        );
        if (res.ok) result = await res.json();
        else if (res.status === 403 || res.status === 401) result = { error: 'kba_not_licensed', hsn: hsnClean, tsn: tsnClean };
        else result = { error: `KBA Fehler: ${res.status}`, hsn: hsnClean, tsn: tsnClean };
      } catch(e) {
        result = { error: 'Schlüsselnummer-Suche Timeout — ruf uns an: 0202 82690', hsn, tsn };
      }

    // ── Teilesuche ───────────────────────────────────────────────────────────
    } else if (action === 'search' && query) {
      try {
        const pegResult = await peg('LIST_ARTICLES_BY_QUICK_SEARCH', {
          searchQuery: query, page, perPage: 20, includeAll: true,
        });
        result = (!pegResult || pegResult.error) ? staticSearch(query) : pegResult;
      } catch(e) {
        result = staticSearch(query); // sofortiger Fallback bei Timeout
      }

    // ── Teile nach Fahrzeug ──────────────────────────────────────────────────
    } else if (action === 'articles' && ktype) {
      try {
        result = await peg('LIST_ARTICLES_BY_LINKAGE_TARGET', {
          linkageTargetId: ktype, linkageTargetType: 'P',
          productGroupIds: productGroupIds || [], page, perPage: 20, includeAll: true,
        });
      } catch(e) {
        result = { error: 'Teile-Suche Timeout', articles: [] };
      }

    } else if (action === 'vehicles' && (mfrId || query)) {
      try {
        result = await peg('GET_LINKAGE_TARGETS', {
          linkageTargetType: 'P', mfrIds: mfrId ? [mfrId] : undefined, perPage: 20, page,
        });
      } catch(e) { result = { error: 'Timeout', data: [] }; }

    } else if (action === 'manufacturers') {
      try {
        result = await peg('GET_LINKAGE_TARGETS', {
          linkageTargetType: 'P', perPage: 0, includeMfrFacets: true,
        });
      } catch(e) { result = { error: 'Timeout' }; }
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
