# Zahlungs-Webhooks

`https://alex-autoshop.de` antwortet mit **308** auf `https://www.alex-autoshop.de`. Stripe und GoCardless folgen bei Webhooks keinem Redirect. Rücksprung- und Webhook-URLs zeigen deshalb auf **www**.

Steht `PUBLIC_BASE_URL` noch auf `https://alex-autoshop.de`, setzt der Server sie auf `https://www.alex-autoshop.de` um. Andere Hosts (Vorschau-URLs) bleiben unverändert.

## URLs im Live-Dashboard

| Dienst | URL |
|---|---|
| Stripe | `https://www.alex-autoshop.de/api/stripe-webhook` |
| GoCardless | `https://www.alex-autoshop.de/api/gocardless-webhook` |

Dieselbe Liste steht in `.env.example` und in `shared/oeffentliche-basis.js`.

## Stripe-Events

Im Stripe-Dashboard unter **Developers → Webhooks → Endpoint** (Live) genau diese Events abonnieren:

| Event | Wofür |
|---|---|
| `checkout.session.completed` | Zahlung oder Mandat abgeschlossen, Mitgliedschaft oder Teile-Bestellung |
| `checkout.session.expired` | Abgebrochene Kasse, eingesetztes Guthaben zurück |
| `checkout.session.async_payment_succeeded` | Lastschrift später erfolgreich |
| `checkout.session.async_payment_failed` | Lastschrift endgültig fehlgeschlagen |
| `customer.subscription.updated` | Abo geändert, Mindestlaufzeit sichern |
| `customer.subscription.deleted` | Abo beendet |
| `invoice.paid` | Bezahlter Monat. Schreibt den Höchstbeitrag der Mindestlaufzeit fort. Ohne dieses Event fehlt die Grundlage für die Nachberechnung. |
| `invoice.payment_failed` | Keine weitere Rate, Mitgliedschaft beenden |

Der Endpunkt prüft `Stripe-Signature` mit `STRIPE_WEBHOOK_SECRET` über den **Roh-Body**. Fehlt das Geheimnis, antwortet er **500** (`STRIPE_WEBHOOK_SECRET fehlt`) und verarbeitet nichts. Eine ungültige Signatur ist **400**. Erfolg ist **200**. Dieselbe Event-ID wird kein zweites Mal ausgeführt.

## GoCardless

Im Endpunkt diese Ereignisse zulassen:

| Ressource | Aktionen |
|---|---|
| `billing_requests` | `fulfilled`, `cancelled` |
| `payments` | `confirmed`, `paid_out`, `failed`, `cancelled`, `charged_back`, `late_failure_settled` |
| `subscriptions` | `cancelled`, `finished` |
| `mandates` | `cancelled`, `failed`, `expired` |

Der Endpunkt prüft `Webhook-Signature` (Hex-HMAC-SHA256 über den Roh-Body) mit `GOCARDLESS_WEBHOOK_SECRET`. Fehlt das Geheimnis, antwortet er **500** mit dem Text `GOCARDLESS_WEBHOOK_SECRET fehlt` und lässt die Anfrage nicht durch. GoCardless stellt 500 erneut zu, sobald die Variable gesetzt ist. Eine falsche Signatur ist **498** (GoCardless wiederholt 498 nicht). Erfolg ist **200**.

Ein neues Abo bekommt einen Idempotency-Key an der Billing-Request-ID, damit eine Wiederholung kein zweites Abo anlegt.

## Umgebungsvariablen in Vercel Production

Projekt **alex-autoshop-medium**, Umgebung Production. Nur Namen, keine Werte ins Repository:

- `PUBLIC_BASE_URL` = `https://www.alex-autoshop.de` (ohne die Variable gilt derselbe Default)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (Signing secret des Live-Endpunkts)
- `GOCARDLESS_ACCESS_TOKEN` (Live-Token)
- `GOCARDLESS_ENVIRONMENT` = `live`
- `GOCARDLESS_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Für die dauerhafte Idempotenz über Instanzen hinweg einmal `supabase/migrations/20261117_webhook_ereignisse.sql` im SQL-Editor ausführen. Ohne die Tabelle bleiben die Webhooks lauffähig.

Nach dem Setzen der Variablen das Production-Deployment neu ausrollen, damit die Funktionen die Werte sehen.
