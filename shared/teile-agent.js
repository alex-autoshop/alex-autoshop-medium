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
  "Top-Preise aus über 20 Partnerlieferanten",
  "Angebot im Chat, bestellt wird erst nach deiner Zusage",
];

export const TEILE_AGENT_SCHRITTE = [
  {
    titel: "Anfrage schicken",
    text: "Schreib ins Feld, was du brauchst, und schick die Anfrage per WhatsApp.",
  },
  {
    titel: "KI-Teileagent prüft Angebote aus über 20 Partnerlieferanten",
    text: "Die Rückmeldung kommt direkt im WhatsApp-Chat.",
  },
  {
    titel: "Angebot im Chat erhalten und bestellen",
    text: "Die Nachricht ist eine Anfrage. Bestellt wird, wenn du das Angebot annimmst.",
  },
];

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
    ...TEILE_AGENT_CLAIMS,
    ...TEILE_AGENT_SCHRITTE.flatMap((schritt) => [schritt.titel, schritt.text]),
    ...TEILE_AGENT_FAQ.flatMap((eintrag) => [eintrag.q, eintrag.a]),
  ];
}
