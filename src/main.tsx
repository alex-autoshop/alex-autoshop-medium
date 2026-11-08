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

window.addEventListener("vite:preloadError", (event) => {
  const fehler = (event as Event & { payload?: unknown }).payload;
  if (fehler && !istChunkFehler(fehler)) return;
  event.preventDefault();
  seiteNeuLaden();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
