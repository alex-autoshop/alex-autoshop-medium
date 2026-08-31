import { useEffect, useMemo, useState } from "react";
import {
  Lock, Loader2, RefreshCw, Download, Search, Users, Crown, Clock,
  ShoppingBag, TrendingUp, AlertCircle, Phone, Mail, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Interne Mitglieder-Übersicht: Wer hat sich eingeschrieben, wer testet gerade,
 * wer bestellt wie viel. Daten kommen aus /api/admin-members (Service-Key
 * serverseitig); der PIN wird nur mitgeschickt, nie im Code hinterlegt.
 */

const PIN_KEY = "aa-admin-pin";

interface Member {
  id: string; email: string; company: string; contact: string; phone: string; address: string;
  level: number; modules: string[];
  trialUsed: boolean; trialLevel: number | null; trialExpires: string | null; trialActive: boolean;
  referralCode: string; referredBy: string; affiliateCredit: number; sepa: boolean;
  createdAt: string; lastSignIn: string | null; confirmed: boolean;
  orders: number; revenue: number; lastOrder: string | null;
}
interface Summary {
  konten: number; mitglieder: number; level1: number; level2: number; level3: number;
  trialAktiv: number; trialGenutzt: number; neu30Tage: number; bestellungen: number; umsatz: number;
}

const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;
const datum = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("de-DE") : "—");
const zeit = (iso: string | null) => {
  if (!iso) return "nie";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "heute";
  if (d === 1) return "gestern";
  if (d < 31) return `vor ${d} Tagen`;
  return new Date(iso).toLocaleDateString("de-DE");
};

function PinScreen({ onDone }: { onDone: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="w-full max-w-xs text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <p className="font-bold mb-1">Mitglieder-Übersicht</p>
        <p className="text-sm text-muted-foreground mb-5">Nur für dich — PIN eingeben.</p>
        <input
          type="password" value={pin} autoFocus
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && pin && onDone(pin)}
          placeholder="PIN"
          className="input-base text-center tracking-[0.3em] mb-3"
        />
        <button onClick={() => pin && onDone(pin)} className="btn-primary w-full">Öffnen</button>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint, tone }: {
  icon: typeof Users; label: string; value: string | number; hint?: string; tone?: "gold" | "green";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={cn("w-4 h-4", tone === "gold" ? "text-primary" : tone === "green" ? "text-emerald-600" : "text-muted-foreground")} />
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

const LEVEL_BADGE = ["bg-secondary text-muted-foreground", "bg-amber-400/15 text-amber-700 dark:text-amber-300", "bg-primary/15 text-primary", "bg-night text-gold-bright"];

export default function AdminMembers() {
  const [pin, setPin] = useState<string | null>(() => localStorage.getItem(PIN_KEY));
  const [data, setData] = useState<{ summary: Summary; members: Member[]; stand: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"alle" | "mitglieder" | "trial" | "trialUsed" | "ohne">("alle");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = async (p: string) => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/admin-members", { headers: { "x-admin-pin": p } });
      const j = await r.json();
      if (!r.ok) { setError(j.hinweis ? `${j.error} — ${j.hinweis}` : j.error || `Fehler ${r.status}`); setData(null); if (r.status === 401) { localStorage.removeItem(PIN_KEY); setPin(null); } return; }
      setData(j);
      localStorage.setItem(PIN_KEY, p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden fehlgeschlagen");
    } finally { setBusy(false); }
  };

  useEffect(() => { if (pin) load(pin); }, [pin]);

  const list = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    return data.members
      .filter((m) =>
        tab === "alle" ? true :
        tab === "mitglieder" ? m.level > 0 :
        tab === "trial" ? m.trialActive :
        tab === "trialUsed" ? m.trialUsed :
        m.level === 0 && !m.trialUsed
      )
      .filter((m) => !s || [m.email, m.company, m.contact, m.phone].some((x) => (x || "").toLowerCase().includes(s)));
  }, [data, tab, q]);

  const csv = () => {
    if (!data) return;
    const head = ["E-Mail","Firma","Ansprechpartner","Telefon","Stufe","Module","Trial genutzt","Trial aktiv bis","Registriert","Zuletzt aktiv","Bestellungen","Umsatz","Empfehlungscode"];
    const rows = list.map((m) => [m.email, m.company, m.contact, m.phone, m.level, (m.modules||[]).join(" / "),
      m.trialUsed ? "ja" : "nein", m.trialExpires ? new Date(m.trialExpires).toLocaleString("de-DE") : "",
      datum(m.createdAt), datum(m.lastSignIn), m.orders, String(m.revenue).replace(".", ","), m.referralCode]);
    const text = [head, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `mitglieder-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!pin) return <PinScreen onDone={(p) => setPin(p)} />;

  const s = data?.summary;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl">Mitglieder</h1>
        {data && <span className="text-xs text-muted-foreground">Stand {new Date(data.stand).toLocaleTimeString("de-DE")}</span>}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => pin && load(pin)} disabled={busy} className="btn-outline text-sm px-3 py-2 min-h-0">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Aktualisieren
          </button>
          <button onClick={csv} disabled={!data} className="btn-dark text-sm px-3 py-2 min-h-0">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-400/50 bg-amber-400/10 p-4 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          <Kpi icon={Users}  label="Konten"        value={s.konten}     hint={`${s.neu30Tage} neu in 30 Tagen`} />
          <Kpi icon={Crown}  label="Mitglieder"    value={s.mitglieder} hint={`L1 ${s.level1} · L2 ${s.level2} · L3 ${s.level3}`} tone="gold" />
          <Kpi icon={Clock}  label="Trial aktiv"   value={s.trialAktiv} hint={`${s.trialGenutzt} insgesamt genutzt`} tone="green" />
          <Kpi icon={ShoppingBag} label="Bestellungen" value={s.bestellungen} />
          <Kpi icon={TrendingUp}  label="Umsatz"      value={eur(s.umsatz)} />
          <Kpi icon={Users} label="Ohne Stufe" value={s.konten - s.mitglieder} hint="Interessenten" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {([
          { id: "alle", label: `Alle (${data?.members.length ?? 0})` },
          { id: "mitglieder", label: `Mitglieder (${s?.mitglieder ?? 0})` },
          { id: "trial", label: `Trial läuft (${s?.trialAktiv ?? 0})` },
          { id: "trialUsed", label: `Trial genutzt (${s?.trialGenutzt ?? 0})` },
          { id: "ohne", label: "Nur registriert" },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("px-3.5 py-2 rounded-xl border text-sm font-semibold transition-colors",
              tab === t.id ? "bg-night text-white border-night" : "bg-card border-border text-muted-foreground hover:border-primary hover:text-foreground")}>
            {t.label}
          </button>
        ))}
        <div className="relative ml-auto min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Firma, Name, E-Mail …"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-primary/60" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="hidden lg:grid grid-cols-[1fr_120px_150px_110px_110px_120px_40px] gap-3 px-4 py-2.5 bg-secondary/60 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>Firma / Kontakt</span><span>Stufe</span><span>Trial</span><span>Registriert</span><span>Zuletzt aktiv</span><span className="text-right">Bestellungen</span><span />
        </div>
        <div className="divide-y divide-border/60">
          {list.map((m) => (
            <div key={m.id}>
              <div
                onClick={() => setOpen(open === m.id ? null : m.id)}
                className="grid grid-cols-[1fr_auto] lg:grid-cols-[1fr_120px_150px_110px_110px_120px_40px] gap-3 px-4 py-3 items-center cursor-pointer hover:bg-secondary/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{m.company || m.contact || m.email}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{m.email}{m.phone ? ` · ${m.phone}` : ""}</p>
                </div>
                <span className={cn("hidden lg:inline-flex items-center justify-center px-2 py-1 rounded-md text-[11px] font-bold w-fit", LEVEL_BADGE[m.level] || LEVEL_BADGE[0])}>
                  {m.level > 0 ? `Level ${m.level}` : "—"}
                </span>
                <span className="hidden lg:block text-[11px]">
                  {m.trialActive ? (
                    <span className="text-emerald-600 font-semibold">läuft bis {new Date(m.trialExpires!).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
                  ) : m.trialUsed ? (
                    <span className="text-muted-foreground">genutzt {m.trialLevel ? `(L${m.trialLevel})` : ""}</span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </span>
                <span className="hidden lg:block text-[11px] text-muted-foreground">{datum(m.createdAt)}</span>
                <span className="hidden lg:block text-[11px] text-muted-foreground">{zeit(m.lastSignIn)}</span>
                <span className="hidden lg:block text-right text-[11px] tabular-nums">
                  {m.orders > 0 ? <><b className="text-foreground">{m.orders}</b> · {eur(m.revenue)}</> : <span className="text-muted-foreground/40">—</span>}
                </span>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform justify-self-end", open === m.id && "rotate-180")} />
              </div>

              {open === m.id && (
                <div className="px-4 pb-4 pt-1 bg-secondary/30 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[13px]">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Kontakt</p>
                    <p>{m.contact || "—"}</p>
                    <a href={`mailto:${m.email}`} className="flex items-center gap-1.5 text-primary hover:underline mt-0.5"><Mail className="w-3 h-3" />{m.email}</a>
                    {m.phone && <a href={`tel:${m.phone}`} className="flex items-center gap-1.5 text-primary hover:underline"><Phone className="w-3 h-3" />{m.phone}</a>}
                    {m.address && <p className="text-muted-foreground mt-1">{m.address}</p>}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Mitgliedschaft</p>
                    <p>{m.level > 0 ? `Level ${m.level}` : "keine Stufe"}</p>
                    <p className="text-muted-foreground">{(m.modules || []).join(" · ") || "keine Module"}</p>
                    <p className="text-muted-foreground">SEPA-Mandat: {m.sepa ? "ja" : "nein"}</p>
                    <p className="text-muted-foreground">E-Mail bestätigt: {m.confirmed ? "ja" : "nein"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Trial</p>
                    <p>{m.trialUsed ? `genutzt${m.trialLevel ? ` — Level ${m.trialLevel}` : ""}` : "noch nicht genutzt"}</p>
                    {m.trialExpires && <p className="text-muted-foreground">bis {new Date(m.trialExpires).toLocaleString("de-DE")}</p>}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Bestellungen & Affiliate</p>
                    <p>{m.orders} Bestellungen · {eur(m.revenue)}</p>
                    <p className="text-muted-foreground">letzte: {datum(m.lastOrder)}</p>
                    <p className="text-muted-foreground">Code: {m.referralCode || "—"}{m.referredBy ? ` · geworben von ${m.referredBy}` : ""}</p>
                    {m.affiliateCredit > 0 && <p className="text-primary font-semibold">Guthaben {eur(m.affiliateCredit)}</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
          {list.length === 0 && !busy && (
            <p className="text-center text-sm text-muted-foreground py-12">Keine Einträge.</p>
          )}
          {busy && list.length === 0 && (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-12">
              <Loader2 className="w-4 h-4 animate-spin" /> Konten werden geladen …
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
