// Teilebörse-Bestellung speichern und bestätigen.
// Datei beginnt mit "_" → kein eigener Vercel-Endpunkt.
// Fehlt Supabase oder Resend, wird geloggt und die Zahlung läuft weiter.

const SHOP_EMAIL = "info@alex-autoshop.de";
const VON = "Alex Autoshop <info@alex-autoshop.de>";
const SITE = "https://www.alex-autoshop.de";

const supabaseUrl = () =>
  (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://zasbdvtsxgimcezotlsi.supabase.co").replace(/\/+$/, "");

export function positionenLesen(text) {
  const positionen = [];
  let versand = 0;
  let pfand = 0;
  for (const teil of String(text || "").split("|")) {
    if (!teil || teil.startsWith("FIN ")) continue;
    if (teil.startsWith("v:")) { versand = Number(teil.slice(2)) || 0; continue; }
    if (teil.startsWith("p:")) { pfand = Number(teil.slice(2)) || 0; continue; }
    const m = teil.match(/^(\d+)x([^@]+)(?:@([\d.]+))?$/);
    if (!m) continue;
    positionen.push({
      menge: Number(m[1]),
      artikelnummer: m[2],
      preis: Number(m[3] || 0),
      name: m[2],
    });
  }
  return { positionen, versand, pfand };
}

function euro(n) {
  return `${Number(n || 0).toFixed(2).replace(".", ",")} €`;
}

function bestelltext(b) {
  const zeilen = (b.positionen || []).map((p) =>
    `${p.menge}× ${p.name || p.artikelnummer}${p.preis ? ` — ${euro(p.preis)}` : ""}`
  );
  const waren = b.warenwert != null ? b.warenwert : (b.positionen || []).reduce((s, p) => s + (Number(p.preis) || 0) * (Number(p.menge) || 1), 0);
  const gesamt = b.summe != null ? b.summe : waren + Number(b.versand || 0) + Number(b.pfand || 0);
  return [
    "Alex Autoshop · Alexander Haritopoulos",
    "Handelstraße 64 · 42277 Wuppertal",
    "Telefon/WhatsApp 0202 82690 · info@alex-autoshop.de",
    "",
    `Bestellung ${b.externId}`,
    b.fahrzeug ? `Fahrzeug: ${b.fahrzeug}` : "",
    "",
    "Positionen (inkl. MwSt):",
    ...zeilen,
    "",
    `Warenwert: ${euro(waren)}`,
    `Versand: ${Number(b.versand) > 0 ? euro(b.versand) : "0,00 €"}`,
    Number(b.pfand) > 0 ? `Batteriepfand: ${euro(b.pfand)}` : "",
    `Gesamt: ${euro(gesamt)}`,
    "",
    b.strasse ? `Lieferung: ${b.name || ""}, ${b.strasse}, ${b.plz || ""} ${b.ort || ""}`.replace(/\s+/g, " ").trim() : "Lieferung: Abholung in Wuppertal oder Adresse beim Zahlungsdienst",
    "",
    `AGB: ${SITE}/agb`,
    `Widerrufsbelehrung: ${SITE}/widerruf`,
    "Verbraucher können den Vertrag binnen 14 Tagen über die Seite Widerruf widerrufen.",
  ].filter((z) => z !== "").join("\n");
}

async function mail(key, an, betreff, text) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: VON,
      to: [an],
      reply_to: SHOP_EMAIL,
      subject: betreff,
      text,
    }),
  });
  if (!r.ok) console.error("[bestellung] mail", r.status, (await r.text()).slice(0, 160));
  return r.ok;
}

/**
 * Legt die Bestellung an oder aktualisiert sie. Schickt bei status "bezahlt"
 * die Kundenmail (§ 312f) und eine Kopie an den Laden. Wirft nicht.
 */
export async function teileBestellung(b) {
  try {
    const externId = String(b?.externId || "").trim();
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!externId) return;
    if (!svc) {
      console.warn("[bestellung] SUPABASE_SERVICE_ROLE_KEY fehlt — Bestellung nicht gespeichert");
      return;
    }
    const zeile = {
      extern_id: externId,
      anbieter: b.anbieter || "unbekannt",
      status: b.status || "offen",
    };
    if (b.email) zeile.email = b.email;
    if (b.name) zeile.name = b.name;
    if (b.strasse) zeile.strasse = b.strasse;
    if (b.plz) zeile.plz = b.plz;
    if (b.ort) zeile.ort = b.ort;
    if (Array.isArray(b.positionen) && b.positionen.length) zeile.positionen = b.positionen;
    if (b.warenwert != null) zeile.warenwert = b.warenwert;
    if (b.versand != null) zeile.versand = b.versand;
    if (b.pfand != null) zeile.pfand = b.pfand;
    if (b.summe != null) zeile.summe = b.summe;
    if (b.fahrzeug) zeile.fahrzeug = b.fahrzeug;
    if (b.vin) zeile.vin = b.vin;
    if (b.status === "bezahlt") zeile.bezahlt_am = new Date().toISOString();
    const r = await fetch(`${supabaseUrl()}/rest/v1/teile_bestellungen?on_conflict=extern_id`, {
      method: "POST",
      headers: {
        apikey: svc,
        Authorization: `Bearer ${svc}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(zeile),
    });
    if (!r.ok) {
      console.error("[bestellung] speichern", r.status, (await r.text()).slice(0, 200));
      return;
    }
    const daten = await r.json().catch(() => null);
    const row = Array.isArray(daten) ? daten[0] : daten;
    if (zeile.status !== "bezahlt" || row?.mail_kunde) return;

    const key = String(process.env.RESEND_API_KEY || "").trim();
    if (!key) {
      console.warn("[bestellung] RESEND_API_KEY fehlt — Bestätigungsmail übersprungen");
      return;
    }
    const text = bestelltext({ ...b, externId });
    const kundeOk = b.email ? await mail(key, b.email, `Bestellbestätigung ${externId}`, text) : false;
    const ladenOk = await mail(key, SHOP_EMAIL, `Neue Teilebörse-Bestellung ${externId}`, text);
    if (!kundeOk && !ladenOk) return;
    await fetch(`${supabaseUrl()}/rest/v1/teile_bestellungen?extern_id=eq.${encodeURIComponent(externId)}`, {
      method: "PATCH",
      headers: {
        apikey: svc,
        Authorization: `Bearer ${svc}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        ...(kundeOk ? { mail_kunde: true } : {}),
        ...(ladenOk ? { mail_laden: true } : {}),
      }),
    }).catch(() => {});
  } catch (e) {
    console.error("[bestellung]", String(e?.message || e).slice(0, 200));
  }
}

/** Zahlung ist eingezogen. Liest die schon angelegte Zeile und schickt die Mails. */
export async function teileBestellungBezahlt(externId, extra = {}) {
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let alt = null;
  if (svc && externId) {
    try {
      const r = await fetch(
        `${supabaseUrl()}/rest/v1/teile_bestellungen?extern_id=eq.${encodeURIComponent(externId)}&select=*`,
        { headers: { apikey: svc, Authorization: `Bearer ${svc}` } },
      );
      const rows = r.ok ? await r.json() : [];
      alt = Array.isArray(rows) ? rows[0] : null;
    } catch { /* unten mit den neuen Angaben */ }
  }
  if (extra.nurWennDa && !alt) return;
  await teileBestellung({
    externId,
    anbieter: extra.anbieter || alt?.anbieter || "unbekannt",
    status: "bezahlt",
    email: extra.email || alt?.email,
    name: extra.name || alt?.name,
    strasse: extra.strasse || alt?.strasse,
    plz: extra.plz || alt?.plz,
    ort: extra.ort || alt?.ort,
    positionen: extra.positionen?.length ? extra.positionen : alt?.positionen,
    warenwert: extra.warenwert ?? alt?.warenwert,
    versand: extra.versand ?? alt?.versand,
    pfand: extra.pfand ?? alt?.pfand,
    summe: extra.summe ?? alt?.summe,
    fahrzeug: extra.fahrzeug || alt?.fahrzeug,
    vin: extra.vin || alt?.vin,
  });
}
