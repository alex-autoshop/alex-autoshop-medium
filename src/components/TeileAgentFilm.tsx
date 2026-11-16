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
  const [pausiert, setPausiert] = useState(true);
  const zeigen = !ruhe || gestartet;
  const rahmen = "rounded-2xl ring-2 ring-[#F2E85C] shadow-[0_0_28px_rgba(242,232,92,0.45)]";

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
    const stand = () => setPausiert(el.paused);
    el.addEventListener("volumechange", tonSync);
    el.addEventListener("play", stand);
    el.addEventListener("pause", stand);
    el.muted = true;
    el.play().catch(() => setPausiert(true));
    return () => {
      el.removeEventListener("volumechange", tonSync);
      el.removeEventListener("play", stand);
      el.removeEventListener("pause", stand);
    };
  }, [zeigen]);

  function abspielen() {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    setTon(false);
    el.play().catch(() => setPausiert(true));
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
      <figure className="relative w-full">
        <img
          src={POSTER}
          alt={TEILE_AGENT_FILM_ALT}
          width={720}
          height={960}
          decoding="async"
          className={`aspect-[3/4] h-auto w-full bg-night object-cover lg:h-[calc(100svh-12rem)] lg:w-auto ${rahmen}`}
        />
        <button
          type="button"
          onClick={() => setGestartet(true)}
          className="absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg"
          style={{ background: "#F2E85C" }}
          aria-label="Film abspielen"
        >
          <span className="ml-1 block border-y-[16px] border-l-[26px] border-y-transparent border-l-[#14120b]" />
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
          className={`aspect-[3/4] h-auto w-full bg-night object-contain lg:h-[calc(100svh-12rem)] lg:w-auto ${rahmen}`}
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
        {pausiert ? (
          <button
            type="button"
            onClick={abspielen}
            className="absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg"
            style={{ background: "#F2E85C" }}
            aria-label="Film abspielen"
          >
            <span className="ml-1 block border-y-[16px] border-l-[26px] border-y-transparent border-l-[#14120b]" />
          </button>
        ) : null}
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
