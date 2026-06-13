-- ===========================================================================
-- Alex Autoshop — Inbox & Mitgliedschaftsanfragen
-- Einmal in Supabase ausführen:  Dashboard -> SQL Editor -> New query ->
-- diesen Inhalt einfügen -> RUN.
-- ===========================================================================

-- Mitgliedschaftsanfragen ----------------------------------------------------
create table if not exists public.membership_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  level int not null,
  modules text[],
  status text not null default 'pending',
  created_at timestamptz default now()
);

alter table public.membership_requests enable row level security;

drop policy if exists "request insert" on public.membership_requests;
create policy "request insert" on public.membership_requests
  for insert with check (true);

drop policy if exists "request read own" on public.membership_requests;
create policy "request read own" on public.membership_requests
  for select using (auth.uid() = user_id);

drop policy if exists "request update own" on public.membership_requests;
create policy "request update own" on public.membership_requests
  for update using (auth.uid() = user_id);

-- Nachrichten / Inbox --------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  recipient uuid not null references auth.users(id) on delete cascade,
  sender_name text,
  type text not null default 'system',   -- system | membership | offer | dealer
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

drop policy if exists "msg read own" on public.messages;
create policy "msg read own" on public.messages
  for select using (auth.uid() = recipient);

drop policy if exists "msg update own" on public.messages;
create policy "msg update own" on public.messages
  for update using (auth.uid() = recipient);

-- Eingeloggte dürfen Nachrichten senden (z.B. Händler an Händler, Bestätigungen)
drop policy if exists "msg insert" on public.messages;
create policy "msg insert" on public.messages
  for insert with check (auth.role() = 'authenticated');

-- ===========================================================================
-- Tipp: Eine Willkommens-/News-Nachricht an ALLE Nutzer schickst du so
-- (im SQL Editor ausführen):
--
--   insert into public.messages (recipient, type, title, body)
--   select id, 'offer', 'Willkommen bei Alex Autoshop',
--          'Schön, dass du dabei bist! Hier bekommst du Angebote & News.'
--   from auth.users;
-- ===========================================================================
