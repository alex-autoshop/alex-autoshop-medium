-- ===========================================================================
-- Businesskonto1: gratis (0 €) als Level-2-Mitglied freischalten
--   + eine Beispiel-Bestellung ins Dashboard legen
-- Im Supabase SQL Editor ausführen (New query -> einfügen -> RUN).
-- Falls die E-Mail anders ist, unten überall anpassen.
-- ===========================================================================

-- 1) Mitgliedschaft gratis freischalten (Level 2 = 33 % Rabatt)
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"membership_level":2}'::jsonb
where email = 'info@alex-autoshop.de';

-- offene Anfrage als angenommen markieren (falls vorhanden)
update public.membership_requests
set status = 'accepted'
where email = 'info@alex-autoshop.de' and status = 'pending';

-- Bestätigung in die Inbox
insert into public.messages (recipient, type, title, body)
select id, 'membership', 'Mitgliedschaft Level 2 freigeschaltet 🎉',
       'Willkommen! Deine Mitgliedschaft Level 2 (33 % Rabatt) ist aktiv – gratis freigeschaltet.'
from auth.users where email = 'info@alex-autoshop.de';

-- 2) Beispiel-Bestellung fürs Dashboard
insert into public.orders (user_id, items, total, currency, status)
select id,
  '[
     {"variantId":"demo-1","variantTitle":"500 ml","title":"FRIZ 2K Klarlack","handle":"friz-2k-klarlack","image":"","price":{"amount":"13.00","currencyCode":"EUR"},"quantity":2},
     {"variantId":"demo-2","variantTitle":"1 L","title":"Mipa CX4 Klarlack","handle":"mipa-cx4","image":"","price":{"amount":"29.95","currencyCode":"EUR"},"quantity":1}
   ]'::jsonb,
  55.95, 'EUR', 'bestaetigt'
from auth.users where email = 'info@alex-autoshop.de';
