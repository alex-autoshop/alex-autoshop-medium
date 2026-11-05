import test from "node:test";
import assert from "node:assert/strict";
import {
  teileboerseOeffentlich,
  istTeileboerseAdminMail,
  teileboerseGeschlossenHtml,
  leereTeileSitemap,
  TEILEBOERSE_HINWEIS,
} from "../shared/teileboerse-schalter.js";
import { tokenAusAnfrage, zugangAusUser, teileboerseDarf } from "../shared/teileboerse-zugang.js";
import middleware from "../middleware.js";
import autoparts from "../api/autoparts.js";
import tecdoc from "../api/tecdoc.js";

test("Schalter ist standardmäßig zu und per Env öffenbar", () => {
  const vorher = process.env.TEILEBOERSE_PUBLIC;
  delete process.env.TEILEBOERSE_PUBLIC;
  assert.equal(teileboerseOeffentlich(), false);
  process.env.TEILEBOERSE_PUBLIC = "true";
  assert.equal(teileboerseOeffentlich(), true);
  process.env.TEILEBOERSE_PUBLIC = "false";
  assert.equal(teileboerseOeffentlich(), false);
  if (vorher === undefined) delete process.env.TEILEBOERSE_PUBLIC;
  else process.env.TEILEBOERSE_PUBLIC = vorher;
});

test("nur info@alex-autoshop.de ist das Teilebörsen-Konto", () => {
  assert.equal(istTeileboerseAdminMail("info@alex-autoshop.de"), true);
  assert.equal(istTeileboerseAdminMail(" Info@Alex-Autoshop.de "), true);
  assert.equal(istTeileboerseAdminMail("alexanderharitopoulos@gmail.com"), false);
  assert.equal(istTeileboerseAdminMail(""), false);
});

test("Sitzung: bestätigt und passende Mail, fremde Rolle nein", () => {
  const basis = { id: "1", email: "info@alex-autoshop.de", email_confirmed_at: "2026-01-01" };
  assert.equal(zugangAusUser(basis).ok, true);
  assert.equal(zugangAusUser({ ...basis, app_metadata: { rolle: "admin" } }).ok, true);
  assert.equal(zugangAusUser({ ...basis, app_metadata: { rolle: "kunde" } }).ok, false);
  assert.equal(zugangAusUser({ ...basis, email_confirmed_at: null }).ok, false);
  assert.equal(zugangAusUser({ ...basis, email: "alexanderharitopoulos@gmail.com" }).status, 403);
});

test("Token aus Bearer oder Cookie, sonst 401 ohne Netz", async () => {
  assert.equal(tokenAusAnfrage({ headers: { authorization: "Bearer aaa.bbb.ccc" } }), "aaa.bbb.ccc");
  assert.equal(
    tokenAusAnfrage({ headers: { cookie: "anders=1; tb-zugang=aaa.bbb.ccc" } }),
    "aaa.bbb.ccc",
  );
  const ohne = await teileboerseDarf({ headers: {} });
  assert.equal(ohne.ok, false);
  assert.equal(ohne.status, 401);
});

test("Middleware liefert Hinweis statt Produkt-HTML und eine leere Sitemap", async () => {
  const seite = await middleware(new Request("https://www.alex-autoshop.de/teile/mann-filter--HU+719~6x"));
  assert.equal(seite.status, 503);
  assert.match(seite.headers.get("x-robots-tag") || "", /noindex/);
  const html = await seite.text();
  assert.match(html, new RegExp(TEILEBOERSE_HINWEIS));
  assert.equal(html.includes("Artikelnummer"), false);
  assert.equal(html.includes("application/ld+json"), false);

  const liste = await middleware(new Request("https://www.alex-autoshop.de/teileboerse"));
  assert.equal(liste.status, 503);
  const map = await middleware(new Request("https://www.alex-autoshop.de/sitemap-teile.xml"));
  assert.equal(map.status, 200);
  assert.equal((await map.text()).includes("<loc>"), false);
  assert.match(map.headers.get("x-robots-tag") || "", /noindex/);
});

test("Katalog-Proxies lehnen Gäste ab, bevor sie nach außen fragen", async () => {
  const a = await autoparts(new Request("https://www.alex-autoshop.de/api/autoparts?p=/articles/search"));
  assert.equal(a.status, 401);
  const t = await tecdoc(new Request("https://www.alex-autoshop.de/api/tecdoc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "vin", vin: "WVWZZZ3CZWE123456" }),
  }));
  assert.equal(t.status, 401);
});

test("geschlossene Seite nennt den Hinweis und kein Produktdokument", () => {
  const html = teileboerseGeschlossenHtml();
  assert.match(html, new RegExp(TEILEBOERSE_HINWEIS));
  assert.match(html, /noindex/);
  assert.equal(html.includes("application/ld+json"), false);
  assert.match(leereTeileSitemap(), /<urlset/);
  assert.equal(leereTeileSitemap().includes("<loc>"), false);
});
