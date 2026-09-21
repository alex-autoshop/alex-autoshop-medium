import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Eye, EyeOff, KeyRound, Loader2, Printer, QrCode, Store, Calculator, Check, X,
  TriangleAlert, ChevronDown, Copy,
} from "lucide-react";
import { MEMBER_LEVELS, eur, memberPrice, type MemberLevelId } from "@/components/TeileportalPricing";
import { adminPinLesen, adminPinSetzen, adminKopf, adminFehlerAus, type EkPreis, type AdminFehler } from "@/lib/adminZugang";
import { marge, vkFuerMarge, grundpreis, prozentText, zahlAusText, netto, brutto, rund2 } from "@/lib/marge";
import { SHOP_INFO } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

/**
 * LADENVERKAUF — Alex bestellt im Laden für den Kunden, der vor ihm steht.
 *
 * Nur im Admin-Konto sichtbar, und auch das ist nur Bequemlichkeit: was
 * wirklich zählt (Einkaufspreis, Preisstufe des Kunden an der Kasse), prüft
 * der Server mit Admin-Sitzung + PIN (api/_admin.js).
 *
 * Der Kunde steht AM Bildschirm. Deshalb ist die Marge standardmäßig
 * verborgen und wird nur auf Klick eingeblendet — und sie steht nie auf dem
 * Abholschein.
 */

export const STUFEN: { id: MemberLevelId; kurz: string; pct: number }[] = [
  { id: "none", kurz: "Einzelhandel", pct: 0 },
  ...MEMBER_LEVELS.map((l) => ({ id: l.id as MemberLevelId, kurz: `L${l.id.slice(1)} −${l.pct} %`, pct: l.pct })),
];

export const preisBeiStufe = (listenpreis: number, level: MemberLevelId) => {
  const l = MEMBER_LEVELS.find((x) => x.id === level);
  return l ? memberPrice(listenpreis, l.pct) : listenpreis;
};

const THEKE_KEY = "tp:theke";
export function thekeGemerkt(): boolean {
  try { return localStorage.getItem(THEKE_KEY) === "1"; } catch { return false; }
}
export function thekeMerken(an: boolean) {
  try { if (an) localStorage.setItem(THEKE_KEY, "1"); else localStorage.removeItem(THEKE_KEY); } catch { /* egal */ }
}

/* ───────────────────────── PIN ───────────────────────── */

function PinEingabe({ onGesetzt, hinweis }: { onGesetzt: () => void; hinweis?: string }) {
  const [pin, setPin] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (!pin.trim()) return; adminPinSetzen(pin.trim()); setPin(""); onGesetzt(); }}
      className="flex items-center gap-1.5"
    >
      <KeyRound className="w-3.5 h-3.5 text-primary shrink-0" />
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder={hinweis || "Admin-PIN"}
        aria-label="Admin-PIN"
        className="flex-1 min-w-0 rounded-lg border border-border bg-background px-2 py-1 text-xs"
      />
      <button type="submit" className="rounded-lg bg-primary text-primary-foreground px-2.5 py-1 text-xs font-semibold">OK</button>
    </form>
  );
}

/* ───────────────────────── Leiste oben im Warenkorb ───────────────────────── */

export function ThekenLeiste({
  level, onLevel, kunde, setKunde, kundenMail, setKundenMail, margeAn, setMargeAn, fehler, onPinNeu,
}: {
  level: MemberLevelId;
  onLevel: (l: MemberLevelId) => void;
  kunde: string;
  setKunde: (s: string) => void;
  kundenMail: string;
  setKundenMail: (s: string) => void;
  margeAn: boolean;
  setMargeAn: (b: boolean) => void;
  fehler: AdminFehler | null;
  onPinNeu: () => void;
}) {
  const pinFehlt = margeAn && (fehler?.art === "pin" || !adminPinLesen());
  return (
    <div className="rounded-xl border-2 p-3 space-y-2.5" style={{ borderColor: "#D4A017", backgroundColor: "#FFFBEB" }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-bold flex items-center gap-1.5 text-black">
          <Store className="w-3.5 h-3.5" /> Ladenverkauf
        </p>
        <button
          onClick={() => setMargeAn(!margeAn)}
          aria-pressed={margeAn}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold border transition-colors",
            margeAn ? "bg-black text-white border-black" : "bg-white text-black/70 border-black/15 hover:text-black",
          )}
        >
          {margeAn ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {margeAn ? "Marge verbergen" : "Marge zeigen"}
        </button>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-black/50 mb-1">Preis für den Kunden</p>
        <div role="radiogroup" aria-label="Preis für den Kunden" className="grid grid-cols-4 gap-1">
          {STUFEN.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={level === s.id}
              onClick={() => onLevel(s.id)}
              className={cn(
                "rounded-lg px-1 py-1.5 text-[11px] font-semibold leading-tight border transition-colors",
                level === s.id ? "bg-primary text-primary-foreground border-primary" : "bg-white text-black/70 border-black/10 hover:border-black/30",
              )}
            >
              {s.kurz}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <input value={kunde} onChange={(e) => setKunde(e.target.value)} placeholder="Kunde (optional)"
          aria-label="Name des Kunden" className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs text-black min-w-0" />
        <input value={kundenMail} onChange={(e) => setKundenMail(e.target.value)} placeholder="E-Mail für Beleg"
          type="email" aria-label="E-Mail des Kunden" className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs text-black min-w-0" />
      </div>

      {pinFehlt && <PinEingabe onGesetzt={onPinNeu} hinweis={fehler?.art === "pin" && fehler.text !== "Admin-PIN eingeben" ? fehler.text + " Nochmal:" : undefined} />}
      {margeAn && fehler && fehler.art !== "pin" && (
        <p className="text-[11px] text-red-700 flex items-start gap-1">
          <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-px" /> {fehler.text}
        </p>
      )}
      {margeAn && adminPinLesen() && (
        <button onClick={() => { adminPinSetzen(""); onPinNeu(); }} className="text-[10px] text-black/40 hover:text-black/70 underline">
          PIN auf diesem Gerät vergessen
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── Marge je Position ───────────────────────── */

export function MargenZeile({ ek, vkStueck, menge }: { ek?: EkPreis | null; vkStueck: number; menge: number }) {
  if (ek === undefined) {
    return <p className="text-[10.5px] text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> EK wird geholt …</p>;
  }
  if (!ek || !ek.gefunden || (!ek.ekBrutto && !ek.ohneEk)) {
    return <p className="text-[10.5px] text-muted-foreground mt-1">Kein EK von Inter Cars für dieses Teil.</p>;
  }
  if (ek.ohneEk) {
    return (
      <p className="text-[10.5px] text-amber-700 mt-1 leading-snug">
        Kein EK von Inter Cars — Preis ist UVP {eur(ek.listeBrutto)} × Aufschlag. Bitte prüfen.
      </p>
    );
  }
  const m = marge(vkStueck, ek.ekBrutto, ek.mwst);
  const schlecht = m.prozent < 10;
  return (
    <p className={cn("text-[10.5px] mt-1 tabular-nums leading-snug", schlecht ? "text-red-700" : "text-emerald-700")}>
      EK {eur(ek.ekBrutto)} · Rohertrag {eur(rund2(m.rohertrag * menge))} · {prozentText(m.prozent)}
    </p>
  );
}

/* ───────────────────────── Summe + alle Stufen ───────────────────────── */

export interface MargenPosition { listenpreis: number; menge: number; ek?: EkPreis | null }

export function MargenSumme({ positionen, level }: { positionen: MargenPosition[]; level: MemberLevelId }) {
  const mitEk = positionen.filter((p) => p.ek && p.ek.ekBrutto > 0);
  if (mitEk.length === 0) return null;
  const fehlt = positionen.length - mitEk.length;
  const zeile = (lv: MemberLevelId) => {
    const vk = mitEk.reduce((s, p) => s + preisBeiStufe(p.listenpreis, lv) * p.menge, 0);
    const ek = mitEk.reduce((s, p) => s + (p.ek as EkPreis).ekBrutto * p.menge, 0);
    return { vk: rund2(vk), ek: rund2(ek), ...marge(vk, ek) };
  };
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-2.5 text-[11.5px]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        Marge bei jeder Stufe{fehlt > 0 ? ` · ${fehlt} Pos. ohne EK nicht drin` : ""}
      </p>
      <table className="w-full tabular-nums">
        <thead>
          <tr className="text-[10px] text-muted-foreground">
            <th className="text-left font-medium pb-1">Stufe</th>
            <th className="text-right font-medium pb-1">Kunde zahlt</th>
            <th className="text-right font-medium pb-1">Rohertrag</th>
            <th className="text-right font-medium pb-1">Marge</th>
          </tr>
        </thead>
        <tbody>
          {STUFEN.map((s) => {
            const z = zeile(s.id);
            return (
              <tr key={s.id} className={cn(level === s.id && "font-bold text-primary")}>
                <td className="py-0.5">{s.id === "none" ? "Einzelhandel" : s.kurz.split(" ")[0]}</td>
                <td className="py-0.5 text-right">{eur(z.vk)}</td>
                <td className="py-0.5 text-right">{eur(z.rohertrag)}</td>
                <td className={cn("py-0.5 text-right", z.prozent < 10 && "text-red-700")}>{prozentText(z.prozent)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-1.5">
        EK gesamt {eur(zeile("none").ek)} · Rohertrag netto (ohne MwSt)
      </p>
    </div>
  );
}

/* ───────────────────────── Freier Margenrechner ───────────────────────── */

export function Margenrechner({ vorschlagEk, aufschlag = 2 }: { vorschlagEk?: number; aufschlag?: number }) {
  const [offen, setOffen] = useState(false);
  const [ekText, setEkText] = useState("");
  const [ekIstNetto, setEkIstNetto] = useState(false);
  const [vkText, setVkText] = useState("");
  const [zielText, setZielText] = useState("30");

  // Beim ersten Öffnen mit dem EK der ersten Warenkorb-Position vorbelegen
  const vorbelegt = useRef(false);
  useEffect(() => {
    if (offen && !vorbelegt.current && vorschlagEk && !ekText) {
      setEkText(vorschlagEk.toFixed(2).replace(".", ","));
      vorbelegt.current = true;
    }
  }, [offen, vorschlagEk, ekText]);

  const ekEingabe = zahlAusText(ekText);
  const ekBrutto = Number.isFinite(ekEingabe) && ekEingabe > 0 ? (ekIstNetto ? rund2(brutto(ekEingabe)) : ekEingabe) : NaN;
  const vk = zahlAusText(vkText);
  const ziel = zahlAusText(zielText);
  const grund = Number.isFinite(ekBrutto) ? grundpreis(ekBrutto, aufschlag) : NaN;

  return (
    <div className="rounded-xl border border-border">
      <button onClick={() => setOffen((o) => !o)} aria-expanded={offen}
        className="w-full flex items-center justify-between px-3 py-2 text-[12px] font-semibold hover:bg-secondary/40 rounded-xl">
        <span className="flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5 text-primary" /> Margenrechner</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", offen && "rotate-180")} />
      </button>
      {offen && (
        <div className="px-3 pb-3 space-y-2.5 text-[12px]">
          <div className="flex items-center gap-1.5">
            <label className="text-muted-foreground w-10 shrink-0" htmlFor="mr-ek">EK</label>
            <input id="mr-ek" inputMode="decimal" value={ekText} onChange={(e) => setEkText(e.target.value)} placeholder="0,00"
              className="flex-1 min-w-0 rounded-lg border border-border bg-background px-2 py-1 tabular-nums" />
            <span className="text-muted-foreground">€</span>
            <div className="flex rounded-lg border border-border overflow-hidden text-[11px]">
              <button onClick={() => setEkIstNetto(false)} aria-pressed={!ekIstNetto} className={cn("px-2 py-1", !ekIstNetto ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}>brutto</button>
              <button onClick={() => setEkIstNetto(true)} aria-pressed={ekIstNetto} className={cn("px-2 py-1", ekIstNetto ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}>netto</button>
            </div>
          </div>

          {Number.isFinite(ekBrutto) && (
            <>
              <table className="w-full tabular-nums text-[11.5px]" aria-label="Preise und Marge je Stufe">
                <thead>
                  <tr className="text-[10px] text-muted-foreground">
                    <th className="text-left font-medium pb-1">Stufe</th>
                    <th className="text-right font-medium pb-1">VK</th>
                    <th className="text-right font-medium pb-1">Rohertrag</th>
                    <th className="text-right font-medium pb-1">Marge</th>
                  </tr>
                </thead>
                <tbody>
                  {STUFEN.map((s) => {
                    const p = preisBeiStufe(grund, s.id);
                    const m = marge(p, ekBrutto);
                    return (
                      <tr key={s.id}>
                        <td className="py-0.5">{s.id === "none" ? `Einzelhandel (Ø ×${aufschlag.toFixed(2).replace(".", ",")})` : s.kurz}</td>
                        <td className="py-0.5 text-right">{eur(p)}</td>
                        <td className="py-0.5 text-right">{eur(m.rohertrag)}</td>
                        <td className={cn("py-0.5 text-right", m.prozent < 10 && "text-red-700")}>{prozentText(m.prozent)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[10px] text-muted-foreground -mt-1">
                EK brutto {eur(ekBrutto)} · netto {eur(rund2(netto(ekBrutto)))} · Richtwert — jedes Teil hat seinen
                eigenen Aufschlag, die echten Preise stehen oben im Korb.
              </p>

              <div className="flex items-center gap-1.5 border-t border-border pt-2">
                <label className="text-muted-foreground w-24 shrink-0" htmlFor="mr-vk">Eigener Preis</label>
                <input id="mr-vk" inputMode="decimal" value={vkText} onChange={(e) => setVkText(e.target.value)} placeholder="VK brutto"
                  className="w-24 rounded-lg border border-border bg-background px-2 py-1 tabular-nums" />
                <span className="text-[11px] tabular-nums ml-auto" data-testid="mr-eigen">
                  {Number.isFinite(vk) && vk > 0
                    ? (() => { const m = marge(vk, ekBrutto); return <>Rohertrag <b>{eur(m.rohertrag)}</b> · {prozentText(m.prozent)}</>; })()
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-muted-foreground w-24 shrink-0" htmlFor="mr-ziel">Ziel-Marge</label>
                <input id="mr-ziel" inputMode="decimal" value={zielText} onChange={(e) => setZielText(e.target.value)}
                  className="w-24 rounded-lg border border-border bg-background px-2 py-1 tabular-nums" />
                <span className="text-muted-foreground">%</span>
                <span className="text-[11px] tabular-nums ml-auto" data-testid="mr-ziel-vk">
                  {Number.isFinite(ziel) && ziel >= 0 && ziel < 95 ? <>VK <b>{eur(vkFuerMarge(ekBrutto, ziel))}</b></> : "—"}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── QR-Zahlung am Handy des Kunden ───────────────────────── */

export interface ThekenArtikel { articleNumber: string; brand: string; name: string; quantity: number }

type QrStand =
  | { art: "laden" }
  | { art: "qr"; url: string; sessionId: string; summe: number; ohnePreis: string[] }
  | { art: "bezahlt"; summe: number }
  | { art: "nichtEingerichtet" }
  | { art: "pin"; text: string }
  | { art: "fehler"; text: string };

function QrBild({ text }: { text: string }) {
  const [pfad, setPfad] = useState<{ d: string; n: number } | null>(null);
  useEffect(() => {
    let lebt = true;
    // Erst beim Öffnen laden — gehört nicht ins Haupt-Bundle.
    import("qrcode-generator").then(({ default: qrcode }) => {
      if (!lebt) return;
      const qr = qrcode(0, "M");
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount();
      let d = "";
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
      setPfad({ d, n });
    });
    return () => { lebt = false; };
  }, [text]);
  if (!pfad) return <div className="w-[232px] h-[232px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-black/40" /></div>;
  const rand = 4;
  return (
    <svg role="img" aria-label="QR-Code zum Bezahlen" viewBox={`${-rand} ${-rand} ${pfad.n + rand * 2} ${pfad.n + rand * 2}`}
      width={232} height={232} shapeRendering="crispEdges" className="bg-white">
      <path d={pfad.d} fill="#000" />
    </svg>
  );
}

export function QrZahlung({
  artikel, level, kunde, kundenMail, vehicleLabel, vin, onClose, onBezahlt,
}: {
  artikel: ThekenArtikel[];
  level: MemberLevelId;
  kunde: string;
  kundenMail: string;
  vehicleLabel?: string;
  vin?: string;
  onClose: () => void;
  onBezahlt: (summe: number) => void;
}) {
  const [stand, setStand] = useState<QrStand>({ art: "laden" });
  const [versuch, setVersuch] = useState(0);
  const [kopiert, setKopiert] = useState(false);
  const stufe = level === "none" ? 0 : Number(level.slice(1));

  // Zahlungssitzung anlegen — der Server rechnet den Preis selbst.
  useEffect(() => {
    let lebt = true;
    setStand({ art: "laden" });
    (async () => {
      if (!adminPinLesen()) { setStand({ art: "pin", text: "Admin-PIN eingeben" }); return; }
      try {
        const r = await fetch("/api/parts-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await adminKopf()) },
          body: JSON.stringify({
            method: "stripe",
            vehicleLabel,
            vin,
            theke: { stufe, kunde, email: kundenMail },
            // Nur Nummer, Marke, Menge — KEIN Preis.
            items: artikel.map((a) => ({ articleNumber: a.articleNumber, brand: a.brand, name: a.name, quantity: a.quantity })),
          }),
        });
        const d = await r.json().catch(() => null);
        if (!lebt) return;
        if (d?.url && d?.sessionId) {
          setStand({ art: "qr", url: d.url, sessionId: d.sessionId, summe: Number(d.summe) || 0, ohnePreis: d.ohnePreis || [] });
        } else if (d?.fallback) {
          setStand({ art: "nichtEingerichtet" });
        } else if (!r.ok && (r.status === 401 || r.status === 403 || r.status === 503)) {
          const f = adminFehlerAus(r.status, d);
          setStand(f.art === "pin" ? { art: "pin", text: f.text } : { art: "fehler", text: f.text });
        } else {
          setStand({ art: "fehler", text: d?.error || "Zahlung konnte nicht angelegt werden." });
        }
      } catch {
        if (lebt) setStand({ art: "fehler", text: "Keine Verbindung — nochmal versuchen." });
      }
    })();
    return () => { lebt = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versuch]);

  // Alle 4 Sekunden nachsehen, ob der Kunde bezahlt hat.
  const sessionId = stand.art === "qr" ? stand.sessionId : "";
  useEffect(() => {
    if (!sessionId) return;
    let lebt = true;
    const bis = Date.now() + 30 * 60 * 1000;
    const t = setInterval(async () => {
      if (Date.now() > bis) { clearInterval(t); return; }
      try {
        const r = await fetch("/api/parts-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await adminKopf()) },
          body: JSON.stringify({ method: "status", sessionId }),
        });
        const d = await r.json().catch(() => null);
        if (lebt && d?.bezahlt) {
          clearInterval(t);
          setStand({ art: "bezahlt", summe: Number(d.betrag) || 0 });
          onBezahlt(Number(d.betrag) || 0);
        }
      } catch { /* nächster Versuch */ }
    }, 4000);
    return () => { lebt = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return createPortal(
    <div className="fixed inset-0 z-[260] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-[340px] rounded-2xl bg-white text-black p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold flex items-center gap-2"><QrCode className="w-4 h-4" /> Kunde zahlt am Handy</p>
          <button onClick={onClose} aria-label="Schließen" className="p-1 rounded-lg hover:bg-black/5"><X className="w-4 h-4" /></button>
        </div>

        {stand.art === "laden" && (
          <div className="py-12 flex flex-col items-center gap-2 text-sm text-black/60">
            <Loader2 className="w-6 h-6 animate-spin" /> Zahlung wird angelegt …
          </div>
        )}

        {stand.art === "qr" && (
          <div className="flex flex-col items-center text-center">
            <p className="text-3xl font-bold tabular-nums mb-1">{eur(stand.summe)}</p>
            <p className="text-[12px] text-black/60 mb-3">
              {kunde ? `${kunde} · ` : ""}{STUFEN.find((s) => s.id === level)?.kurz}
            </p>
            <QrBild text={stand.url} />
            <p className="text-[12px] text-black/70 mt-3 leading-snug">
              Mit der Handykamera scannen — Apple Pay, Google Pay oder Karte.
            </p>
            {stand.ohnePreis.length > 0 && (
              <p className="text-[11px] text-amber-700 mt-2">{stand.ohnePreis.length} Position(en) ohne Preis sind nicht in dieser Zahlung.</p>
            )}
            <p className="text-[11px] text-black/50 mt-3 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> warte auf Zahlung …
            </p>
            <button
              onClick={() => { navigator.clipboard?.writeText(stand.url).then(() => { setKopiert(true); setTimeout(() => setKopiert(false), 1500); }).catch(() => {}); }}
              className="mt-2 text-[11px] text-black/50 hover:text-black inline-flex items-center gap-1"
            >
              {kopiert ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {kopiert ? "Kopiert" : "Link kopieren"}
            </button>
          </div>
        )}

        {stand.art === "bezahlt" && (
          <div className="py-8 flex flex-col items-center text-center gap-2">
            <span className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center"><Check className="w-6 h-6" /></span>
            <p className="font-bold text-lg">Bezahlt: {eur(stand.summe)}</p>
            <p className="text-[12px] text-black/60">Jetzt Abholschein drucken und bei Inter Cars bestellen.</p>
          </div>
        )}

        {stand.art === "nichtEingerichtet" && (
          <div className="py-4 text-[13px] leading-relaxed">
            <p className="font-semibold mb-1">Kartenzahlung ist noch nicht eingerichtet.</p>
            <p className="text-black/70">
              In Vercel fehlt <code className="text-[12px] bg-black/5 px-1 rounded">STRIPE_SECRET_KEY</code>. Bis dahin an der
              Kasse kassieren und den Abholschein drucken.
            </p>
          </div>
        )}

        {stand.art === "pin" && (
          <div className="py-3 space-y-2">
            <p className="text-[13px]">{stand.text === "Admin-PIN eingeben" ? "Für die Zahlung im Laden braucht es deinen Admin-PIN." : stand.text}</p>
            <PinEingabe onGesetzt={() => setVersuch((v) => v + 1)} />
          </div>
        )}

        {stand.art === "fehler" && (
          <div className="py-4 space-y-3">
            <p className="text-[13px] text-red-700 flex items-start gap-1.5"><TriangleAlert className="w-4 h-4 shrink-0 mt-px" /> {stand.text}</p>
            <button onClick={() => setVersuch((v) => v + 1)} className="btn-outline w-full text-sm">Nochmal</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ───────────────────────── Abholschein (Druck) ───────────────────────── */

export interface Schein { name: string; brand: string; articleNumber: string; quantity: number; einzel?: number }

export function Abholschein({
  positionen, kunde, vehicleLabel, vin, zahlart, onClose,
}: {
  positionen: Schein[];
  kunde: string;
  vehicleLabel?: string;
  vin?: string;
  zahlart: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 150);
    return () => clearTimeout(t);
  }, []);
  const summe = useMemo(
    () => rund2(positionen.reduce((s, p) => s + (p.einzel ?? 0) * p.quantity, 0)),
    [positionen],
  );
  const nr = useMemo(() => {
    const d = new Date();
    return `L${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[270] bg-black/60 overflow-y-auto p-4 print:p-0 print:bg-white print:static">
      <style media="print">{`
        @page { margin: 14mm; }
        body * { visibility: hidden !important; }
        .abholschein-blatt, .abholschein-blatt * { visibility: visible !important; }
        .abholschein-blatt { position: absolute !important; left: 0; top: 0; width: 100%; box-shadow: none !important; }
        .abholschein-nicht-drucken { display: none !important; }
      `}</style>

      <div className="abholschein-blatt mx-auto max-w-[720px] bg-white text-black rounded-xl p-8 shadow-2xl print:rounded-none print:shadow-none print:max-w-none">
        <div className="flex justify-between items-start gap-6 border-b border-black/15 pb-4">
          <div>
            <p className="text-xl font-bold">Abholschein</p>
            <p className="text-[12px] text-black/60 mt-0.5">Nr. {nr} · {new Date().toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          <div className="text-right text-[12px] text-black/70">
            <p className="font-semibold text-black">{SHOP_INFO.name}</p>
            <p>{SHOP_INFO.street}, {SHOP_INFO.zip} {SHOP_INFO.city}</p>
            <p>{SHOP_INFO.phone}</p>
          </div>
        </div>

        {(kunde || vehicleLabel || vin) && (
          <div className="mt-4 text-[12.5px]">
            {kunde && <p><span className="text-black/50">Kunde:</span> <b>{kunde}</b></p>}
            {vehicleLabel && <p><span className="text-black/50">Fahrzeug:</span> {vehicleLabel}</p>}
            {vin && <p className="font-mono text-[11.5px]"><span className="text-black/50 font-sans">FIN:</span> {vin}</p>}
          </div>
        )}

        <table className="w-full text-[12.5px] mt-5">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-black/50 border-b border-black/15">
              <th className="text-left font-bold py-1.5 w-10">Anz.</th>
              <th className="text-left font-bold py-1.5">Teil</th>
              <th className="text-right font-bold py-1.5 w-24">Einzel</th>
              <th className="text-right font-bold py-1.5 w-24">Summe</th>
            </tr>
          </thead>
          <tbody>
            {positionen.map((p, i) => (
              <tr key={i} className="border-b border-black/10">
                <td className="py-1.5 tabular-nums">{p.quantity}</td>
                <td className="py-1.5">
                  {p.name}
                  <span className="block text-[10.5px] text-black/50">{p.brand} · {p.articleNumber}</span>
                </td>
                <td className="py-1.5 text-right tabular-nums">{p.einzel != null ? eur(p.einzel) : "—"}</td>
                <td className="py-1.5 text-right tabular-nums">{p.einzel != null ? eur(p.einzel * p.quantity) : "auf Anfrage"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-[260px] text-[12.5px]">
          <div className="flex justify-between py-1.5 border-t border-black/20 font-bold text-[14px]">
            <span>Gesamt</span><span className="tabular-nums">{eur(summe)}</span>
          </div>
          <p className="text-[10.5px] text-black/50 mt-0.5">inkl. MwSt</p>
          <p className="text-[12px] mt-2"><span className="text-black/50">Zahlung:</span> {zahlart}</p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8 text-[11px] text-black/60">
          <div className="border-t border-black/30 pt-1">Abgeholt am</div>
          <div className="border-t border-black/30 pt-1">Unterschrift</div>
        </div>

        <p className="mt-6 text-[10.5px] text-black/50 leading-snug">
          Abholschein — kein Kassenbeleg. Bitte zur Abholung mitbringen.
        </p>
      </div>

      <div className="abholschein-nicht-drucken max-w-[720px] mx-auto flex gap-2 mt-4">
        <button onClick={() => window.print()} className="btn-primary gap-2"><Printer className="w-4 h-4" /> Nochmal drucken</button>
        <button onClick={onClose} className="btn-outline bg-white">Schließen</button>
      </div>
    </div>,
    document.body,
  );
}
