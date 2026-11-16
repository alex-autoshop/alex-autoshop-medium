export const TEILE_AGENT_PFAD: string;
export const TEILE_AGENT_URL: string;
export const TEILE_AGENT_TITEL: string;
export const TEILE_AGENT_BESCHREIBUNG: string;
export const TEILE_AGENT_H1: string;
export const TEILE_AGENT_KURZ: string;
export const TEILE_AGENT_LEAD: string;
export const TEILE_AGENT_BESTPREIS: string;
export const TEILE_AGENT_STANDARD: string;
export const TEILE_AGENT_CODE: string;
export const TEILE_AGENT_CODE_VORGABE: string;
export const TEILE_AGENT_CODE_CTA: string;
export const TEILE_AGENT_CODE_KLEIN: string;
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
export const TEILE_AGENT_CHATS: readonly {
  id: string;
  tab: string;
  nachrichten: readonly {
    von: string;
    art: string;
    text?: string;
    bild?: string;
    alt?: string;
    zeit: string;
    key: string;
    angebot?: { stufe: string; marke: string; nummer: string; altPreis?: string; preis: string; zeit: string; bild: string };
    liste?: { titel: string; zeilen: readonly { marke: string; preis: string }[] };
    korb?: {
      titel: string;
      zeilen: readonly { name: string; alt: string; preis: string }[];
      rabatt: string;
      summe: string;
      linkText: string;
    };
  }[];
}[];
export const TEILE_AGENT_CHAT_HINWEIS: string;
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
