-- Webhook-Ereignisse nur einmal ausführen.
-- Supabase → SQL Editor → New query → alles einfügen → RUN.
-- Mehrfach ausführen ist in Ordnung.
--
-- Schreiben darf nur der Server (Service-Schlüssel). Ohne diese Tabelle
-- bleiben die Webhooks lauffähig; Wiederholungen sind dann nur innerhalb
-- einer Instanz und über die Idempotency-Keys bei GoCardless geschützt.

create table if not exists public.webhook_ereignisse (
  id text primary key,
  gesehen_am timestamptz not null default now()
);

alter table public.webhook_ereignisse enable row level security;
