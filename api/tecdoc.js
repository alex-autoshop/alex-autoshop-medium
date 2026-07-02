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
    const { action, plate, vin, hsn, tsn, ktype, query, productGroupIds, mfrId, page = 1 } = await req.json();
    let result = null;

    if (action === 'plate' && plate) {
      result = await vrmLookup(plate, 'DE');
    } else if (action === 'vin' && vin) {
      const apiKey = process.env.TECALLIANCE_API_KEY;
      const vrmRes = await fetch(`${VRM_BASE}/vehicles/vin/${encodeURIComponent(vin)}?lang=de`, {
        headers: { "x-api-key": apiKey }
      });
      if (vrmRes.ok) {
        result = await vrmRes.json();
      } else {
        const WMI_MAP = {
          'WOL': 'Opel', 'W0L': 'Opel', 'WVW': 'Volkswagen', 'WP0': 'Porsche',
          'WBA': 'BMW', 'WBS': 'BMW', 'WBY': 'BMW', 'WMW': 'MINI', 'WME': 'smart',
          'WAU': 'Audi', 'TRU': 'Audi', 'WDB': 'Mercedes-Benz', 'WDC': 'Mercedes-Benz',
          'WDD': 'Mercedes-Benz', 'VF1': 'Renault', 'VF3': 'Peugeot', 'VF7': 'Citroen',
          'ZFA': 'Fiat', 'VSS': 'SEAT', 'TMB': 'Skoda', 'YV1': 'Volvo',
          'SAJ': 'Jaguar', 'SAL': 'Land Rover', 'VS6': 'Ford', 'VSE': 'Ford',
          'WF0': 'Ford', 'NM0': 'Ford',
        };
        const YEAR_CHARS = {
          'A':2010,'B':2011,'C':2012,'D':2013,'E':2014,'F':2015,'G':2016,'H':2017,
          'J':2018,'K':2019,'L':2020,'M':2021,'N':2022,'P':2023,'R':2024,'S':2025,
          'T':2026,'V':1997,'W':1998,'X':1999,'Y':2000,
          '1':2001,'2':2002,'3':2003,'4':2004,'5':2005,'6':2006,'7':2007,'8':2008,'9':2009,
        };
        const YEAR_CHARS_OLD = {
          'A':1980,'B':1981,'C':1982,'D':1983,'E':1984,'F':1985,
          'G':1986,'H':1987,'J':1988,'K':1989,'L':1990,'M':1991,
          'N':1992,'P':1993,'R':1994,'S':1995,'T':1996
        };

        const vinUpper = vin.toUpperCase().replace(/[IOQ]/g, c => c==='I'?'1':c==='O'?'0':'0');
        const wmi = vinUpper.slice(0, 3);
        const yearChar = vinUpper[9] || '';
        let brand = WMI_MAP[wmi] || '';
        let year = YEAR_CHARS[yearChar] || YEAR_CHARS_OLD[yearChar] || 0;

        try {
          const nhtsaR = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(vinUpper)}?format=json`);
          if (nhtsaR.ok) {
            const nhtsa = await nhtsaR.json();
            const getV = (n) => nhtsa.Results && nhtsa.Results.find(r => r.Variable === n) ? nhtsa.Results.find(r => r.Variable === n).Value : '';
            const nm = getV('Make'), ny = getV('Model Year');
            if (nm && nm !== 'Not Applicable') brand = nm;
            if (ny && ny !== 'Not Applicable') year = parseInt(ny) || year;
          }
        } catch(e) {}

        if (brand) {
          result = {
            source: 'vin_decoded',
            vin: vinUpper,
            vinBrand: brand,
            vinYear: year || null,
            vehicles: [{
              vehicleInformation: {
                ktype: null,
                manuName: brand,
                modelName: '',
                typeName: brand + (year ? ' - ' + year : ''),
                yearOfConstrFrom: year || null,
                yearOfConstrTo: null,
              }
            }]
          };
        } else {
          result = { error: 'VIN nicht erkannt - Hersteller-Praefix "' + wmi + '" unbekannt', vin: vin };
        }
      }
    } else if (action === 'kba' && hsn) {
      const apiKey = process.env.TECALLIANCE_API_KEY;
      const res = await fetch(
        `${VRM_BASE}/vehicles/kba/${encodeURIComponent(hsn)}/${encodeURIComponent(tsn || "")}?lang=de`,
        { headers: { "x-api-key": apiKey } }
      );
      result = res.ok ? await res.json() : { error: `KBA error: ${res.status}` };
    } else if (action === 'search' && query) {
      result = await peg('LIST_ARTICLES_BY_QUICK_SEARCH', {
        searchQuery: query, page, perPage: 20, includeAll: true,
      });
    } else if (action === 'articles' && ktype) {
      result = await peg('LIST_ARTICLES_BY_LINKAGE_TARGET', {
        linkageTargetId: ktype,
        linkageTargetType: 'P',
        productGroupIds: productGroupIds || [],
        page, perPage: 20, includeAll: true,
      });
    } else if (action === 'vehicles' && (mfrId || query)) {
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
