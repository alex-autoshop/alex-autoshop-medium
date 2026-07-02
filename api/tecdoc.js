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
      // Kennzeichen → Fahrzeugdaten (Deutschland)
      result = await vrmLookup(plate, 'DE');
    } else if (action === 'vin' && vin) {
      // VIN lookup — Step 1: TecAlliance VRM
      const apiKey = process.env.TECALLIANCE_API_KEY;
      const vrmRes = await fetch(`${VRM_BASE}/vehicles/vin/${encodeURIComponent(vin)}?lang=de`, {
        headers: { "x-api-key": apiKey }
      });
      if (vrmRes.ok) {
        result = await vrmRes.json();
      } else {
        // Step 2: Decode VIN locally (WMI prefix + year char) + NHTSA fallback
        const WMI_MAP = {
          'WOL': 'Opel', 'W0L': 'Opel', 'WVW': 'Volkswagen', 'WP0': 'Porsche',
          'WBA': 'BMW', 'WBS': 'BMW', 'WBY': 'BMW', 'WMW': 'MINI', 'WME': 'smart',
          'WAU': 'Audi', 'TRU': 'Audi', 'WDB': 'Mercedes-Benz', 'WDC': 'Mercedes-Benz',
          'WDD': 'Mercedes-Benz', 'VF1': 'Renault', 'VF3': 'Peugeot', 'VF7': 'Citroën',
          'ZFA': 'Fiat', 'VSS': 'SEAT', 'TMB': 'Škoda', 'YV1': 'Volvo',
          'SAJ': 'Jaguar', 'SAL': 'Land Rover', 'VS6': 'Ford', 'VSE': 'Ford',
          'WF0': 'Ford', 'NM0': 'Ford',
        };
        const YEAR_CHARS = {
          'A':2010,'B':2011,'C':2012,'D':2013,'E':2014,'F':2015,'G':2016,'H':2017,
          'J':2018,'K':2019,'L':2020,'M':2021,'N':2022,'P':2023,'R':2024,'S':2025,
          'T':2026,'V':1997,'W':1998,'X':1999,'Y':2000,
          '1':2001,'2':2002,'3':2003,'4':2004,'5':2005,'6':2006,'7':2007,'8':2008,'9':2009,
        };
        const YEAR_CHARS_OLD = { 'A':1980,'B':1981,'C':1982,'D':1983,'E':1984,'F':1985,
          'G':1986,'H':1987,'J':1988,'K':1989,'L':1990,'M':1991,'N':1992,'P':1993,'R':1994,'S':1995,'T':1996 };

        const vinUpper = vin.toUpperCase().replace(/[IOQ]/g, c => c==='I'?'1':c==='O'?'0':'0');
        const wmi = vinUpper.slice(0, 3);
        const yearChar = vinUpper[9] || '';
        let brand = WMI_MAP[wmi] || '';
        let year = YEAR_CHARS[yearChar] || YEAR_CHARS_OLD[yearChar] || 0;

        // NHTSA free API as extra signal
        try {
          const nhtsaR = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(vinUpper)}?format=json`);
          if (nhtsaR.ok) {
            const nhtsa = await nht