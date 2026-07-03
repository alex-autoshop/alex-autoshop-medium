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

// ─── Static parts catalog (fallback when TecAlliance article search not licensed) ───
const STATIC_CATALOG = [
  // BREMSSCHEIBEN
  { id: 'bs001', keywords: ['bremse','bremsscheibe','bremsscheiben','disc','brake'], mfrName: 'BOSCH', articleNumber: '0 986 479 B56', name: 'Bremsscheibe', category: 'Bremse', specs: [{attrName:'Durchmesser',attrValue:'280',attrUnit:'mm'},{attrName:'Einbauseite',attrValue:'Vorderachse'},{attrName:'Breite',attrValue:'22',attrUnit:'mm'}], oeNumbers: ['5Q0615301G','5Q0615301AB'] },
  { id: 'bs002', keywords: ['bremse','bremsscheibe','bremsscheiben','disc','brake'], mfrName: 'ZIMMERMANN', articleNumber: '100.3300.20', name: 'Bremsscheibe belüftet', category: 'Bremse', specs: [{attrName:'Durchmesser',attrValue:'300',attrUnit:'mm'},{attrName:'Einbauseite',attrValue:'Vorderachse'},{attrName:'Breite',attrValue:'22',attrUnit:'mm'}], oeNumbers: ['34116756095','34116797772'] },
  { id: 'bs003', keywords: ['bremse','bremsscheibe','bremsscheiben','disc','brake'], mfrName: 'BREMBO', articleNumber: '09.B513.11', name: 'Bremsscheibe Sport', category: 'Bremse', specs: [{attrName:'Durchmesser',attrValue:'312',attrUnit:'mm'},{attrName:'Einbauseite',attrValue:'Vorderachse'},{attrName:'Breite',attrValue:'25',attrUnit:'mm'}], oeNumbers: ['1J0615301H','1J0615301AB'] },
  { id: 'bs004', keywords: ['bremse','bremsscheibe','bremsscheiben','disc','brake'], mfrName: 'ATE', articleNumber: '24.0120-0156.1', name: 'Bremsscheibe', category: 'Bremse', specs: [{attrName:'Durchmesser',attrValue:'258',attrUnit:'mm'},{attrName:'Einbauseite',attrValue:'Hinterachse'},{attrName:'Breite',attrValue:'10',attrUnit:'mm'}], oeNumbers: ['93182185','09117774'] },
  { id: 'bs005', keywords: ['bremse','bremsscheibe','bremsscheiben','disc','brake'], mfrName: 'TRW', articleNumber: 'DF4928', name: 'Bremsscheibe', category: 'Bremse', specs: [{attrName:'Durchmesser',attrValue:'269',attrUnit:'mm'},{attrName:'Einbauseite',attrValue:'Vorderachse'},{attrName:'Breite',attrValue:'20',attrUnit:'mm'}], oeNumbers: ['402064197R','402063711R'] },
  { id: 'bs006', keywords: ['bremse','bremsscheibe','bremsscheiben','disc','brake'], mfrName: 'MEYLE', articleNumber: '115 521 0014', name: 'Bremsscheibe belüftet', category: 'Bremse', specs: [{attrName:'Durchmesser',attrValue:'288',attrUnit:'mm'},{attrName:'Einbauseite',attrValue:'Vorderachse'},{attrName:'Breite',attrValue:'25',attrUnit:'mm'}], oeNumbers: ['4246W1','4246W4'] },
  { id: 'bs007', keywords: ['bremse','bremsscheibe','bremsscheiben','disc','brake'], mfrName: 'TEXTAR', articleNumber: '92159703', name: 'Bremsscheibe', category: 'Bremse', specs: [{attrName:'Durchmesser',attrValue:'320',attrUnit:'mm'},{attrName:'Einbauseite',attrValue:'Hinterachse'},{attrName:'Breite',attrValue:'20',attrUnit:'mm'}], oeNumbers: ['34216864900','34216794027'] },
  { id: 'bs008', keywords: ['bremse','bremsscheibe','bremsscheiben','disc','brake'], mfrName: 'JURID', articleNumber: '562072J', name: 'Bremsscheibe Vollscheibe', category: 'Bremse', specs: [{attrName:'Durchmesser',attrValue:'238',attrUnit:'mm'},{attrName:'Einbauseite',attrValue:'Vorderachse'},{attrName:'Breite',attrValue:'10',attrUnit:'mm'}], oeNumbers: ['GBD90791','93192525'] },

  // BREMSBELÄGE
  { id: 'bb001', keywords: ['bremse','bremsbelag','bremsbelaege','bremsbeläge','brake pad'], mfrName: 'BOSCH', articleNumber: '0 986 494 565', name: 'Bremsbelagsatz Scheibenbremse', category: 'Bremse', specs: [{attrName:'Einbauseite',attrValue:'Vorderachse'},{attrName:'Anzahl Platten',attrValue:'4'}], oeNumbers: ['7D0698151A'] },
  { id: 'bb002', keywords: ['bremse','bremsbelag','bremsbelaege','bremsbeläge','brake pad'], mfrName: 'BREMBO', articleNumber: 'P 23 097', name: 'Bremsbelagsatz Sport', category: 'Bremse', specs: [{attrName:'Einbauseite',attrValue:'Vorderachse'}], oeNumbers: ['34116761292'] },

  // ZÜNDKERZEN
  { id: 'zk001', keywords: ['zuendkerze','zündkerze','zuendkerzen','zündkerzen','spark plug','spark'], mfrName: 'BOSCH', articleNumber: 'FR 7 KPP 33+', name: 'Zuendkerze Platin', category: 'Zuendanlage', specs: [{attrName:'Gewindedurchmesser',attrValue:'M14x1,25'},{attrName:'Schlusselweite',attrValue:'16',attrUnit:'mm'},{attrName:'Elektrodenabstand',attrValue:'0,9',attrUnit:'mm'}], oeNumbers: ['030905601AA','030905601AE','030905601AF'] },
  { id: 'zk002', keywords: ['zuendkerze','zündkerze','zuendkerzen','zündkerzen','spark plug','spark'], mfrName: 'NGK', articleNumber: 'BKR6EGP', name: 'Zuendkerze G-Power Platin', category: 'Zuendanlage', specs: [{attrName:'Gewindedurchmesser',attrValue:'M14x1,25'},{attrName:'Schlusselweite',attrValue:'16',attrUnit:'mm'},{attrName:'Elektrodenabstand',attrValue:'1,1',attrUnit:'mm'}], oeNumbers: ['0K2A918110','BP9Y-EFS'] },
  { id: 'zk003', keywords: ['zuendkerze','zündkerze','zuendkerzen','zündkerzen','spark plug','spark'], mfrName: 'DENSO', articleNumber: 'IK20', name: 'Zuendkerze Iridium Power', category: 'Zuendanlage', specs: [{attrName:'Gewindedurchmesser',attrValue:'M14x1,25'},{attrName:'Schlusselweite',attrValue:'16',attrUnit:'mm'},{attrName:'Elektrodenabstand',attrValue:'1,1',attrUnit:'mm'}], oeNumbers: ['MD362896','90919-01184'] },
  { id: 'zk004', keywords: ['zuendkerze','zündkerze','zuendkerzen','zündkerzen','spark plug','spark'], mfrName: 'CHAMPION', articleNumber: 'RE7MCS', name: 'Zuendkerze Copper Plus', category: 'Zuendanlage', specs: [{attrName:'Gewindedurchmesser',attrValue:'M14x1,25'},{attrName:'Schlusselweite',attrValue:'16',attrUnit:'mm'}], oeNumbers: ['12120037607','12120032135'] },
  { id: 'zk005', keywords: ['zuendkerze','zündkerze','zuendkerzen','zündkerzen','spark plug','spark'], mfrName: 'NGK', articleNumber: 'PLFER7A8EG', name: 'Zuendkerze Laser Platinum', category: 'Zuendanlage', specs: [{attrName:'Gewindedurchmesser',attrValue:'M14x1,25'},{attrName:'Schlusselweite',attrValue:'16',attrUnit:'mm'},{attrName:'Elektrodenabstand',attrValue:'0,7',attrUnit:'mm'}], oeNumbers: ['0242229791','55575605'] },
  { id: 'zk006', keywords: ['zuendkerze','zündkerze','zuendkerzen','zündkerzen','spark plug','spark'], mfrName: 'BOSCH', articleNumber: 'YR 7 SEU+', name: 'Zuendkerze Super 4 Erbium', category: 'Zuendanlage', specs: [{attrName:'Gewindedurchmesser',attrValue:'M14x1,25'},{attrName:'Elektrodenabstand',attrValue:'0,8',attrUnit:'mm'}], oeNumbers: ['12122158252'] },
  { id: 'zk007', keywords: ['zuendkerze','zündkerze','zuendkerzen','zündkerzen','spark plug','spark'], mfrName: 'DENSO', articleNumber: 'VK20', name: 'Zuendkerze VK-Serie', category: 'Zuendanlage', specs: [{attrName:'Gewindedurchmesser',attrValue:'M14x1,25'},{attrName:'Schlusselweite',attrValue:'16',attrUnit:'mm'}], oeNumbers: ['22401-8H515','22401-BN025'] },

  // GETRIEBE
  { id: 'gt001', keywords: ['getriebe','transmission','gearbox'], mfrName: 'LUK', articleNumber: '602 0003 00', name: 'Kupplungssatz (Getriebe)', category: 'Getriebe', specs: [{attrName:'Kupplungsscheiben-Durchmesser',attrValue:'228',attrUnit:'mm'},{attrName:'Anzahl Zaehne',attrValue:'23'}], oeNumbers: ['21207543839','21207573821'] },
  { id: 'gt002', keywords: ['getriebe','transmission','gearbox'], mfrName: 'SACHS', articleNumber: '3000 951 677', name: 'Kupplungssatz komplett', category: 'Getriebe', specs: [{attrName:'Kupplungsscheiben-Durchmesser',attrValue:'240',attrUnit:'mm'},{attrName:'Hoehe',attrValue:'46',attrUnit:'mm'}], oeNumbers: ['24111223088','24111223097'] },
  { id: 'gt003', keywords: ['getriebe','transmission','gearbox'], mfrName: 'FEBI BILSTEIN', articleNumber: '101453', name: 'Getriebelagerung', category: 'Getriebe', specs: [{attrName:'Lagerart',attrValue:'Gummilager'}], oeNumbers: ['1H0199855H','1H0199855G'] },
  { id: 'gt004', keywords: ['getriebe','transmission','gearbox'], mfrName: 'ELRING', articleNumber: '914.041', name: 'Getriebegehaeuse Dichtungssatz', category: 'Getriebe', specs: [{attrName:'Zahl der Teile',attrValue:'3'}], oeNumbers: ['0AM398009','0AM398009A'] },
  { id: 'gt005', keywords: ['getriebe','transmission','gearbox'], mfrName: 'ZF', articleNumber: 'S5-18/3-3', name: 'Getriebeoel ATF', category: 'Getriebe', specs: [{attrName:'Inhalt',attrValue:'1',attrUnit:'Liter'},{attrName:'Spezifikation',attrValue:'Dexron II'}], oeNumbers: [] },
  { id: 'gt006', keywords: ['getriebe','transmission','gearbox'], mfrName: 'MEYLE', articleNumber: '614 137 0013', name: 'Antriebswellensatz Getriebe', category: 'Getriebe', specs: [{attrName:'Seite',attrValue:'links'},{attrName:'Laenge',attrValue:'597',attrUnit:'mm'}], oeNumbers: ['3272KL','3272KD'] },
  { id: 'gt007', keywords: ['getriebe','transmission','gearbox'], mfrName: 'LUK', articleNumber: '537 0181 10', name: 'Ausruecklager Getriebe', category: 'Getriebe', specs: [{attrName:'Innendurchmesser',attrValue:'27',attrUnit:'mm'}], oeNumbers: ['52401461','55702480'] },

  // ÖLFILTER
  { id: 'of001', keywords: ['oelfilter','ölfilter','oil filter','filter'], mfrName: 'BOSCH', articleNumber: 'F 026 407 006', name: 'Oelfilter', category: 'Oelfilter', specs: [{attrName:'Innendurchmesser',attrValue:'62',attrUnit:'mm'},{attrName:'Aussenduchmesser',attrValue:'76',attrUnit:'mm'},{attrName:'Hoehe',attrValue:'78',attrUnit:'mm'}], oeNumbers: ['15400-PLM-A01','15400-PLM-A02'] },
  { id: 'of002', keywords: ['oelfilter','ölfilter','oil filter','filter'], mfrName: 'MANN-FILTER', articleNumber: 'W 712/93', name: 'Oelfilter', category: 'Oelfilter', specs: [{attrName:'Innendurchmesser',attrValue:'62',attrUnit:'mm'},{attrName:'Hoehe',attrValue:'74',attrUnit:'mm'}], oeNumbers: ['0451103316','5650353'] },
  { id: 'of003', keywords: ['oelfilter','ölfilter','oil filter','filter'], mfrName: 'MAHLE ORIGINAL', articleNumber: 'OC 295', name: 'Oelfilter', category: 'Oelfilter', specs: [{attrName:'Innendurchmesser',attrValue:'62',attrUnit:'mm'},{attrName:'Hoehe',attrValue:'76',attrUnit:'mm'}], oeNumbers: ['030115561E','030115561AH'] },

  // LUFTFILTER
  { id: 'lf001', keywords: ['luftfilter','air filter','filter'], mfrName: 'BOSCH', articleNumber: 'F 026 400 072', name: 'Luftfilter', category: 'Luftfilter', specs: [{attrName:'Laenge',attrValue:'257',attrUnit:'mm'},{attrName:'Breite',attrValue:'213',attrUnit:'mm'},{attrName:'Hoehe',attrValue:'47',attrUnit:'mm'}], oeNumbers: ['1987429404'] },
  { id: 'lf002', keywords: ['luftfilter','air filter','filter'], mfrName: 'MANN-FILTER', articleNumber: 'C 24 030', name: 'Luftfilter', category: 'Luftfilter', specs: [{attrName:'Laenge',attrValue:'290',attrUnit:'mm'},{attrName:'Breite',attrValue:'188',attrUnit:'mm'}], oeNumbers: ['1444QK','1444VF'] },

  // STOßDÄMPFER
  { id: 'sd001', keywords: ['stossdaempfer','stoßdämpfer','stoss','daempfer','shock absorber'], mfrName: 'BILSTEIN', articleNumber: 'B4 22-229434', name: 'Stossdaempfer Vorderachse', category: 'Stossdaempfer', specs: [{attrName:'Einbauseite',attrValue:'Vorderachse'},{attrName:'Typ',attrValue:'Zweirohr'}], oeNumbers: ['5340F6','5340F7'] },
  { id: 'sd002', keywords: ['stossdaempfer','stoßdämpfer','stoss','daempfer','shock absorber'], mfrName: 'SACHS', articleNumber: '315 718', name: 'Stossdaempfer', category: 'Stossdaempfer', specs: [{attrName:'Einbauseite',attrValue:'Vorderachse'}], oeNumbers: ['8200869725','8200869726'] },
  { id: 'sd003', keywords: ['stossdaempfer','stoßdämpfer','stoss','daempfer','shock absorber'], mfrName: 'MONROE', articleNumber: 'G8006', name: 'Stossdaempfer Gas-Druck', category: 'Stossdaempfer', specs: [{attrName:'Einbauseite',attrValue:'Hinterachse'},{attrName:'Typ',attrValue:'Einrohr'}], oeNumbers: ['333219','0K55228700E'] },

  // KUPPLUNG
  { id: 'ku001', keywords: ['kupplung','kupplungssatz','clutch'], mfrName: 'LUK', articleNumber: '624 3410 09', name: 'Kupplungssatz', category: 'Kupplung', specs: [{attrName:'Kupplungsscheiben-Durchmesser',attrValue:'215',attrUnit:'mm'}], oeNumbers: ['21201223296'] },
  { id: 'ku002', keywords: ['kupplung','kupplungssatz','clutch'], mfrName: 'SACHS', articleNumber: '3000 832 101', name: 'Kupplungssatz komplett', category: 'Kupplung', specs: [{attrName:'Kupplungsscheiben-Durchmesser',attrValue:'215',attrUnit:'mm'},{attrName:'Anzahl Zaehne',attrValue:'18'}], oeNumbers: ['3000523031'] },

  // ZAHNRIEMEN
  { id: 'zr001', keywords: ['zahnriemen','timing belt','riemen'], mfrName: 'GATES', articleNumber: 'T38102', name: 'Zahnriemensatz', category: 'Motor', specs: [{attrName:'Laenge',attrValue:'1020',attrUnit:'mm'},{attrName:'Anzahl Zaehne',attrValue:'120'}], oeNumbers: ['030109119M','030109119H'] },
  { id: 'zr002', keywords: ['zahnriemen','timing belt','riemen'], mfrName: 'DAYCO', articleNumber: 'KTB283', name: 'Zahnriemensatz mit Wasserpumpe', category: 'Motor', specs: [{attrName:'Laenge',attrValue:'960',attrUnit:'mm'}], oeNumbers: ['7701477048'] },

  // WASSERPUMPE
  { id: 'wp001', keywords: ['wasserpumpe','water pump','pumpe'], mfrName: 'DOLZ', articleNumber: 'A148', name: 'Wasserpumpe', category: 'Kuehlung', specs: [{attrName:'Anzahl Schaufeln',attrValue:'6'}], oeNumbers: ['030121005Q','030121005M'] },
  { id: 'wp002', keywords: ['wasserpumpe','water pump','pumpe'], mfrName: 'GATES', articleNumber: 'WP0109', name: 'Wasserpumpe', category: 'Kuehlung', specs: [{attrName:'Riemenscheibendurchmesser',attrValue:'58',attrUnit:'mm'}], oeNumbers: ['1201E5','9637478880'] },
];

function staticSearch(query) {
  const q = query.toLowerCase().replace(/[äöü]/g, c => ({ä:'ae',ö:'oe',ü:'ue'}[c]||c));
  const tokens = q.split(/\s+/).filter(t => t.length > 2);
  const scored = STATIC_CATALOG.map(item => {
    const kw = item.keywords;
    const score = tokens.reduce((s, t) => s + (kw.some(k => k.includes(t) || t.includes(k)) ? 2 : 0) +
      (item.name.toLowerCase().replace(/[äöü]/g, c => ({ä:'ae',ö:'oe',ü:'ue'}[c]||c)).includes(t) ? 1 : 0) +
      (item.category.toLowerCase().includes(t) ? 1 : 0), 0);
    return { item, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  const items = scored.slice(0, 20).map(({ item }) => ({
    legacyArticleId: item.id,
    articleNumber: item.articleNumber,
    mfrName: item.mfrName,
    articleText: item.name,
    genericArticles: [{ genericArticleDescription: item.name, assemblyGroupDescription: item.category }],
    images: [],
    oeNumbers: (item.oeNumbers || []).map(n => ({ oeNumber: n })),
    immediateAttributs: (item.specs || []).map(s => ({ attrName: s.attrName, attrValue: s.attrValue, attrUnit: s.attrUnit || '' })),
  }));

  return { articles: items, totalMatchingArticles: items.length, source: 'static_catalog' };
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
      // Try TecAlliance first; fall back to static catalog if not licensed (400)
      try {
        const pegResult = await peg('LIST_ARTICLES_BY_QUICK_SEARCH', {
          searchQuery: query, page, perPage: 20, includeAll: true,
        });
        if (pegResult?.error || pegResult?.status >= 400) {
          result = staticSearch(query);
        } else {
          result = pegResult;
        }
      } catch(_) {
        result = staticSearch(query);
      }
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
