(function () {
  const FPS = 24;
  const DAUER = 59.568;
  const FRAMES = Math.round(DAUER * FPS);
  const bild = (name) => `file:///workspace/public/media/${name}`;
  const haken = `<svg viewBox="0 0 16 11" width="16" height="11" style="margin-left:4px;vertical-align:-1px"><path d="M11.1.3 4.7 6.7 2.4 4.4 1 5.8l3.7 3.7L12.5 1.7z" fill="#53bdeb"/><path d="M14.2.3 7.8 6.7l-.7-.7-1.3 1.4 2 2L15.6 1.7z" fill="#53bdeb"/></svg>`;

  const angebot = (ab, zeit, stufe, marke, nummer, preis, datei) => ({
    ab, von: "agent", art: "angebot",
    html: `<img class="produkt" src="${bild(datei)}" alt=""><div class="text" style="padding-top:6px">${stufe}<br>${marke}${nummer ? " " + nummer : ""}<br>${preis} inkl. MwSt<span class="meta">${zeit}</span></div>`,
  });

  const chats = [
    {
      ab: 6.48, bis: 12.8, titel: "Fahrzeugschein",
      zeilen: [
        { ab: 6.5, von: "kunde", art: "bild", html: `<img class="foto" src="${bild("fahrzeugschein-beispiel.jpg")}" alt=""><span class="meta auf">18:41 ${haken}</span>` },
        { ab: 9.6, von: "agent", art: "text", zeit: "18:41", text: "schein ist da. golf 7, 1.6 tdi, hsn 0603." },
      ],
    },
    {
      ab: 12.8, bis: 19.98, titel: "Nachricht",
      zeilen: [
        { ab: 12.85, von: "kunde", art: "text", zeit: "11:07", text: "hi brauche bremsscheiben vorne für meinen golf 7 1.6 tdi was kostet das" },
        { ab: 15.7, von: "agent", art: "text", zeit: "11:08", text: "golf 7, vorne, 1.6 tdi. ich schau." },
      ],
    },
    {
      ab: 19.98, bis: 31.83, titel: "Teilefoto",
      zeilen: [
        { ab: 20.0, von: "kunde", art: "bild", html: `<img class="foto" src="${bild("teilefoto-drosselklappe.jpg")}" alt=""><span class="meta auf">16:22 ${haken}</span>` },
        { ab: 22.2, von: "kunde", art: "text", zeit: "16:22", text: "die hier, bmw x3" },
        { ab: 24.4, von: "agent", art: "text", zeit: "16:23", text: "über 20 lieferanten gleichzeitig. dein bestpreis, deutschlandweit." },
      ],
    },
    {
      ab: 31.83, bis: 53.64, titel: "Drei Angebote",
      zeilen: [
        angebot(31.85, "16:24", "Günstig", "AS-PL", "S0291", "104,90 €", "anlasser-aspl.jpg"),
        angebot(34.7, "16:24", "OE-Qualität", "SEG Automotive", "0001148033", "176,90 €", "anlasser-seg.jpg"),
        angebot(36.9, "16:24", "Premium", "Bosch", "0 986 022 020", "179,90 €", "anlasser-bosch.jpg"),
        { ab: 39.42, von: "agent", art: "text", zeit: "16:25", text: "code BESTERMANN15<br>15% auf die erste teilebestellung<br>gilt für den ganzen warenkorb" },
        { ab: 43.37, von: "agent", art: "text", zeit: "16:25", text: "anlasser as-pl<br><s>104,90 €</s>  89,17 €<br>bremsscheibe ate<br><s>74,90 €</s>  63,67 €" },
        { ab: 47.38, von: "agent", art: "text", zeit: "16:26", text: "übersicht<br>anlasser as-pl  89,17 €<br>bremsscheibe ate  63,67 €<br>summe  152,84 €<br>bestelllink<br>www.alex-autoshop.de" },
      ],
    },
  ];

  const untertitel = [
    [0.1, 1.11, "Hey."],
    [1.06, 4.72, "Teile einfach per WhatsApp anfragen."],
    [4.72, 6.48, "Es gibt drei Wege."],
    [6.48, 9.53, "Foto vom Fahrzeugschein."],
    [9.53, 12.8, "Kennzeichen, Schlüsselnummer und FIN."],
    [12.8, 15.63, "Oder kurz schreiben, was du brauchst."],
    [15.63, 19.98, "Bremsscheiben vorne, Golf 7, 1.6 TDI."],
    [19.98, 24.35, "Oder das alte Teil fotografieren."],
    [24.35, 27.67, "Über 20 Lieferanten gleichzeitig."],
    [27.67, 31.83, "Dein Bestpreis in Minuten, deutschlandweit."],
    [31.83, 34.69, "Drei Angebote zu jedem Teil."],
    [34.69, 39.42, "Günstig, OE-Qualität, Premium. Mit Bild."],
    [39.42, 43.37, "Code BESTERMANN15, erste Teilebestellung."],
    [43.37, 47.38, "15 Prozent auf den ganzen Warenkorb."],
    [47.38, 50.04, "Den Warenkorb bauen wir im Chat."],
    [50.04, 53.64, "Übersicht und Link zur Bestellung."],
    [53.64, 57.48, "Abholen: Handelstraße 64, Wuppertal."],
    [57.48, 59.6, "Oder wir liefern zu dir."],
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
    const ende = t >= 53.64;
    document.getElementById("ende").style.display = ende ? "flex" : "none";
    document.getElementById("telefon").style.visibility = ende ? "hidden" : "visible";
    document.getElementById("titel").style.visibility = ende ? "hidden" : "visible";
    document.getElementById("kicker").style.visibility = ende ? "hidden" : "visible";
    const chat = [...chats].reverse().find((eintrag) => t >= eintrag.ab) || null;
    document.getElementById("titel").textContent = chat ? chat.titel : "Teile anfragen";
    const verlauf = document.getElementById("verlauf");
    verlauf.replaceChildren();
    if (!ende && chat) {
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
