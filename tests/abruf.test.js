import test from "node:test";
import assert from "node:assert/strict";
import { istChunkFehler, wiederholen } from "../shared/abruf.js";

test("fehlende Seitenstücke werden erkannt", () => {
  assert.equal(istChunkFehler(new Error("Failed to fetch dynamically imported module")), true);
  assert.equal(istChunkFehler(Object.assign(new Error("x"), { name: "ChunkLoadError" })), true);
  assert.equal(istChunkFehler(new Error("Katalog gerade nicht erreichbar")), false);
  assert.equal(istChunkFehler(null), false);
});

test("Netzfehler werden wiederholt, Client-Fehler nicht", async () => {
  let n = 0;
  const wert = await wiederholen(async () => {
    n += 1;
    if (n < 3) throw new Error("weg");
    return "ok";
  }, { versuche: 3, pauseMs: 1, timeoutMs: 1000 });
  assert.equal(wert, "ok");
  assert.equal(n, 3);

  await assert.rejects(
    wiederholen(async () => {
      const fehler = new Error("nein");
      fehler.status = 404;
      throw fehler;
    }, { versuche: 3, pauseMs: 1, timeoutMs: 1000 }),
    (fehler) => fehler.status === 404,
  );
});
