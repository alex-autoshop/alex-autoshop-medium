export const MINDEST_MONATE: number;
export const LAUFZEIT_KURZ: string;
export const LAUFZEIT_KURZ_DU: string;
export function kassenText(einmaligEuro: number, monatEuro: number): string;
export function monateAddieren(unix: number, monate: number): number;
export function standAusRechnungen(
  cents: number[] | null | undefined,
  aktuellerCent: number,
  status?: string,
): { bezahlt: number; hoechstCent: number } | null;
export function aboCentAusRechnung(invoice: { lines?: { data?: Array<{ amount?: number; type?: string; price?: { recurring?: unknown } | null }> } | null } | null): number;
export function mindestEingriff(lage: {
  mindest?: boolean;
  geloescht?: boolean;
  bezahlt?: number;
  hoechstCent?: number;
  preisCent?: number;
  periodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
} | null | undefined):
  | { art: "keine" }
  | { art: "rechnung"; monate: number; cent: number }
  | { art: "verlaengern"; monate: number; cancelAt: number; preisCent: number };
