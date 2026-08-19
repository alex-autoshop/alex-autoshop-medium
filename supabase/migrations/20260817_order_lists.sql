-- Bestelllisten für den B2B-Shop: gespeicherte Zusammenstellungen, die ein
-- Kunde mit einem Klick wieder in den Warenkorb legt ("Monats-Nachschub").
-- Ohne diese Tabelle fällt die Oberfläche automatisch auf localStorage zurück
-- (funktioniert dann nur auf dem einen Gerät).

create table if not exists public.order_lists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  items      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_lists_user_idx on public.order_lists (user_id, created_at desc);

alter table public.order_lists enable row level security;

-- Jeder sieht und ändert nur seine eigenen Listen.
drop policy if exists "order_lists_select_own" on public.order_lists;
create policy "order_lists_select_own" on public.order_lists
  for select using (auth.uid() = user_id);

drop policy if exists "order_lists_insert_own" on public.order_lists;
create policy "order_lists_insert_own" on public.order_lists
  for insert with check (auth.uid() = user_id);

drop policy if exists "order_lists_update_own" on public.order_lists;
create policy "order_lists_update_own" on public.order_lists
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "order_lists_delete_own" on public.order_lists;
create policy "order_lists_delete_own" on public.order_lists
  for delete using (auth.uid() = user_id);
