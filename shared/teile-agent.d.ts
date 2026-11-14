export const TEILE_AGENT_PFAD: string;
export const TEILE_AGENT_URL: string;
export const TEILE_AGENT_TITEL: string;
export const TEILE_AGENT_BESCHREIBUNG: string;
export const TEILE_AGENT_H1: string;
export const TEILE_AGENT_LEAD: string;
export const TEILE_AGENT_PLATZHALTER: string;
export const TEILE_AGENT_BUTTON: string;
export const TEILE_AGENT_HINWEIS: string;
export const TEILE_AGENT_DATENSCHUTZ: string;
export const TEILE_AGENT_CLAIMS: readonly string[];
export const TEILE_AGENT_SCHRITTE: readonly { titel: string; text: string }[];
export const TEILE_AGENT_VERGLEICH: {
  titel: string;
  lead: string;
  klassischTitel: string;
  klassisch: readonly string[];
  agentTitel: string;
  agent: readonly string[];
};
export const TEILE_AGENT_BEISPIEL: {
  titel: string;
  hinweis: string;
  kunde: string;
  schein: string;
  scheinHinweis: string;
  agent: string;
  optionen: readonly { stufe: string; preis: string; zeit: string }[];
  preisHinweis: string;
  frage: string;
};
export const TEILE_AGENT_TIPPS: {
  titel: string;
  lead: string;
  punkte: readonly { titel: string; text: string }[];
};
export const TEILE_AGENT_HINTER: string;
export const TEILE_AGENT_FILM_ALT: string;
export const TEILE_AGENT_FILM_LABEL: string;
export const TEILE_AGENT_FILM_TEXT: string;
export const TEILE_AGENT_FILM_LD: {
  "@context": string;
  "@type": string;
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration: string;
  contentUrl: string;
  embedUrl: string;
};
export const TEILE_AGENT_FAQ: readonly { q: string; a: string }[];
export const TEILE_AGENT_FAQ_LD: {
  "@context": string;
  "@type": string;
  mainEntity: readonly {
    "@type": string;
    name: string;
    acceptedAnswer: { "@type": string; text: string };
  }[];
};
export function teileAgentKundentexte(): string[];
