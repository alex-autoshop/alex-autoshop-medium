/**
 * Texte und SEO der Seite /teile-agent.
 * Keine unbelegbaren Superlative, keine Lieferantennamen.
 */

export const TEILE_AGENT_PFAD = "/teile-agent";
export const TEILE_AGENT_URL = "https://www.alex-autoshop.de/teile-agent";
export const TEILE_AGENT_TITEL = "Autoteile per WhatsApp anfragen | Alex Autoshop";
export const TEILE_AGENT_BESCHREIBUNG =
  "Autoteile per WhatsApp anfragen. Unser KI-Teileagent prüft Angebote aus über 20 Partnerlieferanten und antwortet direkt im Chat.";
export const TEILE_AGENT_H1 = "Autoteile per WhatsApp anfragen";
export const TEILE_AGENT_LEAD = "Unser KI-Teileagent antwortet dir direkt im Chat.";
export const TEILE_AGENT_BESTPREIS =
  "Wir fragen über 20 Lieferanten gleichzeitig ab – dein Bestpreis in Minuten, deutschlandweit.";
export const TEILE_AGENT_CODE = "BESTERMANN15";
export const TEILE_AGENT_CODE_VORGABE = "Hallo, ich suche ein Teil. Code: BESTERMANN15";
export const TEILE_AGENT_CODE_CTA =
  "Starte den WhatsApp-Chat mit deinem Teil, der Teilenummer, deinem Fahrzeugschein oder einem Foto und schreib BESTERMANN15 dazu – du bekommst 15 % auf deine erste Teilebestellung, auf den ganzen Warenkorb.";
export const TEILE_AGENT_CODE_KLEIN = "Einmal pro Kunde, gilt für die erste Teilebestellung.";
export const TEILE_AGENT_PLATZHALTER =
  "Schreib einfach, was du brauchst, z.B. Bremsscheiben vorne für VW Golf 7, Bj. 2016";
export const TEILE_AGENT_BUTTON = "Abschicken & per WhatsApp weiter";
export const TEILE_AGENT_HINWEIS =
  "Ein Foto vom Fahrzeugschein kannst du danach direkt im Chat schicken. Das hilft bei der Zuordnung.";
export const TEILE_AGENT_DATENSCHUTZ =
  "Mit „Abschicken & per WhatsApp weiter“ öffnet sich WhatsApp (Meta). Das Textfeld speichert nichts auf dieser Seite. Dein Text steht nur in der Nachricht. Details stehen in der Datenschutzerklärung.";

export const TEILE_AGENT_CLAIMS = [
  "Ein Teil, drei geprüfte Optionen",
  "Marke, Preis und Lieferzeit im Chat",
  "Passform-Prüfung über Schlüsselnummer oder FIN",
  "Angebote aus über 20 Partnerlieferanten",
];

export const TEILE_AGENT_SCHRITTE = [
  {
    titel: "Anfrage schicken",
    text: "Schreib ins Feld, was du brauchst, und schick die Anfrage per WhatsApp. Ein Foto vom Fahrzeugschein kannst du im Chat anhängen.",
  },
  {
    titel: "Passform und Optionen prüfen",
    text: "Die Rückmeldung zeigt bis zu drei Optionen mit Marke, Preis und Lieferzeit. Die Passform prüfen wir über Schlüsselnummer oder FIN.",
  },
  {
    titel: "Angebot annehmen und bestellen",
    text: "Die Nachricht ist eine Anfrage. Bestellt wird, wenn du das Angebot annimmst.",
  },
];

export const TEILE_AGENT_VERGLEICH = {
  titel: "Klassische Beratung vs. Teile-Agent",
  lead: "Klassisch gibt es einen Vorschlag. Der Teile-Agent legt zu einem Teil drei geprüfte Optionen vor. Bestellt wird in beiden Fällen erst, wenn du das Angebot annimmst.",
  klassischTitel: "Klassische Beratung",
  klassisch: [
    "Ein Vorschlag, abgestimmt auf deine Anfrage",
    "Details klärst du im Gespräch",
  ],
  agentTitel: "Teile-Agent",
  agent: [
    "Drei geprüfte Optionen zu einem Teil",
    "Marke, Preis und Lieferzeit, wo sie vorliegt",
    "Passform-Prüfung über Schlüsselnummer (HSN/TSN) oder FIN",
  ],
};

const anlasser = [
  { stufe: "Budget", marke: "AS-PL", nummer: "S0291", preis: "104,90 €", zeit: "bis 18.11.", bild: "/media/anlasser-aspl.jpg" },
  { stufe: "OE-Qualität", marke: "SEG Automotive", nummer: "0001148033", preis: "176,90 €", zeit: "", bild: "/media/anlasser-seg.jpg" },
  { stufe: "Premium", marke: "Bosch", nummer: "0 986 022 020", preis: "179,90 €", zeit: "", bild: "/media/anlasser-bosch.jpg" },
];

const scheiben = [
  { stufe: "Budget", marke: "NK", nummer: "", altPreis: "46,90 €", preis: "39,87 €", zeit: "pro Stück", bild: "/media/scheibe-budget.jpg" },
  { stufe: "OE-Qualität", marke: "ATE", nummer: "", altPreis: "74,90 €", preis: "63,67 €", zeit: "pro Stück", bild: "/media/scheibe-oe.jpg" },
  { stufe: "Premium", marke: "Zimmermann", nummer: "", altPreis: "96,90 €", preis: "82,37 €", zeit: "pro Stück", bild: "/media/scheibe-premium.jpg" },
];

const drossel = [
  { stufe: "Budget", marke: "ESEN", nummer: "", preis: "114,90 €", zeit: "", bild: "/media/drossel-esen.jpg" },
  { stufe: "OE-Qualität", marke: "Meat & Doria", nummer: "", preis: "124,90 €", zeit: "", bild: "/media/drossel-meat.jpg" },
  { stufe: "Premium", marke: "Trucktec", nummer: "", preis: "152,90 €", zeit: "", bild: "/media/drossel-trucktec.jpg" },
];

function angebote(liste, basis) {
  return liste.map((eintrag, index) => ({
    von: "agent",
    art: "angebot",
    zeit: basis,
    angebot: eintrag,
    alt: `${eintrag.marke} ${eintrag.nummer}`.trim(),
    key: `${eintrag.marke}-${index}`,
  }));
}

export const TEILE_AGENT_CHATS = [
  {
    id: "schein",
    tab: "Fahrzeugschein",
    nachrichten: [
      {
        von: "kunde",
        art: "bild",
        bild: "/media/fahrzeugschein-beispiel.jpg",
        alt: "Foto einer erfundenen Zulassungsbescheinigung Teil I, Jonas Keller, VW Golf, Dortmund",
        zeit: "18:41",
        key: "schein",
      },
      { von: "agent", art: "text", text: "schein ist da. welches teil?", zeit: "18:41", key: "s1" },
      { von: "kunde", art: "text", text: "anlasser", zeit: "18:42", key: "s2" },
      { von: "agent", art: "text", text: "golf 7 1.6 tdi, hsn 0603. drei preise, sind beispiele, inkl. mwst", zeit: "18:42", key: "s3" },
      ...angebote(anlasser, "18:43"),
    ],
  },
  {
    id: "text",
    tab: "Nachricht",
    nachrichten: [
      {
        von: "kunde",
        art: "text",
        text: "hi brauche bremsscheiben vorne für meinen golf 7 1.6 tdi was kostet das",
        zeit: "11:07",
        key: "t0",
      },
      { von: "kunde", art: "text", text: "BESTERMANN15", zeit: "11:07", key: "tcode" },
      { von: "agent", art: "text", text: "code ist drin. 15% auf den ganzen warenkorb. drei stückpreise, beispiel, inkl. mwst", zeit: "11:08", key: "t1" },
      ...angebote(scheiben, "11:09"),
      { von: "kunde", art: "text", text: "nehm die ate", zeit: "11:10", key: "twahl" },
      {
        von: "agent",
        art: "korb",
        zeit: "11:11",
        key: "tkorb",
        korb: {
          titel: "Übersicht",
          zeilen: [{ name: "Bremsscheibe ATE, pro Stück", alt: "74,90 €", preis: "63,67 €" }],
          rabatt: "Rabatt −15 %",
          summe: "63,67 €",
          linkText: "Jetzt bestellen",
        },
      },
    ],
  },
  {
    id: "foto",
    tab: "Teilefoto",
    nachrichten: [
      {
        von: "kunde",
        art: "bild",
        bild: "/media/teilefoto-drosselklappe.jpg",
        alt: "Foto einer gebrauchten Drosselklappe auf einer Werkbank",
        zeit: "16:22",
        key: "f0",
      },
      { von: "kunde", art: "text", text: "die hier, bmw x3", zeit: "16:22", key: "f1" },
      { von: "agent", art: "text", text: "drosselklappe. drei preise, beispiel, inkl. mwst", zeit: "16:23", key: "f2" },
      ...angebote(drossel, "16:24"),
    ],
  },
];

export const TEILE_AGENT_CHAT_HINWEIS =
  "Drei Beispiele, kein aktuelles Angebot. Preise inkl. MwSt. Der Fahrzeugschein ist erfunden. Lieferzeit nur, wo sie im Test-Chat stand.";

export const TEILE_AGENT_TIPPS = {
  titel: "Drei Tipps für Preis und Lieferzeit",
  lead: "Je klarer die Anfrage, desto genauer die Auswahl.",
  punkte: [
    {
      titel: "Fahrzeugschein-Foto schicken",
      text: "HSN, TSN oder die FIN stehen auf dem Schein. Das Foto schickst du im Chat.",
    },
    {
      titel: "Teil und Einbauposition nennen",
      text: "Zum Beispiel vorne oder hinten, links oder rechts.",
    },
    {
      titel: "Sagen, was dir wichtiger ist",
      text: "Ein günstiger Preis oder eine kurze Lieferzeit.",
    },
  ],
};

export const TEILE_AGENT_HINTER =
  "Hinter dem Teile-Agent steht der Laden Alex Autoshop in Wuppertal. Die Anfrage kommt bei uns an. Die Angebote stellen wir aus über 20 Partnerlieferanten zusammen.";

export const TEILE_AGENT_FILM_ALT =
  "Standbild aus dem Erklärfilm: WhatsApp-Chat mit drei Beispiel-Angeboten.";
export const TEILE_AGENT_FILM_LABEL =
  "Erklärfilm mit Stimme. Der Ton ist aus, bis du ihn einschaltest.";
export const TEILE_AGENT_FILM_TEXT =
  "Der Film zeigt drei Wege: Fahrzeugschein, kurze Nachricht oder Foto vom Teil. Wir fragen über 20 Lieferanten gleichzeitig ab, dein Bestpreis in Minuten, deutschlandweit. Danach drei Angebote, günstig, OE-Qualität und Premium, mit Bild. Der Code BESTERMANN15 gibt 15 Prozent auf die erste Teilebestellung, auf den ganzen Warenkorb. Die Übersicht und der Bestelllink kommen im Chat. Abholung in der Handelstraße 64 in Wuppertal oder Lieferung.";

export const TEILE_AGENT_FILM_LD = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "So fragst du Autoteile per WhatsApp an",
  description: TEILE_AGENT_BESCHREIBUNG,
  thumbnailUrl: "https://www.alex-autoshop.de/media/teile-agent-poster.jpg",
  uploadDate: "2026-11-14",
  duration: "PT60S",
  contentUrl: "https://www.alex-autoshop.de/media/teile-agent.mp4",
  embedUrl: TEILE_AGENT_URL,
};

export const TEILE_AGENT_FAQ = [
  {
    q: "Welche Angaben helfen bei der Suche?",
    a: "Marke, Modell, Baujahr und das gesuchte Teil im Text. HSN, TSN oder die FIN machen die Zuordnung genauer. Ein Foto vom Fahrzeugschein kannst du im Chat schicken.",
  },
  {
    q: "Kann ich ein Foto vom Fahrzeugschein schicken?",
    a: "Ja. Im WhatsApp-Chat kannst du ein Foto der Zulassungsbescheinigung senden. Das Textfeld auf dieser Seite speichert keine Daten.",
  },
  {
    q: "Wie läuft Versand oder Abholung?",
    a: "Das steht im Angebot im Chat. Möglich sind Versand und die Abholung in unserem Laden in Wuppertal, Handelstraße 64. Einen Termin nennen wir erst zum konkreten Teil.",
  },
  {
    q: "Ist die WhatsApp-Nachricht schon eine Bestellung?",
    a: "Nein. Die Nachricht ist eine Anfrage. Bestellt wird erst, wenn du das Angebot im Chat annimmst.",
  },
  {
    q: "Sind die Beispiele auf dieser Seite echte Angebote?",
    a: "Nein. Die Chats sind Beispiele. Der Anlasser stammt aus einem Test-Chat, die anderen Preise sind Beispielpreise. Die Lieferzeit steht nur dort, wo sie genannt war.",
  },
];

export const TEILE_AGENT_FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: TEILE_AGENT_FAQ.map((eintrag) => ({
    "@type": "Question",
    name: eintrag.q,
    acceptedAnswer: { "@type": "Answer", text: eintrag.a },
  })),
};

export function teileAgentKundentexte() {
  return [
    TEILE_AGENT_TITEL,
    TEILE_AGENT_BESCHREIBUNG,
    TEILE_AGENT_H1,
    TEILE_AGENT_LEAD,
    TEILE_AGENT_BESTPREIS,
    TEILE_AGENT_CODE,
    TEILE_AGENT_CODE_VORGABE,
    TEILE_AGENT_CODE_CTA,
    TEILE_AGENT_CODE_KLEIN,
    TEILE_AGENT_PLATZHALTER,
    TEILE_AGENT_BUTTON,
    TEILE_AGENT_HINWEIS,
    TEILE_AGENT_DATENSCHUTZ,
    TEILE_AGENT_HINTER,
    TEILE_AGENT_FILM_ALT,
    TEILE_AGENT_FILM_LABEL,
    TEILE_AGENT_FILM_TEXT,
    TEILE_AGENT_FILM_LD.name,
    TEILE_AGENT_FILM_LD.description,
    ...TEILE_AGENT_CLAIMS,
    ...TEILE_AGENT_SCHRITTE.flatMap((schritt) => [schritt.titel, schritt.text]),
    ...TEILE_AGENT_FAQ.flatMap((eintrag) => [eintrag.q, eintrag.a]),
    TEILE_AGENT_VERGLEICH.titel,
    TEILE_AGENT_VERGLEICH.lead,
    TEILE_AGENT_VERGLEICH.klassischTitel,
    TEILE_AGENT_VERGLEICH.agentTitel,
    ...TEILE_AGENT_VERGLEICH.klassisch,
    ...TEILE_AGENT_VERGLEICH.agent,
    TEILE_AGENT_CHAT_HINWEIS,
    ...TEILE_AGENT_CHATS.flatMap((chat) => [
      chat.tab,
      ...chat.nachrichten.flatMap((nachricht) => [
        nachricht.text || "",
        nachricht.alt || "",
        nachricht.angebot?.stufe || "",
        nachricht.angebot?.marke || "",
        nachricht.angebot?.nummer || "",
        nachricht.angebot?.altPreis || "",
        nachricht.angebot?.preis || "",
        nachricht.angebot?.zeit || "",
        nachricht.korb?.titel || "",
        nachricht.korb?.rabatt || "",
        nachricht.korb?.summe || "",
        nachricht.korb?.linkText || "",
        ...(nachricht.korb?.zeilen.flatMap((zeile) => [zeile.name, zeile.alt, zeile.preis]) || []),
      ]),
    ]),
    TEILE_AGENT_TIPPS.titel,
    TEILE_AGENT_TIPPS.lead,
    ...TEILE_AGENT_TIPPS.punkte.flatMap((punkt) => [punkt.titel, punkt.text]),
  ];
}
