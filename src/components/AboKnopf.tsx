import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { BadgePercent, Check } from "lucide-react";
import { toast } from "sonner";
import { ABO_RABATTE } from "../../shared/produktabo.js";
import { useAuth } from "@/context/AuthContext";
import {
  aboHinweisGesehen,
  aboHinweisMerken,
  aboListeLesen,
  aboProduktMerken,
  ABO_EREIGNIS,
  type AboMerkProdukt,
} from "@/lib/aboListe";
import { cn } from "@/lib/utils";

const MAX_RABATT = Math.max(...ABO_RABATTE);
const prozent = (n: number) => `${n}\u00a0%`;
const STUFEN = `${prozent(ABO_RABATTE[0])}, ${prozent(ABO_RABATTE[1])} oder ${prozent(ABO_RABATTE[2])}`;
const HINWEIS = `Ins Produkt-Abo legen – bis zu ${prozent(MAX_RABATT)} Rabatt bei jeder Bestellung`;

let hinweisVergeben = false;

function ruhigeBewegung() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AboKnopf({ produkt, className, kurz = false }: {
  produkt: AboMerkProdukt;
  className?: string;
  /** Schmale Karte: nur „+ Abo“ statt des langen Textes. */
  kurz?: boolean;
}) {
  const { user, profile } = useAuth();
  const mitglied = !!user && (profile.membership_level ?? 0) >= 1;
  const knopf = useRef<HTMLButtonElement>(null);
  const blase = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const hinweisId = useId();
  const [drin, setDrin] = useState(false);
  const [gerade, setGerade] = useState(false);
  const [hinweis, setHinweis] = useState(false);
  const [puls, setPuls] = useState(false);
  const [blatt, setBlatt] = useState(false);
  const [ort, setOrt] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const sync = () => setDrin(aboListeLesen().produkte.some((p) => p.id === produkt.id));
    sync();
    window.addEventListener(ABO_EREIGNIS, sync);
    return () => window.removeEventListener(ABO_EREIGNIS, sync);
  }, [produkt.id]);

  useEffect(() => {
    const el = knopf.current;
    if (!el || hinweisVergeben || aboHinweisGesehen() || typeof IntersectionObserver === "undefined") return;
    const beobachter = new IntersectionObserver((eintraege) => {
      if (!eintraege.some((e) => e.isIntersecting) || hinweisVergeben || aboHinweisGesehen()) return;
      hinweisVergeben = true;
      aboHinweisMerken();
      setHinweis(true);
      if (!ruhigeBewegung()) setPuls(true);
    }, { threshold: 0.6 });
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!hinweis) return;
    const legen = () => {
      const r = knopf.current?.getBoundingClientRect();
      if (!r) return;
      const breit = Math.min(260, window.innerWidth - 16);
      const left = Math.min(Math.max(8, r.left), window.innerWidth - breit - 8);
      const top = Math.min(r.bottom + 8, window.innerHeight - 16);
      setOrt({ top, left });
    };
    legen();
    window.addEventListener("scroll", legen, true);
    window.addEventListener("resize", legen);
    return () => {
      window.removeEventListener("scroll", legen, true);
      window.removeEventListener("resize", legen);
    };
  }, [hinweis]);

  useEffect(() => {
    if (!hinweis) return;
    const weg = (e: Event) => {
      const ziel = e.target as Node | null;
      if (ziel && (blase.current?.contains(ziel) || knopf.current?.contains(ziel))) return;
      setHinweis(false);
    };
    const timer = window.setTimeout(() => setHinweis(false), 5000);
    document.addEventListener("pointerdown", weg);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", weg);
    };
  }, [hinweis]);

  useEffect(() => {
    if (!blatt) return;
    const vorher = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const zu = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBlatt(false);
    };
    document.addEventListener("keydown", zu);
    return () => {
      document.removeEventListener("keydown", zu);
      vorher?.focus();
    };
  }, [blatt]);

  const klick = () => {
    setHinweis(false);
    const ergebnis = aboProduktMerken(produkt);
    if (ergebnis === "voll") {
      toast.error("Die Abo-Liste ist voll.");
      return;
    }
    if (ergebnis === "leer") return;
    setGerade(true);
    window.setTimeout(() => setGerade(false), 1600);
    if (ergebnis === "neu") toast.success("In die Abo-Liste gelegt", { description: produkt.titel });
    else toast.success("Schon in der Abo-Liste", { description: produkt.titel });
    if (!mitglied) setBlatt(true);
  };

  return (
    <>
      <button
        ref={knopf}
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); klick(); }}
        aria-label={drin ? "Im Abo" : "Zum Produkt-Abo hinzufügen"}
        aria-describedby={hinweis ? hinweisId : undefined}
        aria-pressed={drin}
        className={cn(
          "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-primary bg-card px-2 min-h-12",
          "text-sm font-semibold text-primary hover:bg-primary/10 active:scale-[0.98]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          puls && "abo-puls",
          className
        )}
      >
        {gerade || drin
          ? <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
          : <BadgePercent className="w-4 h-4 shrink-0" aria-hidden="true" />}
        <span className="truncate">{drin || gerade ? "Im Abo ✓" : kurz ? "+ Abo" : "Zum Abo hinzufügen"}</span>
      </button>

      {hinweis && createPortal(
        <div
          ref={blase}
          id={hinweisId}
          role="tooltip"
          style={{ top: ort.top, left: ort.left, maxWidth: "min(16rem, calc(100vw - 1rem))" }}
          className="fixed z-50 rounded-2xl bg-night text-[#EDE9E3] border border-gold-bright/40 shadow-card p-3 text-sm leading-snug"
        >
          <p>{HINWEIS}</p>
          <Link to="/mitgliedschaft" className="mt-2 inline-block font-semibold text-gold-bright underline underline-offset-2">
            So funktioniert die Mitgliedschaft
          </Link>
        </div>,
        document.body
      )}

      {blatt && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-6">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Schließen" onClick={() => setBlatt(false)} />
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="abo-erklaerung"
            tabIndex={-1}
            className="relative w-full max-w-md rounded-2xl bg-[#FAF9F7] text-[#1a1a1a] p-5 sm:p-6 shadow-card outline-none"
          >
            <h2 id="abo-erklaerung" className="font-display text-xl sm:text-2xl mb-3">Produkt-Abo</h2>
            <ol className="space-y-2 text-sm leading-relaxed">
              <li>1. Du suchst dir die Produkte aus.</li>
              <li>2. Für jedes Produkt wählst du {STUFEN}.</li>
              <li>3. Du sparst bei jeder Bestellung. Der Versand im Shop ist kostenlos.</li>
            </ol>
            <p className="mt-3 text-sm text-neutral-600">„{produkt.titel}“ liegt in deiner Abo-Liste.</p>
            <div className="mt-5 flex flex-col sm:flex-row gap-2">
              <Link to="/mitgliedschaft" className="btn-primary text-sm">Zur Mitgliedschaft</Link>
              <button type="button" onClick={() => setBlatt(false)} className="btn-outline text-sm">Schließen</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
