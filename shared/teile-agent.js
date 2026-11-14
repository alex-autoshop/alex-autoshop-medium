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
export const TEILE_AGENT_PLATZHALTER =
  "Schreib einfach, was du brauchst, z.B. Bremsscheiben vorne für VW Golf 7, Bj. 2016";
export const TEILE_AGENT_BUTTON = "Abschicken & per WhatsApp weiter";
export const TEILE_AGENT_HINWEIS =
  "Ein Foto vom Fahrzeugschein kannst du danach direkt im Chat schicken. Das hilft bei der Zuordnung.";
export const TEILE_AGENT_DATENSCHUTZ =
  "Mit „Abschicken & per WhatsApp weiter“ öffnet sich WhatsApp (Meta). Das Textfeld speichert nichts auf dieser Seite. Dein Text steht nur in der Nachricht. Details stehen in der Datenschutzerklärung.";

export const TEILE_AGENT_CLAIMS = [
  "Mehrere Marken, Preise und Lieferzeiten nebeneinander",
  "Passform-Prüfung über Schlüsselnummer oder FIN",
  "Angebote aus über 20 Partnerlieferanten",
  "Bestellt wird erst nach deiner Zusage",
];

export const TEILE_AGENT_SCHRITTE = [
  {
    titel: "Anfrage schicken",
    text: "Schreib ins Feld, was du brauchst, und schick die Anfrage per WhatsApp. Ein Foto vom Fahrzeugschein kannst du im Chat anhängen.",
  },
  {
    titel: "Passform und Optionen prüfen",
    text: "Die Rückmeldung zeigt mehrere Qualitätsstufen mit Preis und Lieferzeit. Die Passform prüfen wir über Schlüsselnummer oder FIN.",
  },
  {
    titel: "Angebot annehmen und bestellen",
    text: "Die Nachricht ist eine Anfrage. Bestellt wird, wenn du das Angebot annimmst.",
  },
];

export const TEILE_AGENT_VERGLEICH = {
  titel: "Klassische Beratung vs. Teile-Agent",
  lead: "Zwei Wege zur passenden Anfrage. Der Teile-Agent ergänzt die Beratung im Laden und am Telefon. Bestellt wird in beiden Fällen erst, wenn du das Angebot annimmst.",
  klassischTitel: "Klassische Beratung",
  klassisch: [
    "Ein Vorschlag, abgestimmt auf deine Anfrage",
    "Details klärst du im Gespräch",
  ],
  agentTitel: "Teile-Agent",
  agent: [
    "Mehrere Marken, Preise und Lieferzeiten nebeneinander",
    "Passform-Prüfung über Schlüsselnummer (HSN/TSN) oder FIN",
    "Angebote aus über 20 Partnerlieferanten",
  ],
};

export const TEILE_AGENT_BEISPIEL = {
  titel: "So kann ein Chat aussehen",
  hinweis: "Beispiel mit erfundenen Preisen. Kein Angebot und keine echten Fahrzeugdaten.",
  kunde: "Bremsscheiben + Beläge vorne, VW Golf 7, Bj. 2016",
  schein: "Foto vom Fahrzeugschein",
  scheinHinweis: "HSN, TSN und FIN sind hier unkenntlich. Keine echten Daten.",
  agent: "Passform über die Schlüsselnummer geprüft. Drei Optionen:",
  optionen: [
    { stufe: "Budget", preis: "64 €", zeit: "2–3 Werktage" },
    { stufe: "Erstausrüsterqualität", preis: "89 €", zeit: "1–2 Werktage" },
    { stufe: "Premium", preis: "129 €", zeit: "1 Werktag" },
  ],
  preisHinweis: "Beispielpreis",
  frage: "Was ist dir wichtiger: der günstigere Preis oder die kürzere Lieferzeit?",
};

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
  "Standbild: drei Beispiel-Angebote nebeneinander, Budget, Erstausrüsterqualität und Premium.";
export const TEILE_AGENT_FILM_LABEL =
  "Erklärfilm ohne Ton. Die Texte stehen im Bild.";
export const TEILE_AGENT_FILM_TEXT =
  "Der Film zeigt eine Beispiel-Anfrage zu Bremsscheiben und Belägen vorne für einen VW Golf 7, Baujahr 2016, plus ein stilisiertes Foto vom Fahrzeugschein ohne echte Daten. Danach prüft der Teile-Agent die Passform über HSN, TSN oder FIN. Es folgen drei Beispiel-Angebote mit Beispielpreis und Lieferzeit. Drei Tipps: Fahrzeugschein-Foto schicken, Teil und Einbauposition nennen, sagen ob der Preis oder die Lieferzeit wichtiger ist. Am Ende die Anfrage bei Alex Autoshop, Handelstraße 64 in Wuppertal, Telefon +49 202 82690.";

export const TEILE_AGENT_FILM_LD = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "So fragst du Autoteile per WhatsApp an",
  description: TEILE_AGENT_BESCHREIBUNG,
  thumbnailUrl: "https://www.alex-autoshop.de/media/teile-agent-poster.jpg",
  uploadDate: "2026-11-14",
  duration: "PT36S",
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
    a: "Nein. Preise, Qualitätsstufen und Lieferzeiten im Beispiel dienen der Erklärung. Das Angebot für dein Fahrzeug steht im Chat.",
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
    TEILE_AGENT_BEISPIEL.titel,
    TEILE_AGENT_BEISPIEL.hinweis,
    TEILE_AGENT_BEISPIEL.kunde,
    TEILE_AGENT_BEISPIEL.schein,
    TEILE_AGENT_BEISPIEL.scheinHinweis,
    TEILE_AGENT_BEISPIEL.agent,
    TEILE_AGENT_BEISPIEL.preisHinweis,
    TEILE_AGENT_BEISPIEL.frage,
    ...TEILE_AGENT_BEISPIEL.optionen.flatMap((option) => [option.stufe, option.preis, option.zeit]),
    TEILE_AGENT_TIPPS.titel,
    TEILE_AGENT_TIPPS.lead,
    ...TEILE_AGENT_TIPPS.punkte.flatMap((punkt) => [punkt.titel, punkt.text]),
  ];
}
