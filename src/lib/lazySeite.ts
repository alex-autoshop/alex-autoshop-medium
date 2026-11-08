import { lazy, type ComponentType } from "react";
import { istChunkFehler, seiteNeuLaden } from "../../shared/abruf.js";

function warten(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function mitFrist<T>(arbeit: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      const fehler = new Error("chunk-timeout");
      fehler.name = "ChunkLoadError";
      reject(fehler);
    }, ms);
    arbeit.then(
      (wert) => {
        window.clearTimeout(timer);
        resolve(wert);
      },
      (fehler) => {
        window.clearTimeout(timer);
        reject(fehler);
      },
    );
  });
}

/** Dynamischer Import: zweimal versuchen, danach einmal neu laden. */
export function importMitRetry<T>(laden: () => Promise<T>): Promise<T> {
  const versuch = (n: number): Promise<T> =>
    mitFrist(laden(), 8000).catch((fehler: unknown) => {
      const netz = fehler instanceof TypeError || istChunkFehler(fehler);
      if (!netz || n >= 2) {
        if (istChunkFehler(fehler) && seiteNeuLaden()) return new Promise(() => {});
        throw fehler;
      }
      return warten(300 * n).then(() => versuch(n + 1));
    });
  return versuch(1);
}

export function lazySeite(laden: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(() => importMitRetry(laden));
}
