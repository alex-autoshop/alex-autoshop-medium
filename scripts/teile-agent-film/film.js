(function () {
  const FPS = 24;
  const DAUER = 47.856;
  const FRAMES = Math.round(DAUER * FPS);
  const bild = (name) => `file:///workspace/public/media/${name}`;
  const haken = `<svg viewBox="0 0 16 11" width="16" height="11" style="margin-left:4px;vertical-align:-1px"><path d="M11.1.3 4.7 6.7 2.4 4.4 1 5.8l3.7 3.7L12.5 1.7z" fill="#53bdeb"/><path d="M14.2.3 7.8 6.7l-.7-.7-1.3 1.4 2 2L15.6 1.7z" fill="#53bdeb"/></svg>`;

  const angebot = (ab, zeit, stufe, marke, nummer, preis, extra, datei) => ({
    ab, von: "agent", art: "angebot", zeit,
    html: `<img class="produkt" src="${bild(datei)}" alt=""><div class="text" style="padding-top:6px">${stufe}<br>${marke}${nummer ? " " + nummer : ""}<br>${preis} inkl. MwSt${extra ? " · " + extra : ""}<span class="meta">${zeit}</span></div>`,
  });

  const chats = [
    {
      ab: 8.0, bis: 13.9, titel: "Nur der Schein",
      zeilen: [
        { ab: 8.05, von: "kunde", art: "bild", zeit: "18:41", html: `<img class="foto" src="${bild("fahrzeugschein-beispiel.jpg")}" alt=""><span class="meta auf">18:41 ${haken}</span>` },
        { ab: 8.8, von: "agent", art: "text", zeit: "18:41", text: "schein ist da. welches teil?" },
        { ab: 9.6, von: "kunde", art: "text", zeit: "18:42", text: "anlasser" },
        { ab: 10.3, von: "agent", art: "text", zeit: "18:42", text: "bmw x3 e83, passt. drei preise, sind beispiele" },
        angebot(11.0, "18:43", "Budget", "AS-PL", "S0291", "104,90 €", "bis 18.11.", "anlasser-aspl.jpg"),
        angebot(11.8, "18:43", "OE-Qualität", "SEG Automotive", "0001148033", "176,90 €", "", "anlasser-seg.jpg"),
        angebot(12.6, "18:43", "Premium", "Bosch", "0 986 022 020", "179,90 €", "", "anlasser-bosch.jpg"),
      ],
    },
    {
      ab: 13.9, bis: 21.5, titel: "Nur eine Nachricht",
      zeilen: [
        { ab: 14.0, von: "kunde", art: "text", zeit: "11:07", text: "hi brauche bremsscheiben vorne für meinen golf 7 1.6 tdi was kostet das" },
        { ab: 15.4, von: "agent", art: "text", zeit: "11:08", text: "golf 7, vorne. drei stückpreise, beispiel" },
        angebot(16.4, "11:09", "Budget", "NK", "", "46,90 €", "pro Stück", "scheibe-budget.jpg"),
        angebot(17.6, "11:09", "OE-Qualität", "ATE", "", "74,90 €", "pro Stück", "scheibe-oe.jpg"),
        angebot(18.8, "11:09", "Premium", "Zimmermann", "", "96,90 €", "pro Stück", "scheibe-premium.jpg"),
      ],
    },
    {
      ab: 21.5, bis: 42.2, titel: "Foto vom Teil",
      zeilen: [
        { ab: 21.55, von: "kunde", art: "bild", zeit: "16:22", html: `<img class="foto" src="${bild("teilefoto-drosselklappe.jpg")}" alt=""><span class="meta auf">16:22 ${haken}</span>` },
        { ab: 22.5, von: "kunde", art: "text", zeit: "16:22", text: "die hier, bmw x3" },
        { ab: 23.3, von: "agent", art: "text", zeit: "16:23", text: "drosselklappe. drei preise, beispiel" },
        angebot(24.2, "16:24", "Budget", "ESEN", "", "114,90 €", "", "drossel-esen.jpg"),
        angebot(25.6, "16:24", "OE-Qualität", "Meat & Doria", "", "124,90 €", "", "drossel-meat.jpg"),
        angebot(27.0, "16:24", "Premium", "Trucktec", "", "152,90 €", "", "drossel-trucktec.jpg"),
      ],
    },
  ];

  const untertitel = [
    [0.1, 1.08, "Hey."],
    [1.08, 4.8, "Teile einfach per WhatsApp anfragen."],
    [4.8, 8.0, "Drei Wege, so wie die Leute das machen."],
    [8.0, 11.1, "Nur ein Foto vom Fahrzeugschein."],
    [11.1, 13.9, "Wir lesen die Nummer und suchen das Teil."],
    [13.9, 16.8, "Oder kurz schreiben, was du brauchst."],
    [16.8, 21.5, "Bremsscheiben vorne, Golf 7, 1.6 TDI."],
    [21.5, 26.0, "Oder das alte Teil fotografieren."],
    [26.0, 31.0, "Drei Angebote: günstig, OE-Qualität, Premium."],
    [31.0, 34.5, "Mit Preis und Bild."],
    [34.5, 40.4, "Abholen in Wuppertal, Handelstraße 64."],
    [40.4, 43.6, "Oder wir liefern."],
    [43.6, 47.8, "+49 202 82690"],
  ];

  function blase(zeile) {
    const aus = zeile.von === "kunde";
    const div = document.createElement("div");
    div.className = `${aus ? "aus" : "ein"} ${zeile.art === "text" ? "text" : zeile.art}`;
    if (zeile.art === "text") {
      div.innerHTML = `${zeile.text}<span class="meta">${zeile.zeit}${aus ? haken : ""}</span>`;
    } else {
      div.innerHTML = zeile.html;
    }
    return div;
  }

  function zeichne(frame) {
    const t = frame / FPS;
    const ende = t >= 42.2;
    document.getElementById("ende").style.display = ende ? "flex" : "none";
    document.getElementById("telefon").style.visibility = ende ? "hidden" : "visible";
    document.getElementById("titel").style.visibility = ende ? "hidden" : "visible";
    document.getElementById("kicker").style.visibility = ende ? "hidden" : "visible";
    const chat = [...chats].reverse().find((eintrag) => t >= eintrag.ab) || chats[0];
    document.getElementById("titel").textContent = t < 8 ? "Teile anfragen" : chat.titel;
    const verlauf = document.getElementById("verlauf");
    verlauf.replaceChildren();
    if (!ende && t >= 8) {
      for (const zeile of chat.zeilen) {
        if (t >= zeile.ab) verlauf.append(blase(zeile));
      }
    }
    const zeile = untertitel.find((eintrag) => t >= eintrag[0] && t < eintrag[1]);
    document.getElementById("unter").textContent = zeile ? zeile[2] : "";
  }

  window.zeichne = zeichne;
  window.FILM_FRAMES = FRAMES;
  window.FILM_FPS = FPS;
  window.FILM_BEREIT = false;
  window.FILM_GRUND = "";
  const bilder = [...document.images];
  Promise.all(bilder.map((img) => img.complete ? Promise.resolve() : new Promise((ok) => { img.onload = ok; img.onerror = ok; })))
    .then(() => {
      const fehlt = bilder.filter((img) => !img.naturalWidth).map((img) => img.src);
      if (fehlt.length) window.FILM_GRUND = fehlt.join(" ");
      else window.FILM_BEREIT = true;
    });
})();
