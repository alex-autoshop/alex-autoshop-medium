-- ─────────────────────────────────────────────────────────────
-- Live-Chat: Zugriff schliessen
-- Führe dieses SQL im Supabase SQL-Editor aus:
-- https://zasbdvtsxgimcezotlsi.supabase.co/project/default/sql
-- ─────────────────────────────────────────────────────────────
--
-- AUSGANGSLAGE (gemessen am 17.09.2026):
--   Die Policies aus 20240801_live_chat.sql standen auf USING (true).
--   Mit dem publishable Key, der im oeffentlichen Repo steht, waren alle
--   Chat-Sitzungen und alle Nachrichten lesbar — ohne Login, ohne PIN.
--   Nachgemessen: 9 Sitzungen, 19 Nachrichten.
--
-- NEU:
--   Besucher   — darf eine Sitzung anlegen und schreiben, und nur die
--                EIGENE Sitzung lesen. Nachgewiesen wird das ueber den
--                Header x-chat-session, den der Chat mitschickt. Die
--                Sitzungs-ID ist eine zufaellige UUID: wer sie nicht hat,
--                sieht nichts. Kein Raten moeglich.
--   Alex       — liest ueber /api/admin-chat mit dem Service-Role-Key.
--                Der umgeht RLS, deshalb braucht es hier keine Admin-Regel.
--   Alle anderen — nichts.

-- RLS einschalten. NACHGEMESSEN am 17.09.2026: RLS stand auf diesen beiden
-- Tabellen AUS. Solange es aus ist, werden Policies nie geprueft — egal wie
-- streng sie sind. Das war der Grund, warum der erste Durchlauf nichts
-- bewirkt hat. Nachweis: ein INSERT mit erfundener session_id lief in den
-- Fremdschluessel-Fehler (23503) statt in die Policy (42501).
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Alte, offene Regeln weg
DROP POLICY IF EXISTS "chat_sessions_insert" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_select" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_update" ON chat_sessions;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;

-- Sitzungs-ID aus dem Request-Header lesen.
-- Gibt NULL zurueck, wenn kein Header kam, er leer ist oder keine gueltige
-- UUID enthaelt. Wichtig: NICHTS darf hier einen Fehler werfen — sonst koennte
-- ein Besucher mit einem kaputten Header die ganze Abfrage abbrechen lassen.
CREATE OR REPLACE FUNCTION chat_sitzung_aus_header()
RETURNS uuid
LANGUAGE plpgsql STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE roh text;
BEGIN
  roh := NULLIF(current_setting('request.headers', true), '')::json ->> 'x-chat-session';
  IF roh IS NULL
     OR roh !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    RETURN NULL;
  END IF;
  RETURN roh::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

-- ── chat_sessions ───────────────────────────────────────────
-- Anlegen darf jeder (sonst kann niemand einen Chat starten).
CREATE POLICY "sitzung_anlegen" ON chat_sessions
  FOR INSERT WITH CHECK (true);

-- Lesen nur die eigene Sitzung.
CREATE POLICY "eigene_sitzung_lesen" ON chat_sessions
  FOR SELECT USING (id = chat_sitzung_aus_header());

-- Aendern nur die eigene Sitzung (der Chat setzt last_msg_at).
CREATE POLICY "eigene_sitzung_aendern" ON chat_sessions
  FOR UPDATE USING (id = chat_sitzung_aus_header());

-- ── chat_messages ───────────────────────────────────────────
-- Schreiben nur in die eigene Sitzung — und nur als Besucher.
-- Damit kann niemand mehr im Namen des Shops antworten.
CREATE POLICY "eigene_nachricht_schreiben" ON chat_messages
  FOR INSERT WITH CHECK (
    session_id = chat_sitzung_aus_header() AND sender = 'visitor'
  );

-- Lesen nur die eigene Sitzung.
CREATE POLICY "eigene_nachrichten_lesen" ON chat_messages
  FOR SELECT USING (session_id = chat_sitzung_aus_header());

-- ── Kontrolle ───────────────────────────────────────────────
-- Nach dem Ausfuehren sollte das hier 0 Zeilen liefern (ohne Header):
--   SELECT count(*) FROM chat_messages;
-- Und im Browser ohne x-chat-session-Header ebenfalls 0.
