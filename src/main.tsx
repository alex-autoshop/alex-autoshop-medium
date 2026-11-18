// Fonts self-hosted (@fontsource) — kein Google-Fonts-Request, DSGVO-sauber + schneller
import "@fontsource/syne/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { istChunkFehler, seiteNeuLaden } from "../shared/abruf.js";
import App from "./App";
import "./index.css";

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

/** Die Schale malt mit eingebautem CSS. Das große Stylesheet blockiert das nicht mehr,
 *  React wartet aber, damit die echte Seite nicht ungestylt aufblitzt. */
function cssBereit(): Promise<void> {
  const fenster = window as Window & { __aaCss?: number };
  if (fenster.__aaCss) return Promise.resolve();
  const link = document.querySelector<HTMLLinkElement>("link[data-aa-css]");
  if (!link) return Promise.resolve();
  if (link.rel === "stylesheet" && link.sheet) return Promise.resolve();
  return new Promise((resolve) => {
    const fertig = () => resolve();
    link.addEventListener("load", () => requestAnimationFrame(() => requestAnimationFrame(fertig)), { once: true });
    link.addEventListener("error", fertig, { once: true });
    window.setTimeout(fertig, 2500);
  });
}

window.addEventListener("vite:preloadError", (event) => {
  const fehler = (event as Event & { payload?: unknown }).payload;
  if (fehler && !istChunkFehler(fehler)) return;
  event.preventDefault();
  seiteNeuLaden();
});

cssBereit().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
