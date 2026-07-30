-- ─────────────────────────────────────────────────────────────
-- Live Chat — Alex Autoshop
-- Führe dieses SQL in deinem Supabase SQL-Editor aus:
-- https://zasbdvtsxgimcezotlsi.supabase.co/project/default/sql
-- ─────────────────────────────────────────────────────────────

-- Chat-Sessions (eine pro Besucher-Fenster)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_name TEXT,
  started_at  TIMESTAMPTZ DEFAULT now(),
  last_msg_at TIMESTAMPTZ DEFAULT now(),
  status      TEXT        DEFAULT 'open'   -- 'open' | 'closed'
);

-- Nachrichten
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID        REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  sender      TEXT        NOT NULL,   -- 'visitor' | 'agent'
  message     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE chat_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;

-- Jeder darf Sessions anlegen und lesen
CREATE POLICY "chat_sessions_insert" ON chat_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "chat_sessions_select" ON chat_sessions FOR SELECT USING (true);
CREATE POLICY "chat_sessions_update" ON chat_sessions FOR UPDATE USING (true);

-- Jeder darf Nachrichten schreiben und lesen (RLS auf Session-Ebene reicht)
CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT USING (true);

-- Realtime für beide Tabellen aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
