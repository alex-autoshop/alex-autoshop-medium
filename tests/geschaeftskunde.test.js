import test from "node:test";
import assert from "node:assert/strict";
import { istGeschaeftskunde } from "../shared/geschaeftskunde.js";

test("Firma, USt-Id oder Kennzeichen machen einen Gewerbekunden", () => {
  assert.equal(istGeschaeftskunde({ customer: { tags: "newsletter, b2b" } }), true);
  assert.equal(istGeschaeftskunde({ billing_address: { company: "Lack GmbH" } }), true);
  assert.equal(istGeschaeftskunde({ note_attributes: [{ name: "USt-IdNr.", value: "DE123" }] }), true);
  assert.equal(istGeschaeftskunde({ customer: { tags: "stammkunde" }, billing_address: { company: "" } }), false);
  assert.equal(istGeschaeftskunde(null), false);
});
