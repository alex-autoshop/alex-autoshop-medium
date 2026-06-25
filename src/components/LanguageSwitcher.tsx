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

function setLang(code: string) {
  const host = location.hostname;
  const expire = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
  // bestehendes Cookie auf allen relevanten Domains löschen
  document.cookie = `googtrans=;${expire};path=/`;
  document.cookie = `googtrans=;${expire};path=/;domain=.${host}`;
  if (code !== "de") {
    document.cookie = `googtrans=/de/${code};path=/`;
    document.cookie = `googtrans=/de/${code};path=/;domain=.${host}`;
  }
  location.reload();
}

export function LanguageSwitcher({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = currentLang();
  const activeLang = LANGS.find((l) => l.code === active) ?? LANGS[0];

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
              onClick={() => setLang(l.code)}
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
