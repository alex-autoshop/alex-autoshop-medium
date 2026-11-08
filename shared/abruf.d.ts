export function istChunkFehler(fehler: unknown): boolean;
export function seiteNeuLaden(): boolean;
export function wiederholen<T>(
  arbeit: (signal: AbortSignal, versuch: number) => Promise<T>,
  optionen?: { versuche?: number; pauseMs?: number; timeoutMs?: number },
): Promise<T>;
