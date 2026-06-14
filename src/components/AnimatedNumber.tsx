import { useEffect, useRef, useState } from "react";

// Zählt weich von altem zum neuen Wert (für Preis-runter-Animation).
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  duration = 450,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    // Sicherheitsnetz: Endwert garantiert setzen, auch wenn rAF gedrosselt ist.
    const fallback = window.setTimeout(() => {
      setDisplay(to);
      fromRef.current = to;
    }, duration + 80);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(fallback);
    };
  }, [value, duration]);

  return <>{format(display)}</>;
}
