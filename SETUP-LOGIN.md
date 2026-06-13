# Login / Mitgliederbereich aktivieren

Der Login-Code ist fertig und funktioniert. Damit er **auf der Live-Seite** läuft,
müssen einmalig zwei Werte in Vercel hinterlegt werden.

## 1. Die zwei Werte in Vercel eintragen

1. Auf [vercel.com](https://vercel.com) → Projekt **alex-autoshop-medium** öffnen
2. Oben **Settings** → links **Environment Variables**
3. Diese zwei Variablen anlegen (Name exakt so):

   | Name | Wert |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://zasbdvtsxgimcezotlsi.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_hMoY8Rgjjb9cvmeMaTEJoQ_AkBoF3FX` |

   *(Das sind die Werte der bestehenden Supabase-Datenbank deiner Profi-Seite.
   Willst du eine getrennte Datenbank für die Medium-Seite, leg in Supabase ein
   neues Projekt an und nimm dessen URL + „publishable"/anon Key.)*

4. **Save** → dann unter **Deployments** das neueste Deployment **Redeploy**
   (Env-Variablen greifen erst nach einem neuen Build).

Danach funktioniert auf der Live-Seite: Registrieren, Login, geschütztes
Teileportal und das Dashboard.

## 2. E-Mail-Bestätigung (wichtig fürs erste Testen)

Standardmäßig schickt Supabase nach der Registrierung eine Bestätigungs-E-Mail.
Erst nach Klick auf den Link kann man sich anmelden.

- Komfortabler für Werkstätten: In Supabase unter **Authentication → Providers → Email**
  die Option **„Confirm email"** ausschalten → dann ist man sofort nach der
  Registrierung angemeldet.
- Oder eingeschaltet lassen (sicherer) — die Seite zeigt dann den Hinweis
  „Bitte bestätige den Link in deiner E-Mail".

## 3. Mitgliedschaftsstufe eines Kunden setzen

Neue Konten starten als **„kein Mitglied" (Level 0)** — sie sehen Normalpreise
und wie viel sie als Mitglied sparen würden.

Wird jemand telefonisch Mitglied, setzt du seine Stufe so:

1. Supabase → **Authentication → Users** → den Nutzer anklicken
2. Bei **User Metadata** den Wert `membership_level` auf `1`, `2` oder `3` setzen
3. Speichern — beim nächsten Login sieht der Kunde seinen Rabatt im Dashboard

> Hinweis: Die im Dashboard angezeigte Stufe ist informativ. Der echte Rabatt
> wird beim Kauf/an der Theke angewendet. Für eine fälschungssichere Lösung
> (Stufe nur durch Admin änderbar) später eine `profiles`-Tabelle mit RLS — sag
> Bescheid, wenn das gebraucht wird.
