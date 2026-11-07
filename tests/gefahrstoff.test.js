import test from "node:test";
import assert from "node:assert/strict";
import {
  gefahrstoffLesen, hSatzText, gefahrstoffUnvollstaendig, sdbVeraltet, kaufGesperrt,
} from "../shared/gefahrstoff.js";

test("ohne Metafelder ist das Produkt kein Gefahrstoff und bleibt käuflich", () => {
  const g = gefahrstoffLesen(null);
  assert.equal(g.ist, false);
  assert.equal(kaufGesperrt(g), false);
  assert.equal(gefahrstoffLesen([null, { key: "ist_gefahrstoff", value: "false" }]).ist, false);
});

test("vollständige Angaben bleiben käuflich, H-Satz hat den Wortlaut", () => {
  const g = gefahrstoffLesen([
    { key: "ist_gefahrstoff", value: "true" },
    { key: "h_saetze", value: "[\"H225\",\"H319\"]" },
    { key: "piktogramme", value: "GHS02, GHS07" },
    { key: "signalwort", value: "Gefahr" },
    { key: "sdb_url", value: "https://example.com/sdb.pdf" },
    { key: "sdb_stand", value: "2024-06-01" },
    { key: "mindestalter", value: "18" },
    { key: "gefahrgut_un_nr", value: "UN 1263" },
    { key: "versand_hinweis", value: "Nur als begrenzte Menge." },
  ]);
  assert.equal(kaufGesperrt(g), false);
  assert.deepEqual(g.hSaetze, ["H225", "H319"]);
  assert.equal(hSatzText("H225"), "Flüssigkeit und Dampf leicht entzündbar.");
  assert.equal(g.mindestalter, 18);
  assert.equal(g.unNr, "UN 1263");
  assert.equal(g.sdbUrl.startsWith("https://"), true);
});

test("unvollständige Kennzeichnung wird gemeldet und bleibt käuflich", () => {
  const g = gefahrstoffLesen([
    { key: "ist_gefahrstoff", value: "true" },
    { key: "h_saetze", value: "H226" },
    { key: "signalwort", value: "Achtung" },
  ]);
  assert.equal(gefahrstoffUnvollstaendig(g), true);
  assert.equal(kaufGesperrt(g), false);
});

test("Sicherheitsdatenblatt älter als drei Jahre wird gemeldet, ein junges nicht", () => {
  assert.equal(sdbVeraltet("2020-01-01", "2024-06-01"), true);
  assert.equal(sdbVeraltet("2022-06-01", "2024-06-01"), false);
  assert.equal(sdbVeraltet("", "2024-06-01"), false);
});

test("unbekannter H-Code erfindet keinen Wortlaut", () => {
  assert.equal(hSatzText("H999"), "");
});
