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
  // BREMSE
  { id:'bs001', keywords:['bremse','bremsscheibe','disc','brake'], mfrName:'BOSCH', articleNumber:'0 986 479 B56', name:'Bremsscheibe', category:'Bremse', specs:[{attrName:'Durchmesser',attrValue:'280',attrUnit:'mm'},{attrName:'Einbauseite',attrValue:'Vorderachse'}], oeNumbers:['5Q0615301G'] },
  { id:'bs002', keywords:['bremse','bremsscheibe','disc','brake'], mfrName:'ZIMMERMANN', articleNumber:'100.3300.20', name:'Bremsscheibe belüftet', category:'Bremse', specs:[{attrName:'Durchmesser',attrValue:'300',attrUnit:'mm'},{attrName:'Einbauseite',attrValue:'Vorderachse'}], oeNumbers:['34116756095'] },
  { id:'bs003', keywords:['bremse','bremsscheibe','disc','brake'], mfrName:'BREMBO', articleNumber:'09.B513.11', name:'Bremsscheibe Sport', category:'Bremse', specs:[{attrName:'Durchmesser',attrValue:'312',attrUnit:'mm'}], oeNumbers:['1J0615301H'] },
  { id:'bs004', keywords:['bremse','bremsscheibe','disc','brake'], mfrName:'ATE', articleNumber:'24.0120-0156.1', name:'Bremsscheibe', category:'Bremse', specs:[{attrName:'Einbauseite',attrValue:'Hinterachse'}], oeNumbers:['93182185'] },
  { id:'bb001', keywords:['bremse','bremsbelag','bremsbelaege','bremsbeläge','brake pad'], mfrName:'BOSCH', articleNumber:'0 986 494 565', name:'Bremsbelagsatz Vorderachse', category:'Bremse', specs:[{attrName:'Einbauseite',attrValue:'Vorderachse'}], oeNumbers:['7D0698151A'] },
  { id:'bb002', keywords:['bremse','bremsbelag','bremsbelaege','brake pad'], mfrName:'TRW', articleNumber:'GDB1570', name:'Bremsbelagsatz Hinterachse', category:'Bremse', specs:[{attrName:'Einbauseite',attrValue:'Hinterachse'}], oeNumbers:[] },
  { id:'bs005', keywords:['bremssattel','sattel','caliper','bremse'], mfrName:'ATE', articleNumber:'11.0441-9856.3', name:'Bremssattel rechts', category:'Bremse', specs:[{attrName:'Einbauseite',attrValue:'Vorne rechts'}], oeNumbers:[] },
  { id:'bz001', keywords:['bremszylinder','radbremszylinder','wheel cylinder','bremse'], mfrName:'TRW', articleNumber:'BWH244', name:'Radbremszylinder', category:'Bremse', specs:[], oeNumbers:[] },

  // ZÜNDANLAGE
  { id:'zk001', keywords:['zuendkerze','zundkerze','zündkerze','spark plug','zuendung'], mfrName:'BOSCH', articleNumber:'FR 7 KPP 33+', name:'Zündkerze Platin', category:'Zündanlage', specs:[{attrName:'Gewindedurchmesser',attrValue:'M14x1,25'}], oeNumbers:['030905601AA'] },
  { id:'zk002', keywords:['zuendkerze','zundkerze','zündkerze','spark plug'], mfrName:'NGK', articleNumber:'BKR6EGP', name:'Zündkerze G-Power Platin', category:'Zündanlage', specs:[{attrName:'Gewindedurchmesser',attrValue:'M14x1,25'}], oeNumbers:['0K2A918110'] },
  { id:'gk001', keywords:['gluehkerze','glühkerze','gluhkerze','glow plug','diesel','gluehen','glühen'], mfrName:'BOSCH', articleNumber:'0 250 203 001', name:'Glühkerze', category:'Zündanlage', specs:[{attrName:'Spannung',attrValue:'12V'},{attrName:'Watt',attrValue:'65W'}], oeNumbers:['5970.H9'] },
  { id:'gk002', keywords:['gluehkerze','glühkerze','glow plug','diesel'], mfrName:'NGK', articleNumber:'Y-507J', name:'Glühkerze', category:'Zündanlage', specs:[], oeNumbers:[] },

  // FILTER
  { id:'of001', keywords:['oelfilter','ölfilter','oel filter','oil filter','filter'], mfrName:'BOSCH', articleNumber:'F 026 407 006', name:'Ölfilter', category:'Ölfilter', specs:[{attrName:'Höhe',attrValue:'78',attrUnit:'mm'}], oeNumbers:['15400-PLM-A01'] },
  { id:'of002', keywords:['oelfilter','ölfilter','oil filter','filter'], mfrName:'MANN-FILTER', articleNumber:'W 712/93', name:'Ölfilter', category:'Ölfilter', specs:[{attrName:'Höhe',attrValue:'74',attrUnit:'mm'}], oeNumbers:[] },
  { id:'lf001', keywords:['luftfilter','air filter','filter'], mfrName:'BOSCH', articleNumber:'F 026 400 072', name:'Luftfilter', category:'Luftfilter', specs:[{attrName:'Länge',attrValue:'257',attrUnit:'mm'}], oeNumbers:[] },
  { id:'lf002', keywords:['luftfilter','air filter','filter'], mfrName:'MANN-FILTER', articleNumber:'C 2898', name:'Luftfilter', category:'Luftfilter', specs:[], oeNumbers:[] },
  { id:'kf001', keywords:['kraftstofffilter','benzinfilter','dieselfilter','fuel filter','kraftstoff','filter'], mfrName:'BOSCH', articleNumber:'F 026 402 062', name:'Kraftstofffilter', category:'Kraftstofffilter', specs:[], oeNumbers:[] },
  { id:'if001', keywords:['innenraumfilter','pollenfilter','aktivkohlefilter','cabin filter','filter','innenraum','pollen'], mfrName:'BOSCH', articleNumber:'1 987 432 415', name:'Innenraumfilter mit Aktivkohle', category:'Innenraumfilter', specs:[{attrName:'Mit Aktivkohle',attrValue:'Ja'}], oeNumbers:[] },
  { id:'if002', keywords:['innenraumfilter','pollenfilter','filter','innenraum','pollen'], mfrName:'MANN-FILTER', articleNumber:'CU 29 000', name:'Innenraumfilter', category:'Innenraumfilter', specs:[], oeNumbers:[] },

  // VENTIL / MOTOR-DICHTUNGEN
  { id:'vs001', keywords:['ventilgummi','ventilschaft','ventilschaftdichtung','dichtring','valve stem','stem seal','ventil','dichtung'], mfrName:'ELRING', articleNumber:'456.910', name:'Ventilschaftdichtung Satz (8 Stück)', category:'Motor-Dichtung', specs:[{attrName:'Menge',attrValue:'8 Stück'},{attrName:'Material',attrValue:'PTFE/FKM'}], oeNumbers:['12014-RAA-A01'] },
  { id:'vs002', keywords:['ventilgummi','ventilschaft','ventilschaftdichtung','valve stem','ventil'], mfrName:'VICTOR REINZ', articleNumber:'12-53543-01', name:'Ventilschaftdichtung', category:'Motor-Dichtung', specs:[], oeNumbers:[] },
  { id:'vd001', keywords:['ventildeckeldichtung','ventildeckel','zylinderkopfhaube','kopfhaubendichtung','dichtung','motor','rocker cover'], mfrName:'ELRING', articleNumber:'217.600', name:'Ventildeckeldichtung', category:'Motor-Dichtung', specs:[{attrName:'Material',attrValue:'Silikon'}], oeNumbers:['11120-0D020'] },
  { id:'vd002', keywords:['ventildeckeldichtung','ventildeckel','zylinderkopfhaube','dichtung','motor'], mfrName:'VICTOR REINZ', articleNumber:'71-12933-00', name:'Ventildeckeldichtung', category:'Motor-Dichtung', specs:[], oeNumbers:[] },
  { id:'dk001', keywords:['zylinderkopfdichtung','kopfdichtung','head gasket','dichtung','motor','zylinderkopf'], mfrName:'ELRING', articleNumber:'125.830', name:'Zylinderkopfdichtung', category:'Motor-Dichtung', specs:[{attrName:'Dicke',attrValue:'1,5mm'}], oeNumbers:['06A103383S'] },
  { id:'od001', keywords:['oelwannendichtung','ölwannendichtung','oelwanne','ölwanne','sump gasket','dichtung','öl'], mfrName:'ELRING', articleNumber:'029.320', name:'Ölwannendichtung', category:'Motor-Dichtung', specs:[], oeNumbers:[] },
  { id:'ka001', keywords:['kurbelwellendichtung','kurbelwelle','dichtung','wellendichtring','simmerring'], mfrName:'ELRING', articleNumber:'065.900', name:'Kurbelwellendichtring vorne', category:'Motor-Dichtung', specs:[], oeNumbers:[] },
  { id:'nd001', keywords:['nockenwellendichtung','nockenwelle','dichtung','wellendichtring','simmerring'], mfrName:'ELRING', articleNumber:'068.850', name:'Nockenwellendichtring', category:'Motor-Dichtung', specs:[], oeNumbers:[] },

  // ANTRIEBSWELLE / GELENKWELLE
  { id:'aw001', keywords:['antriebswelle','gelenkwelle','drive shaft','gleichlaufgelenk','cv joint','seitenwelle','antrieb'], mfrName:'LOBRO', articleNumber:'304542', name:'Antriebswelle komplett links', category:'Antrieb', specs:[{attrName:'Einbauseite',attrValue:'Links'},{attrName:'Gelenke',attrValue:'2x Gleichlaufgelenk'}], oeNumbers:['1J0407451EX'] },
  { id:'aw002', keywords:['antriebswelle','gelenkwelle','drive shaft','gleichlaufgelenk','seitenwelle','antrieb'], mfrName:'GKN', articleNumber:'2987671', name:'Antriebswelle komplett rechts', category:'Antrieb', specs:[{attrName:'Einbauseite',attrValue:'Rechts'}], oeNumbers:['1J0407452BX'] },
  { id:'gm001', keywords:['gelenkwellenmanschette','manschette','faltenbalg','achsmanschette','cv boot','antrieb','gelenk','antriebsgummi'], mfrName:'LOBRO', articleNumber:'500 0001 10', name:'Gelenkwellenmanschette außen', category:'Antrieb', specs:[], oeNumbers:['1J0498203'] },
  { id:'gm002', keywords:['gelenkwellenmanschette','manschette','faltenbalg','cv boot','antrieb','gelenk'], mfrName:'FEBI', articleNumber:'23789', name:'Manschettensatz Antriebswelle innen', category:'Antrieb', specs:[], oeNumbers:[] },

  // KÜHLUNG
  { id:'wp001', keywords:['wasserpumpe','water pump','kuhlung','kühlung','kühlwasser'], mfrName:'DOLZ', articleNumber:'A148', name:'Wasserpumpe', category:'Kühlung', specs:[{attrName:'Anzahl Schaufeln',attrValue:'6'}], oeNumbers:['030121005Q'] },
  { id:'ts001', keywords:['thermostat','kühlwasser','kuehlwasser','kühlmittel','thermo','cooling','temperatur'], mfrName:'WAHLER', articleNumber:'4.583.80D', name:'Thermostat mit Dichtung', category:'Kühlung', specs:[{attrName:'Öffnungstemperatur',attrValue:'80°C'}], oeNumbers:['06A121113G'] },
  { id:'kh001', keywords:['kuehlmittelschlauch','kühlmittelschlauch','kühlerschlauch','schlauch','kühler','hose','coolant'], mfrName:'GATES', articleNumber:'02-0901', name:'Kühlmittelschlauch oben', category:'Kühlung', specs:[], oeNumbers:[] },
  { id:'kh002', keywords:['kuehlmittelschlauch','kühlmittelschlauch','kühlerschlauch','schlauch','kühler','coolant'], mfrName:'GATES', articleNumber:'02-0902', name:'Kühlmittelschlauch unten', category:'Kühlung', specs:[], oeNumbers:[] },
  { id:'ku001', keywords:['kühler','kuehler','radiator','kühlmittel','kühlung','wasser'], mfrName:'NISSENS', articleNumber:'60794', name:'Motorkühler', category:'Kühlung', specs:[], oeNumbers:['1K0121253M'] },

  // RIEMENANTRIEB
  { id:'zr001', keywords:['zahnriemen','timing belt','riemen','steuerriemen','steuerung'], mfrName:'GATES', articleNumber:'T38102', name:'Zahnriemensatz', category:'Steuerriemen', specs:[{attrName:'Anzahl Zähne',attrValue:'120'}], oeNumbers:['030109119M'] },
  { id:'kr001', keywords:['keilriemen','keilrippenriemen','riemen','v-belt','belt','rippenriemen'], mfrName:'GATES', articleNumber:'6PK1725', name:'Keilrippenriemen', category:'Keilrippenriemen', specs:[{attrName:'Riementyp',attrValue:'6PK'},{attrName:'Länge',attrValue:'1725mm'}], oeNumbers:[] },
  { id:'rt001', keywords:['riemenspanner','spanner','tensioner','spannrolle','riemen'], mfrName:'INA', articleNumber:'534 0080 10', name:'Riemenspanner', category:'Riemenantrieb', specs:[], oeNumbers:['038903315P'] },
  { id:'ur001', keywords:['umlenkrolle','umlenker','deflection','idler','riemen','rolle'], mfrName:'INA', articleNumber:'532 0060 20', name:'Umlenkrolle Keilrippenriemen', category:'Riemenantrieb', specs:[], oeNumbers:['038903341H'] },

  // FAHRWERK / LENKUNG
  { id:'sd001', keywords:['stossdaempfer','stoßdaempfer','stossdampfer','stoßdämpfer','shock absorber','daempfer','dämpfer'], mfrName:'BILSTEIN', articleNumber:'B4 22-229434', name:'Stoßdämpfer Vorderachse', category:'Stoßdämpfer', specs:[{attrName:'Einbauseite',attrValue:'Vorderachse'}], oeNumbers:[] },
  { id:'sd002', keywords:['stossdaempfer','stoßdämpfer','shock absorber','daempfer'], mfrName:'SACHS', articleNumber:'313 269', name:'Stoßdämpfer Hinterachse', category:'Stoßdämpfer', specs:[{attrName:'Einbauseite',attrValue:'Hinterachse'}], oeNumbers:[] },
  { id:'dl001', keywords:['domlager','federbeinlager','federbein','strut mount','lager','daempfer'], mfrName:'LEMFÖRDER', articleNumber:'30584 01', name:'Domlager Vorderachse', category:'Federung/Dämpfung', specs:[{attrName:'Einbauseite',attrValue:'Vorderachse'}], oeNumbers:['1K0412331E'] },
  { id:'fb001', keywords:['feder','fahwerksfeder','spirale','spring','fahrwerk','federung'], mfrName:'KW', articleNumber:'2002000001', name:'Fahrwerksfeder Vorderachse', category:'Federung/Dämpfung', specs:[], oeNumbers:[] },
  { id:'ql001', keywords:['querlenker','control arm','lenker','fahrwerk','achslenker','radaufhaengung','radaufhängung'], mfrName:'LEMFÖRDER', articleNumber:'29888 01', name:'Querlenker vorne links', category:'Radaufhängung', specs:[{attrName:'Einbauseite',attrValue:'Vorne links'}], oeNumbers:['1K0407155P'] },
  { id:'ql002', keywords:['querlenker','control arm','lenker','fahrwerk','achslenker'], mfrName:'LEMFÖRDER', articleNumber:'29889 01', name:'Querlenker vorne rechts', category:'Radaufhängung', specs:[{attrName:'Einbauseite',attrValue:'Vorne rechts'}], oeNumbers:['1K0407156P'] },
  { id:'st001', keywords:['spurstange','spurstangenkopf','tie rod','lenkung','lenker'], mfrName:'TRW', articleNumber:'JTE362', name:'Spurstangenkopf außen rechts', category:'Lenkung', specs:[{attrName:'Einbauseite',attrValue:'Rechts außen'}], oeNumbers:[] },
  { id:'st002', keywords:['spurstange','spurstangenkopf','tie rod','lenkung'], mfrName:'TRW', articleNumber:'JTE363', name:'Spurstangenkopf außen links', category:'Lenkung', specs:[{attrName:'Einbauseite',attrValue:'Links außen'}], oeNumbers:[] },
  { id:'sb001', keywords:['stabilisator','stabi','sway bar','stabilisatorlager','lager','strebe'], mfrName:'LEMFÖRDER', articleNumber:'25473 01', name:'Stabilisatorlager', category:'Radaufhängung', specs:[], oeNumbers:['1K0411313C'] },
  { id:'kp001', keywords:['koppelstange','pendelstütze','sway bar link','stabi','stabilisator'], mfrName:'MEYLE', articleNumber:'11-16 060 0007', name:'Koppelstange Stabilisator', category:'Radaufhängung', specs:[], oeNumbers:[] },
  { id:'wl001', keywords:['radlager','radlagersatz','wheel bearing','lager','nabe','radnabe'], mfrName:'SKF', articleNumber:'VKBA 3543', name:'Radlager Vorderachse', category:'Radaufhängung', specs:[{attrName:'Einbauseite',attrValue:'Vorderachse'}], oeNumbers:['6Q0407621G'] },
  { id:'wl002', keywords:['radlager','wheel bearing','lager','nabe'], mfrName:'FAG', articleNumber:'713 6108 10', name:'Radlager Hinterachse', category:'Radaufhängung', specs:[{attrName:'Einbauseite',attrValue:'Hinterachse'}], oeNumbers:[] },

  // KUPPLUNG / GETRIEBE
  { id:'ku002', keywords:['kupplung','clutch','kupplungssatz'], mfrName:'LUK', articleNumber:'624 3410 09', name:'Kupplungssatz', category:'Kupplung', specs:[{attrName:'Durchmesser',attrValue:'215',attrUnit:'mm'}], oeNumbers:[] },
  { id:'gt001', keywords:['getriebe','transmission','gearbox','schaltgetriebe'], mfrName:'LUK', articleNumber:'602 0003 00', name:'Zweimassenschwungrad + Kupplungssatz', category:'Kupplung/Getriebe', specs:[], oeNumbers:[] },
  { id:'zms001', keywords:['zweimassenschwungrad','schwungrad','zms','dual mass flywheel','kupplung'], mfrName:'LUK', articleNumber:'415 0352 10', name:'Zweimassenschwungrad', category:'Kupplung', specs:[], oeNumbers:[] },

  // ABGASANLAGE
  { id:'es001', keywords:['endschalldaempfer','endschalldämpfer','auspuff','schalldaempfer','schalldämpfer','exhaust','muffler','endtopf'], mfrName:'BOSAL', articleNumber:'255-131', name:'Endschalldämpfer', category:'Abgasanlage', specs:[], oeNumbers:[] },
  { id:'kt001_agr', keywords:['katalysator','kat','catalytic','converter','abgas'], mfrName:'BOSAL', articleNumber:'099-026', name:'Katalysator', category:'Abgasanlage', specs:[], oeNumbers:[] },
  { id:'dpf001', keywords:['dieselpartikelfilter','partikelfilter','dpf','russpartikelfilter','rußpartikelfilter','filter','diesel'], mfrName:'BOSAL', articleNumber:'095-212', name:'Dieselpartikelfilter DPF', category:'Abgasanlage', specs:[], oeNumbers:[] },
  { id:'agr001', keywords:['agr','agr-ventil','egr','egr-ventil','ventil','abgasrueckfuehrung','abgasrückführung'], mfrName:'WAHLER', articleNumber:'7248D', name:'AGR-Ventil', category:'Motorelektrik', specs:[], oeNumbers:['038129637D'] },

  // MOTORELEKTRIK / SENSOREN
  { id:'ls001', keywords:['lambdasonde','lambda','sonde','o2 sensor','sauerstoffsensor','abgas'], mfrName:'BOSCH', articleNumber:'0 258 006 537', name:'Lambdasonde vor Kat', category:'Abgasanlage', specs:[{attrName:'Heizelemente',attrValue:'4'}], oeNumbers:['36531-PNA-003'] },
  { id:'al001', keywords:['anlasser','starter','startmotor','anlassen','elektrik'], mfrName:'VALEO', articleNumber:'432729', name:'Anlasser', category:'Motorelektrik', specs:[{attrName:'Spannung',attrValue:'12V'},{attrName:'kW',attrValue:'1,4'}], oeNumbers:['02M911023G'] },
  { id:'la001', keywords:['lichtmaschine','generator','alternator','elektrik','ladung','lima'], mfrName:'VALEO', articleNumber:'437439', name:'Lichtmaschine 90A', category:'Motorelektrik', specs:[{attrName:'Spannung',attrValue:'14V'},{attrName:'Ampere',attrValue:'90A'}], oeNumbers:['038903018BX'] },

  // AUFLADUNG
  { id:'tl001', keywords:['turbolader','turbo','lader','turbine','aufladung','turbocharger'], mfrName:'GARRETT', articleNumber:'454232-5008S', name:'Turbolader', category:'Aufladung', specs:[{attrName:'Typ',attrValue:'GT1544S'}], oeNumbers:['028145701K'] },
  { id:'tl002', keywords:['turbolader','turbo','lader','aufladung'], mfrName:'BorgWarner', articleNumber:'53039880044', name:'Turbolader KKK', category:'Aufladung', specs:[], oeNumbers:['038145703L'] },

  // KRAFTSTOFFANLAGE
  { id:'in001', keywords:['einspritzduese','einspritzdüse','injektor','injector','duese','einspritzung','kraftstoff'], mfrName:'BOSCH', articleNumber:'0 445 110 071', name:'Kraftstoffinjektor Common Rail', category:'Kraftstoffanlage', specs:[], oeNumbers:['038130073AK'] },
  { id:'op001', keywords:['oelpumpe','ölpumpe','oil pump','pumpe','öl','motor'], mfrName:'HELLA', articleNumber:'8TG 008 411-001', name:'Ölpumpe', category:'Motor', specs:[], oeNumbers:['06B115105A'] },

  // BATTERIE / ZUBEHÖR
  { id:'ba001', keywords:['batterie','battery','akku','starter','12v','autobatterie'], mfrName:'BOSCH', articleNumber:'S5 008', name:'Autobatterie 77Ah', category:'Batterie', specs:[{attrName:'Kapazität',attrValue:'77Ah'},{attrName:'Kaltstartstrom',attrValue:'780A'}], oeNumbers:[] },
  { id:'sw001', keywords:['scheibenwischer','wischer','wischerblatt','wiper','blade','scheibe'], mfrName:'BOSCH', articleNumber:'3 397 013 428', name:'Scheibenwischer Aerotwin 650mm', category:'Scheibenwischer', specs:[{attrName:'Länge',attrValue:'650mm'}], oeNumbers:[] },

  // ACHSMANSCHETTEN / GUMMITEILE
  { id:'ls002', keywords:['lenkungsmanschette','lenkmanschette','manschette','steering boot','faltenbalg','lenkung'], mfrName:'FEBI', articleNumber:'33867', name:'Lenkungsmanschettensatz', category:'Lenkung', specs:[], oeNumbers:[] },
  { id:'gm003', keywords:['gummi','gummilager','buchse','lagerbuchse','silent block','fahrwerk','lager'], mfrName:'MEYLE', articleNumber:'300 610 5549', name:'Querlenkerlagersatz Gummi', category:'Radaufhängung', specs:[], oeNumbers:[] },
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
        // Fallback auf Static-Catalog wenn: kein Ergebnis, Fehler, ODER 0 Artikel zurück
        const pegArts = Array.isArray(pegResult?.articles) ? pegResult.articles : [];
        result = (!pegResult || pegResult.error || pegArts.length === 0) ? staticSearch(query) : pegResult;
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
