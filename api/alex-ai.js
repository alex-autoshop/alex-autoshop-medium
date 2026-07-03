export const config = { runtime: 'edge' };

// Echte Preise aus dem Alex Autoshop Shopify-Sortiment — Quelle für alle Empfehlungen.
const PRODUCT_CATALOG = `
## ECHTE PRODUKTE & PREISE (Alex Autoshop Shopify)

### WUNSCHFARBE / BASISLACK (Farbcode nötig)
handle: farben-mix
- Mipa 1K: 50ml=12€, 100ml=15€, 250ml=19€, 500ml=23€, 1L=27€, 2L=35€, 3L=43€, 5L=55€
- Mipa 2K (inkl. Klarlack): 50ml=10€, 100ml=13€, 500ml=19€, 1L=22€, 2L=28€, 5L=43€
- Standox 1K: 50ml=15€, 100ml=25€, 500ml=45€, 1L=55€, 2L=75€, 5L=125€
- Standox 2K (inkl. Klarlack): 50ml=15€, 100ml=20€, 500ml=30€, 1L=35€, 2L=45€, 5L=75€

### SPRAYDOSE 400ml (mit Farbcode)
handle: individuelle-spraydose-bestellen-400ml
- Mipa 1K: 18,50€ | Mipa 2K: 20€
- Standox 1K: 22,50€ | Standox 2K: 24,50€

### KLARLACK
- FRIZ 2K-Klarlack 500ml: 13€
- Mipa CX4 Express-Klarlack 1L: 29,95€
- Master HS Klarlack 5L: 65€

### HÄRTER
- FRIZ Härter 10 500ml: 11,50€
- FRIZ Härter 25 500ml: 11,50€
- MASTER HS Härter 2K: 15,50€

### VERDÜNNUNG
- Meyer Nitro Universalverdünnung 1L: 8,95€
- AVO Acrylverdünnung 1L: 15€
- FRIZ 2K-Acrylverdünnung 5L: 29,95€

### GRUNDIERUNG
- MIPA Quick Primer Spray: 13,50€
- Mipa Etch-Filler HB: 15€
- Standox U3070 Kunststoff-Haftprimer 1L: 83,95€

### SILIKONENTFERNER
- FRIZ Silikonentferner mild 1L: 6,95€
- Friz Silikonentferner 5L: 29,90€

### ABDECKBAND
- Beiges Abdeckband 19mm: 1,50€
- Beiges Abdeckband 30mm: 2,30€
- Green Tape 19mm: 1,95€
- CRS Foam-Tape: 18,50€

### SCHLEIFPAPIER
- APP WS 222 Schleifvlies: 1,75€
- MP P1000 Schleifscheiben 100Stk: 28,50€
- Rhynogrip P800: 19€

### POLIEREN
- A1 Speed Polish Schwamm: 3€
- A1 Polish & Wax: 14€
- Gewaffelte Polierpads: 5€
`;

// System Prompt für den AI-Materialplaner: strukturiertes JSON, keine Prosa.
const MATERIAL_PLAN_PROMPT = `Du bist ein Lackier-Experte bei Alex Autoshop Wuppertal (B2B-Distributor für Lackierprodukte).
Erstelle eine präzise Materialliste mit Mengen, konkreten Produktempfehlungen aus dem Alex Autoshop Sortiment und Preisschätzungen.

${PRODUCT_CATALOG}

## REGELN
1. Antworte AUSSCHLIESSLICH mit einem einzigen JSON-Objekt. Kein Markdown, keine Code-Fences, kein Text davor oder danach.
2. Nutze NUR Produkte und Preise aus dem Katalog oben. Mengen realistisch für die genannte Schadenstelle kalkulieren (Stoßstange ≈ 300-400ml Basislack, Tür ≈ 400-500ml, Motorhaube ≈ 500ml-1L, Komplettfahrzeug ≈ 3-5L).
3. Qualitätsstufe beachten: "Professionell" → Standox, "Mittelklasse" → Mipa, "Budget" → FRIZ/Master (bei Basislack ggf. Mipa, da FRIZ keinen anbietet — dann günstigste Option).
4. Bei Politur/Aufbereitung keinen Lack empfehlen, nur Polituren/Pads/Reiniger.
5. "reason" = 1 kurzer Satz für Werkstatt-Profis, warum das Material gebraucht wird.
6. "search_query" = kurzer Shopify-Suchbegriff (z.B. "friz klarlack", "silikonentferner", "abdeckband 19mm").
7. 5-10 Positionen. Pflichtmaterial zuerst.
8. Wenn der Kunde einen FARBCODE angibt: in den Basislack-Namen aufnehmen (z.B. "Mipa 1K Basislack, Farbcode LC9Z"). Wenn nur FARBNAME oder VIN bekannt: Zusatz "(Farbcode ermitteln wir kostenlos aus VIN/Farbname)". Wenn gar nichts: "(Farbcode wird an der Theke ermittelt)".
9. Wenn der Kunde eine LACKMENGE vorgibt: exakt diese Menge verwenden und den Katalogpreis der nächstgrößeren Gebindegröße nehmen — NICHT neu kalkulieren.
10. Wenn der Kunde einen KLARLACK-WUNSCH angibt: genau dieses Produkt empfehlen, keinen anderen.
11. LACKSYSTEM respektieren: Bei "2K Decklack" KEINEN separaten Klarlack einplanen (2K glänzt direkt — nutze die 2K-Preise aus dem Katalog). Bei "1K Basislack + Klarlack" beides plus passenden Härter. Bei "Nur Basislack — Klarlack vorhanden" weder Klarlack noch Klarlack-Härter aufnehmen.
12. VORHANDENES MATERIAL: Positionen, die der Kunde als "bereits vorhanden" angibt, NICHT in die Liste aufnehmen — komplett weglassen, auch nicht mit 0€. Die Werkstatt hat sie schon.

## JSON-FORMAT (exakt so)
{
  "project_title": "z.B. BMW 3er — Stoßstange lackieren",
  "items": [
    { "name": "FRIZ 2K-Klarlack 500ml", "quantity": "500 ml", "price_estimate": "13€", "reason": "Versiegelt den Basislack UV- und kratzfest.", "search_query": "friz klarlack" }
  ],
  "total_estimate": "ca. 95€",
  "hint": "Optionaler Profi-Tipp in 1 Satz."
}`;

// Allgemeiner Alex AI Prompt (Chat) — Fallback wenn kein mode gesetzt ist.
const SYSTEM_PROMPT = `Du bist Alex AI — der Automotive-Assistent von Alex Autoshop Wuppertal.
Handelstraße 64, 42277 Wuppertal | Tel: 0202 82690 | Mo–Fr 9–17:30, Sa 9–14
B2B: Lackierbetriebe, Karosseriewerkstätten, Kfz-Aufbereiter

${PRODUCT_CATALOG}

Antworte kurz, konkret und immer mit echten Preisen aus dem Katalog.`;

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, authorization',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { messages, mode } = await req.json();

    const systemContent = mode === 'material_plan' ? MATERIAL_PLAN_PROMPT : SYSTEM_PROMPT;

    const anthropicMessages = (messages || []).map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: systemContent,
        messages: anthropicMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: err }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Anthropic SSE → OpenAI-Format (Frontend erwartet choices[0].delta.content) — NIE brechen!
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    (async () => {
      const reader = response.body.getReader();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                const chunk = { choices: [{ delta: { content: event.delta.text }, index: 0 }] };
                await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              }
            } catch { /* ignore */ }
          }
        }
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } finally {
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal error: ' + e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
