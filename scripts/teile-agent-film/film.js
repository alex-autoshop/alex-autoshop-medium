/**
 * Stummer Erklärfilm, 1080×1440, 24 Bilder/s, 36 Sekunden.
 * Jedes Bild erklärt sich über den eingeblendeten Text.
 * Preise und der Fahrzeugschein sind Beispiele, ohne echte Daten und ohne Markennamen.
 */
(function () {
  const W = 1080;
  const H = 1440;
  const FPS = 24;
  const DAUER = 36;
  const FRAMES = FPS * DAUER;
  const GOLD = "#f1eb5b";
  const GOLD_TIEF = "#c4b000";
  const CREME = "#EDE9E3";
  const NACHT = "#0D0D0D";
  const LEISE = "rgba(237,233,227,0.74)";
  const LINIE = "rgba(237,233,227,0.14)";
  const KARTE = "#161616";

  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  const logo = document.getElementById("logo");

  const FADE = 0.28;
  const SZENEN = [
    { ein: 0.05, aus: 7.7, malen: szeneChat },
    { ein: 7.9, aus: 15.2, malen: szenePassung },
    { ein: 15.4, aus: 24.0, malen: szeneAngebote },
    { ein: 24.2, aus: 31.4, malen: szeneTipps },
    { ein: 31.6, aus: 35.9, malen: szeneAbschluss },
  ];

  function ease(t) {
    const x = Math.min(1, Math.max(0, t));
    return 1 - (1 - x) * (1 - x) * (1 - x);
  }
  function strecke(t, a, b) {
    return ease((t - a) / (b - a));
  }
  function schrift(groesse, gewicht, familie) {
    ctx.font = `${gewicht} ${groesse}px ${familie}`;
  }
  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  }
  function umbrechen(text, max) {
    const worte = text.split(" ");
    const zeilen = [];
    let zeile = "";
    for (const wort of worte) {
      const probe = zeile ? `${zeile} ${wort}` : wort;
      if (ctx.measureText(probe).width > max && zeile) {
        zeilen.push(zeile);
        zeile = wort;
      } else {
        zeile = probe;
      }
    }
    if (zeile) zeilen.push(zeile);
    return zeilen;
  }
  function spur(text, x, y, abstand) {
    let cursor = x;
    for (const zeichen of text) {
      ctx.fillText(zeichen, cursor, y);
      cursor += ctx.measureText(zeichen).width + abstand;
    }
  }

  function hintergrund(t) {
    ctx.fillStyle = NACHT;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.5, 280, 20, W * 0.5, 420, 820);
    glow.addColorStop(0, "rgba(241,235,91,0.10)");
    glow.addColorStop(1, "rgba(241,235,91,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(241,235,91,0.16)";
    ctx.lineWidth = 2;
    rrect(28, 28, W - 56, H - 56, 40);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(48, H - 22, W - 96, 6);
    ctx.fillStyle = GOLD;
    ctx.fillRect(48, H - 22, (W - 96) * (t / DAUER), 6);
  }

  function kopf(kicker, titel) {
    schrift(26, 700, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = GOLD;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    spur(kicker, 80, 128, 3.2);
    ctx.fillStyle = GOLD;
    ctx.fillRect(80, 152, 72, 4);
    schrift(72, 700, "Syne, Inter, sans-serif");
    ctx.fillStyle = CREME;
    let y = 240;
    for (const zeile of titel) {
      ctx.fillText(zeile, 80, y);
      y += 82;
    }
    return y + 8;
  }

  function fuss(text) {
    schrift(32, 600, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = LEISE;
    ctx.textAlign = "center";
    const zeilen = umbrechen(text, 880);
    let y = 1268;
    if (zeilen.length > 1) y = 1236;
    for (const zeile of zeilen) {
      ctx.fillText(zeile, W / 2, y);
      y += 42;
    }
    ctx.textAlign = "left";
  }

  function punkte(index) {
    const aktiv = 36;
    const ruhend = 10;
    const luecke = 12;
    const breite = aktiv + (SZENEN.length - 1) * (ruhend + luecke);
    let x = (W - breite) / 2;
    const y = 1348;
    for (let i = 0; i < SZENEN.length; i++) {
      const w = i === index ? aktiv : ruhend;
      ctx.fillStyle = i === index ? GOLD : "rgba(237,233,227,0.28)";
      rrect(x, y, w, 10, 5);
      ctx.fill();
      x += w + luecke;
    }
  }

  function szeneIndex(t) {
    let index = 0;
    for (let i = 0; i < SZENEN.length; i++) {
      if (t >= SZENEN[i].ein) index = i;
    }
    return index;
  }

  function scheibe(x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = GOLD;
    ctx.fillStyle = GOLD;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const winkel = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.arc(Math.cos(winkel) * r * 0.68, Math.sin(winkel) * r * 0.68, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function haken(x, y, s, p) {
    ctx.beginPath();
    const ax = x;
    const ay = y + s * 0.55;
    const bx = x + s * 0.38;
    const by = y + s * 0.92;
    const cx = x + s;
    const cy = y + s * 0.18;
    if (p <= 0.42) {
      const k = p / 0.42;
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + (bx - ax) * k, ay + (by - ay) * k);
    } else {
      const k = Math.min(1, (p - 0.42) / 0.58);
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + (cx - bx) * k, by + (cy - by) * k);
    }
    ctx.stroke();
  }

  function kreisHaken(x, y, r, p) {
    ctx.save();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const bogen = Math.min(1, p / 0.55);
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * bogen);
    ctx.stroke();
    if (p > 0.4) haken(x - r * 0.42, y - r * 0.42, r * 0.9, (p - 0.4) / 0.6);
    ctx.restore();
  }

  function schein(x, y, w, h, p) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(-0.035);
    ctx.translate(-w / 2, -h / 2);
    ctx.globalAlpha *= p;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    rrect(10, 16, w, h, 22);
    ctx.fill();
    ctx.fillStyle = "#F6F1E6";
    rrect(0, 0, w, h, 22);
    ctx.fill();
    ctx.save();
    rrect(0, 0, w, h, 22);
    ctx.clip();
    ctx.fillStyle = NACHT;
    ctx.fillRect(0, 0, w, 48);
    schrift(18, 700, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = GOLD;
    ctx.textAlign = "left";
    ctx.fillText("BEISPIEL", 22, 31);
    schrift(28, 700, "Syne, Inter, sans-serif");
    ctx.fillStyle = "#1A1A1A";
    ctx.fillText("Fahrzeugschein", 22, 92);
    schrift(20, 600, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = "#6B675E";
    ctx.fillText("keine echten Daten", 22, 122);
    const felder = [
      ["HSN", "••••"],
      ["TSN", "•••"],
      ["FIN", "•••••••••"],
    ];
    felder.forEach((feld, i) => {
      const fy = 168 + i * 42;
      schrift(18, 700, "'DM Sans', Inter, sans-serif");
      ctx.fillStyle = "#8A8478";
      ctx.fillText(feld[0], 22, fy);
      schrift(22, 700, "'DM Sans', Inter, sans-serif");
      ctx.fillStyle = "#1A1A1A";
      ctx.fillText(feld[1], 110, fy);
    });
    ctx.strokeStyle = "#1A1A1A";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(w - 168, 214);
    ctx.lineTo(w - 150, 188);
    ctx.lineTo(w - 92, 184);
    ctx.lineTo(w - 70, 214);
    ctx.lineTo(w - 48, 214);
    ctx.quadraticCurveTo(w - 42, 236, w - 62, 236);
    ctx.lineTo(w - 156, 236);
    ctx.quadraticCurveTo(w - 176, 236, w - 168, 214);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w - 140, 236, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w - 78, 236, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.translate(w - 86, 78);
    ctx.rotate(-0.32);
    ctx.strokeStyle = "#9F2D22";
    ctx.lineWidth = 3;
    ctx.strokeRect(-62, -18, 124, 36);
    schrift(16, 700, "Syne, Inter, sans-serif");
    ctx.fillStyle = "#9F2D22";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("BEISPIEL", 0, 1);
    ctx.restore();
    ctx.restore();
  }

  function szeneChat(t) {
    const u = t - 0.05;
    kopf("01   ·   WHATSAPP", ["Anfrage im Chat"]);
    const px = 210;
    const py = 330 + (1 - strecke(u, 0.15, 0.55)) * 30;
    const pw = 660;
    const ph = 860;
    ctx.save();
    ctx.globalAlpha *= strecke(u, 0.1, 0.45);
    ctx.fillStyle = "#070B10";
    rrect(px, py, pw, ph, 52);
    ctx.fill();
    ctx.strokeStyle = "rgba(237,233,227,0.16)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.save();
    rrect(px, py, pw, ph, 52);
    ctx.clip();
    ctx.fillStyle = "#1F2C34";
    ctx.fillRect(px, py, pw, 132);
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(px + 78, py + 66, 32, 0, Math.PI * 2);
    ctx.fill();
    schrift(22, 700, "Syne, Inter, sans-serif");
    ctx.fillStyle = NACHT;
    ctx.textAlign = "center";
    ctx.fillText("AA", px + 78, py + 74);
    ctx.textAlign = "left";
    schrift(30, 700, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("Alex Autoshop", px + 128, py + 58);
    schrift(22, 600, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = GOLD;
    ctx.fillText("Teile-Agent", px + 128, py + 92);
    ctx.fillStyle = "#3DDC84";
    ctx.beginPath();
    ctx.arc(px + pw - 58, py + 66, 8, 0, Math.PI * 2);
    ctx.fill();

    const text = "Bremsscheiben + Beläge vorne, VW Golf 7, Bj. 2016";
    const zeichen = Math.floor(strecke(u, 0.45, 3.5) * text.length);
    const sichtbar = text.slice(0, zeichen);
    schrift(28, 600, "'DM Sans', Inter, sans-serif");
    const zeilen = umbrechen(sichtbar || " ", 430);
    const zeilenHoehe = 38;
    const blaseH = Math.max(74, zeilen.length * zeilenHoehe + 36);
    const blaseW = 500;
    const blaseX = px + pw - blaseW - 36;
    const blaseY = py + 168;
    if (zeichen > 0) {
      ctx.fillStyle = "#005C4B";
      rrect(blaseX, blaseY, blaseW, blaseH, 24);
      ctx.fill();
      ctx.fillStyle = "#E7FFEF";
      zeilen.forEach((zeile, i) => {
        ctx.fillText(zeile === " " ? "" : zeile, blaseX + 24, blaseY + 42 + i * zeilenHoehe);
      });
      if (u < 3.55 && Math.floor(u * 4) % 2 === 0) {
        const letzte = zeilen[zeilen.length - 1] || "";
        const cursorX = blaseX + 24 + ctx.measureText(letzte === " " ? "" : letzte).width + 2;
        ctx.fillRect(cursorX, blaseY + 16 + (zeilen.length - 1) * zeilenHoehe, 3, 28);
      }
    }
    const fotoP = strecke(u, 3.85, 4.6);
    if (fotoP > 0) {
      const fotoY = blaseY + (zeichen > 0 ? blaseH : 0) + 22 + (1 - fotoP) * 24;
      schein(px + 78, fotoY, 500, 300, fotoP);
    }
    ctx.restore();
    ctx.restore();
    fuss("Teil, Fahrzeug, Baujahr — und ein Foto vom Schein.");
  }

  function szenePassung(t) {
    const u = t - 7.9;
    kopf("02   ·   PASSFORM", ["Passend geprüft"]);
    const zeilen = [
      ["HSN", "Herstellerschlüssel"],
      ["TSN", "Typschlüssel"],
      ["FIN", "Fahrzeug-Identnummer"],
    ];
    zeilen.forEach((zeile, i) => {
      const y = 360 + i * 176;
      const p = strecke(u, 0.35 + i * 0.7, 1.15 + i * 0.7);
      const ein = strecke(u, 0.12 + i * 0.12, 0.45 + i * 0.12);
      ctx.save();
      ctx.globalAlpha *= ein;
      ctx.fillStyle = KARTE;
      rrect(80, y, W - 160, 156, 28);
      ctx.fill();
      ctx.strokeStyle = p > 0.85 ? "rgba(241,235,91,0.55)" : LINIE;
      ctx.lineWidth = 2;
      ctx.stroke();
      schrift(44, 700, "Syne, Inter, sans-serif");
      ctx.fillStyle = CREME;
      ctx.fillText(zeile[0], 116, y + 72);
      schrift(26, 600, "'DM Sans', Inter, sans-serif");
      ctx.fillStyle = LEISE;
      ctx.fillText(zeile[1], 116, y + 116);
      if (p > 0) kreisHaken(W - 176, y + 78, 32, p);
      ctx.restore();
    });
    const siegel = strecke(u, 2.7, 3.4);
    if (siegel > 0) {
      ctx.save();
      ctx.globalAlpha *= siegel;
      ctx.fillStyle = "rgba(241,235,91,0.12)";
      rrect(80, 900, W - 160, 150, 28);
      ctx.fill();
      kreisHaken(168, 975, 34, siegel);
      schrift(40, 700, "Syne, Inter, sans-serif");
      ctx.fillStyle = GOLD;
      ctx.fillText("passend geprüft", 230, 990);
      ctx.restore();
    }
    fuss("Der Agent prüft die Passform über HSN, TSN oder FIN.");
  }

  function angebotKarte(x, y, w, h, daten, p) {
    ctx.save();
    ctx.globalAlpha *= p;
    ctx.translate(0, (1 - p) * 36);
    ctx.fillStyle = "#121212";
    rrect(x, y, w, h, 28);
    ctx.fill();
    ctx.strokeStyle = "rgba(241,235,91,0.28)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.fillRect(x + 24, y + 22, 48, 5);
    schrift(16, 700, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = NACHT;
    const pillW = ctx.measureText("BEISPIEL").width + 28;
    ctx.fillStyle = GOLD;
    rrect(x + 24, y + 44, pillW, 32, 16);
    ctx.fill();
    ctx.fillStyle = NACHT;
    ctx.textBaseline = "middle";
    ctx.fillText("BEISPIEL", x + 38, y + 61);
    ctx.textBaseline = "alphabetic";
    scheibe(x + w / 2, y + 156, 42);
    schrift(26, 700, "Syne, Inter, sans-serif");
    ctx.fillStyle = CREME;
    ctx.textAlign = "center";
    daten.stufe.forEach((zeile, i) => ctx.fillText(zeile, x + w / 2, y + 246 + i * 32));
    const preisY = y + 360;
    schrift(52, 700, "Syne, Inter, sans-serif");
    ctx.fillStyle = GOLD;
    ctx.fillText(daten.preis, x + w / 2, preisY);
    schrift(18, 600, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = LEISE;
    ctx.fillText("Beispielpreis", x + w / 2, preisY + 34);
    ctx.strokeStyle = LINIE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 28, preisY + 58);
    ctx.lineTo(x + w - 28, preisY + 58);
    ctx.stroke();
    schrift(24, 700, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = CREME;
    ctx.fillText(daten.zeit, x + w / 2, preisY + 100);
    ctx.textAlign = "left";
    ctx.restore();
  }

  function szeneAngebote(t) {
    const u = t - 15.4;
    kopf("03   ·   BEISPIEL", ["Drei Angebote"]);
    schrift(30, 600, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = LEISE;
    ctx.fillText("Mehrere Marken und Preise,", 80, 360);
    ctx.fillText("statt nur einem Vorschlag.", 80, 402);
    const karten = [
      { stufe: ["Budget"], preis: "64 €", zeit: "2–3 Werktage" },
      { stufe: ["Erstausrüster", "Qualität"], preis: "89 €", zeit: "1–2 Werktage" },
      { stufe: ["Premium"], preis: "129 €", zeit: "1 Werktag" },
    ];
    const spalt = 28;
    const breite = (W - 160 - spalt * 2) / 3;
    karten.forEach((karte, i) => {
      const p = strecke(u, 0.25 + i * 0.22, 0.85 + i * 0.22);
      angebotKarte(80 + i * (breite + spalt), 450, breite, 540, karte, p);
    });
    const band = strecke(u, 1.7, 2.2);
    if (band > 0) {
      ctx.save();
      ctx.globalAlpha *= band;
      schrift(28, 700, "'DM Sans', Inter, sans-serif");
      ctx.fillStyle = GOLD;
      ctx.textAlign = "center";
      ctx.fillText("Über 20 Partnerlieferanten", W / 2, 1088);
      ctx.textAlign = "left";
      ctx.restore();
    }
    fuss("Preise und Lieferzeiten in diesem Film sind Beispiele.");
  }

  function szeneTipps(t) {
    const u = t - 24.2;
    kopf("04   ·   TIPPS", ["Preis und Lieferzeit"]);
    const tipps = [
      ["Fahrzeugschein-Foto schicken", "HSN, TSN oder die FIN stehen auf dem Schein."],
      ["Teil und Einbauposition nennen", "Vorne oder hinten, links oder rechts."],
      ["Sagen, was dir wichtiger ist", "Günstiger Preis oder kurze Lieferzeit."],
    ];
    tipps.forEach((tipp, i) => {
      const p = strecke(u, 0.25 + i * 0.45, 0.85 + i * 0.45);
      const y = 390 + i * 250;
      ctx.save();
      ctx.globalAlpha *= p;
      ctx.translate((1 - p) * 40, 0);
      ctx.fillStyle = KARTE;
      rrect(80, y, W - 160, 220, 28);
      ctx.fill();
      ctx.strokeStyle = LINIE;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(168, y + 110, 42, 0, Math.PI * 2);
      ctx.fill();
      schrift(36, 700, "Syne, Inter, sans-serif");
      ctx.fillStyle = NACHT;
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), 168, y + 124);
      ctx.textAlign = "left";
      schrift(34, 700, "Syne, Inter, sans-serif");
      ctx.fillStyle = CREME;
      const titel = umbrechen(tipp[0], 700);
      titel.forEach((zeile, n) => ctx.fillText(zeile, 236, y + 86 + n * 42));
      schrift(26, 600, "'DM Sans', Inter, sans-serif");
      ctx.fillStyle = LEISE;
      ctx.fillText(tipp[1], 236, y + 92 + titel.length * 42);
      ctx.restore();
    });
    fuss("Drei Angaben, damit die Auswahl konkret wird.");
  }

  function szeneAbschluss(t) {
    const u = t - 31.6;
    kopf("05   ·   ALEX AUTOSHOP", ["Jetzt anfragen"]);
    const logoP = strecke(u, 0.15, 0.6);
    if (logo.complete && logo.naturalWidth && logoP > 0) {
      const lw = 820;
      const lh = lw * (logo.naturalHeight / logo.naturalWidth);
      ctx.save();
      ctx.globalAlpha *= logoP;
      ctx.drawImage(logo, (W - lw) / 2, 360 + (1 - logoP) * 16, lw, lh);
      ctx.restore();
    }
    const knopf = strecke(u, 0.45, 0.9);
    if (knopf > 0) {
      const text = "Jetzt per WhatsApp anfragen";
      schrift(34, 700, "'DM Sans', Inter, sans-serif");
      const bw = ctx.measureText(text).width + 80;
      const bh = 92;
      const bx = (W - bw) / 2;
      const by = 860;
      ctx.save();
      ctx.globalAlpha *= knopf;
      ctx.fillStyle = GOLD;
      rrect(bx, by, bw, bh, 18);
      ctx.fill();
      ctx.fillStyle = NACHT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, W / 2, by + bh / 2 + 2);
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.restore();
    }
    const nummer = strecke(u, 0.75, 1.15);
    if (nummer > 0) {
      ctx.save();
      ctx.globalAlpha *= nummer;
      schrift(48, 700, "Syne, Inter, sans-serif");
      ctx.fillStyle = CREME;
      ctx.textAlign = "center";
      ctx.fillText("+49 202 82690", W / 2, 1040);
      schrift(28, 600, "'DM Sans', Inter, sans-serif");
      ctx.fillStyle = LEISE;
      ctx.fillText("Handelstraße 64 · Wuppertal", W / 2, 1096);
      ctx.textAlign = "left";
      ctx.restore();
    }
    fuss("Anfragen bei Alex Autoshop, direkt im Chat.");
  }

  function zeichne(frame) {
    const t = frame / FPS;
    hintergrund(t);
    for (const szene of SZENEN) {
      if (t < szene.ein || t > szene.aus) continue;
      const ein = t < szene.ein + FADE ? (t - szene.ein) / FADE : 1;
      const aus = t > szene.aus - FADE ? (szene.aus - t) / FADE : 1;
      ctx.save();
      ctx.globalAlpha = ease(Math.min(ein, aus));
      szene.malen(t);
      ctx.restore();
    }
    punkte(szeneIndex(t));
  }

  async function vorbereiten() {
    try {
      await document.fonts.ready;
      await Promise.all([
        document.fonts.load("700 72px Syne"),
        document.fonts.load("700 32px 'DM Sans'"),
        document.fonts.load("600 32px 'DM Sans'"),
        document.fonts.load("400 32px Inter"),
      ]);
      if (!logo.complete) {
        await new Promise((resolve) => {
          logo.onload = resolve;
          logo.onerror = resolve;
        });
      }
      const syne = document.fonts.check("700 72px Syne");
      const dm = document.fonts.check("600 32px 'DM Sans'");
      if (!syne || !dm || !logo.naturalWidth) {
        window.FILM_GRUND = `syne=${syne} dm=${dm} logo=${logo.naturalWidth}`;
        return;
      }
      window.FILM_BEREIT = true;
    } catch (fehler) {
      window.FILM_GRUND = String(fehler);
    }
  }

  window.zeichne = zeichne;
  window.FILM_FRAMES = FRAMES;
  window.FILM_FPS = FPS;
  window.FILM_W = W;
  window.FILM_H = H;
  window.FILM_BEREIT = false;
  window.FILM_GRUND = "";
  vorbereiten();
})();
