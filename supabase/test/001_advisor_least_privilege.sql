-- Nachzug für die schon angelegte Testdatenbank ronyqrmfgzuqfksxrwhu.
-- Nur dort ausführen. Bricht ab, sobald ein Konto existiert, damit das
-- nicht gegen die Produktionsdatenbank laufen kann.

do $$
declare
  n int;
begin
  select count(*) into n from auth.users;
  if n <> 0 then
    raise exception 'Abbruch: nur die leere Testdatenbank (0 Nutzer). Gefunden: %', n;
  end if;
end $$;

-- Freigabe: der Admin im Dashboard ist authenticated (src/lib/inbox.ts).
-- Die Funktion selbst verlangt app_metadata.rolle = admin. anon bleibt draußen.
revoke all on function public.approve_membership_request(uuid) from public, anon;
grant execute on function public.approve_membership_request(uuid) to authenticated;

-- Empfehlungszähler: bewusst nur für die angemeldete Sitzung (Dashboard).
revoke all on function public.meine_empfehlungen() from public, anon;
grant execute on function public.meine_empfehlungen() to authenticated;

-- Reine Zahl aus JSON. Kein Tabellenzugriff, daher nur pg_catalog.
-- Aufruf nur als service_role; die anderen Funktionen rufen sie als Owner auf.
alter function public.guthaben_von(jsonb) set search_path = pg_catalog;
revoke all on function public.guthaben_von(jsonb) from public, anon, authenticated;
grant execute on function public.guthaben_von(jsonb) to service_role;
