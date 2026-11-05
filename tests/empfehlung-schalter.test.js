import test from "node:test";
import assert from "node:assert/strict";
import { empfehlungOffen, empfehlungSichtbar, EMPFEHLUNGS_PROZENT } from "../shared/empfehlung.js";

test("Empfehlungen sind zu, nur das Admin-Konto sieht sie", () => {
  const vorher = process.env.EMPFEHLUNG_OEFFENTLICH;
  delete process.env.EMPFEHLUNG_OEFFENTLICH;
  assert.equal(empfehlungOffen(), false);
  assert.equal(empfehlungSichtbar("kunde@example.com"), false);
  assert.equal(empfehlungSichtbar("info@alex-autoshop.de"), true);
  assert.equal(EMPFEHLUNGS_PROZENT, 5);
  process.env.EMPFEHLUNG_OEFFENTLICH = "true";
  assert.equal(empfehlungOffen(), true);
  assert.equal(empfehlungSichtbar("kunde@example.com"), true);
  if (vorher === undefined) delete process.env.EMPFEHLUNG_OEFFENTLICH;
  else process.env.EMPFEHLUNG_OEFFENTLICH = vorher;
});
