import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  NACHRICHT_MAX,
  WHATSAPP_ANZEIGE,
  WHATSAPP_NUMMER,
  anfrageBereit,
  anfrageText,
  whatsappAnfrageUrl,
  whatsappChatUrl,
} from "../shared/whatsapp-anfrage.js";
import {
  TEILE_AGENT_BESCHREIBUNG,
  TEILE_AGENT_BUTTON,
  TEILE_AGENT_FAQ,
  TEILE_AGENT_FAQ_LD,
  TEILE_AGENT_HINWEIS,
  TEILE_AGENT_PFAD,
  TEILE_AGENT_PLATZHALTER,
  TEILE_AGENT_TITEL,
  TEILE_AGENT_URL,
  teileAgentKundentexte,
} from "../shared/teile-agent.js";

const BEISPIEL = "Bremsscheiben vorne für VW Golf 7, Bj. 2016";

test("WhatsApp-Link enthält Nummer und den Kundentext", () => {
  const url = whatsappAnfrageUrl(BEISPIEL);
  assert.equal(url.startsWith(`https://wa.me/${WHATSAPP_NUMMER}?text=`), true);
  assert.equal(WHATSAPP_NUMMER, "4920282690");
  assert.equal(WHATSAPP_ANZEIGE, "+49 202 82690");
  const text = decodeURIComponent(url.slice(url.indexOf("?text=") + 6));
  assert.equal(text, BEISPIEL);
  assert.equal(text, anfrageText(BEISPIEL));
  assert.equal(anfrageBereit(BEISPIEL), true);
  assert.equal(url.includes("Marke:"), false);
});

test("Umlaute, Sonderzeichen und Zeilenumbrüche bleiben im Text", () => {
  const roh = "Ölfilter & Dichtung\nfür Golf";
  const url = whatsappAnfrageUrl(`  ${roh}  `);
  assert.match(url, /%C3%96lfilter%20%26%20Dichtung%0Af%C3%BCr%20Golf/);
  assert.equal(anfrageText(`  ${roh}  `), roh);
});

test("Leerer Text ist nicht abschickbar, der Chat-Link hat keinen Text", () => {
  assert.equal(anfrageBereit(""), false);
  assert.equal(anfrageBereit("   \n  "), false);
  assert.equal(anfrageText(" \n "), "");
  assert.equal(whatsappChatUrl(), "https://wa.me/4920282690");
  assert.equal(whatsappChatUrl().includes("?"), false);
});

test("Lange Texte bleiben unter der URL-Grenze", () => {
  const url = whatsappAnfrageUrl("ä".repeat(NACHRICHT_MAX + 400));
  assert.ok(url.length <= 1800, String(url.length));
  assert.match(url, /^https:\/\/wa\.me\/4920282690\?text=/);
  assert.ok(anfrageText("x".repeat(NACHRICHT_MAX + 50)).length <= NACHRICHT_MAX);
});

test("Kundentext bleibt rechtssicher und die Seite hat nur ein Textfeld", () => {
  assert.ok(TEILE_AGENT_TITEL.length <= 60, TEILE_AGENT_TITEL);
  assert.ok(TEILE_AGENT_BESCHREIBUNG.length <= 155, String(TEILE_AGENT_BESCHREIBUNG.length));
  assert.equal(TEILE_AGENT_URL, "https://www.alex-autoshop.de/teile-agent");
  assert.match(TEILE_AGENT_PLATZHALTER, /Bremsscheiben vorne/);
  assert.match(TEILE_AGENT_BUTTON, /Abschicken & per WhatsApp weiter/);
  assert.match(TEILE_AGENT_HINWEIS, /Fahrzeugschein/);
  assert.equal(TEILE_AGENT_FAQ_LD["@type"], "FAQPage");
  assert.equal(TEILE_AGENT_FAQ_LD.mainEntity.length, TEILE_AGENT_FAQ.length);
  const verboten = /shopify|\bbeta\b|g[üu]nstigster|schnellste|\bminuten\b|inter\s*cars|tecdoc|ds[\s-]?color|oil[-\s]?center/i;
  for (const text of teileAgentKundentexte()) {
    assert.equal(verboten.test(text), false, text);
  }
  assert.equal(verboten.test(anfrageText("Spiegel")), false);

  const seite = readFileSync(new URL("../src/pages/TeileAgent.tsx", import.meta.url), "utf8");
  assert.match(seite, /id="anfrage-text"/);
  assert.equal(seite.includes('id="marke"'), false);
  assert.equal(seite.includes('id="hsn"'), false);
  assert.equal(seite.includes('id="fin"'), false);
  assert.match(seite, /whatsappAnfrageUrl\(text\)/);
  assert.match(seite, /location\.assign/);

  const sitemap = readFileSync(new URL("../public/sitemap-seiten.xml", import.meta.url), "utf8");
  const vercel = readFileSync(new URL("../vercel.json", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const header = readFileSync(new URL("../src/components/Header.tsx", import.meta.url), "utf8");
  const schale = readFileSync(new URL("../scripts/schale.mjs", import.meta.url), "utf8");
  assert.match(sitemap, /https:\/\/www\.alex-autoshop\.de\/teile-agent</);
  assert.match(vercel, /"source": "\/teile-agent"/);
  assert.match(app, /path="\/teile-agent"/);
  assert.match(header, /label: "Teile-Agent"/);
  assert.match(schale, /teile-agent\/index\.html/);
  assert.equal(TEILE_AGENT_PFAD, "/teile-agent");
});
