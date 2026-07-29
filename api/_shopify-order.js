// Gemeinsamer Helper: Mitgliedschaft (oder Teileportal-Bestellung) als echte
// Shopify-Bestellung anlegen — via Admin GraphQL API (orderCreate).
//
// Benötigte Vercel-Env-Vars:
//   SHOPIFY_ADMIN_TOKEN   — Admin-API Access-Token der Custom App (shpat_…)
//   SHOPIFY_STORE_DOMAIN  — z.B. "shop.alex-autoshop.de" (Fallback unten gesetzt)
//
// Scopes der Custom App: write_orders, write_customers (read_orders optional).

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
 * @param {string}  p.title        Positionsname, z.B. "Alex Autoshop Mitgliedschaft Level 2"
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

export { shopifyConfigured };
