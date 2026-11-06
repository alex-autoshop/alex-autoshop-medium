-- Isolierte Testdatenbank. Nur auf einem NEUEN, leeren Supabase-Projekt ausführen.
-- Nicht gegen zasbdvtsxgimcezotlsi. Keine Produktionsnutzer, keine Kopie von PII.
-- Legt keine Konten an. Der Webhook-Host legt einen Testnutzer erst bei einem
-- signierten Test-Event an. Seed: keiner.

create table if not exists public.membership_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  level int not null,
  modules text[],
  status text not null default 'pending',
  member_no text,
  referral_code text,
  created_at timestamptz default now()
);
alter table public.membership_requests enable row level security;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  recipient uuid not null references auth.users(id) on delete cascade,
  sender_name text,
  type text not null default 'system',
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;

-- 4) FREISCHALTEN schreibt die Stufe dorthin, wo sie keiner fälschen kann ----
create or replace function public.approve_membership_request(req_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  r public.membership_requests%rowtype;
begin
  -- nur Admins — frisch aus der Datenbank, nicht aus dem Token
  if not exists (
    select 1 from auth.users
    where id = auth.uid() and (raw_app_meta_data ->> 'rolle') = 'admin'
  ) then
    raise exception 'Nicht berechtigt';
  end if;

  select * into r from public.membership_requests where id = req_id;
  if not found then
    raise exception 'Anfrage nicht gefunden';
  end if;
  if r.level not between 1 and 3 then
    raise exception 'Ungültige Stufe';
  end if;

  update public.membership_requests set status = 'accepted' where id = req_id;

  if r.user_id is not null then
    update auth.users
    set raw_app_meta_data  = coalesce(raw_app_meta_data,  '{}'::jsonb) || jsonb_build_object('membership_level', r.level),
        -- user_metadata nur noch als Anzeige-Kopie für ältere Seitenteile
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('membership_level', r.level)
    where id = r.user_id;

    insert into public.messages (recipient, type, title, body)
    values (
      r.user_id, 'membership',
      'Mitgliedschaft Level ' || r.level || ' freigeschaltet 🎉',
      'Willkommen! Deine Mitgliedschaft Level ' || r.level ||
      ' ist aktiv. Dein Rabatt gilt ab dem nächsten Login.'
    );
  end if;
end;
$$;

grant execute on function public.approve_membership_request(uuid) to authenticated;


-- 5) BEZAHLTE TEILE-BESTELLUNGEN — Grundlage für die Zahlungsgrenze ----------
-- Neukunden zahlen online nur bis zu einem kleinen Betrag. Erst nach 5
-- bezahlten Bestellungen an 5 verschiedenen Tagen gilt die höhere Grenze.
-- Einträge schreiben ausschließlich die Zahlungs-Webhooks (Service-Key).
create table if not exists public.teile_zahlungen (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  email       text,
  betrag      numeric(10,2) not null default 0,
  anbieter    text not null check (anbieter in ('stripe', 'gocardless')),
  typ         text not null default 'teile',          -- teile | theke
  status      text not null default 'offen'           -- offen | bezahlt | fehlgeschlagen
              check (status in ('offen', 'bezahlt', 'fehlgeschlagen')),
  extern_id   text not null unique,                   -- Stripe-Session / GoCardless-Zahlung
  erstellt_am timestamptz not null default now(),
  bezahlt_am  timestamptz
);

create index if not exists teile_zahlungen_user_idx on public.teile_zahlungen (user_id, status);

alter table public.teile_zahlungen enable row level security;

-- Jeder sieht nur seine eigenen Zahlungen; schreiben kann nur der Server.
drop policy if exists "zahlungen lesen eigene" on public.teile_zahlungen;
create policy "zahlungen lesen eigene" on public.teile_zahlungen
  for select using (auth.uid() = user_id);


-- 5b) EMPFEHLUNGEN: Werber finden und zuordnen -----------------------------
-- Wer über einen Empfehlungslink (…/mitgliedschaft?ref=CODE) kommt, wird dem
-- Werber zugeordnet. Die ersten drei Funktionen darf NUR der Server aufrufen
-- (Service-Key) — sonst könnte jeder fremde Konten verknüpfen.

-- Konto-ID zu einer E-Mail (Server)
create or replace function public.nutzer_id(mail text)
returns uuid
language sql stable security definer set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(mail) order by created_at limit 1;
$$;

-- Werber zu einem Code: eigener Werbe-Code oder — wie im Kundenkonto angezeigt —
-- die ersten 8 Zeichen der Konto-ID.
create or replace function public.werber_finden(code text)
returns table (user_id uuid, werbe_code text)
language sql stable security definer set search_path = public, auth
as $$
  select u.id,
         coalesce(nullif(u.raw_app_meta_data ->> 'referral_code', ''), upper(left(u.id::text, 8)))
  from auth.users u
  where length(coalesce(code, '')) between 6 and 8
    and (upper(u.raw_app_meta_data ->> 'referral_code') = upper(code)
         or upper(left(u.id::text, 8)) = upper(code))
  order by (upper(u.raw_app_meta_data ->> 'referral_code') = upper(code)) desc nulls last, u.created_at
  limit 1;
$$;

-- Werber eintragen — nur wenn noch keiner drinsteht, das Konto jünger als
-- 30 Tage ist und es nicht der eigene Code ist.
create or replace function public.werber_zuordnen(ziel uuid, code text)
returns text
language plpgsql security definer set search_path = public, auth
as $$
declare
  z_meta jsonb;
  z_angelegt timestamptz;
  w_id uuid;
  w_code text;
begin
  select raw_app_meta_data, created_at into z_meta, z_angelegt from auth.users where id = ziel;
  if not found then return 'kein_konto'; end if;
  if coalesce(z_meta ->> 'referred_by_id', z_meta ->> 'referred_by') is not null then
    return 'schon_zugeordnet';
  end if;
  if z_angelegt < now() - interval '30 days' then return 'zu_alt'; end if;

  select f.user_id, f.werbe_code into w_id, w_code from public.werber_finden(code) f;
  if w_id is null then return 'code_unbekannt'; end if;
  if w_id = ziel then return 'eigener_code'; end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('referred_by', w_code, 'referred_by_id', w_id::text)
  where id = ziel;
  return 'ok';
end;
$$;

revoke all on function public.nutzer_id(text) from public, anon, authenticated;
revoke all on function public.werber_finden(text) from public, anon, authenticated;
revoke all on function public.werber_zuordnen(uuid, text) from public, anon, authenticated;
grant execute on function public.nutzer_id(text) to service_role;
grant execute on function public.werber_finden(text) to service_role;
grant execute on function public.werber_zuordnen(uuid, text) to service_role;

-- Wie viele Kollegen habe ICH geworben? (für das Kundenkonto — nur die eigene Zahl)
create or replace function public.meine_empfehlungen()
returns integer
language sql stable security definer set search_path = public, auth
as $$
  select count(*)::int from auth.users u
  where (u.raw_app_meta_data ->> 'referred_by_id') = auth.uid()::text;
$$;

revoke all on function public.meine_empfehlungen() from public, anon;
grant execute on function public.meine_empfehlungen() to authenticated;


-- 5c) EMPFEHLUNGS-GUTHABEN BUCHEN ------------------------------------------
-- Bezahlt ein geworbener Kunde online in der Teilebörse, bekommt sein Werber
-- automatisch einen Anteil als Guthaben (Satz: shared/empfehlung.js).
-- Jede Zahlung wird höchstens EINMAL gutgeschrieben — Webhooks können
-- mehrfach kommen. Platzt eine Lastschrift, wird die Gutschrift abgezogen.
alter table public.teile_zahlungen add column if not exists provision numeric(10,2);
alter table public.teile_zahlungen add column if not exists provision_werber uuid;
alter table public.teile_zahlungen add column if not exists provision_storniert boolean not null default false;

create or replace function public.provision_buchen(p_extern_id text, p_satz numeric)
returns text
language plpgsql security definer set search_path = public, auth
as $$
declare
  z public.teile_zahlungen%rowtype;
  w_id uuid;
  v_provision numeric(10,2);
begin
  if p_satz is null or p_satz < 0 or p_satz > 0.3 then return 'satz_ungueltig'; end if;
  select * into z from public.teile_zahlungen where extern_id = p_extern_id for update;
  if not found then return 'keine_zahlung'; end if;

  if z.status = 'bezahlt' and z.provision is null then
    select (raw_app_meta_data ->> 'referred_by_id')::uuid into w_id
    from auth.users where id = z.user_id and (raw_app_meta_data ->> 'referred_by_id') ~ '^[0-9a-f-]{36}$';
    if w_id is null or w_id = z.user_id then
      update public.teile_zahlungen set provision = 0 where id = z.id;
      return 'kein_werber';
    end if;
    v_provision := round(z.betrag * p_satz, 2);
    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'affiliate_credit',
      round(coalesce(case when (raw_app_meta_data ->> 'affiliate_credit') ~ '^-?[0-9]+(\.[0-9]+)?$'
                          then (raw_app_meta_data ->> 'affiliate_credit')::numeric end, 0) + v_provision, 2))
    where id = w_id;
    update public.teile_zahlungen set provision = v_provision, provision_werber = w_id where id = z.id;
    return 'gutgeschrieben';
  end if;

  if z.status = 'fehlgeschlagen' and coalesce(z.provision, 0) > 0 and not z.provision_storniert then
    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'affiliate_credit',
      greatest(0, round(coalesce(case when (raw_app_meta_data ->> 'affiliate_credit') ~ '^-?[0-9]+(\.[0-9]+)?$'
                                      then (raw_app_meta_data ->> 'affiliate_credit')::numeric end, 0) - z.provision, 2)))
    where id = z.provision_werber;
    update public.teile_zahlungen set provision_storniert = true where id = z.id;
    return 'storniert';
  end if;

  return 'nichts_zu_tun';
end;
$$;

-- Guthaben von Hand ändern (Admin-Liste: Laden-/Shop-Einkäufe gutschreiben,
-- eingelöstes Guthaben abziehen). Nie unter 0. Gibt den neuen Stand zurück.
create or replace function public.guthaben_aendern(ziel uuid, betrag numeric)
returns numeric
language plpgsql security definer set search_path = public, auth
as $$
declare
  neu numeric(10,2);
begin
  if betrag is null or abs(betrag) > 10000 then raise exception 'Betrag ungültig'; end if;
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
    'affiliate_credit',
    greatest(0, round(coalesce(case when (raw_app_meta_data ->> 'affiliate_credit') ~ '^-?[0-9]+(\.[0-9]+)?$'
                                    then (raw_app_meta_data ->> 'affiliate_credit')::numeric end, 0) + betrag, 2)))
  where id = ziel
  returning (raw_app_meta_data ->> 'affiliate_credit')::numeric into neu;
  if neu is null then raise exception 'Konto nicht gefunden'; end if;
  return neu;
end;
$$;

revoke all on function public.provision_buchen(text, numeric) from public, anon, authenticated;
revoke all on function public.guthaben_aendern(uuid, numeric) from public, anon, authenticated;
grant execute on function public.provision_buchen(text, numeric) to service_role;
grant execute on function public.guthaben_aendern(uuid, numeric) to service_role;


-- 5d) GUTHABEN BEIM BEZAHLEN EINLÖSEN ---------------------------------------
-- Ablauf: Beim Klick auf "bezahlen" wird das Guthaben RESERVIERT (sofort vom
-- Konto abgezogen, damit es nicht zweimal eingelöst wird). Kommt die Zahlung
-- durch → eingelöst. Bricht der Kunde ab, läuft die Bezahlseite ab oder
-- platzt die Lastschrift → das Guthaben geht zurück aufs Konto.
create table if not exists public.guthaben_reservierungen (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  betrag      numeric(10,2) not null check (betrag > 0),
  anbieter    text not null check (anbieter in ('stripe', 'gocardless')),
  status      text not null default 'reserviert'
              check (status in ('reserviert', 'eingeloest', 'freigegeben')),
  extern_id   text unique,          -- Stripe-Bezahlseite bzw. GoCardless-Anfrage/Zahlung
  erstellt_am timestamptz not null default now(),
  erledigt_am timestamptz
);
create index if not exists guthaben_res_user_idx on public.guthaben_reservierungen (user_id, status);
alter table public.guthaben_reservierungen enable row level security;
-- Keine Regel für Kunden: lesen und schreiben nur über den Server.

-- Guthaben aus den Konto-Daten als Zahl (kaputte Werte zählen als 0)
create or replace function public.guthaben_von(p_meta jsonb)
returns numeric
language sql immutable
as $$
  select coalesce(case when (p_meta ->> 'affiliate_credit') ~ '^-?[0-9]+(\.[0-9]+)?$'
                       then (p_meta ->> 'affiliate_credit')::numeric end, 0);
$$;

-- Guthaben reservieren: höchstens p_max, höchstens was da ist. Gibt die
-- Reservierung zurück (oder nichts, wenn kein Guthaben da ist).
create or replace function public.guthaben_reservieren(p_user uuid, p_max numeric, p_anbieter text)
returns table (res_id uuid, res_betrag numeric)
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_meta jsonb;
  v_stand numeric;
  v_betrag numeric(10,2);
  v_alt record;
  v_id uuid;
begin
  if p_anbieter not in ('stripe', 'gocardless') or p_max is null or p_max <= 0 then return; end if;
  -- Konto sperren: zwei gleichzeitige Bezahlvorgänge warten aufeinander
  select raw_app_meta_data into v_meta from auth.users where id = p_user for update;
  if not found then return; end if;
  v_meta := coalesce(v_meta, '{}'::jsonb);

  -- Reservierungen, zu denen nie eine Bezahlseite entstand, zurückgeben
  for v_alt in
    select r.id as rid, r.betrag as rbetrag from public.guthaben_reservierungen r
    where r.user_id = p_user and r.status = 'reserviert' and r.extern_id is null
      and r.erstellt_am < now() - interval '15 minutes'
  loop
    v_meta := v_meta || jsonb_build_object('affiliate_credit', round(public.guthaben_von(v_meta) + v_alt.rbetrag, 2));
    update public.guthaben_reservierungen set status = 'freigegeben', erledigt_am = now() where id = v_alt.rid;
  end loop;

  v_stand := greatest(0, public.guthaben_von(v_meta));
  v_betrag := floor(least(v_stand, p_max) * 100) / 100;
  if v_betrag <= 0 then
    update auth.users set raw_app_meta_data = v_meta where id = p_user;
    return;
  end if;

  v_meta := v_meta || jsonb_build_object('affiliate_credit', round(v_stand - v_betrag, 2));
  update auth.users set raw_app_meta_data = v_meta where id = p_user;
  insert into public.guthaben_reservierungen (user_id, betrag, anbieter)
  values (p_user, v_betrag, p_anbieter)
  returning id into v_id;

  res_id := v_id;
  res_betrag := v_betrag;
  return next;
end;
$$;

-- Reservierung mit der Bezahlseite verknüpfen (Stripe-Session / GoCardless-Anfrage)
create or replace function public.guthaben_verknuepfen(p_id uuid, p_extern text)
returns boolean
language sql security definer set search_path = public
as $$
  update public.guthaben_reservierungen set extern_id = p_extern
  where id = p_id and status = 'reserviert' and extern_id is null
  returning true;
$$;

-- GoCardless: nach der Freigabe der Lastschrift heißt die Zahlung anders
create or replace function public.guthaben_umhaengen(p_alt text, p_neu text)
returns boolean
language sql security definer set search_path = public
as $$
  update public.guthaben_reservierungen set extern_id = p_neu
  where extern_id = p_alt and status = 'reserviert'
  returning true;
$$;

-- Zahlung durch → eingelöst. Nicht durch → Guthaben zurück aufs Konto.
-- Mehrfach aufrufbar (Webhooks kommen gern doppelt).
create or replace function public.guthaben_abschliessen(p_extern text, p_bezahlt boolean)
returns text
language plpgsql security definer set search_path = public, auth
as $$
declare
  r public.guthaben_reservierungen%rowtype;
begin
  select * into r from public.guthaben_reservierungen where extern_id = p_extern for update;
  if not found then return 'keine'; end if;

  if p_bezahlt then
    if r.status = 'reserviert' then
      update public.guthaben_reservierungen set status = 'eingeloest', erledigt_am = now() where id = r.id;
      return 'eingeloest';
    end if;
    return 'nichts_zu_tun';
  end if;

  -- nicht bezahlt (auch: Rücklastschrift nach Einlösung)
  if r.status in ('reserviert', 'eingeloest') then
    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('affiliate_credit', round(public.guthaben_von(raw_app_meta_data) + r.betrag, 2))
    where id = r.user_id;
    update public.guthaben_reservierungen set status = 'freigegeben', erledigt_am = now() where id = r.id;
    return 'freigegeben';
  end if;
  return 'nichts_zu_tun';
end;
$$;

-- Reservierungen ohne Bezahlseite (Server abgestürzt, bevor der Kunde den
-- Link bekam) nach 15 Minuten zurückgeben. Läuft beim Öffnen des Warenkorbs.
-- Sicher, weil der Kunde ohne Verknüpfung nie einen Bezahl-Link erhalten hat.
create or replace function public.guthaben_aufraeumen(p_user uuid)
returns numeric
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_summe numeric := 0;
  v_alt record;
begin
  perform 1 from auth.users where id = p_user for update;
  if not found then return 0; end if;
  for v_alt in
    select r.id as rid, r.betrag as rbetrag from public.guthaben_reservierungen r
    where r.user_id = p_user and r.status = 'reserviert' and r.extern_id is null
      and r.erstellt_am < now() - interval '15 minutes'
    for update
  loop
    v_summe := v_summe + v_alt.rbetrag;
    update public.guthaben_reservierungen set status = 'freigegeben', erledigt_am = now() where id = v_alt.rid;
  end loop;
  if v_summe > 0 then
    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('affiliate_credit', round(public.guthaben_von(raw_app_meta_data) + v_summe, 2))
    where id = p_user;
  end if;
  return v_summe;
end;
$$;

-- Sofort zurückgeben, wenn die Bezahlseite gar nicht erst entstanden ist
create or replace function public.guthaben_freigeben(p_id uuid)
returns text
language plpgsql security definer set search_path = public, auth
as $$
declare
  r public.guthaben_reservierungen%rowtype;
begin
  select * into r from public.guthaben_reservierungen where id = p_id for update;
  if not found then return 'keine'; end if;
  if r.status <> 'reserviert' then return 'nichts_zu_tun'; end if;
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('affiliate_credit', round(public.guthaben_von(raw_app_meta_data) + r.betrag, 2))
  where id = r.user_id;
  update public.guthaben_reservierungen set status = 'freigegeben', erledigt_am = now() where id = r.id;
  return 'freigegeben';
end;
$$;

revoke all on function public.guthaben_von(jsonb) from public, anon, authenticated;
revoke all on function public.guthaben_reservieren(uuid, numeric, text) from public, anon, authenticated;
revoke all on function public.guthaben_verknuepfen(uuid, text) from public, anon, authenticated;
revoke all on function public.guthaben_umhaengen(text, text) from public, anon, authenticated;
revoke all on function public.guthaben_abschliessen(text, boolean) from public, anon, authenticated;
revoke all on function public.guthaben_freigeben(uuid) from public, anon, authenticated;
revoke all on function public.guthaben_aufraeumen(uuid) from public, anon, authenticated;
grant execute on function public.guthaben_von(jsonb) to service_role;
grant execute on function public.guthaben_reservieren(uuid, numeric, text) to service_role;
grant execute on function public.guthaben_verknuepfen(uuid, text) to service_role;
grant execute on function public.guthaben_umhaengen(text, text) to service_role;
grant execute on function public.guthaben_abschliessen(text, boolean) to service_role;
grant execute on function public.guthaben_freigeben(uuid) to service_role;
grant execute on function public.guthaben_aufraeumen(uuid) to service_role;

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
