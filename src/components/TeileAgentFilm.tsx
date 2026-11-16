import { useEffect, useRef, useState } from "react";
import {
  TEILE_AGENT_FILM_ALT,
  TEILE_AGENT_FILM_LABEL,
  TEILE_AGENT_FILM_TEXT,
} from "../../shared/teile-agent.js";

const FILM = "/media/teile-agent.mp4";
const POSTER = "/media/teile-agent-poster.webp";

function bewegungReduziert() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function TeileAgentFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ruhe, setRuhe] = useState(bewegungReduziert);
  const [gestartet, setGestartet] = useState(false);
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
    const tonSync = () => setTon(!el.muted);
    el.addEventListener("volumechange", tonSync);
    el.muted = true;
    el.play().catch(() => {});
    return () => {
      el.removeEventListener("volumechange", tonSync);
    };
  }, [zeigen]);

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
      <figure className="w-full">
        <img
          src={POSTER}
          alt={TEILE_AGENT_FILM_ALT}
          width={720}
          height={960}
          decoding="async"
          className="aspect-[3/4] h-auto w-full bg-night object-cover sm:rounded-2xl lg:h-[calc(100svh-12rem)] lg:w-auto"
        />
        <button type="button" onClick={() => setGestartet(true)} className="btn-gold-bright mt-3 w-full">
          Film abspielen
        </button>
        <figcaption className="sr-only">{TEILE_AGENT_FILM_LABEL}</figcaption>
        <p className="sr-only">{TEILE_AGENT_FILM_TEXT}</p>
      </figure>
    );
  }

  return (
    <figure className="w-full">
      <div className="relative">
        <video
          ref={videoRef}
          className="aspect-[3/4] h-auto w-full bg-night object-contain sm:rounded-2xl lg:h-[calc(100svh-12rem)] lg:w-auto"
          width={1080}
          height={1440}
          muted
          autoPlay={!ruhe}
          loop
          playsInline
          controls
          preload="metadata"
          poster={POSTER}
          aria-label={TEILE_AGENT_FILM_LABEL}
        >
          <source src={FILM} type="video/mp4" />
        </video>
        <button
          type="button"
          onClick={tonSchalten}
          className="btn-gold-bright absolute bottom-16 right-3 z-10 min-h-12 shadow-lg"
          aria-pressed={ton}
        >
          {ton ? "Ton aus" : "Ton an"}
        </button>
      </div>
      <figcaption className="sr-only">{TEILE_AGENT_FILM_LABEL}</figcaption>
      <p className="sr-only">{TEILE_AGENT_FILM_TEXT}</p>
    </figure>
  );
}
