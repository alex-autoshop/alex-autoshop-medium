// Fonts self-hosted (@fontsource) — kein Google-Fonts-Request, DSGVO-sauber + schneller
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import syne700 from "@fontsource/syne/files/syne-latin-700-normal.woff2?url";
import dm400 from "@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2?url";

for (const href of [syne700, dm400]) {
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "font";
  link.type = "font/woff2";
  link.crossOrigin = "anonymous";
  link.href = href;
  document.head.appendChild(link);
}
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Page-Preloader ausblenden sobald React gemountet ist
requestAnimationFrame(() => {
  const preloader = document.getElementById("page-preloader");
  if (preloader) {
    preloader.classList.add("fade-out");
    setTimeout(() => preloader.remove(), 500);
  }
});
