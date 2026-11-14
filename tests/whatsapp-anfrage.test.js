import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  FELD_MAX,
  WHATSAPP_ANZEIGE,
  WHATSAPP_NUMMER,
  anfrageBereit,
  anfrageText,
  feldText,
  whatsappAnfrageUrl,
  whatsappChatUrl,
} from "../shared/whatsapp-anfrage.js";
import {
  TEILE_AGENT_BESCHREIBUNG,
  TEILE_AGENT_FAQ,
  TEILE_AGENT_FAQ_LD,
  TEILE_AGENT_PFAD,
  TEILE_AGENT_TITEL,
  TEILE_AGENT_URL,
  teileAgentKundentexte,
} from "../shared/teile-agent.js";

const BEISPIEL = {
  marke: "Volkswagen",
  modell: "Golf",
  baujahr: "2016",
  hsn: "0603",
  tsn: "AEX",
  fin: "",
  teil: "Bremsscheibe vorn",
  anmerkung: "bitte paarweise",
  plz: "42277",
};

test("WhatsApp-Link enthält Nummer, Text und alle gesetzten Angaben", () => {
  const url = whatsappAnfrageUrl(BEISPIEL);
  assert.equal(url.startsWith(`https://wa.me/${WHATSAPP_NUMMER}?text=`), true);
  assert.equal(WHATSAPP_NUMMER, "4920282690");
  assert.equal(WHATSAPP_ANZEIGE, "+49 202 82690");
  const text = decodeURIComponent(url.slice(url.indexOf("?text=") + 6));
  assert.equal(text, anfrageText(BEISPIEL));
  assert.match(text, /^Hallo, ich suche ein Autoteil bei Alex Autoshop\.\n/);
  assert.match(text, /Marke: Volkswagen/);
  assert.match(text, /Modell: Golf/);
  assert.match(text, /Baujahr: 2016/);
  assert.match(text, /HSN: 0603/);
  assert.match(text, /TSN: AEX/);
  assert.match(text, /Teil: Bremsscheibe vorn/);
  assert.match(text, /Anmerkung: bitte paarweise/);
  assert.match(text, /PLZ: 42277/);
  assert.equal(text.includes("FIN:"), false);
  assert.equal(anfrageBereit(BEISPIEL), true);
});

test("Leere Felder fehlen, Umlaute und Sonderzeichen werden kodiert", () => {
  const url = whatsappAnfrageUrl({ teil: "Ölfilter & Dichtung" });
  assert.equal(url.includes("Marke:"), false);
  assert.equal(url.includes("?text="), true);
  assert.match(url, /%C3%96lfilter%20%26%20Dichtung/);
  const text = anfrageText({ teil: "Ölfilter & Dichtung" });
  assert.deepEqual(text.split("\n"), [
    "Hallo, ich suche ein Autoteil bei Alex Autoshop.",
    "Teil: Ölfilter & Dichtung",
  ]);
});

test("Zeilenumbrüche in einem Feld werden keine eigenen Angaben", () => {
  const text = anfrageText({ teil: "Bremse\nFIN: GEHEIM\nMarke: Audi" });
  assert.equal(text.includes("\nFIN:"), false);
  assert.equal(text.includes("\nMarke:"), false);
  assert.match(text, /Teil: Bremse FIN: GEHEIM Marke: Audi/);
});

test("FIN wird verdichtet, der Chat-Link hat keinen Text", () => {
  const text = anfrageText({ teil: "Filter", fin: "wvw zzz-1kz aw123456 extra" });
  assert.match(text, /FIN: WVWZZZ1KZAW123456/);
  assert.equal(text.split("FIN: ")[1].split("\n")[0].length, 17);
  assert.equal(whatsappChatUrl(), "https://wa.me/4920282690");
  assert.equal(whatsappChatUrl().includes("?"), false);
});

test("Ohne Teil kein Versand, lange Texte bleiben unter der URL-Grenze", () => {
  assert.equal(anfrageBereit({ teil: "  " }), false);
  assert.equal(anfrageBereit({}), false);
  assert.equal(feldText("  a \n b  "), "a b");
  const url = whatsappAnfrageUrl({
    teil: "X".repeat(FELD_MAX.teil + 50),
    anmerkung: "ä".repeat(2000),
    marke: "M".repeat(500),
  });
  assert.ok(url.length <= 1800, String(url.length));
  assert.match(url, /^https:\/\/wa\.me\/4920282690\?text=/);
  const text = anfrageText({ teil: "X".repeat(500) });
  assert.ok(text.split("Teil: ")[1].length <= FELD_MAX.teil);
});

test("Kundentext bleibt rechtssicher und die Seite ist verdrahtet", () => {
  assert.ok(TEILE_AGENT_TITEL.length <= 60, TEILE_AGENT_TITEL);
  assert.ok(TEILE_AGENT_BESCHREIBUNG.length <= 155, String(TEILE_AGENT_BESCHREIBUNG.length));
  assert.equal(TEILE_AGENT_URL, "https://www.alex-autoshop.de/teile-agent");
  assert.equal(TEILE_AGENT_FAQ_LD["@type"], "FAQPage");
  assert.equal(TEILE_AGENT_FAQ_LD.mainEntity.length, TEILE_AGENT_FAQ.length);
  const verboten = /shopify|\bbeta\b|g[üu]nstigster|schnellste|\bminuten\b|inter\s*cars|tecdoc|ds[\s-]?color|oil[-\s]?center/i;
  for (const text of teileAgentKundentexte()) {
    assert.equal(verboten.test(text), false, text);
  }
  assert.equal(verboten.test(anfrageText({ teil: "Spiegel" })), false);

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
