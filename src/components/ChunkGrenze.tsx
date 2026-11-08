import { Component, type ReactNode } from "react";
import { istChunkFehler, seiteNeuLaden } from "../../shared/abruf.js";

interface Stand {
  fehler: unknown;
}

/** Fängt fehlende Seitenstücke ab (zum Beispiel nach einem neuen Stand) und lädt einmal neu. */
export class ChunkGrenze extends Component<{ children: ReactNode }, Stand> {
  state: Stand = { fehler: null };

  static getDerivedStateFromError(fehler: unknown): Stand {
    return { fehler };
  }

  componentDidCatch(fehler: unknown) {
    if (istChunkFehler(fehler)) seiteNeuLaden();
  }

  render() {
    const fehler = this.state.fehler;
    if (!fehler) return this.props.children;
    if (!istChunkFehler(fehler)) throw fehler;
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-6 text-center text-muted-foreground">
        <p>Die Seite wird neu geladen …</p>
        <button type="button" className="btn-outline" onClick={() => window.location.reload()}>
          Erneut laden
        </button>
      </div>
    );
  }
}
