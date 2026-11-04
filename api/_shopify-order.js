// Gemeinsamer Helper: Mitgliedschaft (oder Teileportal-Bestellung) als echte
// Shopify-Bestellung anlegen — via Admin GraphQL API (orderCreate).
//
// Benötigte Vercel-Env-Vars:
//   SHOPIFY_ADMIN_TOKEN   — Admin-API Access-Token der Custom App (shpat_…)
//   SHOPIFY_STORE_DOMAIN  — z.B. "shop.alex-autoshop.de" (Fallback unten gesetzt)
//
// Scopes der Custom App: write_orders, read_customers, write_customers.

const SHOPIFY_API_VERSION = "2024-10";

function shopifyConfigured() {
  return !!process.env.SHOPIFY_ADMIN_TOKEN;
}

async function shopifyGraphQL(query, variables) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN || "shop.alex-autoshop.de";
  const token  = process.env.SHOPIFY_ADMIN_TOKEN;
  const res = await fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.errors) {
    throw new Error(`Shopify API ${res.status}: ${JSON.stringify(json?.errors || json).slice(0, 300)}`);
  }
  return json.data;
}

const ORDER_CREATE = `
mutation OrderCreate($order: OrderCreateOrderInput!) {
  orderCreate(order: $order) {
    order { id name }
    userErrors { field message }
  }
}`;

/**
 * Legt eine bezahlte Shopify-Bestellung mit einem freien Positions-Artikel an.
 * @param {Object} p
 * @param {string}  p.email        Kunden-E-Mail
 * @param {string}  p.title        Positionsname, z.B. "Alex Autoshop Mitgliedschaft — 28 % Rabatt"
 * @param {number}  p.amount       Bruttobetrag in EUR (z.B. 165)
 * @param {number} [p.quantity=1]
 * @param {string[]} [p.tags]      z.B. ["mitgliedschaft","level-2","stripe"]
 * @param {string} [p.note]        Notiz (Module, Zahlungsart, Provider-ID)
 * @param {boolean}[p.paid=true]   markiert die Bestellung als bezahlt
 * @returns {Promise<{id:string,name:string}|null>}
 */
export async function createShopifyOrder({ email, title, amount, quantity = 1, tags = [], note = "", paid = true }) {
  if (!shopifyConfigured()) {
    console.warn("[shopify] SHOPIFY_ADMIN_TOKEN fehlt — überspringe Bestellungsanlage");
    return null;
  }
  const order = {
    email,
    tags,
    note,
    currency: "EUR",
    financialStatus: paid ? "PAID" : "PENDING",
    lineItems: [
      {
        title,
        quantity,
        priceSet: { shopMoney: { amount: Number(amount).toFixed(2), currencyCode: "EUR" } },
        requiresShipping: false,
        taxable: true,
      },
    ],
  };
  const data = await shopifyGraphQL(ORDER_CREATE, { order });
  const errs = data?.orderCreate?.userErrors;
  if (errs && errs.length) throw new Error(`Shopify orderCreate: ${JSON.stringify(errs)}`);
  return data?.orderCreate?.order || null;
}

const MITGLIED_TAG = "mitglied";

const CUSTOMERS_BY_EMAIL = `
query CustomersByEmail($query: String!) {
  customers(first: 5, query: $query) {
    edges { node { id email tags } }
  }
}`;

const CUSTOMER_CREATE = `
mutation CustomerCreate($input: CustomerInput!) {
  customerCreate(input: $input) {
    customer { id email tags }
    userErrors { field message }
  }
}`;

const TAGS_ADD = `
mutation TagsAdd($id: ID!, $tags: [String!]!) {
  tagsAdd(id: $id, tags: $tags) {
    node { id }
    userErrors { message }
  }
}`;

const TAGS_REMOVE = `
mutation TagsRemove($id: ID!, $tags: [String!]!) {
  tagsRemove(id: $id, tags: $tags) {
    node { id }
    userErrors { message }
  }
}`;

/**
 * Setzt oder entfernt das Kunden-Tag "mitglied".
 * Legt den Kunden bei der Aktivierung an, wenn es ihn noch nicht gibt.
 * Mehrfach ausführen ändert nichts, wenn der Tag schon (nicht) da ist.
 * Wirft nicht — der Aufrufer soll die Zahlung nicht davon abhängen lassen.
 * @returns {Promise<{ok:boolean, aktion?:string, grund?:string}>}
 */
export async function shopifyMitgliedTag(email, aktiv) {
  const mail = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    console.warn("[shopify] mitglied-tag übersprungen: keine gültige E-Mail");
    return { ok: false, grund: "email" };
  }
  if (!shopifyConfigured()) {
    console.warn("[shopify] SHOPIFY_ADMIN_TOKEN fehlt — mitglied-Tag übersprungen");
    return { ok: false, grund: "token" };
  }
  try {
    const suche = `email:${JSON.stringify(mail)}`;
    const data = await shopifyGraphQL(CUSTOMERS_BY_EMAIL, { query: suche });
    const treffer = (data?.customers?.edges || [])
      .map((e) => e?.node)
      .filter((n) => n?.id && String(n.email || "").trim().toLowerCase() === mail);

    if (!treffer.length && aktiv) {
      const created = await shopifyGraphQL(CUSTOMER_CREATE, { input: { email: mail, tags: [MITGLIED_TAG] } });
      const errs = created?.customerCreate?.userErrors || [];
      if (!errs.length && created?.customerCreate?.customer?.id) return { ok: true, aktion: "angelegt" };
      // Kunde existierte doch (Suche war kurz leer) — noch einmal suchen und nur den Tag setzen.
      const nochmal = await shopifyGraphQL(CUSTOMERS_BY_EMAIL, { query: suche });
      const neu = (nochmal?.customers?.edges || [])
        .map((e) => e?.node)
        .filter((n) => n?.id && String(n.email || "").trim().toLowerCase() === mail);
      if (!neu.length) throw new Error(errs.length ? JSON.stringify(errs) : "Kunde nicht angelegt");
      treffer.push(...neu);
    }
    if (!treffer.length) return { ok: true, aktion: "kein-kunde" };

    let geaendert = 0;
    for (const node of treffer) {
      const tags = Array.isArray(node.tags) ? node.tags : [];
      const hat = tags.some((t) => String(t).toLowerCase() === MITGLIED_TAG);
      if (aktiv === hat) continue;
      const mut = await shopifyGraphQL(aktiv ? TAGS_ADD : TAGS_REMOVE, { id: node.id, tags: [MITGLIED_TAG] });
      const key = aktiv ? "tagsAdd" : "tagsRemove";
      const errs = mut?.[key]?.userErrors || [];
      if (errs.length) throw new Error(JSON.stringify(errs));
      geaendert += 1;
    }
    return { ok: true, aktion: geaendert ? (aktiv ? "gesetzt" : "entfernt") : "unverändert" };
  } catch (e) {
    const grund = String(e?.message || e).slice(0, 200);
    console.error("[shopify] mitglied-tag:", grund);
    return { ok: false, grund };
  }
}

export { shopifyConfigured };
