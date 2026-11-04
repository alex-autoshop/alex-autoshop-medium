import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apListManufacturers, apListModels, apListTypes, type ApVinCandidate } from "@/lib/autoparts";

/**
 * Marke, Modell, Motor — wenn HSN/TSN oder FIN nicht zur Hand sind.
 * Die Typ-ID kommt aus dem TecDoc-Katalog, nicht aus der ersten Zeile einer Liste.
 */
export function FahrzeugWahl({ onPick }: { onPick: (v: ApVinCandidate) => void }) {
  const [marken, setMarken] = useState<Array<{ id: number; name: string }>>([]);
  const [modelle, setModelle] = useState<Array<{ id: number; name: string }>>([]);
  const [typen, setTypen] = useState<ApVinCandidate[]>([]);
  const [marke, setMarke] = useState("");
  const [modell, setModell] = useState("");
  const [laedt, setLaedt] = useState<"marken" | "modelle" | "typen" | "">("marken");
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    let lebt = true;
    apListManufacturers()
      .then((m) => { if (lebt) setMarken(m); })
      .catch(() => { if (lebt) setFehler("Marken konnten nicht geladen werden."); })
      .finally(() => { if (lebt) setLaedt(""); });
    return () => { lebt = false; };
  }, []);

  const waehleMarke = (id: string) => {
    setMarke(id);
    setModell("");
    setModelle([]);
    setTypen([]);
    if (!id) return;
    setLaedt("modelle");
    setFehler("");
    apListModels(Number(id))
      .then(setModelle)
      .catch(() => setFehler("Modelle konnten nicht geladen werden."))
      .finally(() => setLaedt(""));
  };

  const waehleModell = (id: string) => {
    setModell(id);
    setTypen([]);
    if (!id) return;
    setLaedt("typen");
    setFehler("");
    apListTypes(Number(id))
      .then(setTypen)
      .catch(() => setFehler("Motoren konnten nicht geladen werden."))
      .finally(() => setLaedt(""));
  };

  return (
    <div className="space-y-3 text-left">
      <label className="block">
        <span className="text-xs text-muted-foreground font-medium mb-1.5 block">Marke</span>
        <select value={marke} onChange={(e) => waehleMarke(e.target.value)} className="input-base w-full h-11" disabled={laedt === "marken"}>
          <option value="">{laedt === "marken" ? "Marken werden geladen …" : "Marke wählen"}</option>
          {marken.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-xs text-muted-foreground font-medium mb-1.5 block">Modell</span>
        <select value={modell} onChange={(e) => waehleModell(e.target.value)} className="input-base w-full h-11" disabled={!marke || laedt === "modelle"}>
          <option value="">{laedt === "modelle" ? "Modelle werden geladen …" : "Modell wählen"}</option>
          {modelle.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <div>
        <span className="text-xs text-muted-foreground font-medium mb-1.5 block">Motor</span>
        {laedt === "typen" && (
          <p className="text-xs text-muted-foreground flex items-center gap-2 py-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Motoren werden geladen …</p>
        )}
        {typen.length > 0 && (
          <div className="max-h-52 overflow-y-auto rounded-xl border border-border divide-y divide-border">
            {typen.map((t) => (
              <button
                key={t.vehicleId}
                type="button"
                onClick={() => onPick(t)}
                className="w-full text-left px-3 py-2.5 hover:bg-primary/10 text-sm"
              >
                <span className="font-semibold">{t.typeName || "Variante"}</span>
                <span className="block text-xs text-muted-foreground">
                  {[t.ps && `${t.ps} PS`, t.power && `${t.power} kW`, t.fuel, t.bodyType, t.buildFrom && `ab ${t.buildFrom.slice(0, 7)}`, t.engineCodes].filter(Boolean).join(" · ")}
                </span>
              </button>
            ))}
          </div>
        )}
        {modell && laedt !== "typen" && typen.length === 0 && !fehler && (
          <p className="text-xs text-muted-foreground py-2">Für dieses Modell liegen keine Motoren im Katalog.</p>
        )}
      </div>
      {fehler && <p className="text-xs text-destructive">{fehler}</p>}
    </div>
  );
}
