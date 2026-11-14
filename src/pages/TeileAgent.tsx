import { type ChangeEvent, type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, MessageCircle, Shield } from "lucide-react";
import { Seo } from "@/components/Seo";
import { cn } from "@/lib/utils";
import {
  FELD_MAX,
  WHATSAPP_ANZEIGE,
  WHATSAPP_TEL,
  type AnfrageAngaben,
  anfrageBereit,
  whatsappAnfrageUrl,
  whatsappChatUrl,
} from "../../shared/whatsapp-anfrage.js";
import {
  TEILE_AGENT_BESCHREIBUNG,
  TEILE_AGENT_CLAIMS,
  TEILE_AGENT_DATENSCHUTZ,
  TEILE_AGENT_FAQ,
  TEILE_AGENT_FAQ_LD,
  TEILE_AGENT_H1,
  TEILE_AGENT_LEAD,
  TEILE_AGENT_SCHRITTE,
  TEILE_AGENT_TITEL,
  TEILE_AGENT_URL,
} from "../../shared/teile-agent.js";

const LEER: Required<AnfrageAngaben> = {
  marke: "",
  modell: "",
  baujahr: "",
  hsn: "",
  tsn: "",
  fin: "",
  teil: "",
  anmerkung: "",
  plz: "",
};

const CHAT = whatsappChatUrl();

export default function TeileAgent() {
  const [werte, setWerte] = useState(LEER);
  const [fehler, setFehler] = useState("");
  const [offen, setOffen] = useState<number | null>(0);

  function aendern(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setWerte((alt) => ({ ...alt, [name]: value }));
    if (name === "teil") setFehler("");
  }

  function senden(event: FormEvent) {
    event.preventDefault();
    if (!anfrageBereit(werte)) {
      setFehler("Bitte das gesuchte Teil eintragen.");
      document.getElementById("teil")?.focus();
      return;
    }
    setFehler("");
    window.open(whatsappAnfrageUrl(werte), "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <Seo
        titelFertig
        title={TEILE_AGENT_TITEL}
        description={TEILE_AGENT_BESCHREIBUNG}
        canonical={TEILE_AGENT_URL}
        jsonLd={TEILE_AGENT_FAQ_LD}
      />

      <section className="section-dark">
        <div className="container py-12 sm:py-20 max-w-3xl">
          <p className="text-gold-accent font-semibold tracking-wide uppercase text-sm mb-4">
            WhatsApp · Autoteile
          </p>
          <h1 className="text-3xl sm:text-5xl leading-tight mb-4">{TEILE_AGENT_H1}</h1>
          <p className="text-white/70 text-base sm:text-lg leading-relaxed max-w-xl">{TEILE_AGENT_LEAD}</p>
          <ul className="mt-6 flex flex-col gap-2">
            {TEILE_AGENT_CLAIMS.map((claim) => (
              <li key={claim} className="flex items-start gap-2 text-sm sm:text-base font-semibold text-white/90">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-bright" aria-hidden="true" />
                {claim}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-white/70">
            WhatsApp{" "}
            <a
              href={CHAT}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-accent font-bold text-xl tracking-wide hover:underline"
            >
              {WHATSAPP_ANZEIGE}
            </a>
            <span className="mx-2 text-white/30">·</span>
            <a href={`tel:${WHATSAPP_TEL}`} className="underline underline-offset-2 hover:text-white">
              Anrufen
            </a>
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a href="#anfrage" className="btn-gold-bright">
              Anfrage starten
            </a>
            <a
              href={CHAT}
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-white/10 text-white hover:bg-white/20"
            >
              <MessageCircle className="w-5 h-5" /> WhatsApp-Chat öffnen
            </a>
          </div>
        </div>
      </section>

      <section id="anfrage" className="container py-12 sm:py-16 scroll-mt-28">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl mb-2">Was brauchst du?</h2>
          <p className="text-muted-foreground mb-6">
            Das Formular bleibt im Browser. Gespeichert wird nichts — die Angaben stehen in der WhatsApp-Nachricht.
          </p>
          <form onSubmit={senden} className="card-tilt hover:translate-y-0 p-5 sm:p-8" noValidate>
            <div className="grid sm:grid-cols-2 gap-4">
              <Feld id="marke" name="marke" label="Automarke" value={werte.marke} maxLength={FELD_MAX.marke} onChange={aendern} autoComplete="off" />
              <Feld id="modell" name="modell" label="Modell" value={werte.modell} maxLength={FELD_MAX.modell} onChange={aendern} autoComplete="off" />
              <Feld id="baujahr" name="baujahr" label="Baujahr" value={werte.baujahr} maxLength={FELD_MAX.baujahr} onChange={aendern} inputMode="numeric" autoComplete="off" />
              <Feld id="plz" name="plz" label="PLZ" value={werte.plz} maxLength={FELD_MAX.plz} onChange={aendern} inputMode="numeric" autoComplete="postal-code" optional />
              <Feld id="hsn" name="hsn" label="HSN" value={werte.hsn} maxLength={FELD_MAX.hsn} onChange={aendern} inputMode="numeric" autoComplete="off" optional hint="Schlüsselnummer aus dem Fahrzeugschein" />
              <Feld id="tsn" name="tsn" label="TSN" value={werte.tsn} maxLength={FELD_MAX.tsn} onChange={aendern} autoComplete="off" optional />
            </div>
            <div className="mt-4">
              <Feld
                id="fin"
                name="fin"
                label="FIN"
                value={werte.fin}
                maxLength={24}
                onChange={aendern}
                autoComplete="off"
                optional
                hint="Alternativ zu HSN und TSN, 17 Stellen"
                className="uppercase"
              />
            </div>
            <div className="mt-4">
              <Feld
                id="teil"
                name="teil"
                label="Gesuchtes Teil"
                value={werte.teil}
                maxLength={FELD_MAX.teil}
                onChange={aendern}
                autoComplete="off"
                pflicht
                fehler={fehler}
              />
            </div>
            <label className="block mt-4" htmlFor="anmerkung">
              <span className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-semibold">
                Anmerkung
                <span className="font-normal text-muted-foreground">optional</span>
              </span>
              <textarea
                id="anmerkung"
                name="anmerkung"
                value={werte.anmerkung}
                onChange={aendern}
                maxLength={FELD_MAX.anmerkung}
                rows={3}
                className="input-base py-3"
              />
            </label>
            <div className="mt-6 flex flex-col gap-3">
              <button type="submit" className="btn-gold-bright w-full">
                <MessageCircle className="w-5 h-5" /> Per WhatsApp anfragen
              </button>
              <a
                href={CHAT}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline w-full"
              >
                WhatsApp-Chat öffnen
              </a>
              <p className="text-center text-sm text-muted-foreground">
                WhatsApp {WHATSAPP_ANZEIGE}
              </p>
            </div>
          </form>
        </div>
      </section>

      <section className="container pb-12 sm:pb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl mb-6">So funktioniert&apos;s</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {TEILE_AGENT_SCHRITTE.map((schritt, index) => (
              <li key={schritt.titel} className="card-tilt hover:translate-y-0 p-5">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {index + 1}
                </span>
                <h3 className="text-base font-bold leading-snug mb-2">{schritt.titel}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{schritt.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container pb-12 sm:pb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl mb-6">Häufige Fragen</h2>
          <div className="space-y-3">
            {TEILE_AGENT_FAQ.map((eintrag, index) => {
              const auf = offen === index;
              return (
                <div key={eintrag.q} className="card-tilt hover:translate-y-0 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOffen(auf ? null : index)}
                    className="w-full flex items-center justify-between gap-3 p-5 text-left font-semibold min-h-[56px]"
                    aria-expanded={auf}
                  >
                    {eintrag.q}
                    <ChevronDown className={cn("w-5 h-5 shrink-0 transition-transform", auf && "rotate-180")} />
                  </button>
                  {auf ? <p className="px-5 pb-5 text-muted-foreground leading-relaxed">{eintrag.a}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container pb-16">
        <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card p-5 sm:p-6 flex gap-4">
          <Shield className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg mb-2">Datenschutz</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {TEILE_AGENT_DATENSCHUTZ}{" "}
              <Link to="/datenschutz" className="text-primary font-semibold underline underline-offset-2">
                Zur Datenschutzerklärung
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Feld({
  id,
  name,
  label,
  value,
  onChange,
  maxLength,
  autoComplete,
  inputMode,
  hint,
  optional,
  pflicht,
  fehler,
  className,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  maxLength: number;
  autoComplete?: string;
  inputMode?: "numeric" | "text";
  hint?: string;
  optional?: boolean;
  pflicht?: boolean;
  fehler?: string;
  className?: string;
}) {
  const hinweisId = hint ? `${id}-hinweis` : undefined;
  const fehlerId = fehler ? `${id}-fehler` : undefined;
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-semibold">
        {label}
        {pflicht ? (
          <span className="text-primary">Pflicht</span>
        ) : optional ? (
          <span className="font-normal text-muted-foreground">optional</span>
        ) : null}
      </span>
      <input
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={pflicht}
        aria-invalid={fehler ? true : undefined}
        aria-describedby={[hinweisId, fehlerId].filter(Boolean).join(" ") || undefined}
        className={cn("input-base", className)}
      />
      {hint ? (
        <span id={hinweisId} className="mt-1 block text-xs text-muted-foreground">
          {hint}
        </span>
      ) : null}
      {fehler ? (
        <span id={fehlerId} role="alert" className="mt-1 block text-sm font-semibold text-destructive">
          {fehler}
        </span>
      ) : null}
    </label>
  );
}
