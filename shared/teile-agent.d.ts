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
