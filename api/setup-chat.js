// EINMALIGE Setup-Funktion — nach Ausführung löschen!
// Löscht alte chat_messages Tabelle und legt sie korrekt neu an.
export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;

  if (!serviceKey) {
    res.writeHead(500); res.end(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY nicht gesetzt' })); return;
  }

  const sql = `
    -- Alte Tabelle löschen (falls falsche Spalten)
    DROP TABLE IF EXISTS chat_messages CASCADE;
    DROP TABLE IF EXISTS chat_sessions CASCADE;

    -- Sessions neu anlegen
    CREATE TABLE chat_sessions (
      id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      visitor_name TEXT,
      started_at   TIMESTAMPTZ DEFAULT now(),
      last_msg_at  TIMESTAMPTZ DEFAULT now(),
      status       TEXT        DEFAULT 'open'
    );

    -- Nachrichten neu anlegen
    CREATE TABLE chat_messages (
      id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      session_id UUID        REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
      sender     TEXT        NOT NULL,
      message    TEXT        NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    -- RLS
    ALTER TABLE chat_sessions  ENABLE ROW LEVEL SECURITY;
    ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "cs_insert" ON chat_sessions FOR INSERT WITH CHECK (true);
    CREATE POLICY "cs_select" ON chat_sessions FOR SELECT USING (true);
    CREATE POLICY "cs_update" ON chat_sessions FOR UPDATE USING (true);
    CREATE POLICY "cm_insert" ON chat_messages FOR INSERT WITH CHECK (true);
    CREATE POLICY "cm_select" ON chat_messages FOR SELECT USING (true);

    -- Realtime
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

    -- Schema-Cache sofort neu laden
    NOTIFY pgrst, 'reload schema';
  `;

  // Supabase SQL-Endpoint mit Service-Role-Key
  const response = await fetch(`${supabaseUrl}/rest/v1/sql`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await response.text();

  // Falls /rest/v1/sql nicht verfügbar, versuche es über den pg-Adapter
  if (response.status === 404) {
    // Supabase Management API Fallback
    const mgmtRes = await fetch(
      `https://api.supabase.com/v1/projects/${supabaseUrl.split('//')[1].split('.')[0]}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      }
    );
    const mgmtText = await mgmtRes.text();
    res.writeHead(mgmtRes.status);
    res.end(JSON.stringify({ method: 'management_api', status: mgmtRes.status, body: mgmtText }));
    return;
  }

  res.writeHead(response.status);
  res.end(JSON.stringify({ method: 'rest_sql', status: response.status, body: text }));
}
