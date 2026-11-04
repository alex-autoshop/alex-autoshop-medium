export const STANDARD_BASIS: number;
export const STANDARD_SPANNE: number;
export const STANDARD_GRUPPEN: Readonly<Record<string, number>>;
export function basisAusEnv(env?: Record<string, string | undefined>): number;
export function spanneAusEnv(env?: Record<string, string | undefined>): number;
export function warengruppenText(name: string | undefined): string;
export function gruppenFaktor(name: string | undefined, env?: Record<string, string | undefined>): number | null;
export function mindestpreis(ek: number, env?: Record<string, string | undefined>): number;
export function verkaufspreis(arg: {
  ek: number;
  sku?: string;
  name?: string;
  listenpreis?: number;
  env?: Record<string, string | undefined>;
  streuung?: (sku: string) => number;
}): number;
