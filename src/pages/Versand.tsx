import { Truck, Zap, Package, MapPin, Clock, CheckCircle2, Star, Info } from "lucide-react";
import { Seo } from "@/components/Seo";
import { DHL_EUR, VERSAND_FREI_AB } from "../../shared/versand.js";

const FREE_THRESHOLD = VERSAND_FREI_AB;
const DHL_RATE = DHL_EUR;
const LOCAL_BASE = 2.9;
const LOCAL_PER_KM = 0.29;

function ShippingBadge({ label, highlight = false }: { label: string; highlight?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        highlight
          ? "bg-primary/15 text-primary border border-primary/30"
          : "bg-secondary text-muted-foreground border border-border"
      }`}
    >
      {label}
    </span>
  );
}

export default function Versand() {
  return (
    <>
      <Seo
        title="Versand & Lieferung"
        description="Versandkosten bei Alex Autoshop: Teilebörse 7,49 € DHL für alle, frei ab 150 €. Im Shop ist der Versand für Mitglieder kostenlos."
      />

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

        {/* ── Header ── */}
        <div>
          <div className="inline-flex items-center gap-2 text-primary text-sm font-semibold mb-3">
            <Truck className="w-4 h-4" />
            Versand & Lieferung
          </div>
          <h1 className="text-3xl font-display font-bold">So kommt deine Bestellung zu dir</h1>
          <p className="text-muted-foreground mt-2">
            Wir liefern schnell, fair und transparent — ohne versteckte Kosten.
          </p>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex gap-4">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Star className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Mitgliedschaft gilt im Shop</p>
            <p className="text-muted-foreground text-sm mt-0.5">
              Mit aktiver bezahlter Mitgliedschaft (Level 1–3) ist der Versand im Shop kostenlos,
              auch unter {FREE_THRESHOLD} €. In der Teilebörse zahlt jeder {DHL_RATE.toFixed(2).replace(".", ",")} € DHL,
              frei ab {FREE_THRESHOLD} €. Die Teststunde ist kein kostenloser Shop-Versand.
            </p>
          </div>
        </div>

        {/* ── Versandoptionen ── */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Versandoptionen</h2>

          {/* DHL Standard */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">DHL Paketversand</p>
                  <p className="text-sm text-muted-foreground">Deutschlandweit · 1–3 Werktage</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-lg">{DHL_RATE.toFixed(2).replace(".", ",")} €</p>
                <p className="text-xs text-muted-foreground">pauschal</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
              <ShippingBadge label="Teilebörse: für alle gleich" highlight />
              <ShippingBadge label="Ab 150 € kostenlos" highlight />
              <ShippingBadge label="Shop: Mitglieder gratis" />
              <ShippingBadge label="Sendungsverfolgung inklusive" />
            </div>
          </div>

          {/* Eigene Lieferung */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">Alex Autoshop Lieferservice</p>
                  <p className="text-sm text-muted-foreground">Wuppertal & Umgebung · gleicher oder nächster Tag</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-lg">{LOCAL_BASE.toFixed(2).replace(".", ",")} €</p>
                <p className="text-xs text-muted-foreground">+ {LOCAL_PER_KM.toFixed(2).replace(".", ",")} €/km</p>
              </div>
            </div>

            {/* Km-Rechner Beispiele */}
            <div className="rounded-lg bg-secondary/60 p-3 grid grid-cols-3 gap-2 text-center text-sm">
              {[
                { km: 5, price: LOCAL_BASE + 5 * LOCAL_PER_KM },
                { km: 10, price: LOCAL_BASE + 10 * LOCAL_PER_KM },
                { km: 20, price: LOCAL_BASE + 20 * LOCAL_PER_KM },
                { km: 30, price: LOCAL_BASE + 30 * LOCAL_PER_KM },
                { km: 40, price: LOCAL_BASE + 40 * LOCAL_PER_KM },
                { km: 50, price: LOCAL_BASE + 50 * LOCAL_PER_KM },
              ].map(({ km, price }) => (
                <div key={km} className="space-y-0.5">
                  <p className="text-muted-foreground text-xs">{km} km</p>
                  <p className="font-semibold">{price.toFixed(2).replace(".", ",")} €</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
              <ShippingBadge label="Ab 150 € kostenlos" highlight />
              <ShippingBadge label="Shop: Mitglieder gratis" />
              <ShippingBadge label="Per WhatsApp koordiniert" />
            </div>
          </div>

          {/* Express */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Express-Lieferung</p>
                  <p className="text-sm text-muted-foreground">Wuppertal · 1–2 Stunden</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-lg">6,00 €</p>
                <p className="text-xs text-muted-foreground">pauschal</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
              <ShippingBadge label="Shop: Mitglieder gratis" />
              <ShippingBadge label="Auf Anfrage" />
              <ShippingBadge label="WhatsApp: 0202 82690" />
            </div>
          </div>

          {/* Abholung */}
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">Selbstabholung — immer kostenlos</p>
                <p className="text-sm text-muted-foreground">
                  Handelstraße 64 · 42277 Wuppertal · Mo–Fr 9–17:30, Sa 9–14
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Freigrenze-Übersicht ── */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Versandkostenfreiheit auf einen Blick
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Kundengruppe</th>
                  <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Bedingung</th>
                  <th className="text-left py-2 font-semibold text-muted-foreground">Ergebnis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Teilebörse, alle Kunden</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">Warenwert &lt; 150 €</td>
                  <td className="py-2.5 text-muted-foreground">{DHL_RATE.toFixed(2).replace(".", ",")} € DHL</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Teilebörse, alle Kunden</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">Warenwert ≥ 150 €</td>
                  <td className="py-2.5 font-semibold text-primary">Kostenlos ✓</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Online-Shop, Mitglied Level 1–3</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">Jede Shop-Bestellung</td>
                  <td className="py-2.5 font-semibold text-primary">Kostenlos ✓</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Online-Shop ohne Mitgliedschaft</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">Wie die Teilebörse</td>
                  <td className="py-2.5 text-muted-foreground">{DHL_RATE.toFixed(2).replace(".", ",")} €, frei ab 150 €</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Sendungsverfolgung ── */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Sendungsverfolgung
          </h2>
          <p className="text-sm text-muted-foreground">
            Bei DHL-Versand erhältst du nach dem Versand automatisch eine E-Mail mit deiner
            Sendungsnummer und einem direkten Link zur DHL-Sendungsverfolgung.
          </p>
          <p className="text-sm text-muted-foreground">
            Bei Lieferungen per eigenem Fahrservice koordinieren wir per{" "}
            <strong className="text-foreground">WhatsApp</strong> — du bekommst eine Nachricht,
            sobald wir losfahren.
          </p>
          <div className="flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-sm">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              Tracking-Links direkt in der Bestellbestätigung — kein separates Konto oder App nötig.
            </p>
          </div>
        </div>

        {/* ── Sonstiges ── */}
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="border-t border-border pt-6 space-y-3">
            <p>
              <strong className="text-foreground">Liefergebiet:</strong> Paketversand deutschlandweit.
              Österreich und Schweiz auf Anfrage (+49 202 82690). Die Kasse der Teilebörse
              bietet DHL innerhalb Deutschlands oder Abholung an. Dieselben Sätze stehen in den AGB.
            </p>
            <p>
              <strong className="text-foreground">Batteriepfand:</strong> für Starterbatterien in der
              Teilebörse 7,50 € je Stück. Einen Altteilpfand berechnen wir nicht.
            </p>
            <p>
              <strong className="text-foreground">Gefahrgut & Sperrgut:</strong> Lacke, Spraydosen
              und Verdünner versenden wir nach den ADR-Vorschriften. Einen Zuschlag, der erst
              nach der Bestellung dazukommt, gibt es nicht. Passt etwas nicht in den genannten
              Versand, sagen wir das vor der Bestellung.
            </p>
            <p>
              <strong className="text-foreground">Teillieferungen:</strong> Wenn Artikel getrennt
              gelagert sind, kann es zu Teillieferungen kommen — ohne zusätzliche Versandkosten.
            </p>
            <p>
              <strong className="text-foreground">DHL-Packstationen:</strong> Lieferung möglich.
              Postnummer und Packstationsnummer vollständig angeben.
            </p>
            <p>
              <strong className="text-foreground">Lieferverzögerungen:</strong> Bei Verzögerungen
              wirst du aktiv per WhatsApp oder E-Mail informiert.
            </p>
          </div>
        </div>

        <div id="entsorgung" className="rounded-xl border border-border bg-card p-5 space-y-3 text-sm">
          <h2 className="text-lg font-semibold">Rücknahme und Entsorgung</h2>
          <p className="text-muted-foreground">
            <strong className="text-foreground">Starterbatterien:</strong> Altbatterien nehmen wir
            im Laden zurück (Handelstraße 64, 42277 Wuppertal). Das Pfand von 7,50 € je
            Starterbatterie erstatten wir bei Rückgabe, die Rechnung bitte mitbringen.
          </p>
          <p className="text-muted-foreground">
            <strong className="text-foreground">Altöl:</strong> Verbrennungs- und Getriebeöl aus
            dem privaten Ölwechsel kannst du bei uns im Laden abgeben. Die Annahmestelle nennen
            wir auf Nachfrage auch, wenn der Behälter gerade voll ist. Altöl gehört nicht in den
            Ausguss.
          </p>
        </div>

      </div>
    </>
  );
}
