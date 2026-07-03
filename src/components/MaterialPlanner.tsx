import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ShoppingCart,
  MessageCircle,
  Printer,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  AlertTriangle,
  Wand2,
  Car,
  Palette,
  Hand,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { usePlannerStore, type AIPlan, type AIPlanItem } from "@/stores/plannerStore";
import { useCartStore } from "@/stores/cartStore";
import { useAuth, type Vehicle } from "@/context/AuthContext";
import {
  storefrontApiRequest,
  STOREFRONT_PRODUCTS_QUERY,
  formatPrice,
  type ShopifyProduct,
} from "@/lib/shopify";
import { discountForLevel } from "@/data/memberships";
import { sendMessage } from "@/lib/inbox";
import { whatsappLink } from "@/data/shopInfo";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────
// AI-Materialplaner — 3 Schritte auf einer Page:
// 1. Projekt-Briefing (große Touch-Buttons, kein Tippen nötig)
//    + Erstuser-Tutorial + Fahrzeug-Garage + optionale Profi-Details
// 2. AI generiert Materialplan (/api/alex-ai, SSE-Stream)
// 3. Aktionen: Warenkorb, WhatsApp, Drucken, Neu planen
// ─────────────────────────────────────────────────────────────────────

const JOBS = ["Komplettlackierung", "Beilackierung", "Politur/Aufbereitung", "Karosserie/Spachtel", "Steinschlagschutz", "Andere..."];
const AREAS = ["Motorhaube", "Tür", "Stoßstange", "Komplettfahrzeug", "Heckklappe", "Dach", "Andere..."];
const QUALITIES = [
  { value: "Professionell (Standox/Sikkens)", label: "Professionell", sub: "Standox / Sikkens" },
  { value: "Mittelklasse (Mipa)", label: "Mittelklasse", sub: "Mipa" },
  { value: "Budget (FRIZ)", label: "Budget", sub: "FRIZ / Master" },
];
const PAINT_AMOUNTS = ["250 ml", "500 ml", "1 L", "2 L oder mehr"];
const SYSTEM_1K = "1K Basislack + Klarlack";
const PAINT_SYSTEMS = [SYSTEM_1K, "2K Decklack — ohne Klarlack", "Nur Basislack — Klarlack hab ich schon"];
const STOCK_PAINT = [
  "Abdeckband & Folie",
  "Schleifmittel",
  "Verdünnung",
  "Silikonentferner",
  "Härter",
  "Spachtel",
  "Poliermittel",
  "Grundierung / Füller",
  "Mischbecher & Siebe",
  "Handschuhe & Tücher",
];
const STOCK_POLISH = ["Poliermittel", "Polierpads", "Mikrofasertücher", "Silikonentferner", "Felgenreiniger", "Abdeckband"];
const TOOLS_PAINT = ["Lackierpistole (Set)", "Exzenterschleifer", "Poliermaschine (Set)"];
const TOOLS_POLISH = ["Poliermaschine (Set)", "Exzenterschleifer"];
const CLEARCOATS = [
  { label: "FRIZ 2K — 13€", value: "FRIZ 2K-Klarlack 500ml" },
  { label: "Mipa CX4 Express — 29,95€", value: "Mipa CX4 Express-Klarlack 1L" },
  { label: "Master HS 5L — 65€", value: "Master HS Klarlack 5L" },
];

const LOADING_STEPS = [
  "Projekt wird analysiert …",
  "Mengen werden kalkuliert …",
  "Produkte aus dem Sortiment gewählt …",
  "Preise werden geprüft …",
];

const TUTORIAL_KEY = "aiplanner-tutorial-done";

// Framer Motion Varianten für Step-Übergänge
const stepVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

let aiSeq = 0;
const nextAiId = () => Date.now() * 100 + (aiSeq++ % 100);

// Modul-weiter Guard: verhindert Doppel-Requests, auch wenn der Planner
// mehrfach gemountet ist (Dashboard + schwebendes Widget).
let generatingGlobal = false;

// SSE-Stream von /api/alex-ai lesen und Volltext zurückgeben.
// Mit hartem Timeout — die Ladeanimation darf NIE endlos hängen.
async function streamAiResponse(briefingText: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch("/api/alex-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        mode: "material_plan",
        messages: [{ role: "user", content: briefingText }],
      }),
    });
    if (!res.ok || !res.body) {
      let detail = "";
      try {
        detail = (await res.text()).slice(0, 200);
      } catch {
        /* Body nicht lesbar */
      }
      throw new Error(`AI-Anfrage fehlgeschlagen (${res.status})${detail ? ` — ${detail}` : ""}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload);
          full += chunk?.choices?.[0]?.delta?.content ?? "";
        } catch {
          /* unvollständige Chunks ignorieren */
        }
      }
    }
    return full;
  } catch (e) {
    if (ctrl.signal.aborted) throw new Error("Zeitüberschreitung — der AI-Server hat nicht geantwortet");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// JSON aus der AI-Antwort extrahieren (robust gegen Code-Fences / Prosa)
function parseAiPlan(raw: string): AIPlan {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Keine gültige Antwort erhalten");
  const data = JSON.parse(match[0]);
  const items: AIPlanItem[] = (data.items ?? []).map(
    (it: { name?: string; quantity?: string; price_estimate?: string; reason?: string; search_query?: string }) => ({
      id: nextAiId(),
      name: String(it.name ?? "").trim(),
      quantity: String(it.quantity ?? "").trim(),
      price: String(it.price_estimate ?? "").trim(),
      reason: String(it.reason ?? "").trim(),
      searchQuery: String(it.search_query ?? it.name ?? "").trim(),
      included: true,
    })
  ).filter((it: AIPlanItem) => it.name);
  if (items.length === 0) throw new Error("Der Plan kam leer zurück");
  return {
    title: String(data.project_title ?? "Dein Materialplan"),
    items,
    totalEstimate: String(data.total_estimate ?? ""),
    hint: data.hint ? String(data.hint) : undefined,
  };
}

// "23€" / "ab 19€" / "29,95€" → Zahl für Rabatt- und Summenberechnung
function parsePrice(p: string): number | null {
  const m = p.replace(/\./g, "").match(/(\d+(?:,\d+)?)/);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
}
const fmtEur = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

// HTML-Escaping für den Druck (AI-/Nutzertexte)
const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Professioneller A4-Materialplan (genau 1 Seite) — zum Abheften in die Werkstatt-Kartei.
// Mitarbeiter haken die Kästchen beim Zusammenstellen ab.
function generatePlanPrintHtml(
  plan: AIPlan,
  briefing: { job: string; vehicle: string; colorCode: string; colorName: string; vin: string; area: string; quality: string },
  note: string,
  discount: number,
  total: number
): string {
  const planNo = `MP-${Date.now().toString(36).toUpperCase()}`;
  const date = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const items = plan.items.filter((i) => i.included);
  const rows = items
    .map(
      (i, idx) => `
      <tr>
        <td class="chk"><span class="box"></span></td>
        <td class="num">${idx + 1}</td>
        <td><strong>${esc(i.name)}</strong>${i.reason ? `<span class="why">${esc(i.reason)}</span>` : ""}</td>
        <td class="qty">${esc(i.quantity)}</td>
        <td class="price">${esc(i.price || "—")}</td>
      </tr>`
    )
    .join("");

  const meta = [
    ["Arbeit", briefing.job],
    ["Fahrzeug", briefing.vehicle || "—"],
    ["Farbcode", briefing.colorCode || (briefing.vin ? "aus VIN ermitteln" : "an der Theke ermitteln")],
    ["Farbname", briefing.colorName || "—"],
    ["Schadenstelle", briefing.area],
    ["Qualität", briefing.quality],
  ]
    .map(([k, v]) => `<div class="meta-item"><span class="k">${k}</span><span class="v">${esc(v)}</span></div>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Materialplan ${planNo}</title>
<style>
  @page { size: A4; margin: 11mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11px; line-height: 1.35; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #B8860B; padding-bottom: 8px; margin-bottom: 10px; }
  .logo { font-size: 20px; font-weight: 800; color: #B8860B; }
  .logo span { color: #111; }
  .shop { font-size: 9.5px; color: #555; margin-top: 2px; }
  .doc { text-align: right; }
  .doc h1 { font-size: 15px; letter-spacing: 1px; }
  .doc p { font-size: 9.5px; color: #555; }
  .title { font-size: 14px; font-weight: 800; margin-bottom: 6px; }
  .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 12px; background: #f7f5ee; border: 1px solid #e6dfc8; border-radius: 6px; padding: 7px 10px; margin-bottom: 10px; }
  .meta-item .k { display: block; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; color: #8a8a8a; }
  .meta-item .v { font-weight: 700; font-size: 10.5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { background: #111; color: #fff; text-align: left; padding: 5px 6px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 5px 6px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  .chk { width: 22px; } .box { display: inline-block; width: 12px; height: 12px; border: 1.5px solid #111; border-radius: 2px; }
  .num { width: 18px; color: #999; }
  .why { display: block; font-size: 9px; color: #777; margin-top: 1px; }
  .qty { width: 70px; white-space: nowrap; }
  .price { width: 75px; text-align: right; font-weight: 700; white-space: nowrap; }
  .total td { border-top: 2px solid #111; border-bottom: none; font-size: 12px; font-weight: 800; padding-top: 6px; }
  .member { font-size: 9.5px; color: #8B6914; font-weight: 700; text-align: right; }
  .note { background: #fffbea; border: 1px solid #e6c84a; border-radius: 6px; padding: 6px 10px; margin-bottom: 6px; font-size: 10px; }
  .sign { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 14px; }
  .sign div { border-top: 1px solid #999; padding-top: 3px; font-size: 8.5px; color: #777; }
  .foot { margin-top: 10px; padding-top: 6px; border-top: 1px solid #ddd; font-size: 8.5px; color: #999; display: flex; justify-content: space-between; }
  .print-btn { display: block; margin: 14px auto 0; padding: 10px 26px; background: #B8860B; color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="logo">alex <span>autoshop</span></div>
      <div class="shop">Handelstraße 64 · 42277 Wuppertal · Tel 0202 82690 · alex-autoshop.de</div>
    </div>
    <div class="doc">
      <h1>MATERIALPLAN</h1>
      <p>Nr: ${planNo}<br>Datum: ${date}</p>
    </div>
  </div>

  <div class="title">${esc(plan.title)}</div>
  <div class="meta">${meta}${briefing.vin ? `<div class="meta-item"><span class="k">VIN</span><span class="v">${esc(briefing.vin)}</span></div>` : ""}</div>

  <table>
    <thead>
      <tr><th></th><th>#</th><th>Material</th><th>Menge</th><th style="text-align:right">Preis</th></tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total"><td></td><td></td><td>Gesamt (geschätzt)</td><td></td><td class="price">ca. ${fmtEur(discount > 0 ? total * (1 - discount / 100) : total)}</td></tr>
      ${discount > 0 ? `<tr><td colspan="5" class="member">Mitgliedspreis (−${discount}%) bereits eingerechnet · Listenpreis: ca. ${fmtEur(total)}</td></tr>` : ""}
    </tbody>
  </table>

  ${note.trim() ? `<div class="note"><strong>Anmerkung:</strong> ${esc(note.trim())}</div>` : ""}
  ${plan.hint ? `<div class="note">💡 ${esc(plan.hint)}</div>` : ""}

  <div class="sign">
    <div>Zusammengestellt von / Datum</div>
    <div>Geprüft von / Datum</div>
    <div>Auftrag / Kennzeichen</div>
  </div>

  <div class="foot">
    <span>Alex Autoshop · Mo–Fr 9–17:30 · Sa 9–14 · Bestellung: WhatsApp oder alex-autoshop.de</span>
    <span>Erstellt mit Alex AI Materialplaner</span>
  </div>

  <button class="print-btn" onclick="window.print()">🖨️ Drucken / Als PDF speichern</button>
</body>
</html>`;
}

// Preis pro Position: groß und gold; Mitglieder sehen Original durchgestrichen + Netto
function ItemPrice({ price, discount }: { price: string; discount: number }) {
  const num = parsePrice(price);
  if (!discount || num == null) {
    return <span className="shrink-0 text-base font-bold text-gold-deep">{price}</span>;
  }
  const ab = /\bab\b/i.test(price) ? "ab " : "";
  return (
    <span className="shrink-0 text-right">
      <span className="block text-[11px] text-muted-foreground line-through">{price}</span>
      <span className="block text-base font-bold text-gold-deep">{ab}{fmtEur(num * (1 - discount / 100))}</span>
    </span>
  );
}

export function MaterialPlanner({ compact = false }: { compact?: boolean }) {
  const { step, briefing, aiPlan, planNote, setStep, setBriefing, setAiPlan, setPlanNote, toggleAiItem, resetPlanner } =
    usePlannerStore();
  const addItem = useCartStore((s) => s.addItem);
  const { profile, user } = useAuth();
  const garage: Vehicle[] = profile.vehicles ?? [];
  const discount = user ? discountForLevel(profile.membership_level) : 0;
  // Bei Politur/Aufbereitung sind alle Lackfragen sinnlos — nur Lager-Frage zeigen
  const isPaintJob = briefing.job !== "Politur/Aufbereitung";
  const stockOptions = isPaintJob ? STOCK_PAINT : STOCK_POLISH;
  const toolOptions = isPaintJob ? TOOLS_PAINT : TOOLS_POLISH;
  const toggleTool = (m: string) =>
    setBriefing({
      needTools: briefing.needTools.includes(m)
        ? briefing.needTools.filter((x) => x !== m)
        : [...briefing.needTools, m],
    });
  const toggleStock = (m: string) =>
    setBriefing({
      inStock: briefing.inStock.includes(m)
        ? briefing.inStock.filter((x) => x !== m)
        : [...briefing.inStock, m],
    });
  // Lebende Summe: nur angewählte Positionen, passt sich beim Abwählen an
  const includedTotal = aiPlan
    ? aiPlan.items.filter((i) => i.included).reduce((sum, i) => sum + (parsePrice(i.price) ?? 0), 0)
    : 0;

  // Briefing-Unterschritt (0=Arbeit, 1=Fahrzeug, 2=Stelle, 3=Qualität, 4=Profi-Details)
  const [q, setQ] = useState(0);
  const [customJob, setCustomJob] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cartBusy, setCartBusy] = useState(false);
  const [cartDone, setCartDone] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => {
    try {
      return !localStorage.getItem(TUTORIAL_KEY);
    } catch {
      return false;
    }
  });

  const dismissTutorial = () => {
    try {
      localStorage.setItem(TUTORIAL_KEY, "1");
    } catch {
      /* localStorage gesperrt */
    }
    setShowTutorial(false);
  };

  const TOTAL_Q = 5;

  // ── Schritt 2: AI-Plan generieren ──
  const generate = async (b = briefing) => {
    if (generatingGlobal) return;
    generatingGlobal = true;
    setError(null);
    setStep(2);
    setLoadingStep(0);
    const ticker = setInterval(() => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 850);
    const minWait = new Promise((r) => setTimeout(r, 3000)); // Lade-Animation min. 3s

    const briefingText = [
      `Erstelle einen Materialplan für folgendes Lackier-Projekt:`,
      `Arbeit: ${b.job}`,
      b.vehicle ? `Fahrzeug: ${b.vehicle}` : `Fahrzeug: nicht angegeben`,
      b.colorCode
        ? `Farbcode: ${b.colorCode}`
        : b.vin
          ? `Farbcode: unbekannt — Kunde hat VIN angegeben (${b.vin}), Alex Autoshop ermittelt den Farbcode daraus`
          : `Farbcode: nicht bekannt — an der Theke ermitteln`,
      b.colorName ? `Farbname: ${b.colorName}` : "",
      `Schadenstelle: ${b.area}`,
      `Qualitätsstufe: ${b.quality}`,
      b.job !== "Politur/Aufbereitung"
        ? b.paintSystem
          ? `Lacksystem (vom Kunden vorgegeben): ${b.paintSystem}`
          : `Lacksystem: bitte passend empfehlen (1K Basislack + Klarlack oder 2K Decklack)`
        : "",
      b.paintAmount ? `Gewünschte Lackmenge (vom Kunden vorgegeben): ${b.paintAmount}` : `Lackmenge: bitte passend kalkulieren`,
      b.clearcoat ? `Klarlack-Wunsch (vom Kunden vorgegeben): ${b.clearcoat}` : "",
      b.inStock.length > 0 ? `Bereits in der Werkstatt vorhanden — NICHT in den Plan aufnehmen: ${b.inStock.join(", ")}` : "",
      b.needTools.length > 0 ? `Kunde benötigt zusätzlich WERKZEUG (als Positionen mit price_estimate "Preis im Shop" aufnehmen): ${b.needTools.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    try {
      const [raw] = await Promise.all([streamAiResponse(briefingText), minWait]);
      setAiPlan(parseAiPlan(raw));
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      clearInterval(ticker);
      generatingGlobal = false;
    }
  };

  // Selbstheilung: Steht der Planner beim Mount auf "lädt" (Schritt 2),
  // obwohl kein Request läuft (z.B. nach Reload oder abgebrochenem Versuch),
  // wird automatisch neu generiert bzw. sauber zurückgesetzt.
  useEffect(() => {
    if (step === 2 && !generatingGlobal) {
      if (briefing.job && briefing.area && briefing.quality) {
        generate();
      } else {
        setStep(aiPlan ? 3 : 1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Schritt 3: Alle in den Warenkorb ──
  const addAllToCart = async () => {
    if (!aiPlan || cartBusy) return;
    setCartBusy(true);
    let ok = 0;
    const missed: string[] = [];
    for (const it of aiPlan.items.filter((i) => i.included)) {
      try {
        const d = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first: 1, query: it.searchQuery });
        const p: ShopifyProduct | undefined = d?.data?.products?.edges?.[0];
        const variant = p?.node?.variants?.edges?.[0]?.node;
        if (!p || !variant) {
          missed.push(it.name);
          continue;
        }
        await addItem({
          product: p,
          variantId: variant.id,
          variantTitle: variant.title,
          price: variant.price,
          quantity: 1,
          selectedOptions: variant.selectedOptions ?? [],
        });
        ok++;
      } catch {
        missed.push(it.name);
      }
    }
    setCartBusy(false);
    if (ok > 0) {
      setCartDone(true);
      toast.success(`${ok} Produkte im Warenkorb`, {
        description: missed.length > 0 ? `Nicht gefunden: ${missed.join(", ")} — per WhatsApp anfragen.` : "Bereit zur Kasse!",
      });
      setTimeout(() => setCartDone(false), 2500);
    } else {
      toast.error("Keine Produkte gefunden", { description: "Frag den Plan direkt per WhatsApp an — wir kümmern uns." });
    }
  };

  // ── Schritt 3: WhatsApp-Text ──
  const whatsappHref = () => {
    if (!aiPlan) return "#";
    const lines = [
      `Hallo Alex Autoshop! 👋 Materialanfrage:`,
      `📋 ${aiPlan.title}`,
      briefing.vehicle ? `🚗 ${briefing.vehicle}${briefing.colorCode ? ` — Farbcode ${briefing.colorCode}` : ""}${briefing.colorName ? ` (${briefing.colorName})` : ""}` : "",
      briefing.vin && !briefing.colorCode ? `🔎 VIN: ${briefing.vin} — bitte Farbcode ermitteln` : "",
      "",
      ...aiPlan.items.filter((i) => i.included).map((i) => `• ${i.name} — ${i.quantity}${i.price ? ` (${i.price})` : ""}`),
      "",
      aiPlan.totalEstimate ? `Geschätzt gesamt: ${aiPlan.totalEstimate}` : "",
      planNote.trim() ? `📝 Anmerkung: ${planNote.trim()}` : "",
      `Bitte um Verfügbarkeit & Bestpreis. Danke!`,
    ].filter(Boolean);
    return whatsappLink(lines.join("\n"));
  };

  // Eigene Position ergänzen — Preis wird best-effort im Shop nachgeschlagen
  const addCustomItem = async (name: string) => {
    if (!aiPlan) return;
    let price = "";
    try {
      const d = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first: 1, query: name });
      const node = d?.data?.products?.edges?.[0]?.node;
      if (node) {
        const pr = node.priceRange.minVariantPrice;
        const multiple = (node.variants?.edges?.length ?? 0) > 1;
        price = `${multiple ? "ab " : ""}${formatPrice(pr.amount, pr.currencyCode)}`;
      }
    } catch {
      /* Preis bleibt offen — wird an der Theke geklärt */
    }
    setAiPlan({
      ...aiPlan,
      items: [
        ...aiPlan.items,
        { id: nextAiId(), name, quantity: "1×", price, reason: "Selbst hinzugefügt", searchQuery: name, included: true },
      ],
    });
  };

  // Farbcode-Service: VIN per WhatsApp anfragen + Bestätigung in die Inbox
  const requestColorCode = () => {
    if (!user) return;
    sendMessage({
      recipient: user.id,
      type: "system",
      title: "Farbcode-Anfrage gesendet 🎨",
      body: `Wir ermitteln den Farbcode für ${briefing.vehicle || "dein Fahrzeug"} (VIN ${briefing.vin}). Du bekommst die Antwort per WhatsApp oder hier in deinen Nachrichten — meist innerhalb weniger Stunden.`,
    });
  };

  // Export: professioneller 1-Seiten-A4-Plan im eigenen Fenster
  const exportPlan = () => {
    if (!aiPlan) return;
    const html = generatePlanPrintHtml(aiPlan, briefing, planNote, discount, includedTotal);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const restart = () => {
    resetPlanner();
    setQ(0);
    setCustomJob("");
    setCustomArea("");
    setError(null);
  };

  // ── Briefing-Fragen ──
  const questions = [
    {
      title: "Was wird gemacht?",
      subtitle: undefined as string | undefined,
      content: (
        <OptionGrid
          options={JOBS}
          selected={briefing.job}
          custom={customJob}
          onCustom={setCustomJob}
          customPlaceholder="z.B. Felgen lackieren"
          onPick={(v) => {
            setBriefing({ job: v });
            setQ(1);
          }}
        />
      ),
    },
    {
      title: "Welches Fahrzeug?",
      subtitle: (garage.length > 0 ? "Tipp ein gespeichertes Projektauto an — oder gib ein anderes ein" : "Optional — hilft bei der Mengenkalkulation") as string | undefined,
      content: (
        <VehicleStep
          garage={garage}
          vehicle={briefing.vehicle}
          colorCode={briefing.colorCode}
          colorName={briefing.colorName}
          vin={briefing.vin}
          onChange={(patch) => setBriefing(patch)}
          onNext={() => setQ(2)}
        />
      ),
    },
    {
      title: "Welche Schadenstelle?",
      subtitle: undefined as string | undefined,
      content: (
        <OptionGrid
          options={AREAS}
          selected={briefing.area}
          custom={customArea}
          onCustom={setCustomArea}
          customPlaceholder="z.B. Kotflügel links"
          onPick={(v) => {
            setBriefing({ area: v });
            setQ(3);
          }}
        />
      ),
    },
    {
      title: "Qualitätsstufe?",
      subtitle: undefined as string | undefined,
      content: (
        <div className="grid gap-3">
          {QUALITIES.map((opt) => (
            <TouchButton
              key={opt.value}
              active={briefing.quality === opt.value}
              onClick={() => {
                setBriefing({ quality: opt.value });
                setQ(4);
              }}
            >
              <span className="font-bold">{opt.label}</span>
              <span className="text-sm opacity-70">{opt.sub}</span>
            </TouchButton>
          ))}
        </div>
      ),
    },
    {
      title: isPaintJob ? "Profi-Details?" : "Schon was auf Lager?",
      subtitle: "Optional — was du nicht wählst, entscheidet die AI" as string | undefined,
      content: (
        <div className="space-y-5">
          {/* Lacksystem: 1K braucht Klarlack, 2K glänzt direkt, oder Klarlack ist schon da */}
          {isPaintJob && (
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" /> Welches Lacksystem?
              </p>
              <div className="flex flex-wrap gap-2">
                <Chip label="AI empfehlen lassen" active={!briefing.paintSystem} onClick={() => setBriefing({ paintSystem: "", clearcoat: "" })} />
                {PAINT_SYSTEMS.map((ps) => (
                  <Chip
                    key={ps}
                    label={ps}
                    active={briefing.paintSystem === ps}
                    onClick={() => setBriefing({ paintSystem: ps, ...(ps !== SYSTEM_1K ? { clearcoat: "" } : {}) })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Klarlack-Wahl nur, wenn das System überhaupt einen braucht */}
          {isPaintJob && briefing.paintSystem === SYSTEM_1K && (
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" /> Welcher Klarlack?
              </p>
              <div className="flex flex-wrap gap-2">
                <Chip label="AI empfehlen lassen" active={!briefing.clearcoat} onClick={() => setBriefing({ clearcoat: "" })} />
                {CLEARCOATS.map((c) => (
                  <Chip key={c.value} label={c.label} active={briefing.clearcoat === c.value} onClick={() => setBriefing({ clearcoat: c.value })} />
                ))}
              </div>
            </div>
          )}

          {isPaintJob && (
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-primary" /> Wie viel Lack brauchst du?
              </p>
              <div className="flex flex-wrap gap-2">
                <Chip label="AI kalkulieren lassen" active={!briefing.paintAmount} onClick={() => setBriefing({ paintAmount: "" })} />
                {PAINT_AMOUNTS.map((a) => (
                  <Chip key={a} label={a} active={briefing.paintAmount === a} onClick={() => setBriefing({ paintAmount: a })} />
                ))}
              </div>
            </div>
          )}

          {/* Lager-Check: was die Werkstatt schon hat, fliegt aus dem Plan */}
          <div>
            <p className="text-sm font-semibold mb-1 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-primary" /> Hast du davon schon was da?
            </p>
            <p className="text-xs text-muted-foreground mb-2">Antippen, was vorhanden ist — kommt dann nicht in den Plan.</p>
            <div className="flex flex-wrap gap-2">
              {stockOptions.map((m) => (
                <Chip key={m} label={m} active={briefing.inStock.includes(m)} onClick={() => toggleStock(m)} />
              ))}
            </div>
          </div>

          {/* Werkzeug: für Erstkunden ohne Ausrüstung — Preis kommt aus dem Shop */}
          <div>
            <p className="text-sm font-semibold mb-1 flex items-center gap-1.5">
              <Wand2 className="w-4 h-4 text-primary" /> Brauchst du auch Werkzeug?
            </p>
            <p className="text-xs text-muted-foreground mb-2">Für alle ohne eigene Ausrüstung — kommt mit in den Plan.</p>
            <div className="flex flex-wrap gap-2">
              {toolOptions.map((m) => (
                <Chip key={m} label={m} active={briefing.needTools.includes(m)} onClick={() => toggleTool(m)} />
              ))}
            </div>
          </div>

          <div className="grid gap-2 pt-1">
            <button onClick={() => generate()} className="btn-primary w-full min-h-[56px] text-base font-bold">
              <Wand2 className="w-5 h-5" /> Plan erstellen
            </button>
            <p className="text-xs text-muted-foreground text-center">Nichts gewählt? Kein Problem — die AI entscheidet alles.</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className={cn("relative", compact ? "" : "max-w-2xl")}>
      <AnimatePresence mode="wait">
        {/* ── ERSTUSER-TUTORIAL ── */}
        {step === 1 && showTutorial && (
          <motion.div key="tutorial" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              <Wand2 className="w-4 h-4" /> AI-Materialplaner
            </p>
            <h3 className="font-display text-xl sm:text-2xl font-bold mb-4">So einfach geht's</h3>
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.12 } } }}
              className="space-y-3 mb-5"
            >
              {[
                { icon: Hand, title: "1 · Fragen antippen", text: "Arbeit, Fahrzeug, Stelle, Qualität — alles große Buttons. Kein Tippen nötig, auch mit Handschuhen." },
                { icon: Sparkles, title: "2 · AI erstellt deinen Plan", text: "Komplette Materialliste mit Mengen und echten Preisen aus unserem Sortiment — in Sekunden." },
                { icon: ShoppingCart, title: "3 · Fertig machen", text: "Alles mit einem Klick in den Warenkorb, per WhatsApp anfragen oder als Liste drucken." },
              ].map(({ icon: Icon, title, text }) => (
                <motion.div
                  key={title}
                  variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                  className="flex gap-3 rounded-xl border border-border bg-card p-3.5"
                >
                  <div className="w-11 h-11 rounded-lg bg-night flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-gold-bright" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{text}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            <p className="text-xs text-muted-foreground bg-secondary/60 rounded-lg p-3 mb-4">
              💡 <strong>Neu beim Lackieren?</strong> Überspring einfach alle optionalen Felder — die AI kalkuliert Menge, Klarlack und Härter für dich.{" "}
              <strong>Profi?</strong> Gib Farbcode, Lackmenge und Klarlack selbst vor — dann rechnet die AI exakt damit.
            </p>
            <button onClick={dismissTutorial} className="btn-primary w-full min-h-[56px] text-base font-bold">
              Los geht's <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* ── SCHRITT 1: Briefing ── */}
        {step === 1 && !showTutorial && (
          <motion.div key={`q${q}`} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeOut" }}>
            {/* Fortschritt */}
            <div className="flex items-center gap-2 mb-5">
              {q > 0 && (
                <button onClick={() => setQ(q - 1)} className="w-11 h-11 flex items-center justify-center rounded-xl border border-border hover:border-primary transition-colors shrink-0" aria-label="Zurück">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex-1 flex gap-1.5">
                {questions.map((_, i) => (
                  <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= q ? "bg-gold-bright" : "bg-border")} />
                ))}
              </div>
              <span className="text-xs font-semibold text-muted-foreground shrink-0">{q + 1}/{TOTAL_Q}</span>
            </div>

            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              <Wand2 className="w-4 h-4" /> AI-Materialplaner
            </p>
            <h3 className="font-display text-xl sm:text-2xl font-bold mb-1">{questions[q].title}</h3>
            {questions[q].subtitle ? <p className="text-sm text-muted-foreground mb-4">{questions[q].subtitle}</p> : <div className="mb-4" />}
            {questions[q].content}

            <p className="text-[11px] text-muted-foreground mt-4 text-center">
              In 30 Sekunden zum kompletten, kaufbaren Materialplan — kein Tippen nötig.
            </p>
          </motion.div>
        )}

        {/* ── SCHRITT 2: AI generiert ── */}
        {step === 2 && !error && (
          <motion.div key="loading" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="py-10 text-center">
            <motion.div
              animate={{ scale: [1, 1.12, 1], rotate: [0, 6, -6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-night flex items-center justify-center"
            >
              <Sparkles className="w-8 h-8 text-gold-bright" />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.p key={loadingStep} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="font-semibold">
                {LOADING_STEPS[loadingStep]}
              </motion.p>
            </AnimatePresence>
            <p className="text-xs text-muted-foreground mt-2">Alex AI erstellt deinen Materialplan mit echten Preisen</p>
            <div className="mt-5 h-1.5 max-w-[240px] mx-auto rounded-full bg-border overflow-hidden">
              <motion.div className="h-full bg-gold-bright" initial={{ width: "5%" }} animate={{ width: "95%" }} transition={{ duration: 3.2, ease: "easeOut" }} />
            </div>
          </motion.div>
        )}

        {/* ── Fehler (kein leerer Zustand ohne Erklärung) ── */}
        {step === 2 && error && (
          <motion.div key="error" variants={stepVariants} initial="enter" animate="center" exit="exit" className="py-8 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-destructive" />
            <p className="font-bold mb-1">Da ist etwas schiefgelaufen</p>
            <p className="text-sm text-muted-foreground mb-5">{error} — versuch es nochmal oder frag uns direkt.</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button onClick={() => generate()} className="btn-primary min-h-[56px] px-6"><RotateCcw className="w-4 h-4" /> Nochmal versuchen</button>
              <a href={whatsappLink(`Hallo Alex Autoshop! Ich brauche Material für: ${briefing.job} — ${briefing.area}${briefing.vehicle ? ` (${briefing.vehicle})` : ""}`)} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-[56px] px-6">
                <MessageCircle className="w-4 h-4" /> Per WhatsApp fragen
              </a>
            </div>
          </motion.div>
        )}

        {/* ── SCHRITT 3: Plan + Aktionen ── */}
        {step === 3 && aiPlan && (
          <motion.div key="plan" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              <Sparkles className="w-4 h-4" /> Dein AI-Materialplan
            </p>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <h3 className="font-display text-xl font-bold leading-tight">{aiPlan.title}</h3>
              {includedTotal > 0 ? (
                <span className="shrink-0 text-right bg-night rounded-lg px-3 py-1.5">
                  {discount > 0 && (
                    <span className="block text-[11px] text-white/50 line-through">ca. {fmtEur(includedTotal)}</span>
                  )}
                  <span className="block text-base font-bold text-gold-bright">
                    ca. {fmtEur(discount > 0 ? includedTotal * (1 - discount / 100) : includedTotal)}
                  </span>
                  {discount > 0 && (
                    <span className="block text-[10px] font-semibold text-gold-bright/80">Mitglied −{discount}%</span>
                  )}
                </span>
              ) : (
                aiPlan.totalEstimate && (
                  <span className="shrink-0 text-sm font-bold text-gold-bright bg-night rounded-lg px-3 py-1.5">{aiPlan.totalEstimate}</span>
                )
              )}
            </div>
            {(briefing.vehicle || briefing.colorCode) && (
              <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" /> {briefing.vehicle}
                {briefing.colorCode && <span className="font-semibold text-foreground">· Farbcode {briefing.colorCode}</span>}
                {briefing.colorName && <span>· {briefing.colorName}</span>}
              </p>
            )}
            {!briefing.vehicle && !briefing.colorCode && <div className="mb-4" />}

            {/* Abwählen-Hinweis */}
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-primary" /> Tipp auf eine Position, um sie ab- oder anzuwählen — die Summe rechnet mit.
            </p>

            {/* Karten-Liste: Produkt | Menge | Preis | Warum */}
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06 } } }}
              className={cn("space-y-2 mb-4", compact && "max-h-[38vh] overflow-y-auto pr-1")}
            >
              {aiPlan.items.map((it) => (
                <motion.li
                  key={it.id}
                  variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                  onClick={() => toggleAiItem(it.id)}
                  className={cn(
                    "rounded-xl border bg-card p-3 cursor-pointer transition-all min-h-[56px] select-none",
                    it.included ? "border-primary/50 hover:border-primary" : "border-border opacity-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn("mt-0.5 w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors", it.included ? "bg-gold-bright border-gold-bright text-night" : "border-muted-foreground/50 bg-secondary")}>
                      {it.included && <Check className="w-4 h-4" strokeWidth={3} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={cn("font-semibold text-sm leading-tight", !it.included && "line-through")}>{it.name}</p>
                        <ItemPrice price={it.price} discount={discount} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium">{it.quantity}</span>
                        {it.reason && <> · {it.reason}</>}
                      </p>
                    </div>
                  </div>
                </motion.li>
              ))}
            </motion.ul>

            {/* Eigene Position ergänzen */}
            <AddItemRow onAdd={addCustomItem} />

            {aiPlan.hint && (
              <p className="text-xs text-muted-foreground bg-secondary/60 rounded-lg p-3 mb-4">💡 {aiPlan.hint}</p>
            )}

            {/* Spar-Teaser: Nicht-Mitglieder sehen ihr Sparpotenzial */}
            {discount === 0 && includedTotal > 0 && (
              <a href="/mitgliedschaft" className="block text-xs text-center bg-secondary/60 hover:bg-secondary rounded-lg p-3 mb-4 transition-colors">
                💛 Als Mitglied würdest du bei diesem Plan bis zu <strong>{fmtEur(includedTotal * 0.46)} sparen</strong> — Mitgliedschaft ansehen →
              </a>
            )}

            {/* Farbcode-Service: VIN vorhanden, Farbcode fehlt */}
            {briefing.vin && !briefing.colorCode && (
              <div className="rounded-xl bg-night text-white p-4 mb-4">
                <p className="text-sm font-bold flex items-center gap-2">
                  <Palette className="w-4 h-4 text-gold-bright" /> Farbcode-Service — kostenlos
                </p>
                <p className="text-xs text-white/70 mt-1 mb-3">
                  VIN erkannt. Wir ermitteln deinen exakten Farbcode und melden uns per WhatsApp
                  {user ? " und in deinen Nachrichten" : ""} — meist innerhalb weniger Stunden.
                </p>
                <a
                  href={whatsappLink(`Hallo Alex Autoshop! Bitte ermittelt den Farbcode für mein Fahrzeug:\n🚗 ${briefing.vehicle || "—"}\n🔎 VIN: ${briefing.vin}${briefing.colorName ? `\n🎨 Farbname: ${briefing.colorName}` : ""}\nProjekt: ${aiPlan.title}`)}
                  onClick={requestColorCode}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold-bright w-full text-sm min-h-[48px]"
                >
                  <MessageCircle className="w-4 h-4" /> Farbcode aus VIN anfragen
                </a>
              </div>
            )}

            {/* Anmerkung: geht mit in WhatsApp-Anfrage und Ausdruck */}
            <textarea
              value={planNote}
              onChange={(e) => setPlanNote(e.target.value)}
              rows={2}
              placeholder="Anmerkung (optional) — z.B. Bis Freitag benötigt / Bitte Lieferung"
              className="input-base text-foreground w-full py-3 mb-3 resize-none text-sm"
            />

            {/* Aktionen */}
            <div className="grid gap-2">
              <button onClick={addAllToCart} disabled={cartBusy} className="btn-primary w-full min-h-[56px] text-base font-bold">
                {cartBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : cartDone ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                {cartBusy ? "Produkte werden gesucht …" : cartDone ? "Im Warenkorb!" : "Alle in den Warenkorb"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-[56px] text-sm">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                <button onClick={exportPlan} className="btn-outline min-h-[56px] text-sm">
                  <Printer className="w-4 h-4" /> Exportieren
                </button>
              </div>
              <button onClick={restart} className="min-h-[48px] text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center gap-1.5">
                <RotateCcw className="w-4 h-4" /> Neu planen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Eigene Position zum Plan hinzufügen — Preis kommt automatisch aus dem Shop
function AddItemRow({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!val.trim() || busy) return;
    setBusy(true);
    await onAdd(val.trim());
    setVal("");
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="flex gap-2 mb-4">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Noch was? Position hinzufügen …"
        className="input-base flex-1 text-foreground"
      />
      <button
        type="submit"
        disabled={!val.trim() || busy}
        className="btn-outline shrink-0 px-4 disabled:opacity-40"
        aria-label="Position hinzufügen"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
      </button>
    </form>
  );
}

// ── Große Touch-Buttons (min. 56px, dreckige Hände!) ──
function TouchButton({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "w-full min-h-[56px] px-4 py-3 rounded-xl border-2 text-left flex flex-col justify-center transition-colors",
        active ? "border-gold-bright bg-night text-white" : "border-border bg-card hover:border-primary"
      )}
    >
      {children}
    </motion.button>
  );
}

// Kleine Auswahl-Chips (48px) für Profi-Details
function Chip({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        "min-h-[48px] px-4 rounded-xl border-2 text-sm font-semibold transition-colors",
        active ? "border-gold-bright bg-night text-white" : "border-border bg-card hover:border-primary"
      )}
    >
      {label}
    </motion.button>
  );
}

function OptionGrid({
  options,
  selected,
  onPick,
  custom,
  onCustom,
  customPlaceholder,
}: {
  options: string[];
  selected: string;
  onPick: (v: string) => void;
  custom: string;
  onCustom: (v: string) => void;
  customPlaceholder: string;
}) {
  const [showCustom, setShowCustom] = useState(false);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {options.map((opt) =>
        opt === "Andere..." ? (
          <div key={opt} className={cn(!showCustom ? "" : "sm:col-span-2")}>
            {!showCustom ? (
              <TouchButton onClick={() => setShowCustom(true)}>
                <span className="font-semibold text-muted-foreground">Andere …</span>
              </TouchButton>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (custom.trim()) onPick(custom.trim());
                }}
                className="flex gap-2"
              >
                <input autoFocus value={custom} onChange={(e) => onCustom(e.target.value)} placeholder={customPlaceholder} className="input-base flex-1 min-h-[56px]" />
                <button type="submit" disabled={!custom.trim()} className="btn-primary min-h-[56px] px-5 shrink-0 disabled:opacity-40">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            )}
          </div>
        ) : (
          <TouchButton key={opt} active={selected === opt} onClick={() => onPick(opt)}>
            <span className="font-semibold">{opt}</span>
          </TouchButton>
        )
      )}
    </div>
  );
}

// Fahrzeug-Schritt: gespeicherte Projektautos (Garage) als Ein-Tipp-Auswahl,
// plus Freitext + Farbcode / Farbname / VIN für alle anderen.
function VehicleStep({
  garage,
  vehicle,
  colorCode,
  colorName,
  vin,
  onChange,
  onNext,
}: {
  garage: Vehicle[];
  vehicle: string;
  colorCode: string;
  colorName: string;
  vin: string;
  onChange: (patch: { vehicle?: string; colorCode?: string; colorName?: string; vin?: string }) => void;
  onNext: () => void;
}) {
  const [showManual, setShowManual] = useState(garage.length === 0);
  const inputCls = "input-base min-h-[56px] text-base text-foreground bg-card";

  return (
    <div className="grid gap-2.5">
      {/* Garage: Ein Tipp wählt Fahrzeug + Farbcode + VIN */}
      {garage.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {garage.map((v) => (
            <TouchButton
              key={v.id}
              active={vehicle === v.label}
              onClick={() => {
                onChange({
                  vehicle: v.label,
                  colorCode: v.color_code ?? "",
                  colorName: v.color_name ?? "",
                  vin: v.vin ?? "",
                });
                onNext();
              }}
            >
              <span className="font-semibold flex items-center gap-2"><Car className="w-4 h-4 shrink-0" /> {v.label}</span>
              {(v.color_code || v.color_name) && (
                <span className="text-xs opacity-70">
                  {v.color_code ? `Farbcode ${v.color_code}` : ""}
                  {v.color_code && v.color_name ? " · " : ""}
                  {v.color_name ?? ""}
                </span>
              )}
            </TouchButton>
          ))}
          {!showManual && (
            <TouchButton onClick={() => setShowManual(true)}>
              <span className="font-semibold text-muted-foreground">Anderes Fahrzeug …</span>
            </TouchButton>
          )}
        </div>
      )}

      {showManual && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onNext();
          }}
          className="grid gap-2.5"
        >
          <input
            value={vehicle}
            onChange={(e) => onChange({ vehicle: e.target.value })}
            placeholder="Fahrzeug, z.B. BMW 3er G20"
            className={inputCls}
            autoFocus={garage.length === 0}
          />
          <div className="grid grid-cols-2 gap-2.5">
            <input
              value={colorCode}
              onChange={(e) => onChange({ colorCode: e.target.value })}
              placeholder="Farbcode (z.B. LC9Z)"
              className={inputCls}
            />
            <input
              value={colorName}
              onChange={(e) => onChange({ colorName: e.target.value })}
              placeholder="Farbname (z.B. Deep Black)"
              className={inputCls}
            />
          </div>
          <input
            value={vin}
            onChange={(e) => onChange({ vin: e.target.value })}
            placeholder="VIN / Fahrgestellnummer"
            className={inputCls}
          />
          <p className="text-xs text-muted-foreground -mt-1">
            Kein Farbcode zur Hand? Gib die VIN ein — wir ermitteln ihn <strong>kostenlos</strong> und melden uns.
          </p>
          <button type="submit" className="btn-primary w-full min-h-[56px] text-base font-bold">
            Weiter <ArrowRight className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              onChange({ vehicle: "", colorCode: "", colorName: "", vin: "" });
              onNext();
            }}
            className="min-h-[48px] text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Überspringen
          </button>
        </form>
      )}
    </div>
  );
}
