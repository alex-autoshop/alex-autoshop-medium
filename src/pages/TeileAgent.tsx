import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, MapPin, MessageCircle, Phone, Shield } from "lucide-react";
import { Seo } from "@/components/Seo";
import { TeileAgentFilm } from "@/components/TeileAgentFilm";
import { WhatsAppBeispiel } from "@/components/WhatsAppBeispiel";
import { SHOP_INFO } from "@/data/shopInfo";
import { cn } from "@/lib/utils";
import {
  NACHRICHT_MAX,
  WHATSAPP_ANZEIGE,
  WHATSAPP_TEL,
  anfrageBereit,
  whatsappAnfrageUrl,
} from "../../shared/whatsapp-anfrage.js";
import {
  TEILE_AGENT_BESTPREIS,
  TEILE_AGENT_BESCHREIBUNG,
  TEILE_AGENT_CODE_CTA,
  TEILE_AGENT_CODE_KLEIN,
  TEILE_AGENT_CODE_VORGABE,
  TEILE_AGENT_BUTTON,
  TEILE_AGENT_CLAIMS,
  TEILE_AGENT_DATENSCHUTZ,
  TEILE_AGENT_FAQ,
  TEILE_AGENT_FAQ_LD,
  TEILE_AGENT_FILM_LD,
  TEILE_AGENT_H1,
  TEILE_AGENT_HINTER,
  TEILE_AGENT_HINWEIS,
  TEILE_AGENT_LEAD,
  TEILE_AGENT_PLATZHALTER,
  TEILE_AGENT_SCHRITTE,
  TEILE_AGENT_TIPPS,
  TEILE_AGENT_TITEL,
  TEILE_AGENT_URL,
  TEILE_AGENT_VERGLEICH,
} from "../../shared/teile-agent.js";

const CHAT = whatsappAnfrageUrl(TEILE_AGENT_CODE_VORGABE);

function nachrichtMitCode(wert: string) {
  if (/BESTERMANN15/i.test(wert)) return wert;
  return `${wert.trim()}\nCode: BESTERMANN15`;
}
const POSTER = "/media/teile-agent-poster.jpg";

export default function TeileAgent() {
  const [text, setText] = useState("");
  const [fehler, setFehler] = useState("");
  const [offen, setOffen] = useState<number | null>(0);
  const bereit = anfrageBereit(text);

  function senden(event: FormEvent) {
    event.preventDefault();
    if (!anfrageBereit(text)) {
      setFehler("Bitte schreib kurz, was du brauchst.");
      document.getElementById("anfrage-text")?.focus();
      return;
    }
    setFehler("");
    window.location.assign(whatsappAnfrageUrl(nachrichtMitCode(text)));
  }

  return (
    <div>
      <Seo
        titelFertig
        title={TEILE_AGENT_TITEL}
        description={TEILE_AGENT_BESCHREIBUNG}
        canonical={TEILE_AGENT_URL}
        jsonLd={[TEILE_AGENT_FAQ_LD, TEILE_AGENT_FILM_LD]}
        preloadImage={POSTER}
        imageSizes="(min-width: 1024px) 380px, 92vw"
      />

      <section className="section-dark">
        <div className="container py-10 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,380px)] lg:items-center lg:gap-x-12">
            <div className="lg:col-start-1 lg:row-start-1">
              <p className="text-gold-accent font-semibold tracking-wide uppercase text-sm mb-4">
                WhatsApp · Autoteile
              </p>
              <h1 className="text-3xl sm:text-5xl leading-tight mb-4">{TEILE_AGENT_H1}</h1>
              <p className="text-white/70 text-base sm:text-lg leading-relaxed max-w-xl">{TEILE_AGENT_LEAD}</p>
              <p className="mt-5 max-w-xl rounded-xl border border-gold-bright/50 bg-white/10 px-4 py-3 text-base font-semibold leading-snug text-white sm:text-lg">
                {TEILE_AGENT_BESTPREIS}
              </p>
            </div>

            <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
              <TeileAgentFilm />
            </div>

            <div className="lg:col-start-1 lg:row-start-2">
              <ul className="flex flex-col gap-2">
                {TEILE_AGENT_CLAIMS.map((claim) => (
                  <li key={claim} className="flex items-start gap-2 text-sm sm:text-base font-semibold text-white/90">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-gold-bright" aria-hidden="true" />
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
          </div>
        </div>
      </section>

      <section id="anfrage" className="container py-12 sm:py-16 scroll-mt-28">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl mb-2">Was brauchst du?</h2>
          <p className="text-muted-foreground mb-6">
            Schreib einfach in das Feld. Gespeichert wird nichts — dein Text steht in der WhatsApp-Nachricht.
          </p>
          <form onSubmit={senden} className="card-tilt hover:translate-y-0 p-5 sm:p-8" noValidate>
            <label htmlFor="anfrage-text" className="mb-2 block text-sm font-semibold">
              Deine Anfrage
            </label>
            <textarea
              id="anfrage-text"
              name="anfrage"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                if (fehler) setFehler("");
              }}
              maxLength={NACHRICHT_MAX}
              rows={6}
              required
              placeholder={TEILE_AGENT_PLATZHALTER}
              aria-invalid={fehler ? true : undefined}
              aria-describedby={fehler ? "anfrage-hinweis anfrage-fehler" : "anfrage-hinweis"}
              className="input-base min-h-40 py-3 text-base leading-relaxed"
            />
            <p id="anfrage-hinweis" className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {TEILE_AGENT_HINWEIS}
            </p>
            {fehler ? (
              <p id="anfrage-fehler" role="alert" className="mt-2 text-sm font-semibold text-destructive">
                {fehler}
              </p>
            ) : null}
            <button type="submit" className="btn-gold-bright mt-6 w-full text-balance" disabled={!bereit}>
              <MessageCircle className="w-5 h-5" /> {TEILE_AGENT_BUTTON}
            </button>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              WhatsApp {WHATSAPP_ANZEIGE}
            </p>
          </form>
          <aside className="mt-6 rounded-2xl border border-primary/30 bg-card p-5 sm:p-6">
            <p className="text-lg font-semibold leading-snug">{TEILE_AGENT_CODE_CTA}</p>
            <a href={CHAT} target="_blank" rel="noopener noreferrer" className="btn-gold-bright mt-4 w-full">
              <MessageCircle className="w-5 h-5" /> WhatsApp mit Code öffnen
            </a>
            <p className="mt-3 text-sm text-muted-foreground">{TEILE_AGENT_CODE_KLEIN}</p>
          </aside>
        </div>
      </section>

      <section className="container pb-12 sm:pb-16" aria-labelledby="beispiel-titel">
        <div className="max-w-3xl mx-auto">
          <h2 id="beispiel-titel" className="text-2xl sm:text-3xl mb-2">So schreiben Kunden wirklich</h2>
          <p className="text-muted-foreground mb-4">Schein fotografieren, kurz schreiben, oder das alte Teil zeigen.</p>
          <WhatsAppBeispiel />
        </div>
      </section>

      <section className="container pb-12 sm:pb-16" aria-labelledby="vergleich-titel">
        <div className="max-w-3xl mx-auto">
          <h2 id="vergleich-titel" className="text-2xl sm:text-3xl mb-2">{TEILE_AGENT_VERGLEICH.titel}</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">{TEILE_AGENT_VERGLEICH.lead}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="card-tilt hover:translate-y-0 p-5 sm:p-6">
              <h3 className="text-lg mb-3">{TEILE_AGENT_VERGLEICH.klassischTitel}</h3>
              <ul className="grid gap-3">
                {TEILE_AGENT_VERGLEICH.klassisch.map((punkt) => (
                  <li key={punkt} className="flex items-start gap-2 text-sm leading-relaxed">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" aria-hidden="true" />
                    {punkt}
                  </li>
                ))}
              </ul>
            </article>
            <article className="card-tilt hover:translate-y-0 border-primary/40 p-5 sm:p-6">
              <h3 className="text-lg mb-3">{TEILE_AGENT_VERGLEICH.agentTitel}</h3>
              <ul className="grid gap-3">
                {TEILE_AGENT_VERGLEICH.agent.map((punkt) => (
                  <li key={punkt} className="flex items-start gap-2 text-sm leading-relaxed">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {punkt}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="container pb-12 sm:pb-16" aria-labelledby="tipps-titel">
        <div className="max-w-3xl mx-auto">
          <h2 id="tipps-titel" className="text-2xl sm:text-3xl mb-2">{TEILE_AGENT_TIPPS.titel}</h2>
          <p className="text-muted-foreground mb-6">{TEILE_AGENT_TIPPS.lead}</p>
          <ol className="grid gap-4">
            {TEILE_AGENT_TIPPS.punkte.map((punkt, index) => (
              <li key={punkt.titel} className="card-tilt hover:translate-y-0 flex gap-4 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-base font-bold leading-snug mb-1">{punkt.titel}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{punkt.text}</p>
                </div>
              </li>
            ))}
          </ol>
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

      <section className="container pb-12 sm:pb-16" aria-labelledby="hinter-titel">
        <div className="max-w-3xl mx-auto">
          <h2 id="hinter-titel" className="text-2xl sm:text-3xl mb-2">Wer steckt dahinter</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">{TEILE_AGENT_HINTER}</p>
          <div className="card-tilt hover:translate-y-0 p-5 sm:p-6 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="font-display text-2xl leading-tight">{SHOP_INFO.name}</p>
              <p className="mt-2 text-sm text-muted-foreground">Inhaber: {SHOP_INFO.owner}</p>
              <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  {SHOP_INFO.street}
                  <br />
                  {SHOP_INFO.zip} {SHOP_INFO.city}
                </span>
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <a href={`tel:${SHOP_INFO.phoneIntl}`} className="font-semibold text-primary hover:underline">
                  {SHOP_INFO.phone}
                </a>
              </p>
              <p className="mt-2 text-sm">
                <a href={`mailto:${SHOP_INFO.email}`} className="font-semibold text-primary hover:underline">
                  {SHOP_INFO.email}
                </a>
              </p>
            </div>
            <div>
              <p className="font-semibold mb-2">Öffnungszeiten</p>
              <ul className="grid gap-1 text-sm text-muted-foreground">
                {SHOP_INFO.hours.map((zeit) => (
                  <li key={zeit.days} className="flex justify-between gap-4">
                    <span>{zeit.days}</span>
                    <span className="text-foreground">{zeit.time}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link to="/laden" className="btn-outline">Laden & Kontakt</Link>
                <Link to="/impressum" className="btn-outline">Impressum</Link>
              </div>
            </div>
          </div>
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
