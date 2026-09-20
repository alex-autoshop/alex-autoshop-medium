import { useEffect, useState } from "react";
import {
  Lock, GraduationCap, Layers, FileText, Printer, Plus, Trash2, ClipboardList,
  Clock, ScanLine, Users, Crown, Check, Hammer,
} from "lucide-react";
import { Link } from "react-router-dom";
import { eur, memberPrice, MEMBER_LEVELS, type MemberLevelId } from "@/components/TeileportalPricing";
import { akteLesen, akteEintragLoeschen, akteNotiz, type Fahrzeugakte } from "@/lib/fahrzeugakte";
import { SHOP_INFO } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

/**
 * Die drei Stufen des Teilefinders.
 *
 *   Teilefinder        frei für alle — FIN, Zeichnung, Teil anklicken, kaufen
 *   Teilefinder Pro    nur Mitglieder — Fahrzeugakte, Angebot, Werkstatt-Werkzeug
 *   Campus             Ausbildung — INTERN, noch nicht für Kunden
 *
 * Campus ist mit Absicht durchgestrichen und nur für Alex sichtbar: die Seite
 * wird hier aufgebaut, bevor irgendein Kunde sie zu sehen bekommt.
 */

export type Stufe = "finder" | "pro" | "campus";

/* ─────────────────────── Reiter im Kopf ─────────────────────── */

export function TeilefinderStufen({
  stufe, setStufe, istMitglied, istAdmin,
}: {
  stufe: Stufe;
  setStufe: (s: Stufe) => void;
  istMitglied: boolean;
  istAdmin: boolean;
}) {
  const knopf = (id: Stufe, text: React.ReactNode, extra?: React.ReactNode) => (
    <button
      key={id}
      onClick={() => setStufe(id)}
      aria-pressed={stufe === id}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-colors whitespace-nowrap",
        stufe === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary",
      )}
    >
      {text}
      {extra}
    </button>
  );

  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card p-0.5 shrink-0">
      {knopf("finder", <><span className="sm:hidden">Finder</span><span className="hidden sm:inline">Teilefinder</span></>)}
      {knopf("pro", "Pro", !istMitglied && <Lock className="w-3 h-3 opacity-70" />)}
      {istAdmin && (
        <button
          onClick={() => setStufe("campus")}
          title="Interne Baustelle — für Kunden nicht sichtbar"
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-colors whitespace-nowrap",
            stufe === "campus" ? "bg-night text-gold-bright" : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-secondary",
          )}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span className="line-through">Campus</span>
          <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider opacity-70">intern</span>
        </button>
      )}
    </div>
  );
}

/* ─────────────────────── Pro: gesperrt ─────────────────────── */

const PRO_VORTEILE = [
  { icon: ClipboardList, t: "Fahrzeugakte", d: "Jedes Auto behält seine Historie. Beim nächsten Mal ein Klick statt zehn Minuten Suche." },
  { icon: FileText, t: "Angebot in einer Minute", d: "Teile plus Arbeitszeit, als Kostenvoranschlag zum Ausdrucken — mit deinem Namen drauf." },
  { icon: Clock, t: "Teile zurücklegen", d: "Bis 17 Uhr reservieren statt bestellen. Du holst ab, wenn das Auto auf der Bühne steht." },
  { icon: ScanLine, t: "Fahrzeugschein scannen", d: "QR-Code vom Schein abfotografieren, Fahrzeug steht. Kein Abtippen der FIN." },
  { icon: Users, t: "Team-Konten", d: "Meister, Geselle, Azubi — jeder mit eigenen Rechten. Wer bestellen darf, bestellt." },
];

function ProGesperrt() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Crown className="w-5 h-5 text-primary" />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold leading-tight">Teilefinder Pro</h2>
          <p className="text-sm text-muted-foreground">Im Mitgliedsbeitrag enthalten — ab Level 1.</p>
        </div>
      </div>

      <div className="space-y-3">
        {PRO_VORTEILE.map((v) => (
          <div key={v.t} className="flex gap-3 rounded-xl border border-border bg-card p-3.5">
            <v.icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{v.t}</p>
              <p className="text-[13px] text-muted-foreground leading-snug mt-0.5">{v.d}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link to="/mitgliedschaft" className="btn-primary gap-2">
          <Crown className="w-4 h-4" /> Mitgliedschaft ansehen
        </Link>
        <a href={`tel:${SHOP_INFO.phone}`} className="text-sm text-muted-foreground hover:text-primary">
          oder anrufen: {SHOP_INFO.phone}
        </a>
      </div>
    </div>
  );
}

/* ─────────────────────── Pro: Fahrzeugakte ─────────────────────── */

function AktenListe({ vin, label }: { vin: string; label: string }) {
  const [akte, setAkte] = useState<Fahrzeugakte | null>(null);
  const [offen, setOffen] = useState<string | null>(null);

  useEffect(() => { setAkte(akteLesen(vin)); }, [vin]);

  if (!vin) {
    return (
      <p className="text-[13px] text-muted-foreground px-1">
        Für die Akte braucht es ein Fahrzeug. Gib oben eine FIN ein, dann sammelt sich hier alles,
        was an diesem Auto verbaut wurde.
      </p>
    );
  }

  const eintraege = akte?.eintraege ?? [];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 px-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label || "Fahrzeug"}
        </p>
        <p className="text-[11px] text-muted-foreground font-mono">{vin}</p>
      </div>

      {eintraege.length === 0 ? (
        <p className="text-[13px] text-muted-foreground px-1 leading-snug">
          Noch nichts verbaut. Jedes Teil, das du aus dem Teilefinder in den Warenkorb legst,
          steht ab sofort hier — mit Datum, Nummer und Preis.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {eintraege.map((e) => (
            <li key={e.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold leading-tight truncate">{e.name}</p>
                  <p className="text-[11.5px] text-muted-foreground truncate">
                    <span className="uppercase font-semibold">{e.brand}</span>
                    <span className="mx-1.5 opacity-40">·</span>
                    <span className="font-mono">{e.articleNumber}</span>
                    {e.ueberOe && <><span className="mx-1.5 opacity-40">·</span>OE {e.ueberOe}</>}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(e.datum).toLocaleDateString("de-DE")} · {e.menge}×
                    {e.preis != null && <> · {eur(e.preis * e.menge)}</>}
                  </p>
                  {offen === e.id ? (
                    <input
                      autoFocus
                      defaultValue={e.notiz || ""}
                      placeholder="Notiz, z.B. Kilometerstand"
                      onBlur={(ev) => { setAkte(akteNotiz(vin, e.id, ev.target.value)); setOffen(null); }}
                      onKeyDown={(ev) => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); }}
                      className="mt-2 w-full h-8 px-2 rounded-lg border border-border bg-background text-[12px]"
                    />
                  ) : (
                    <button
                      onClick={() => setOffen(e.id)}
                      className="mt-1 text-[11.5px] text-muted-foreground hover:text-primary text-left"
                    >
                      {e.notiz ? `„${e.notiz}"` : "+ Notiz"}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setAkte(akteEintragLoeschen(vin, e.id))}
                  aria-label="Eintrag löschen"
                  className="p-1.5 rounded-md text-muted-foreground/40 hover:text-destructive shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─────────────────────── Pro: Angebot / KVA ─────────────────────── */

export interface KvaPosition {
  name: string;
  brand: string;
  articleNumber: string;
  quantity: number;
  price?: number;
}

interface Arbeit { id: string; text: string; stunden: string }

function Angebot({
  positionen, level, fahrzeug, vin,
}: {
  positionen: KvaPosition[];
  level: MemberLevelId;
  fahrzeug: string;
  vin: string;
}) {
  const [werkstatt, setWerkstatt] = useState(() => {
    try { return localStorage.getItem("tf:werkstatt") || ""; } catch { return ""; }
  });
  const [satz, setSatz] = useState(() => {
    try { return localStorage.getItem("tf:stundensatz") || "110"; } catch { return "110"; }
  });
  const [kunde, setKunde] = useState("");
  const [arbeiten, setArbeiten] = useState<Arbeit[]>([]);
  const [drucken, setDrucken] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("tf:werkstatt", werkstatt);
      localStorage.setItem("tf:stundensatz", satz);
    } catch { /* egal */ }
  }, [werkstatt, satz]);

  const lvl = MEMBER_LEVELS.find((l) => l.id === level);
  const stueck = (p?: number) => (p == null ? null : lvl ? memberPrice(p, lvl.pct) : p);

  const teileSumme = positionen.reduce((s, p) => s + (stueck(p.price) ?? 0) * p.quantity, 0);
  const stundenSatz = Number(String(satz).replace(",", ".")) || 0;
  const arbeitSumme = arbeiten.reduce((s, a) => s + (Number(a.stunden.replace(",", ".")) || 0) * stundenSatz, 0);
  const gesamt = Math.round((teileSumme + arbeitSumme) * 100) / 100;

  if (positionen.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground px-1 leading-snug">
        Leg die Teile in den Warenkorb — daraus wird hier das Angebot. Arbeitszeit trägst du
        darunter ein, fertig ist der Kostenvoranschlag zum Ausdrucken.
      </p>
    );
  }

  return (
    <div>
      {/* Eingaben */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <input
          value={werkstatt} onChange={(e) => setWerkstatt(e.target.value)}
          placeholder="Dein Betrieb (steht oben im Angebot)"
          className="col-span-2 h-9 px-3 rounded-lg border border-border bg-card text-[13px]"
        />
        <input
          value={kunde} onChange={(e) => setKunde(e.target.value)}
          placeholder="Kunde / Kennzeichen"
          className="h-9 px-3 rounded-lg border border-border bg-card text-[13px]"
        />
        <div className="flex items-center gap-2">
          <input
            value={satz} onChange={(e) => setSatz(e.target.value)}
            inputMode="decimal"
            className="w-20 h-9 px-3 rounded-lg border border-border bg-card text-[13px] tabular-nums"
          />
          <span className="text-[12px] text-muted-foreground">€ / Stunde</span>
        </div>
      </div>

      {/* Teile */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-[12.5px]">
          <tbody>
            {positionen.map((p, i) => (
              <tr key={`${p.articleNumber}-${i}`} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2 w-10 text-muted-foreground tabular-nums">{p.quantity}×</td>
                <td className="px-1 py-2">
                  <span className="font-semibold">{p.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {p.brand} · <span className="font-mono">{p.articleNumber}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                  {stueck(p.price) != null ? eur((stueck(p.price) as number) * p.quantity) : "auf Anfrage"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Arbeitszeit */}
      <div className="mt-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1.5">
          Arbeitszeit
        </p>
        {arbeiten.map((a) => (
          <div key={a.id} className="flex items-center gap-2 mb-1.5">
            <input
              value={a.text}
              onChange={(e) => setArbeiten((l) => l.map((x) => (x.id === a.id ? { ...x, text: e.target.value } : x)))}
              placeholder="z.B. Bremsen vorne erneuern"
              className="flex-1 h-9 px-3 rounded-lg border border-border bg-card text-[13px]"
            />
            <input
              value={a.stunden}
              onChange={(e) => setArbeiten((l) => l.map((x) => (x.id === a.id ? { ...x, stunden: e.target.value } : x)))}
              inputMode="decimal" placeholder="1,2"
              className="w-16 h-9 px-2 rounded-lg border border-border bg-card text-[13px] tabular-nums text-right"
            />
            <span className="text-[12px] text-muted-foreground w-4">h</span>
            <button
              onClick={() => setArbeiten((l) => l.filter((x) => x.id !== a.id))}
              aria-label="Zeile entfernen"
              className="p-1.5 text-muted-foreground/40 hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => setArbeiten((l) => [...l, { id: String(Date.now()), text: "", stunden: "" }])}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-primary font-semibold hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Arbeitsposition
        </button>
      </div>

      {/* Summe */}
      <div className="mt-4 rounded-xl bg-secondary/50 p-3 space-y-1 text-[13px]">
        <div className="flex justify-between"><span className="text-muted-foreground">Teile</span><span className="tabular-nums">{eur(teileSumme)}</span></div>
        {arbeitSumme > 0 && (
          <div className="flex justify-between"><span className="text-muted-foreground">Arbeit</span><span className="tabular-nums">{eur(arbeitSumme)}</span></div>
        )}
        <div className="flex justify-between pt-1 border-t border-border font-bold">
          <span>Gesamt <span className="font-normal text-[11px] text-muted-foreground">inkl. MwSt</span></span>
          <span className="tabular-nums">{eur(gesamt)}</span>
        </div>
      </div>

      <button onClick={() => setDrucken(true)} className="btn-primary w-full gap-2 mt-3">
        <Printer className="w-4 h-4" /> Angebot drucken / als PDF
      </button>

      {drucken && (
        <KvaDruck
          onClose={() => setDrucken(false)}
          werkstatt={werkstatt} kunde={kunde} fahrzeug={fahrzeug} vin={vin}
          positionen={positionen.map((p) => ({ ...p, einzel: stueck(p.price) }))}
          arbeiten={arbeiten.filter((a) => a.text.trim() || a.stunden.trim())}
          satz={stundenSatz} teileSumme={teileSumme} arbeitSumme={arbeitSumme} gesamt={gesamt}
        />
      )}
    </div>
  );
}

/** Druckansicht — beim Drucken ist NUR dieses Blatt sichtbar. */
function KvaDruck({
  onClose, werkstatt, kunde, fahrzeug, vin, positionen, arbeiten, satz,
  teileSumme, arbeitSumme, gesamt,
}: {
  onClose: () => void;
  werkstatt: string; kunde: string; fahrzeug: string; vin: string;
  positionen: (KvaPosition & { einzel: number | null })[];
  arbeiten: Arbeit[];
  satz: number; teileSumme: number; arbeitSumme: number; gesamt: number;
}) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 overflow-y-auto p-4 print:p-0 print:bg-white print:static">
      <style media="print">{`
        @page { margin: 16mm; }
        body * { visibility: hidden !important; }
        .kva-blatt, .kva-blatt * { visibility: visible !important; }
        .kva-blatt { position: absolute !important; left: 0; top: 0; width: 100%; box-shadow: none !important; }
        .kva-nicht-drucken { display: none !important; }
      `}</style>

      <div className="kva-blatt mx-auto max-w-[800px] bg-white text-black rounded-xl p-8 shadow-2xl print:rounded-none print:shadow-none print:max-w-none">
        <div className="flex justify-between items-start gap-6 border-b border-black/15 pb-4">
          <div>
            <p className="text-lg font-bold">{werkstatt || "Kostenvoranschlag"}</p>
            <p className="text-[12px] text-black/60 mt-0.5">
              Kostenvoranschlag vom {new Date().toLocaleDateString("de-DE")}
            </p>
          </div>
          <div className="text-right text-[12px] text-black/70">
            {kunde && <p className="font-semibold text-black">{kunde}</p>}
            {fahrzeug && <p>{fahrzeug}</p>}
            {vin && <p className="font-mono text-[11px]">{vin}</p>}
          </div>
        </div>

        <table className="w-full text-[12.5px] mt-5">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-black/50 border-b border-black/15">
              <th className="text-left font-bold py-1.5 w-10">Anz.</th>
              <th className="text-left font-bold py-1.5">Bezeichnung</th>
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
            {arbeiten.map((a, i) => {
              const h = Number(a.stunden.replace(",", ".")) || 0;
              return (
                <tr key={`a-${i}`} className="border-b border-black/10">
                  <td className="py-1.5 tabular-nums">{h ? `${a.stunden} h` : ""}</td>
                  <td className="py-1.5">{a.text || "Arbeitszeit"}</td>
                  <td className="py-1.5 text-right tabular-nums">{eur(satz)}</td>
                  <td className="py-1.5 text-right tabular-nums">{eur(Math.round(h * satz * 100) / 100)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-[260px] text-[12.5px]">
          <div className="flex justify-between py-1"><span className="text-black/60">Teile</span><span className="tabular-nums">{eur(teileSumme)}</span></div>
          {arbeitSumme > 0 && <div className="flex justify-between py-1"><span className="text-black/60">Arbeit</span><span className="tabular-nums">{eur(arbeitSumme)}</span></div>}
          <div className="flex justify-between py-1.5 border-t border-black/20 font-bold text-[14px]">
            <span>Gesamt</span><span className="tabular-nums">{eur(gesamt)}</span>
          </div>
          <p className="text-[10.5px] text-black/50 mt-1">Alle Preise inkl. MwSt.</p>
        </div>

        <p className="mt-6 text-[10.5px] text-black/50 leading-snug">
          Unverbindlicher Kostenvoranschlag. Preise und Verfügbarkeit gelten zum Zeitpunkt der
          Erstellung. Erstellt mit dem Teilefinder von Alex Autoshop.
        </p>
      </div>

      <div className="kva-nicht-drucken max-w-[800px] mx-auto flex gap-2 mt-4">
        <button onClick={() => window.print()} className="btn-primary gap-2"><Printer className="w-4 h-4" /> Nochmal drucken</button>
        <button onClick={onClose} className="btn-outline">Schließen</button>
      </div>
    </div>
  );
}

/* ─────────────────────── Pro: Gesamtansicht ─────────────────────── */

const GEPLANT = [
  { icon: Clock, t: "Teile zurücklegen", d: "Reservierung bis zur Abholung — sobald die Lager-Anbindung steht." },
  { icon: ScanLine, t: "Fahrzeugschein scannen", d: "QR vom Schein statt FIN tippen." },
  { icon: Users, t: "Team-Konten", d: "Meister, Geselle, Azubi mit eigenen Rechten." },
];

export function ProBereich({
  istMitglied, vin, fahrzeug, level, positionen,
}: {
  istMitglied: boolean;
  vin: string;
  fahrzeug: string;
  level: MemberLevelId;
  positionen: KvaPosition[];
}) {
  if (!istMitglied) return <ProGesperrt />;

  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="grid lg:grid-cols-2 gap-6">
          <section>
            <h3 className="font-display text-[15px] font-bold flex items-center gap-2 mb-3">
              <ClipboardList className="w-4 h-4 text-primary" /> Fahrzeugakte
            </h3>
            <AktenListe vin={vin} label={fahrzeug} />
          </section>

          <section>
            <h3 className="font-display text-[15px] font-bold flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" /> Angebot für deinen Kunden
            </h3>
            <Angebot positionen={positionen} level={level} fahrzeug={fahrzeug} vin={vin} />
          </section>
        </div>

        <div className="mt-8 pt-5 border-t border-border">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
            In Arbeit
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {GEPLANT.map((g) => (
              <div key={g.t} className="rounded-xl border border-dashed border-border p-3.5">
                <g.icon className="w-4 h-4 text-muted-foreground/60 mb-2" />
                <p className="text-[13px] font-semibold leading-tight">{g.t}</p>
                <p className="text-[12px] text-muted-foreground leading-snug mt-1">{g.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Campus: interne Baustelle ─────────────────────── */

const CAMPUS_MODULE = [
  { t: "Blindmodus", d: "Zeichnung ohne Nummern. Der Azubi benennt das Teil und bestimmt die Nummer selbst, das System korrigiert.", stand: "Gerüst" },
  { t: "Aufgaben", d: "„Finde die Teilenummer der Wasserpumpe am Golf VII 1.6 TDI, Motorcode CLHA.“ — Lehrer stellt, System prüft.", stand: "Konzept" },
  { t: "Klassen", d: "Kurse, Schüler, Fortschritt je Aufgabe. Prüfungssimulation Richtung Gesellenprüfung.", stand: "Konzept" },
  { t: "Arbeitsblätter", d: "Zeichnung plus Aufgabenteil als PDF für den Unterricht.", stand: "Konzept" },
];

export function CampusBereich() {
  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.07] p-4 mb-7">
          <Hammer className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[13px] leading-snug">
            <p className="font-bold">Interne Baustelle</p>
            <p className="text-muted-foreground mt-0.5">
              Dieser Bereich ist nur über dein Admin-Konto erreichbar und taucht für Kunden nirgends
              auf. Hier bauen wir Campus auf, bevor die erste Schule ihn zu sehen bekommt.
            </p>
          </div>
        </div>

        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          <span className="line-through decoration-2">Campus</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          Der Teilefinder als Lernwerkzeug für Berufsschulen und Ausbildungsbetriebe. Die Zeichnungen
          sind da, die Fahrzeugbestimmung ist da — es fehlt die Schulseite drumherum.
        </p>

        <div className="mt-6 space-y-3">
          {CAMPUS_MODULE.map((m, i) => (
            <div key={m.t} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-secondary text-muted-foreground text-[11px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-[14px] font-bold flex-1">{m.t}</p>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                  m.stand === "Gerüst" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
                )}>
                  {m.stand}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground leading-snug mt-2 pl-[34px]">{m.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 rounded-xl border border-border bg-secondary/40 p-4">
          <p className="text-[13px] font-bold mb-2 flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" /> Vor dem ersten Schulgespräch zu klären
          </p>
          <ul className="text-[13px] text-muted-foreground space-y-1.5 leading-snug list-disc pl-5">
            <li>Deckt der YQ-Vertrag die Zeichnungen für Schulungszwecke und Schulkonten ab?</li>
            <li>Wer zahlt die Lizenzen — die Schule oder der Großhändler als Sponsor?</li>
            <li>Ein Pilot mit einer Berufsschule, bevor daraus ein Produkt wird.</li>
          </ul>
        </div>

        <p className="mt-6 text-[12px] text-muted-foreground flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" /> Nächster Schritt: Blindmodus auf einer echten Zeichnung ausprobieren.
        </p>
      </div>
    </div>
  );
}
