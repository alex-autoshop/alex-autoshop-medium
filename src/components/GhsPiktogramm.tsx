/** GHS-Raute, rot umrandet, weißes Feld, schwarzes Symbol. GHS01–GHS09. */

const SYMBOL: Record<string, string> = {
  GHS01: "M32 14 l3 6 4-1-2 5 5 2-5 3 2 6-7-2-3 5-3-5-7 2 2-6 5-2-2-5 4 1z",
  GHS02: "M32 16 c2 6 8 8 8 14 a8 8 0 0 1-16 0 c0-6 6-8 8-14z",
  GHS03: "M32 14 c2 5 7 7 7 12 a7 7 0 0 1-14 0 c0-5 5-7 7-12z M24 40 h16",
  GHS04: "M27 18 h10 v22 h-10z M29 18 v-3 h6 v3 M29 40 v4 h6 v-4",
  GHS05: "M22 22 h20 l-4 16 h-6 l-2 6 h-4z M26 28 h8",
  GHS06: "M32 16 a6 6 0 1 1 0 12 a6 6 0 1 1 0-12 M28 30 h8 l2 12 h-12z",
  GHS07: "M32 18 a3 3 0 1 1 0 6 a3 3 0 1 1 0-6 M30 28 h4 l1 14 h-6z",
  GHS08: "M32 16 c6 0 10 8 10 14 v8 h-20 v-8 c0-6 4-14 10-14z M28 24 h8",
  GHS09: "M20 36 c6-10 18-10 24 0 c-6 4-18 4-24 0z M32 22 c3 2 4 6 2 8",
};

const NAME: Record<string, string> = {
  GHS01: "Explodierende Bombe",
  GHS02: "Flamme",
  GHS03: "Flamme über einem Kreis",
  GHS04: "Gasflasche",
  GHS05: "Ätzwirkung",
  GHS06: "Totenkopf mit gekreuzten Knochen",
  GHS07: "Ausrufezeichen",
  GHS08: "Gesundheitsgefahr",
  GHS09: "Umwelt",
};

export function GhsPiktogramm({ code, gross = false }: { code: string; gross?: boolean }) {
  const pfad = SYMBOL[code];
  if (!pfad) return null;
  const px = gross ? 56 : 28;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`${code}: ${NAME[code] || "Gefahrenpiktogramm"}`}
    >
      <rect x="14" y="14" width="36" height="36" transform="rotate(45 32 32)" fill="#fff" stroke="#c8102e" strokeWidth="3" />
      <path d={pfad} fill="#111" />
    </svg>
  );
}

export function ghsName(code: string) {
  return NAME[code] || code;
}
