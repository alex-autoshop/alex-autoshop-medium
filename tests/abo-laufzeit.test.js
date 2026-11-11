import test from "node:test";
import assert from "node:assert/strict";
import {
  LAUFZEIT_KURZ, MINDEST_MONATE, aboCentAusRechnung, kassenText, mindestEingriff, monateAddieren, standAusRechnungen,
} from "../shared/abo-laufzeit.js";

const PERIOD = Math.floor(Date.UTC(2026, 0, 15) / 1000);

test("Kassenhinweis nennt 3 Monate und die Nachberechnung", () => {
  assert.equal(MINDEST_MONATE, 3);
  assert.match(LAUFZEIT_KURZ, /Mindestlaufzeit 3 Monate/);
  assert.match(LAUFZEIT_KURZ, /höchsten bisherigen Monatsbeitrag/);
  assert.equal(
    kassenText(12.5, 4.8),
    `Zahlungspflichtig bestellen. Einmalig 12,50 €, dazu 4,80 € im Monat. ${LAUFZEIT_KURZ}`,
  );
  assert.doesNotMatch(kassenText(1, 1), /Mindestlaufzeit gibt es nicht|keine Mindestlaufzeit/);
});

test("vorzeitige Kündigung verlängert bis Monat 3, zum Höchstbeitrag", () => {
  const ziel = monateAddieren(PERIOD, 2);
  const eingriff = mindestEingriff({
    mindest: true,
    bezahlt: 1,
    hoechstCent: 17112,
    preisCent: 480,
    periodEnd: PERIOD,
    cancelAtPeriodEnd: true,
  });
  assert.equal(eingriff.art, "verlaengern");
  assert.equal(eingriff.monate, 2);
  assert.equal(eingriff.cancelAt, ziel);
  assert.equal(eingriff.preisCent, 17112);
});

test("schon richtig gesetzt: kein zweites Mal anfassen", () => {
  const ziel = monateAddieren(PERIOD, 2);
  const eingriff = mindestEingriff({
    mindest: true,
    bezahlt: 1,
    hoechstCent: 17112,
    preisCent: 17112,
    periodEnd: PERIOD,
    cancelAt: ziel,
    cancelAtPeriodEnd: false,
  });
  assert.equal(eingriff.art, "keine");
});

test("sofort beendet: Rechnung über die offenen Monate", () => {
  const weg = mindestEingriff({
    mindest: true,
    geloescht: true,
    bezahlt: 1,
    hoechstCent: 500,
    preisCent: 500,
  });
  assert.deepEqual(weg, { art: "rechnung", monate: 2, cent: 1000 });
  const drei = mindestEingriff({
    mindest: true,
    geloescht: true,
    bezahlt: 0,
    hoechstCent: 500,
    preisCent: 500,
  });
  assert.equal(drei.cent, 1500);
  const fertig = mindestEingriff({
    mindest: true,
    geloescht: true,
    bezahlt: 3,
    hoechstCent: 500,
    preisCent: 500,
  });
  assert.equal(fertig.art, "keine");
  assert.equal(mindestEingriff({ mindest: false, geloescht: true, bezahlt: 0, hoechstCent: 500 }).art, "keine");
});

test("nur der Abo-Anteil einer Rechnung zählt, nicht die Ware", () => {
  const cent = aboCentAusRechnung({
    lines: {
      data: [
        { amount: 17112, type: "subscription", price: { recurring: { interval: "month" } } },
        { amount: 213900, type: "invoiceitem" },
      ],
    },
  });
  assert.equal(cent, 17112);
  assert.deepEqual(standAusRechnungen([17112], 480, "active"), { bezahlt: 1, hoechstCent: 17112 });
  assert.deepEqual(standAusRechnungen([], 480, "active"), { bezahlt: 1, hoechstCent: 480 });
  assert.equal(standAusRechnungen(null, 480, "active"), null);
});
