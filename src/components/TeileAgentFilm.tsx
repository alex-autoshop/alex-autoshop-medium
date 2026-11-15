import { useEffect, useRef, useState } from "react";
import {
  TEILE_AGENT_FILM_ALT,
  TEILE_AGENT_FILM_LABEL,
  TEILE_AGENT_FILM_TEXT,
} from "../../shared/teile-agent.js";

const FILM = "/media/teile-agent.mp4";
const POSTER = "/media/teile-agent-poster.jpg";

function bewegungReduziert() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function TeileAgentFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ruhe, setRuhe] = useState(bewegungReduziert);
  const [gestartet, setGestartet] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [ton, setTon] = useState(false);
  const zeigen = !ruhe || gestartet;

  useEffect(() => {
    const medien = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setRuhe(medien.matches);
    medien.addEventListener("change", sync);
    return () => medien.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !zeigen) return;
    const an = () => setLaeuft(true);
    const aus = () => setLaeuft(false);
    el.addEventListener("play", an);
    el.addEventListener("pause", aus);
    el.muted = true;
    el.play().catch(() => setLaeuft(false));
    return () => {
      el.removeEventListener("play", an);
      el.removeEventListener("pause", aus);
    };
  }, [zeigen]);

  function umschalten() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }

  function tonSchalten() {
    const el = videoRef.current;
    if (!el) return;
    const an = el.muted;
    el.muted = !an;
    setTon(an);
    if (an) el.play().catch(() => {});
  }

  if (!zeigen) {
    return (
      <figure className="mx-auto w-full max-w-[440px]">
        <img
          src={POSTER}
          alt={TEILE_AGENT_FILM_ALT}
          width={720}
          height={960}
          decoding="async"
          className="aspect-[3/4] w-full rounded-2xl border border-white/10 bg-night object-cover"
        />
        <button type="button" onClick={() => setGestartet(true)} className="btn-gold-bright mt-3 w-full">
          Film abspielen
        </button>
        <figcaption className="mt-3 text-center text-sm text-white/70">{TEILE_AGENT_FILM_LABEL}</figcaption>
        <p className="sr-only">{TEILE_AGENT_FILM_TEXT}</p>
      </figure>
    );
  }

  return (
    <figure className="mx-auto w-full max-w-[440px]">
      <div className="relative">
        <video
          ref={videoRef}
          className="aspect-[3/4] w-full rounded-2xl border border-white/10 bg-night object-contain"
          width={1080}
          height={1440}
          muted
          autoPlay={!ruhe}
          loop
          playsInline
          preload="metadata"
          poster={POSTER}
          aria-label={TEILE_AGENT_FILM_LABEL}
        >
          <source src={FILM} type="video/mp4" />
        </video>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <figcaption className="text-sm leading-snug text-white/70">{TEILE_AGENT_FILM_LABEL}</figcaption>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={tonSchalten}
            className="min-h-12 rounded-lg border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10"
            aria-pressed={ton}
          >
            {ton ? "Ton aus" : "Ton an"}
          </button>
          <button
            type="button"
            onClick={umschalten}
            className="min-h-12 rounded-lg border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10"
            aria-pressed={laeuft}
          >
            {laeuft ? "Pause" : "Abspielen"}
          </button>
        </div>
      </div>
      <p className="sr-only">{TEILE_AGENT_FILM_TEXT}</p>
    </figure>
  );
}
