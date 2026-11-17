// Öffentliche Basis für Rücksprünge (success/cancel) und interne Aufrufe.
//
// https://alex-autoshop.de antwortet mit 308 auf https://www.alex-autoshop.de.
// Stripe und GoCardless folgen bei Webhooks keinem Redirect. success-/cancel-URLs
// und der Aufruf der eigenen API sollen deshalb direkt auf www zeigen.

export const OEFFENTLICHE_BASIS_DEFAULT = "https://www.alex-autoshop.de";

export const WEBHOOK_STRIPE_URL = `${OEFFENTLICHE_BASIS_DEFAULT}/api/stripe-webhook`;
export const WEBHOOK_GOCARDLESS_URL = `${OEFFENTLICHE_BASIS_DEFAULT}/api/gocardless-webhook`;

/**
 * Events, die /api/stripe-webhook auswertet.
 * Im Stripe-Dashboard (Live) genau diese abonnieren.
 * invoice.paid schreibt den Höchstbeitrag der Mindestlaufzeit fort.
 */
export const STRIPE_WEBHOOK_EVENTS = Object.freeze([
  "checkout.session.completed",
  "checkout.session.expired",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

/**
 * GoCardless schickt ein Bündel von Ereignissen. Der Webhook wertet diese aus.
 * Im GoCardless-Endpunkt diese Ressourcen zulassen.
 */
export const GOCARDLESS_WEBHOOK_AKTIONEN = Object.freeze([
  { ressource: "billing_requests", aktionen: ["fulfilled", "cancelled"] },
  { ressource: "payments", aktionen: ["confirmed", "paid_out", "failed", "cancelled", "charged_back", "late_failure_settled"] },
  { ressource: "subscriptions", aktionen: ["cancelled", "finished"] },
  { ressource: "mandates", aktionen: ["cancelled", "failed", "expired"] },
]);

export function oeffentlicheBasis() {
  const roh = String(process.env.PUBLIC_BASE_URL || "").trim();
  if (!roh) return OEFFENTLICHE_BASIS_DEFAULT;
  try {
    const url = new URL(roh);
    if (url.hostname === "alex-autoshop.de") return OEFFENTLICHE_BASIS_DEFAULT;
    const pfad = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${pfad && pfad !== "/" ? pfad : ""}`;
  } catch {
    return roh.replace(/\/+$/, "") || OEFFENTLICHE_BASIS_DEFAULT;
  }
}
