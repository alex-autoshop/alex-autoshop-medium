-- ===========================================================================
-- Alex Autoshop — Mitgliedsstufe fälschungssicher + Zahlungsgrenze
--
-- Supabase → SQL Editor → New query → alles einfügen → RUN.
-- ZUERST ausführen, DANN die Website hochladen. Die Datei ist so gebaut,
-- dass die alte Website damit weiterläuft — nichts geht kaputt, wenn der
-- Upload erst ein paar Minuten später kommt.
--
-- WARUM: Die Mitgliedsstufe stand in "user_metadata". Die darf jeder Nutzer
-- selbst ändern (eine Zeile in der Browser-Konsole) — und hatte dann Level 3:
-- 40 % Rabatt und Alex' private Handynummer. Ab jetzt zählt nur noch
-- "app_metadata". Die kann ausschließlich der Server bzw. dieser Editor
-- schreiben, nie der Nutzer selbst.
--
-- Unten kommt am Ende eine Liste aller Mitglieder — bitte kurz durchsehen.
-- ===========================================================================


-- 1) ADMIN-ROLLE — nur für Alex' Konten --------------------------------------
-- Die Admin-Prüfung hing bisher allein an der E-Mail-Adresse. Die steht im
-- öffentlichen Code; wer ein Konto mit dieser Adresse anlegen könnte, wäre
-- Admin gewesen. Die Rolle in app_metadata kann niemand selbst setzen.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"rolle": "admin"}'::jsonb
where lower(email) in ('alexanderharitopoulos@gmail.com', 'info@alex-autoshop.de')
  and email_confirmed_at is not null;


-- 2) BESTEHENDE MITGLIEDER ÜBERNEHMEN ----------------------------------------
-- Stand von jetzt wird 1:1 übernommen, damit kein zahlendes Mitglied seinen
-- Rabatt verliert. Nur Zahlen 1–3 zählen (so hat es die Website auch bisher
-- gelesen). Wer schon einen Wert in app_metadata hat, bleibt unverändert.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('membership_level', (raw_user_meta_data ->> 'membership_level')::int)
where (raw_user_meta_data ->> 'membership_level') ~ '^[1-3]$'
  and (raw_app_meta_data ->> 'membership_level') is null;

-- Gratis-Teststunde: wer sie schon hatte, bekommt sie nicht nochmal.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"trial_used": true}'::jsonb
where (raw_user_meta_data ->> 'trial_used') = 'true'
  and (raw_app_meta_data ->> 'trial_used') is null;


-- 3) ANFRAGEN: Nutzer dürfen ihre Anfrage nicht selbst "annehmen" ------------
-- Bisher durfte jeder seine eigene Anfrage beliebig ändern — auch den Status.
drop policy if exists "request update own" on public.membership_requests;
create policy "request update own" on public.membership_requests
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and status = 'pending');

-- Admins sehen alle Anfragen — jetzt über die Rolle statt über die E-Mail.
-- (Die Rolle steckt im Anmelde-Token: nach dem Ausführen einmal ab- und
--  wieder anmelden, dann sind die Anfragen im Postfach sofort da.)
drop policy if exists "request read admin" on public.membership_requests;
create policy "request read admin" on public.membership_requests
  for select using ((auth.jwt() -> 'app_metadata' ->> 'rolle') = 'admin');


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


-- 6) ZUM DURCHSEHEN: alle Mitglieder mit Stufe ------------------------------
-- "ueber_anfrage = false" heißt: diese Stufe wurde NICHT über das Postfach
-- freigeschaltet. Das kann ein Mitglied sein, das du von Hand eingetragen
-- hast — oder jemand, der sich die Stufe selbst gegeben hat. Kennst du ein
-- Konto nicht, setzt du es so zurück (E-Mail anpassen):
--
--   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"membership_level": 0}'::jsonb
--   where email = 'name@beispiel.de';
select
  u.email,
  (u.raw_app_meta_data ->> 'membership_level')::int as stufe,
  exists (
    select 1 from public.membership_requests m
    where m.user_id = u.id and m.status = 'accepted'
      and m.level = (u.raw_app_meta_data ->> 'membership_level')::int
  ) as ueber_anfrage,
  (u.raw_app_meta_data ->> 'rolle') as rolle,
  u.created_at::date as angelegt,
  u.last_sign_in_at::date as zuletzt_da
from auth.users u
where (u.raw_app_meta_data ->> 'membership_level') ~ '^[1-3]$'
   or (u.raw_app_meta_data ->> 'rolle') = 'admin'
order by ueber_anfrage, stufe desc, u.created_at desc;
