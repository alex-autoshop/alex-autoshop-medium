// Vercel Node Runtime — Email-Benachrichtigung wenn neuer Chat startet
export const config = { runtime: 'nodejs' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(200, CORS); res.end(); return; }
  if (req.method !== 'POST') { res.writeHead(405, CORS); res.end(); return; }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    res.writeHead(500, { ...CORS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'RESEND_API_KEY not set' }));
    return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /**/ } }

  const { sessionId, visitorName, firstMessage } = body ?? {};

  try {
    const adminUrl = `https://www.alex-autoshop.de/admin/chat?session=${sessionId}`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'chat@alex-autoshop.de',
        to: ['lazoneon@web.de'],
        subject: `💬 Neuer Live-Chat${visitorName ? ` von ${visitorName}` : ''}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#B8860B">💬 Neuer Chat auf alex-autoshop.de</h2>
            ${visitorName ? `<p><strong>Name:</strong> ${visitorName}</p>` : ''}
            <p><strong>Erste Nachricht:</strong></p>
            <blockquote style="border-left:4px solid #B8860B;padding:12px 16px;background:#faf9f0;border-radius:4px;margin:0">
              ${firstMessage ?? '(keine Nachricht)'}
            </blockquote>
            <p style="margin-top:20px">
              <a href="${adminUrl}"
                 style="display:inline-block;background:#B8860B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
                Jetzt antworten →
              </a>
            </p>
            <p style="font-size:12px;color:#999;margin-top:16px">
              Direkt-URL: ${adminUrl}
            </p>
          </div>
        `,
      }),
    });

    res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error('[chat-notify]', err);
    res.writeHead(500, { ...CORS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err?.message }));
  }
}
