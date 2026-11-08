import { wiederholen } from "../shared/abruf.js";

const VERSION = "2025-07";
const DOMAIN = process.env.VITE_SHOPIFY_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN || "j1a6sr-q2.myshopify.com";
const TOKEN = process.env.VITE_SHOPIFY_STOREFRONT_TOKEN || process.env.SHOPIFY_STOREFRONT_TOKEN || "2dc3a08f112a4904d68387a4801dd23c";

/** Katalog-Lesen vom Server. Der Schlüssel bleibt aus der Antwort draußen. */
export async function storefront(query, variables) {
  return wiederholen(async (signal) => {
    const response = await fetch(`https://${DOMAIN}/api/${VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": TOKEN,
      },
      body: JSON.stringify({ query, variables }),
      signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || data.errors) {
      const fehler = new Error("Katalog gerade nicht erreichbar");
      fehler.status = data?.errors ? 400 : (response.status || 502);
      throw fehler;
    }
    return data;
  }, { versuche: 2, timeoutMs: 8000, pauseMs: 200 });
}
