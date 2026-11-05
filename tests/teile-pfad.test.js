import test from "node:test";
import assert from "node:assert/strict";
import { teilePfad, ausTeileSlug, teileSlug } from "../shared/teile-pfad.js";

test("Teilenummer mit Leerzeichen und Schrägstrich bleibt in der Adresse erhalten", () => {
  const pfad = teilePfad("MANN-FILTER", "HU 719/6x");
  assert.equal(pfad, "/teile/mann-filter--HU+719~6x");
  assert.equal(ausTeileSlug(teileSlug("MANN-FILTER", "HU 719/6x")).nummer, "HU 719/6x");
});
