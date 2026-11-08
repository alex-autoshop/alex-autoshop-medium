import test from "node:test";
import assert from "node:assert/strict";
import {
  seiteAusSuche,
  queryMitSeite,
  labelFuer,
  istListenPfad,
  listeBeimProdukt,
  leseListen,
  zurueckZiel,
  listenSchreiben,
} from "../shared/listen-zustand.js";

function memory() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
  };
}

test("Seite in der Adresse bleibt bei der Marke und fällt bei 1 weg", () => {
  assert.equal(seiteAusSuche(""), 1);
  assert.equal(seiteAusSuche("?seite=1"), 1);
  assert.equal(seiteAusSuche("?seite=2"), 2);
  assert.equal(seiteAusSuche("?seite=99"), 40);
  assert.equal(seiteAusSuche("?seite=2abc"), 1);
  assert.equal(queryMitSeite("?marke=glasurit,rm&sort=name", 3), "?marke=glasurit,rm&sort=name&seite=3");
  assert.equal(queryMitSeite("?marke=glasurit&seite=3", 1), "?marke=glasurit");
  assert.equal(seiteAusSuche(queryMitSeite("?marke=Glasurit", 2)), 2);
});

test("Label folgt der Liste, nicht einem festen Shop-Text", () => {
  assert.equal(labelFuer("/kategorie/lackierbedarf-alle", ""), "Zurück zu Lackierbedarf");
  assert.equal(labelFuer("/kategorie/haerter", "?marke=novol"), "Zurück zu Härter");
  assert.equal(labelFuer("/shop", "?q=Klarlack"), "Zurück zur Suche");
  assert.equal(labelFuer("/shop/lackierbedarf-alle", "?q=Klarlack"), "Zurück zu Lackierbedarf");
  assert.equal(labelFuer("/", ""), "Zurück zur Startseite");
  assert.equal(labelFuer("/mitgliedschaft", ""), "Zurück zur Mitgliedschaft");
  assert.equal(istListenPfad("/konto"), false);
  assert.equal(istListenPfad("/"), true);
});

test("Klick merkt Seite, Scroll und Handle pro Listen-URL", () => {
  const s = memory();
  listeBeimProdukt({
    pathname: "/kategorie/lackierbedarf-alle",
    search: "?marke=novol&seite=3",
    scroll: 1840,
    seite: 3,
    handle: "novol-90-860-hard",
    historyLength: 4,
  }, s);
  const eintrag = leseListen("/kategorie/lackierbedarf-alle", "?marke=novol&seite=3", s);
  assert.equal(eintrag.scroll, 1840);
  assert.equal(eintrag.seite, 3);
  assert.equal(eintrag.handle, "novol-90-860-hard");
  assert.equal(eintrag.label, "Zurück zu Lackierbedarf");
  listenSchreiben({
    pathname: "/shop",
    search: "?q=Klarlack",
    scroll: 420,
    handle: "mipa-cc9-2k-hs-klarlack-5l",
    historyLength: 6,
  }, s);
  assert.equal(leseListen("/kategorie/lackierbedarf-alle", "?marke=novol&seite=3", s).scroll, 1840);
});

test("Zurück nutzt die History, wenn die vorige Seite diese Liste war", () => {
  const s = memory();
  listeBeimProdukt({
    pathname: "/kategorie/lackierbedarf-alle",
    search: "?marke=novol&seite=3",
    scroll: 900,
    seite: 3,
    handle: "novol-90-860-hard",
    historyLength: 4,
  }, s);
  const ziel = zurueckZiel({
    historyLength: 5,
    produktHandle: "novol-90-860-hard",
    sammlungen: [{ handle: "haerter" }],
  }, s);
  assert.equal(ziel.history, true);
  assert.equal(ziel.pathname, "/kategorie/lackierbedarf-alle");
  assert.equal(ziel.search, "?marke=novol&seite=3");
  assert.equal(ziel.label, "Zurück zu Lackierbedarf");
});

test("Ohne passende History gilt die letzte Liste, sonst die Produktkategorie", () => {
  const s = memory();
  listeBeimProdukt({
    pathname: "/shop",
    search: "?q=Novol",
    scroll: 200,
    handle: "novol-90-860-hard",
    historyLength: 2,
  }, s);
  const andere = zurueckZiel({
    historyLength: 8,
    produktHandle: "anderes-produkt",
    sammlungen: [{ handle: "klarlack-produkte" }, { handle: "lackierbedarf-alle" }],
  }, s);
  assert.equal(andere.history, false);
  assert.equal(andere.shopZurueck, true);
  assert.equal(andere.pathname, "/shop");
  assert.equal(andere.search, "?q=Novol");
  assert.equal(andere.label, "Zurück zur Suche");

  const frisch = zurueckZiel({
    historyLength: 1,
    produktHandle: "novol-90-860-hard",
    sammlungen: [{ handle: "klarlack-produkte" }, { handle: "lackierbedarf-alle" }],
  }, memory());
  assert.equal(frisch.history, false);
  assert.equal(frisch.shopZurueck, false);
  assert.equal(frisch.pathname, "/kategorie/klarlack-produkte");
  assert.equal(frisch.label, "Zurück zu Klarlack");
});

test("Fremde Adressen und kaputte Handles werden verworfen", () => {
  const s = memory();
  assert.equal(listeBeimProdukt({
    pathname: "https://evil.test/shop",
    search: "?seite=2",
    handle: "../x",
    historyLength: 1,
  }, s), null);
  assert.equal(zurueckZiel({ historyLength: 2, produktHandle: "novol-90-860-hard", sammlungen: [] }, s).pathname, "/shop");
});
