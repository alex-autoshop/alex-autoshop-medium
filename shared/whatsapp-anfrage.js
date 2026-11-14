/**
 * WhatsApp-Link für eine freie Teile-Anfrage.
 * Der Text steht nur in der Nachricht, nichts wird gespeichert.
 */

export const WHATSAPP_NUMMER = "4920282690";
export const WHATSAPP_ANZEIGE = "+49 202 82690";
export const WHATSAPP_TEL = "+4920282690";
export const NACHRICHT_MAX = 700;

const URL_MAX = 1800;

export function anfrageText(wert) {
  let text = String(wert ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, NACHRICHT_MAX);
  const basis = whatsappChatUrl() + "?text=";
  while (basis.length + encodeURIComponent(text).length > URL_MAX && text.length > 0) {
    text = text.slice(0, -1);
  }
  return text.trim();
}

export function anfrageBereit(wert) {
  return anfrageText(wert).length > 0;
}

export function whatsappChatUrl() {
  return `https://wa.me/${WHATSAPP_NUMMER}`;
}

export function whatsappAnfrageUrl(wert) {
  return `${whatsappChatUrl()}?text=${encodeURIComponent(anfrageText(wert))}`;
}
