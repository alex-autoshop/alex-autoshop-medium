-- Teilebörse-Bestellungen nach erfolgreicher Zahlung.
-- Supabase → SQL Editor → einfügen → RUN. Mehrfach ausführen ist in Ordnung.
-- Der Server schreibt mit dem Service-Role-Schlüssel. Kunden lesen die Tabelle nicht.

create table if not exists public.teile_bestellungen (
  id uuid primary key default gen_random_uuid(),
  extern_id text not null unique,
  anbieter text not null,
  status text not null default 'offen',
  email text,
  name text,
  strasse text,
  plz text,
  ort text,
  positionen jsonb not null default '[]'::jsonb,
  warenwert numeric,
  versand numeric,
  pfand numeric,
  summe numeric,
  fahrzeug text,
  vin text,
  bezahlt_am timestamptz,
  mail_kunde boolean not null default false,
  mail_laden boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.teile_bestellungen enable row level security;
