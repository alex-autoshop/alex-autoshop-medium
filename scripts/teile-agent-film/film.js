(function () {
  const FPS = 24;
  const DAUER = 57.936;
  const FRAMES = Math.round(DAUER * FPS);
  const bild = (name) => `file:///workspace/public/media/${name}`;
  const haken = `<svg viewBox="0 0 16 11" width="16" height="11" style="margin-left:4px;vertical-align:-1px"><path d="M11.1.3 4.7 6.7 2.4 4.4 1 5.8l3.7 3.7L12.5 1.7z" fill="#53bdeb"/><path d="M14.2.3 7.8 6.7l-.7-.7-1.3 1.4 2 2L15.6 1.7z" fill="#53bdeb"/></svg>`;
  const scheibe = bild("scheibe-aftermarket.jpg");

  const angebot = (ab, zeit, stufe, marke, preis, datei) => ({
    ab, von: "agent", art: "angebot",
    html: `${datei ? `<img class="produkt" src="${datei}" alt="">` : ""}<div class="text" style="padding-top:6px">${stufe}<br>${marke}<br>${preis} inkl. MwSt<span class="meta">${zeit}</span></div>`,
  });

  const liste = [
    "1 ABE 33,92 €",
    "2 NK 35,70 €",
    "3 Mapco 38,17 €",
    "4 Triscan 39,87 €",
    "5 Japanparts 41,23 €",
    "6 Optimal 42,42 €",
    "7 Vaico 44,12 €",
    "8 Febi Bilstein 46,67 €",
    "9 Meyle 49,22 €",
    "10 Blue Print 52,62 €",
  ].join("<br>");

  const chats = [
    {
      ab: 6.6, bis: 13.03, titel: "Fahrzeugschein",
      zeilen: [
        { ab: 6.65, von: "kunde", art: "bild", html: `<img class="foto" src="${bild("fahrzeugschein-beispiel.jpg")}" alt=""><span class="meta auf">18:41 ${haken}</span>` },
        { ab: 9.8, von: "agent", art: "text", zeit: "18:41", text: "schein ist da. golf 7, hsn 0603." },
      ],
    },
    {
      ab: 13.03, bis: 18.91, titel: "Nachricht",
      zeilen: [
        { ab: 13.05, von: "kunde", art: "text", zeit: "11:07", text: "hi brauche bremsscheiben vorne für meinen golf 7 1.6 tdi was kostet das" },
      ],
    },
    {
      ab: 18.91, bis: 21.75, titel: "Teilefoto",
      zeilen: [
        { ab: 18.95, von: "kunde", art: "bild", html: `<img class="foto" src="${bild("teilefoto-drosselklappe.jpg")}" alt=""><span class="meta auf">16:22 ${haken}</span>` },
        { ab: 20.4, von: "kunde", art: "text", zeit: "16:22", text: "die hier" },
      ],
    },
    {
      ab: 21.75, bis: 52.27, titel: "Angebote",
      zeilen: [
        { ab: 21.8, von: "agent", art: "text", zeit: "11:08", text: "über 20 lieferanten gleichzeitig. dein bestpreis, deutschlandweit." },
        angebot(29.4, "11:09", "Angebot 1", "ABE", "33,92 €", scheibe),
        angebot(30.6, "11:09", "Angebot 2", "NK", "35,70 €", scheibe),
        angebot(31.8, "11:09", "Angebot 3", "Mapco", "38,17 €", scheibe),
        { ab: 34.1, von: "kunde", art: "text", zeit: "11:10", text: "zeig mir 10" },
        { ab: 35.2, von: "agent", art: "text", zeit: "11:10", text: `10 angebote, stück, beispiel<br>${liste}` },
        { ab: 38.05, von: "agent", art: "text", zeit: "11:11", text: "oe und premium nur auf anfrage." },
        { ab: 41.2, von: "agent", art: "text", zeit: "11:11", text: "code BESTERMANN15<br>15% auf die erste teilebestellung<br>ganzer warenkorb" },
        { ab: 45.2, von: "agent", art: "text", zeit: "11:12", text: "2× bremsscheibe nk, vorne<br><s>84,00 €</s>  71,40 €" },
        { ab: 48.4, von: "agent", art: "text", zeit: "11:12", text: "übersicht<br>2× nk vorne  71,40 €<br>rabatt −15 %<br>summe 71,40 € inkl. mwst<br>bestelllink<br>www.alex-autoshop.de" },
      ],
    },
  ];

  const untertitel = [
    [0.1, 1.13, "Hey."],
    [1.08, 4.81, "Teile einfach per WhatsApp anfragen."],
    [4.81, 6.6, "Es gibt drei Wege."],
    [6.6, 9.7, "Foto vom Fahrzeugschein."],
    [9.7, 13.03, "Kennzeichen, Schlüsselnummer und FIN."],
    [13.03, 15.91, "Oder kurz schreiben, was du brauchst."],
    [15.91, 18.91, "Bremsscheiben vorne für den Golf."],
    [18.91, 21.75, "Oder das alte Teil fotografieren."],
    [21.75, 25.12, "Über 20 Lieferanten gleichzeitig."],
    [25.12, 29.36, "Dein Bestpreis in Minuten, deutschlandweit."],
    [29.36, 34.07, "Standard: 3 Aftermarket-Angebote, mit Bild."],
    [34.07, 38.02, "Auf Wunsch bis zu 10 Angebote pro Teil."],
    [38.02, 41.18, "OE-Qualität und Premium nur auf Anfrage."],
    [41.18, 45.2, "Code BESTERMANN15, erste Teilebestellung."],
    [45.2, 48.36, "15 Prozent auf den ganzen Warenkorb."],
    [48.36, 52.27, "Warenkorb im Chat, mit Übersicht und Link."],
    [52.27, 56.18, "Abholen: Handelstraße 64, Wuppertal."],
    [56.18, 58.0, "Oder wir liefern."],
  ];

  function blase(zeile) {
    const aus = zeile.von === "kunde";
    const div = document.createElement("div");
    div.className = `${aus ? "aus" : "ein"} ${zeile.art === "text" ? "text" : zeile.art}`;
    if (zeile.art === "text") div.innerHTML = `${zeile.text}<span class="meta">${zeile.zeit}${aus ? haken : ""}</span>`;
    else div.innerHTML = zeile.html;
    return div;
  }

  function zeichne(frame) {
    const t = frame / FPS;
    const ende = t >= 52.27;
    document.getElementById("ende").style.display = ende ? "flex" : "none";
    document.getElementById("telefon").style.visibility = ende ? "hidden" : "visible";
    document.getElementById("titel").style.visibility = ende ? "hidden" : "visible";
    document.getElementById("kicker").style.visibility = ende ? "hidden" : "visible";
    const chat = [...chats].reverse().find((eintrag) => t >= eintrag.ab) || null;
    document.getElementById("titel").textContent = chat ? chat.titel : "Teile anfragen";
    const verlauf = document.getElementById("verlauf");
    verlauf.replaceChildren();
    if (!ende && chat) {
      for (const zeile of chat.zeilen) if (t >= zeile.ab) verlauf.append(blase(zeile));
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
