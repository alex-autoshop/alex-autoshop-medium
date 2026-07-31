// Vercel Node Runtime — Push-Benachrichtigung via ntfy.sh (kostenlos, kein Account nötig)
// Setup: ntfy App installieren (iOS/Android) → Topic "alex-autoshop-chat-7x4k9" abonnieren → fertig.
export const config = { runtime: 'nodejs' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Einzigartiger Topic-Name damit niemand zufällig mithört
const NTFY_TOPIC = 'alex-autoshop-chat-7x4k9';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(200, CORS); res.end(); return; }
  if (req.method !== 'POST') { res.writeHead(405, CORS); res.end(); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /**/ } }

  const { visitorName, firstMessage, sessionId } = body ?? {};

  const title = visitorName ? `💬 Chat von ${visitorName}` : '💬 Neuer Chat';
  const message = firstMessage || '(keine Nachricht)';
  const clickUrl = `https://www.alex-autoshop.de/admin/chat${sessionId ? `?session=${sessionId}` : ''}`;

  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': 'high',
        'Click': clickUrl,
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: message,
    });

    res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error('[chat-notify]', err);
    res.writeHead(500, { ...CORS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err?.message }));
  }
}
