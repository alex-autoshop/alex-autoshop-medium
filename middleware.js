/**
 * Server-HTML für die Teilebörse.
 *
 * Die App ist ein einzelnes index.html. Ohne diesen Schritt sieht ein Crawler
 * auf /teileboerse den Titel der Startseite, bis JavaScript läuft.
 */

const SITE = "https://www.alex-autoshop.de";

function seite(pathname, search) {
  const nr = new URLSearchParams(search).get("nr");
  if (pathname.startsWith("/teileboerse/artikel")) {
    const name = nr ? `Autoteil ${nr}` : "Autoteil";
    return {
      title: `${name} | Alex Autoshop Wuppertal`,
      description: nr
        ? `Teilenummer ${nr} im TecDoc-Katalog. Preis und Bestand von Inter Cars, Abholung in Wuppertal.`
        : "Teil aus dem TecDoc-Katalog. Preis und Bestand von Inter Cars.",
      canonical: `${SITE}/teileboerse/artikel${nr ? `?nr=${encodeURIComponent(nr)}` : ""}`,
      jsonLd: nr
        ? {
            "@context": "https://schema.org",
            "@type": "Product",
            name,
            sku: nr,
            url: `${SITE}/teileboerse/artikel?nr=${encodeURIComponent(nr)}`,
          }
        : null,
    };
  }
  return {
    title: "Teilebörse – Autoteile per HSN/TSN oder FIN | Alex Autoshop Wuppertal",
    description:
      "Fahrzeug per HSN/TSN, FIN oder Marke wählen. Passende Teile aus dem TecDoc-Katalog, Preise und Bestand von Inter Cars. Abholung in Wuppertal.",
    canonical: `${SITE}/teileboerse`,
    jsonLd: null,
  };
}

function ersetzen(html, s) {
  let aus = html;
  aus = aus.replace(/<title>[^<]*<\/title>/, `<title>${s.title}</title>`);
  aus = aus.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${s.description}" />`,
  );
  aus = aus.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${s.canonical}" />`);
  aus = aus.replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${s.title}" />`);
  aus = aus.replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${s.description}" />`);
  aus = aus.replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${s.canonical}" />`);
  aus = aus.replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${s.title}" />`);
  aus = aus.replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${s.description}" />`);
  if (s.jsonLd) {
    aus = aus.replace(
      "</head>",
      `<script type="application/ld+json">${JSON.stringify(s.jsonLd)}</script></head>`,
    );
  }
  return aus;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const indexUrl = new URL("/index.html", url.origin);
  const antwort = await fetch(indexUrl);
  const html = await antwort.text();
  const s = seite(url.pathname, url.search);
  return new Response(ersetzen(html, s), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

export const config = {
  matcher: ["/teileboerse", "/teileboerse/:path*"],
};
