import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";

// Sichtbare Sprachauswahl (Google übersetzt darüber hinaus jede weitere Sprache).
const LANGS: { code: string; label: string; flag: string }[] = [
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "ro", label: "Română", flag: "🇷🇴" },
  { code: "sq", label: "Shqip", flag: "🇦🇱" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "el", label: "Ελληνικά", flag: "🇬🇷" },
  { code: "zh-CN", label: "中文", flag: "🇨🇳" },
];

function getCookie(name: string): string | undefined {
  return document.cookie.split("; ").find((r) => r.startsWith(name + "="))?.split("=").slice(1).join("=");
}

function currentLang(): string {
  const raw = getCookie("googtrans");
  if (!raw) return "de";
  const parts = decodeURIComponent(raw).split("/");
  return parts[2] || "de";
}

// googtrans-Cookie auf allen relevanten Domain-Varianten löschen (Host, .Host,
// Wurzeldomain, .Wurzeldomain) — sonst überlebt eine alte Übersetzung den Reset.
function clearGoogtrans() {
  const host = location.hostname;
  const parts = host.split(".");
  const root = parts.length > 2 ? parts.slice(-2).join(".") : host;
  const exp = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
  const variants = ["", `;domain=${host}`, `;domain=.${host}`];
  if (root !== host) variants.push(`;domain=${root}`, `;domain=.${root}`);
  variants.forEach((d) => {
    document.cookie = `googtrans=;${exp};path=/${d}`;
  });
}

// Auf eine andere Sprache übersetzen — über Googles eigenes Auswahl-Element.
function applyLang(code: string, attempt = 0) {
  const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (combo) {
    combo.value = code;
    combo.dispatchEvent(new Event("change"));
    return;
  }
  if (attempt < 40) window.setTimeout(() => applyLang(code, attempt + 1), 120);
}

export function LanguageSwitcher({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>(() => currentLang());
  const ref = useRef<HTMLDivElement>(null);
  const activeLang = LANGS.find((l) => l.code === active) ?? LANGS[0];

  const pick = (code: string) => {
    setOpen(false);
    if (code === "de") {
      // Original wiederherstellen: Cookie überall löschen + neu laden
      clearGoogtrans();
      window.location.reload();
      return;
    }
    setActive(code);
    applyLang(code);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const triggerClass =
    tone === "dark"
      ? "text-white/75 hover:text-white hover:bg-white/10"
      : "text-foreground/70 hover:text-foreground hover:bg-black/5";

  return (
    <div ref={ref} className="relative notranslate" translate="no">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 min-h-[44px] text-sm font-medium transition-colors ${triggerClass}`}
        aria-label="Sprache wählen"
      >
        <Globe className="w-5 h-5" />
        <span className="hidden sm:inline">{activeLang.flag}</span>
        <span className="text-[11px] font-bold uppercase">{active === "zh-CN" ? "ZH" : active}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-[60vh] w-52 overflow-y-auto rounded-xl border border-black/10 bg-white py-1.5 text-night shadow-2xl animate-fade-up">
          <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Sprache / Language
          </p>
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => pick(l.code)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-black/5"
            >
              <span className="text-base">{l.flag}</span>
              <span className="flex-1">{l.label}</span>
              {active === l.code && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
          <p className="px-3 pb-1 pt-1.5 text-[10px] text-muted-foreground">Übersetzt von Google</p>
        </div>
      )}
    </div>
  );
}
