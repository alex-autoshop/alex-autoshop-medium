-- ===========================================================================
-- Admin-Freischaltung: Admins dürfen Mitgliedschaftsanfragen sehen & per Klick
-- gratis freischalten (setzt die Rabattstufe des Nutzers).
-- Im Supabase SQL Editor ausführen (New query -> einfügen -> RUN).
-- Admin-E-Mails bei Bedarf in BEIDEN Stellen anpassen.
-- ===========================================================================

-- 1) Admins dürfen ALLE offenen Anfragen sehen (zusätzlich zur "eigene"-Regel)
drop policy if exists "request read admin" on public.membership_requests;
create policy "request read admin" on public.membership_requests
  for select using (
    (auth.jwt() ->> 'email') in ('alexanderharitopoulos@gmail.com', 'info@alex-autoshop.de')
  );

-- 2) Sichere Funktion: Anfrage annehmen + Mitgliedschaft freischalten
create or replace function public.approve_membership_request(req_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  r public.membership_requests%rowtype;
  caller_email text := (auth.jwt() ->> 'email');
begin
  -- nur Admins
  if caller_email is null
     or caller_email not in ('alexanderharitopoulos@gmail.com', 'info@alex-autoshop.de') then
    raise exception 'Nicht berechtigt';
  end if;

  select * into r from public.membership_requests where id = req_id;
  if not found then
    raise exception 'Anfrage nicht gefunden';
  end if;

  update public.membership_requests set status = 'accepted' where id = req_id;

  if r.user_id is not null then
    -- Rabattstufe gratis (0 €) freischalten
    update auth.users
    set raw_user_meta_data =
        coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('membership_level', r.level)
    where id = r.user_id;

    -- Bestätigung in die Inbox des Mitglieds
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
