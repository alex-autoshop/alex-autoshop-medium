export declare const ABO_KONTO_HINWEIS: string;

export declare function tokenAusKopf(req: { headers?: unknown }): string;

export declare function kundeAusUser(user: {
  id?: string;
  email?: string;
} | null | undefined):
  | { ok: true; email: string; userId: string }
  | { ok: false; status: number; error: string };

export declare function kundeAusAnfrage(
  req: { headers?: unknown },
  holen?: typeof fetch,
): Promise<
  | { ok: true; email: string; userId: string }
  | { ok: false; status: number; error: string }
>;

export declare function paketMitKonto(paket: string, userId: string): string;
export declare function userIdAusPaket(paket: string): string;
