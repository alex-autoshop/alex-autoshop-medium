import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shopifyMitgliedTag } from "../api/_shopify-order.js";

const quelle = readFileSync(new URL("../api/_activate-membership.js", import.meta.url), "utf8");

function antwort(data) {
  return { ok: true, status: 200, json: async () => ({ data }) };
}

test("Shopify-Kunden-Tag mitglied ist idempotent und blockiert die Bestellung nicht", async () => {
  assert.match(quelle, /shopifyMitgliedTag\(email, true\)/);
  assert.match(quelle, /\["mitgliedschaft", `level-\$\{level\}`, provider\]/);

  const vorher = process.env.SHOPIFY_ADMIN_TOKEN;
  const original = globalThis.fetch;
  try {
    delete process.env.SHOPIFY_ADMIN_TOKEN;
    let aufrufe = 0;
    globalThis.fetch = async () => { aufrufe += 1; throw new Error("netz"); };
    assert.deepEqual(await shopifyMitgliedTag("mitglied@example.com", true), { ok: false, grund: "token" });
    assert.equal((await shopifyMitgliedTag("keine-mail", true)).grund, "email");
    assert.equal(aufrufe, 0);

    process.env.SHOPIFY_ADMIN_TOKEN = "shpat_test_nicht_echt";
    const schritte = [];
    const kunde = { id: "gid://shopify/Customer/9", email: "mitglied@example.com", tags: ["stammkunde"] };
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(init.body);
      const art = body.query.includes("customerCreate") ? "anlegen"
        : body.query.includes("tagsAdd") ? "dazu"
        : body.query.includes("tagsRemove") ? "weg"
        : "suche";
      schritte.push(art);
      if (art === "suche") {
        const edges = schritte.filter((s) => s === "suche").length === 1
          ? []
          : [{ node: { ...kunde, tags: [...kunde.tags] } }];
        return antwort({ customers: { edges } });
      }
      if (art === "anlegen") {
        assert.deepEqual(body.variables.input, { email: "mitglied@example.com", tags: ["mitglied"] });
        return antwort({ customerCreate: { customer: { id: kunde.id, email: kunde.email, tags: ["mitglied"] }, userErrors: [] } });
      }
      if (art === "dazu") {
        assert.deepEqual(body.variables, { id: kunde.id, tags: ["mitglied"] });
        kunde.tags = [...kunde.tags, "mitglied"];
        return antwort({ tagsAdd: { userErrors: [] } });
      }
      kunde.tags = kunde.tags.filter((t) => t !== "mitglied");
      return antwort({ tagsRemove: { userErrors: [] } });
    };

    assert.equal((await shopifyMitgliedTag("Mitglied@Example.com", true)).aktion, "angelegt");
    assert.equal((await shopifyMitgliedTag("mitglied@example.com", true)).aktion, "gesetzt");
    assert.equal((await shopifyMitgliedTag("mitglied@example.com", true)).aktion, "unverändert");
    assert.equal((await shopifyMitgliedTag("mitglied@example.com", false)).aktion, "entfernt");
    assert.equal((await shopifyMitgliedTag("mitglied@example.com", false)).aktion, "unverändert");
    assert.equal((await shopifyMitgliedTag("unbekannt@example.com", false)).aktion, "kein-kunde");
    assert.deepEqual(schritte, ["suche", "anlegen", "suche", "dazu", "suche", "suche", "weg", "suche", "suche"]);
  } finally {
    globalThis.fetch = original;
    if (vorher === undefined) delete process.env.SHOPIFY_ADMIN_TOKEN;
    else process.env.SHOPIFY_ADMIN_TOKEN = vorher;
  }
});
