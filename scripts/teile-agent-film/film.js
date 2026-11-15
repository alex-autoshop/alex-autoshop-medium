/**
 * Stummer Erklärfilm, 1080×1440, 24 Bilder/s, 38 Sekunden.
 * WhatsApp-Chat zum Anlasser eines BMW X3: ein Teil, drei Angebote.
 * Preise aus einem Test-Chat, als Beispiel gekennzeichnet.
 * Der Fahrzeugschein ist stilisiert und enthält keine echten Daten.
 */
(function () {
  const W = 1080;
  const H = 1440;
  const FPS = 24;
  const DAUER = 38;
  const FRAMES = FPS * DAUER;
  const GOLD = "#f1eb5b";
  const CREME = "#EDE9E3";
  const NACHT = "#0D0D0D";
  const LEISE = "rgba(237,233,227,0.74)";
  const GRUEN = "#075E54";
  const BLASE = "#DCF8C6";
  const CHAT = "#ECE5DD";

  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  const logo = document.getElementById("logo");
  const bilder = {
    aspl: document.getElementById("bild-aspl"),
    seg: document.getElementById("bild-seg"),
    bosch: document.getElementById("bild-bosch"),
  };

  const ANGEBOTE = [
    { stufe: "Budget", marke: "AS-PL", nummer: "S0291", preis: "104,90 €", zeit: "Lieferung bis 18.11.", bild: "aspl", ab: 16.2 },
    { stufe: "OE-Qualität", marke: "SEG Automotive", nummer: "0001148033", preis: "176,90 €", zeit: "", bild: "seg", ab: 21.2 },
    { stufe: "Premium", marke: "Bosch", nummer: "0 986 022 020", preis: "179,90 €", zeit: "", bild: "bosch", ab: 26.2 },
  ];

  const FADE = 0.35;
  const SZENEN = [
    { ein: 0.08, aus: 33.15, malen: szeneChat },
    { ein: 32.8, aus: 37.85, malen: szeneAbschluss },
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
    const worte = String(text).split(" ");
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

  function hintergrund(t) {
    ctx.fillStyle = NACHT;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.5, 260, 20, W * 0.5, 420, 780);
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

  function fuss(text) {
    schrift(30, 600, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = LEISE;
    ctx.textAlign = "center";
    const zeilen = umbrechen(text, 900);
    let y = zeilen.length > 1 ? 1288 : 1310;
    for (const zeile of zeilen) {
      ctx.fillText(zeile, W / 2, y);
      y += 40;
    }
    ctx.textAlign = "left";
  }

  function punkte(index) {
    const aktiv = 36;
    const ruhend = 10;
    const luecke = 12;
    const anzahl = 4;
    const breite = aktiv + (anzahl - 1) * (ruhend + luecke);
    let x = (W - breite) / 2;
    for (let i = 0; i < anzahl; i++) {
      const w = i === index ? aktiv : ruhend;
      ctx.fillStyle = i === index ? GOLD : "rgba(237,233,227,0.28)";
      rrect(x, 1362, w, 10, 5);
      ctx.fill();
      x += w + luecke;
    }
  }

  function kopf(kicker, titel) {
    schrift(26, 700, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = GOLD;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    let cursor = 72;
    for (const zeichen of kicker) {
      ctx.fillText(zeichen, cursor, 108);
      cursor += ctx.measureText(zeichen).width + 2.4;
    }
    ctx.fillRect(72, 128, 72, 4);
    schrift(64, 700, "Syne, Inter, sans-serif");
    ctx.fillStyle = CREME;
    ctx.fillText(titel, 72, 204);
  }

  function foto(bild, x, y, w, h) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x, y, w, h);
    if (!bild || !bild.naturalWidth) return;
    const mass = Math.min(w / bild.naturalWidth, h / bild.naturalHeight);
    const dw = bild.naturalWidth * mass;
    const dh = bild.naturalHeight * mass;
    ctx.drawImage(bild, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function schein(x, y, w, h) {
    ctx.save();
    rrect(x, y, w, h, 16);
    ctx.clip();
    ctx.fillStyle = "#F6F1E6";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = NACHT;
    ctx.fillRect(x, y, w, 36);
    schrift(16, 700, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = GOLD;
    ctx.textAlign = "left";
    ctx.fillText("BEISPIEL", x + 16, y + 24);
    schrift(26, 700, "Syne, Inter, sans-serif");
    ctx.fillStyle = "#1A1A1A";
    ctx.fillText("Fahrzeugschein", x + 16, y + 72);
    schrift(18, 600, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = "#6B675E";
    ctx.fillText("keine echten Daten", x + 16, y + 100);
    const felder = [["HSN", "••••"], ["TSN", "•••"], ["FIN", "•••••••••"]];
    felder.forEach((feld, i) => {
      const fy = y + 140 + i * 32;
      schrift(16, 700, "'DM Sans', Inter, sans-serif");
      ctx.fillStyle = "#8A8478";
      ctx.fillText(feld[0], x + 16, fy);
      ctx.fillStyle = "#1A1A1A";
      ctx.fillText(feld[1], x + 90, fy);
    });
    ctx.restore();
  }

  function handy(inhalt) {
    const x = 130;
    const y = 236;
    const w = 820;
    const h = 980;
    ctx.fillStyle = "#111B21";
    rrect(x, y, w, h, 42);
    ctx.fill();
    ctx.save();
    rrect(x, y, w, h, 42);
    ctx.clip();
    ctx.fillStyle = GRUEN;
    ctx.fillRect(x, y, w, 112);
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(x + 70, y + 56, 28, 0, Math.PI * 2);
    ctx.fill();
    schrift(20, 700, "Syne, Inter, sans-serif");
    ctx.fillStyle = NACHT;
    ctx.textAlign = "center";
    ctx.fillText("AA", x + 70, y + 63);
    ctx.textAlign = "left";
    schrift(28, 700, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("Alex Autoshop", x + 114, y + 50);
    schrift(20, 600, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText("Teile-Agent", x + 114, y + 80);
    schrift(16, 700, "'DM Sans', Inter, sans-serif");
    const pill = "BEISPIEL";
    const pillW = ctx.measureText(pill).width + 22;
    ctx.fillStyle = GOLD;
    rrect(x + w - pillW - 28, y + 38, pillW, 32, 16);
    ctx.fill();
    ctx.fillStyle = NACHT;
    ctx.textBaseline = "middle";
    ctx.fillText(pill, x + w - pillW - 17, y + 55);
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = CHAT;
    ctx.fillRect(x, y + 112, w, h - 112);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y + 112, w, h - 112);
    ctx.clip();
    inhalt(x, y + 112, w, h - 128);
    ctx.restore();
    ctx.restore();
  }

  function zeilenHoehe(text, max, px) {
    schrift(px, 600, "'DM Sans', Inter, sans-serif");
    return umbrechen(text, max).length * (px + 10) + 28;
  }

  function textBlase(x, y, w, text, rechts) {
    schrift(26, 600, "'DM Sans', Inter, sans-serif");
    const zeilen = umbrechen(text, w - 36);
    const h = zeilen.length * 36 + 28;
    ctx.fillStyle = rechts ? BLASE : "#FFFFFF";
    rrect(x, y, w, h, 18);
    ctx.fill();
    ctx.fillStyle = "#1A1A1A";
    zeilen.forEach((zeile, i) => ctx.fillText(zeile, x + 18, y + 36 + i * 36));
    return h;
  }

  function angebotBlase(x, y, w, daten, p) {
    const h = 176;
    ctx.save();
    ctx.globalAlpha *= p;
    ctx.fillStyle = "#FFFFFF";
    rrect(x, y, w, h, 18);
    ctx.fill();
    foto(bilder[daten.bild], x + 12, y + 12, 152, 152);
    schrift(16, 700, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = GRUEN;
    ctx.textAlign = "left";
    ctx.fillText(daten.stufe.toUpperCase(), x + 180, y + 36);
    schrift(28, 700, "Syne, Inter, sans-serif");
    ctx.fillStyle = "#1A1A1A";
    ctx.fillText(daten.marke, x + 180, y + 74);
    schrift(20, 600, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = "#5C6560";
    ctx.fillText(daten.nummer, x + 180, y + 104);
    schrift(30, 700, "Syne, Inter, sans-serif");
    ctx.fillStyle = "#128C7E";
    ctx.fillText(daten.preis, x + 180, y + 142);
    schrift(16, 600, "'DM Sans', Inter, sans-serif");
    ctx.fillStyle = "#5C6560";
    ctx.fillText(daten.zeit ? `${daten.zeit} · inkl. MwSt` : "inkl. MwSt · Beispiel", x + 180, y + 166);
    ctx.restore();
    return h;
  }

  function szeneChat(t) {
    const titel = t < 8 ? "Anfrage im Chat" : t < 15.6 ? "Passform geprüft" : "Drei Angebote";
    const kicker = t < 8 ? "01   ·   WHATSAPP" : t < 15.6 ? "02   ·   PASSFORM" : "03   ·   BEISPIEL";
    kopf(kicker, titel);
    handy((x, y, w) => {
      const innen = 28;
      const breit = w - innen * 2;
      const bloecke = [];
      const kundeP = strecke(t, 0.45, 2.6);
      if (kundeP > 0) {
        const voll = "Anlasser für BMW X3 (E83)";
        const sichtbar = voll.slice(0, Math.max(1, Math.floor(kundeP * voll.length)));
        bloecke.push({ art: "kunde", text: sichtbar, p: 1 });
      }
      const scheinP = strecke(t, 3.3, 4.2);
      if (scheinP > 0) bloecke.push({ art: "schein", p: scheinP });
      const agentP = strecke(t, 8.5, 9.3);
      if (agentP > 0) {
        bloecke.push({
          art: "agent",
          text: "Passform geprüft über HSN, TSN und FIN. Ich suche 3 Optionen.",
          p: agentP,
        });
      }
      for (const angebot of ANGEBOTE) {
        const p = strecke(t, angebot.ab, angebot.ab + 0.7);
        if (p > 0) bloecke.push({ art: "teil", daten: angebot, p });
      }
      const hoehen = bloecke.map((block) => {
        if (block.art === "kunde" || block.art === "agent") return zeilenHoehe(block.text, breit * 0.78, 26);
        if (block.art === "schein") return 210;
        return 176;
      });
      const gesamt = hoehen.reduce((summe, wert) => summe + wert + 14, 8);
      const sicht = 980 - 128;
      let agentStart = null;
      let lauf = 8;
      bloecke.forEach((block, i) => {
        if (block.art === "agent" && agentStart === null) agentStart = lauf;
        lauf += hoehen[i] + 14;
      });
      const unten = Math.max(0, gesamt - sicht + 28);
      const anAgent = agentStart === null ? unten : Math.max(0, agentStart + 8);
      const versatz = t >= 18 ? anAgent : unten;
      let cursor = y + 16 - versatz;
      bloecke.forEach((block, i) => {
        const h = hoehen[i];
        ctx.save();
        ctx.globalAlpha *= block.p;
        if (block.art === "kunde") textBlase(x + w - innen - breit * 0.82, cursor, breit * 0.82, block.text, true);
        else if (block.art === "agent") textBlase(x + innen, cursor, breit * 0.9, block.text, false);
        else if (block.art === "schein") schein(x + w - innen - breit * 0.78, cursor, breit * 0.78, h);
        else angebotBlase(x + innen, cursor, breit - 8, block.daten, 1);
        ctx.restore();
        cursor += h + 14;
      });
    });
    const untertitel = t < 8
      ? "Teil und Fahrzeug, plus ein Beispiel-Foto vom Schein."
      : t < 15.6
        ? "Der Agent prüft die Passform und sucht drei Optionen."
        : "Ein Teil, drei Marken, drei Preise. Lieferzeit nur, wo sie im Chat stand.";
    fuss(untertitel);
  }

  function szeneAbschluss(t) {
    const u = t - 32.8;
    kopf("04   ·   WHATSAPP", "Jetzt anfragen");
    const logoP = strecke(u, 0.15, 0.6);
    if (logo.complete && logo.naturalWidth && logoP > 0) {
      const lw = 760;
      const lh = lw * (logo.naturalHeight / logo.naturalWidth);
      ctx.save();
      ctx.globalAlpha *= logoP;
      ctx.drawImage(logo, (W - lw) / 2, 250, lw, lh);
      ctx.restore();
    }
    const knopf = strecke(u, 0.4, 0.85);
    if (knopf > 0) {
      const text = "Jetzt per WhatsApp anfragen";
      schrift(34, 700, "'DM Sans', Inter, sans-serif");
      const bw = ctx.measureText(text).width + 72;
      const bx = (W - bw) / 2;
      const by = 760;
      ctx.save();
      ctx.globalAlpha *= knopf;
      ctx.fillStyle = "#25D366";
      rrect(bx, by, bw, 92, 18);
      ctx.fill();
      ctx.fillStyle = "#073B28";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, W / 2, by + 48);
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.restore();
    }
    const nummer = strecke(u, 0.7, 1.1);
    if (nummer > 0) {
      ctx.save();
      ctx.globalAlpha *= nummer;
      schrift(48, 700, "Syne, Inter, sans-serif");
      ctx.fillStyle = CREME;
      ctx.textAlign = "center";
      ctx.fillText("+49 202 82690", W / 2, 940);
      schrift(28, 600, "'DM Sans', Inter, sans-serif");
      ctx.fillStyle = LEISE;
      ctx.fillText("Alex Autoshop · Handelstraße 64 · Wuppertal", W / 2, 996);
      ctx.textAlign = "left";
      ctx.restore();
    }
    fuss("Anfragen bei Alex Autoshop, direkt im Chat.");
  }

  function zeichne(frame) {
    const t = frame / FPS;
    hintergrund(t);
    const index = t < 8 ? 0 : t < 15.6 ? 1 : t < 32.8 ? 2 : 3;
    for (const szene of SZENEN) {
      if (t < szene.ein || t > szene.aus) continue;
      const ein = t < szene.ein + FADE ? (t - szene.ein) / FADE : 1;
      const aus = t > szene.aus - FADE ? (szene.aus - t) / FADE : 1;
      ctx.save();
      ctx.globalAlpha = ease(Math.min(ein, aus));
      szene.malen(t);
      ctx.restore();
    }
    punkte(index);
  }

  async function vorbereiten() {
    try {
      await document.fonts.ready;
      await Promise.all([
        document.fonts.load("700 64px Syne"),
        document.fonts.load("700 28px 'DM Sans'"),
        document.fonts.load("600 26px 'DM Sans'"),
      ]);
      const wartende = [logo, bilder.aspl, bilder.seg, bilder.bosch].filter((bild) => bild && !bild.complete);
      await Promise.all(wartende.map((bild) => new Promise((resolve) => {
        bild.onload = resolve;
        bild.onerror = resolve;
      })));
      const ok = document.fonts.check("700 64px Syne")
        && logo.naturalWidth
        && bilder.aspl.naturalWidth
        && bilder.seg.naturalWidth
        && bilder.bosch.naturalWidth;
      if (!ok) {
        window.FILM_GRUND = `logo=${logo.naturalWidth} aspl=${bilder.aspl.naturalWidth} seg=${bilder.seg.naturalWidth} bosch=${bilder.bosch.naturalWidth}`;
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
