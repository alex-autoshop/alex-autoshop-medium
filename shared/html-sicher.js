/**
 * Beschreibung aus dem Katalog: nur erlaubte Tags, keine Skripte.
 * Läuft ohne Bibliothek, damit die Produktseite leicht bleibt.
 */

const ERLAUBT = new Set([
  "p", "br", "h2", "h3", "h4", "strong", "b", "em", "i",
  "ul", "ol", "li", "a", "table", "thead", "tbody", "tr", "th", "td",
]);

/** Diese Tags verschlucken ihren Inhalt, sonst bliebe Skript- oder CSS-Text stehen. */
const WEG = new Set([
  "script", "style", "iframe", "object", "embed", "noscript",
  "svg", "math", "template", "textarea", "title", "xmp",
  "noembed", "noframes", "head",
]);

const LEER = new Set(["br"]);

function tagEnde(html, i) {
  let quote = "";
  for (; i < html.length; i += 1) {
    const c = html[i];
    if (quote) {
      if (c === quote) quote = "";
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === ">") return i;
  }
  return -1;
}

function attribute(roh) {
  const attrs = {};
  const re = /([^\s=\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(roh))) {
    const key = m[1].toLowerCase();
    if (Object.prototype.hasOwnProperty.call(attrs, key)) continue;
    attrs[key] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}

function textEsc(s) {
  return String(s)
    .replace(/&(?!(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]+);)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function attrEsc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function dekodieren(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => zeichen(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => zeichen(parseInt(d, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function zeichen(n) {
  if (!Number.isFinite(n) || n <= 0 || n > 0x10ffff) return "";
  if (n >= 0xd800 && n <= 0xdfff) return "";
  try {
    return String.fromCodePoint(n);
  } catch {
    return "";
  }
}

function adresseSicher(raw) {
  let wert = dekodieren(raw).replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!wert) return "";
  const schema = /^([a-zA-Z][a-zA-Z0-9+.-]*)\s*:/.exec(wert);
  if (schema) {
    const proto = schema[1].toLowerCase();
    if (proto !== "http" && proto !== "https" && proto !== "mailto" && proto !== "tel") return "";
    wert = proto + wert.slice(schema[0].length - 1);
  } else if (wert.startsWith("//")) {
    return "";
  } else {
    if (/[\s<>"']/.test(wert)) return "";
    return wert;
  }
  try {
    const url = new URL(wert);
    const proto = url.protocol;
    if (proto !== "http:" && proto !== "https:" && proto !== "mailto:" && proto !== "tel:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function istExtern(href) {
  if (!/^https?:/i.test(href)) return false;
  try {
    const host = new URL(href).hostname.toLowerCase();
    return host !== "alex-autoshop.de" && !host.endsWith(".alex-autoshop.de");
  } catch {
    return true;
  }
}

function bisSchliessend(html, i, name) {
  const re = new RegExp(`</${name}\\s*>`, "i");
  const rest = html.slice(i);
  const m = re.exec(rest);
  if (!m) return html.length;
  return i + m.index + m[0].length;
}

function sichtbar(html) {
  return dekodieren(html.replace(/<[^>]+>/g, " ")).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

/** Sicheres HTML oder leer, wenn nach dem Filtern nichts übrig ist. */
export function beschreibungHtml(wert) {
  const html = String(wert || "").replace(/\u0000/g, "");
  if (!html.trim()) return "";
  const out = [];
  const stack = [];
  let i = 0;

  const schliessenBis = (name) => {
    const idx = stack.lastIndexOf(name);
    if (idx === -1) return;
    while (stack.length > idx) out.push(`</${stack.pop()}>`);
  };

  while (i < html.length) {
    if (html[i] !== "<") {
      const j = html.indexOf("<", i);
      const ende = j === -1 ? html.length : j;
      out.push(textEsc(html.slice(i, ende)));
      i = ende;
      continue;
    }
    if (html.startsWith("<!--", i)) {
      const ende = html.indexOf("-->", i + 4);
      i = ende === -1 ? html.length : ende + 3;
      continue;
    }
    if (html.startsWith("<!", i) || html.startsWith("<?", i)) {
      const ende = html.indexOf(">", i + 2);
      i = ende === -1 ? html.length : ende + 1;
      continue;
    }
    const zu = html[i + 1] === "/";
    const start = i + (zu ? 2 : 1);
    const nameMatch = /^([a-zA-Z][\w:-]*)/.exec(html.slice(start));
    if (!nameMatch) {
      out.push("&lt;");
      i += 1;
      continue;
    }
    const name = nameMatch[1].toLowerCase();
    let j = start + nameMatch[1].length;
    const ende = tagEnde(html, j);
    if (ende === -1) break;
    const roh = html.slice(j, ende);
    const selbst = /\/\s*$/.test(roh) || LEER.has(name);
    i = ende + 1;

    if (zu) {
      if (ERLAUBT.has(name)) schliessenBis(name);
      continue;
    }
    if (WEG.has(name)) {
      if (!selbst) i = bisSchliessend(html, i, name);
      continue;
    }
    if (!ERLAUBT.has(name)) continue;

    if (name === "br") {
      out.push("<br>");
      continue;
    }
    if (name === "a") {
      const href = adresseSicher(attribute(roh).href);
      if (!href) continue;
      const extra = istExtern(href)
        ? ' target="_blank" rel="noopener noreferrer"'
        : ' rel="noopener"';
      out.push(`<a href="${attrEsc(href)}"${extra}>`);
      if (!selbst) stack.push("a");
      else out.push("</a>");
      continue;
    }
    out.push(`<${name}>`);
    if (!selbst) stack.push(name);
    else out.push(`</${name}>`);
  }

  while (stack.length) out.push(`</${stack.pop()}>`);
  const fertig = out.join("").trim();
  return sichtbar(fertig) ? fertig : "";
}
