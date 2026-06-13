-- ===========================================================================
-- Alex Autoshop — Bestellhistorie
-- Einmal in Supabase ausführen: SQL Editor -> New query -> einfügen -> RUN.
-- ===========================================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]',
  total numeric not null default 0,
  currency text not null default 'EUR',
  status text not null default 'gestartet',   -- gestartet | bestaetigt | storniert
  created_at timestamptz default now()
);

alter table public.orders enable row level security;

drop policy if exists "orders read own" on public.orders;
create policy "orders read own" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "orders insert own" on public.orders;
create policy "orders insert own" on public.orders
  for insert with check (auth.uid() = user_id);
