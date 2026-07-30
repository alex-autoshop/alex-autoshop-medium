// Serverless — Vercel Node Runtime
export const config = { runtime: 'nodejs' };

/**
 * Parts AI — strukturierte KI-Suche für die Teilebörse
 *
 * Nutzt claude-haiku (billigste Claude-Version) für strukturierte JSON-Ausgabe.
 * Kosten: ~0,05 Cent pro Suche. Bei 1.000 Suchen/Monat = 50 Cent gesamt.
 *
 * INPUT:  POST { query: string }
 * OUTPUT: JSON { vehicle?, segments[], paint?, materialPlan[], confidence }
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `Du bist der KI-Kern der Alex Autoshop Teilebörse in Wuppertal.

Alex Autoshop verkauft: Autoteile, Lackierprodukte (Standox, Mipa, Sikkens, FRIZ, Master), Werkstattbedarf (3M, Mirka, SATA, Rupes).

Deine Aufgabe: Analysiere die Suchanfrage und gib NUR valides JSON zurück — KEIN Text, KEINE Erklärung, KEIN Markdown.

JSON-Schema:
{
  "vehicle": {
    "make": "VW",
    "model": "Golf",
    "generation": "7",
    "year": 2015,
    "engine": null,
    "color": null,
    "colorCode": null,
    "confirmed": false
  } | null,
  "intent": "repair" | "paint" | "maintenance" | "tuning" | "unknown",
  "segments": [
    {
      "id": "string",
      "label": "Kotflügel vorne links",
      "category": "Karosserie",
      "selected": true,
      "essential": true,
      "searchQuery": "Kotflügel vorne links VW Golf 7"
    }
  ],
  "paint": {
    "name": "Silber metallic",
    "code": "LA7W",
    "brand": "Mipa",
    "liters": 1,
    "type": "1K"
  } | null,
  "materialPlan": [
    {
      "id": "string",
      "name": "Mipa 1K Silber metallic",
      "category": "Lack" | "Grundierung" | "Klarlack" | "Härter" | "Schleifmittel" | "Füller" | "Reiniger" | "Hilfsmittel",
      "qty": 1,
      "unit": "1L",
      "estimatedPrice": 22.50,
      "selected": true,
      "essential": true,
      "shopifyHandle": null
    }
  ],
  "questions": [
    {
      "id": "string",
      "text": "Ist der Schaden an der Außenseite oder auch am Träger?",
      "options": ["Nur außen", "Auch am Träger"],
      "impact": "Wenn Träger: zusätzlich Schweißbedarf"
    }
  ],
  "confidence": 0.85,
  "summary": "Kotflügel tauschen + Lackierung für VW Golf 7"
}

Regeln:
- Materialpläne NUR wenn Lackierung/Karosserie involviert
- Bei reinen Teile-Suchen: segments füllen, materialPlan leer lassen
- Mengen realistisch kalkulieren (1 Kotflügel = ca. 300ml Lack)
- estimatedPrice: echte Alex-Autoshop Preise nutzen wenn bekannt:
  * Mipa 1K 50ml=12€, 500ml=28€, 1L=45€
  * FRIZ 2K Klarlack 500ml=13€, 1L=24€
  * FRIZ Härter 50ml=11,50€
  * Grundierung 1K Dose 400ml=8,50€
  * Schleifpapier Mirka P400 5er=6€
- questions: max. 2-3 Klärungsfragen wenn wirklich nötig
- Gib IMMER valides JSON zurück, nie leeres Objekt`;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, CORS);
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405, CORS);
    res.end(JSON.stringify({ error: 'POST required' }));
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.writeHead(500, { ...CORS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }));
    return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /* ignore */ } }

  const query = (body?.query || '').trim();
  if (!query || query.length < 2) {
    res.writeHead(400, { ...CORS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'query required' }));
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: query }],
      }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      console.error('[parts-ai] Anthropic error', response.status, err.slice(0, 200));
      res.writeHead(502, { ...CORS, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'AI service error', status: response.status }));
      return;
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text || '{}';

    // JSON aus der Antwort extrahieren (falls Claude doch Markdown nutzt)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { error: 'parse_error', raw: text.slice(0, 500) };
    }

    res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(parsed));
  } catch (err) {
    console.error('[parts-ai]', err);
    res.writeHead(500, { ...CORS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
  }
}
