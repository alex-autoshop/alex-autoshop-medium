/**
 * Teilebörse für die Öffentlichkeit.
 *
 * Standard: zu. Wieder öffnen:
 *   • diese Konstante auf true setzen, oder
 *   • Umgebungsvariable TEILEBOERSE_PUBLIC=true (auch VITE_TEILEBOERSE_PUBLIC).
 *
 * Solange sie zu ist, gelten zusätzlich:
 *   public/sitemap.xml          — sitemap-teile.xml nicht im Index
 *   public/sitemap-seiten.xml   — /teileboerse nicht gelistet
 *   public/robots.txt           — Disallow für /teileboerse und /teile
 * Die Middleware leitet Gäste von /teileboerse und /teile auf / um (noindex)
 * und liefert /sitemap-teile.xml leer.
 */

export const TEILEBOERSE_PUBLIC = false;

/** Einziges Konto, das die geschlossene Teilebörse nutzen darf. */
export const TEILEBOERSE_ADMIN_EMAIL = "info@alex-autoshop.de";

export const TEILEBOERSE_HINWEIS = "Diese Seite ist derzeit nicht verfügbar";

export const TEILEBOERSE_COOKIE = "tb-zugang";

/** localStorage-Schlüssel der Supabase-Sitzung (Projekt-Ref aus der öffentlichen URL). */
export const TEILEBOERSE_AUTH_STORAGE = "sb-zasbdvtsxgimcezotlsi-auth-token";

function envWert(name) {
  try {
    if (typeof process !== "undefined" && process.env && typeof process.env[name] === "string") {
      return process.env[name];
    }
  } catch { /* Browser ohne process */ }
  return "";
}

function viteWert() {
  try {
    const env = import.meta.env;
    const wert = env && env.VITE_TEILEBOERSE_PUBLIC;
    return typeof wert === "string" ? wert : "";
  } catch {
    return "";
  }
}

export function teileboerseOeffentlich() {
  if (TEILEBOERSE_PUBLIC === true) return true;
  const wert = envWert("TEILEBOERSE_PUBLIC") || viteWert();
  return wert === "true" || wert === "1";
}

export function istTeileboerseAdminMail(email) {
  return String(email || "").trim().toLowerCase() === TEILEBOERSE_ADMIN_EMAIL;
}

export function leereTeileSitemap() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n`;
}

/** Seite ohne App-Bundle: Text steht im HTML, auch ohne JavaScript. */
export function teileboerseGeschlossenHtml() {
  const hinweis = TEILEBOERSE_HINWEIS;
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${hinweis} | Alex Autoshop</title>
</head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0e0e0e;color:#f5f5f5;font-family:system-ui,sans-serif;">
  <main style="max-width:32rem;padding:2rem;text-align:center;">
    <p style="letter-spacing:.14em;text-transform:uppercase;font-size:.75rem;color:#c6a15b;">Alex Autoshop</p>
    <h1 style="font-size:1.7rem;line-height:1.25;margin:.4rem 0 .8rem;">${hinweis}</h1>
    <p style="color:#d6d6d6;line-height:1.5;">Bis dahin findest du Lack und Werkstattbedarf im Shop.</p>
    <p style="margin-top:1.4rem;">
      <a href="/" style="color:#e6c98a;margin-right:1rem;">Zur Startseite</a>
      <a href="/shop" style="color:#e6c98a;">Zum Shop</a>
    </p>
  </main>
  <script>
    (function () {
      try {
        var raw = localStorage.getItem(${JSON.stringify(TEILEBOERSE_AUTH_STORAGE)});
        if (!raw) return;
        var s = JSON.parse(raw);
        var user = s.user || (s.currentSession && s.currentSession.user) || {};
        var token = s.access_token || (s.currentSession && s.currentSession.access_token) || "";
        var email = String(user.email || "").toLowerCase();
        if (email !== ${JSON.stringify(TEILEBOERSE_ADMIN_EMAIL)} || !token) return;
        if (document.cookie.indexOf(${JSON.stringify(TEILEBOERSE_COOKIE + "=")}) !== -1) return;
        var sicher = location.protocol === "https:" ? "; Secure" : "";
        document.cookie = ${JSON.stringify(TEILEBOERSE_COOKIE)} + "=" + encodeURIComponent(token) + "; Path=/; Max-Age=3600; SameSite=Lax" + sicher;
        location.reload();
      } catch (e) {}
    })();
  </script>
</body>
</html>`;
}
