import test from "node:test";
import assert from "node:assert/strict";
import {
  zustandAusSuche,
  sucheAusZustand,
  zustandNormalisieren,
  shopZustandSchreiben,
  shopZurueckZiel,
  istShopPfad,
} from "../shared/shop-zustand.js";

function memory() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
  };
}

test("Marke Glasurit übersteht den Weg durch die Adresse", () => {
  const suche = sucheAusZustand({
    brands: ["Glasurit"],
    tags: [],
    priceMax: null,
    onlyAvailable: false,
    q: "",
    sort: "empfohlen",
  });
  assert.equal(suche, "?marke=Glasurit");
  const zurueck = zustandAusSuche(suche);
  assert.deepEqual(zurueck.brands, ["Glasurit"]);
  assert.equal(zurueck.sort, "empfohlen");
  assert.equal(zurueck.q, "");
});

test("Kategorie-Pfad und Marke bleiben zusammen das Zurück-Ziel", () => {
  const s = memory();
  shopZustandSchreiben({
    pathname: "/shop/lackierbedarf-alle",
    search: "?marke=Glasurit&sort=name",
    scroll: 840,
  }, s);
  const ziel = shopZurueckZiel(s);
  assert.equal(ziel.pathname, "/shop/lackierbedarf-alle");
  assert.equal(ziel.search, "?marke=Glasurit&sort=name");
  assert.equal(ziel.scroll, 840);
});

test("Suche, Art, Preis und Lager wandern mit", () => {
  const suche = sucheAusZustand({
    brands: ["Glasurit", "Mipa"],
    tags: ["Härter"],
    priceMax: 50,
    onlyAvailable: true,
    q: "Klarlack",
    sort: "preis-auf",
  });
  const z = zustandAusSuche(suche);
  assert.deepEqual(z.brands, ["Glasurit", "Mipa"]);
  assert.deepEqual(z.tags, ["Härter"]);
  assert.equal(z.priceMax, 50);
  assert.equal(z.onlyAvailable, true);
  assert.equal(z.q, "Klarlack");
  assert.equal(z.sort, "preis-auf");
  assert.equal(sucheAusZustand(z), suche);
});

test("Kategorieleiste mit Marke Glasurit bleibt das Zurück-Ziel", () => {
  const s = memory();
  shopZustandSchreiben({
    pathname: "/kategorie/lackierbedarf-alle",
    search: "?marke=Glasurit&sort=neu",
    scroll: 420,
  }, s);
  const ziel = shopZurueckZiel(s);
  assert.equal(ziel.pathname, "/kategorie/lackierbedarf-alle");
  assert.equal(ziel.search, "?marke=Glasurit&sort=neu");
  assert.equal(ziel.scroll, 420);
});

test("Unbekannte Sortierung und fremde Pfade fallen weg", () => {
  assert.equal(zustandAusSuche("?sort=hack&marke=").sort, "empfohlen");
  assert.equal(zustandAusSuche("?marke=").brands.length, 0);
  assert.equal(istShopPfad("/shop/lackierbedarf-alle"), true);
  assert.equal(istShopPfad("/konto"), false);
  assert.equal(zustandNormalisieren({ pathname: "https://evil.test/shop", search: "?marke=Glasurit" }), null);
  assert.equal(zustandNormalisieren({ pathname: "/konto", search: "?marke=Glasurit" }), null);
  const s = memory();
  assert.deepEqual(shopZurueckZiel(s), { pathname: "/shop", search: "" });
});
