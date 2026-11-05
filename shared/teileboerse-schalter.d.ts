export const TEILEBOERSE_PUBLIC: boolean;
export const TEILEBOERSE_ADMIN_EMAIL: string;
export const TEILEBOERSE_HINWEIS: string;
export const TEILEBOERSE_COOKIE: string;
export function teileboerseOeffentlich(): boolean;
export function istTeileboerseAdminMail(email: string | null | undefined): boolean;
