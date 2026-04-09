/**
 * Cloudflare Pages Function — API Proxy for Gemini
 * This file lives in public/_worker.js
 * Wrangler Pages dev automatically uses this to handle dynamic requests
 * 
 * IMPORTANT: Only handle /api/* and /health routes here.
 * For all other requests (static files, etc), return null to let
 * Pages handle them with its default file serving.
 */

// ── In-memory rate limiting (per IP) ───────────────────────────────
let rateLimitMap = new Map();
const RATE_LIMIT = 15;
const RATE_WINDOW = 60_000;

function checkRateLimit(ip) {
  const now = Date.now();
  const rec = rateLimitMap.get(ip) || { count: 0, reset: now + RATE_WINDOW };
  if (now > rec.reset) rec.count = 0, rec.reset = now + RATE_WINDOW;
  rec.count++;
  rateLimitMap.set(ip, rec);
  return rec.count <= RATE_LIMIT;
}

// ── Config ─────────────────────────────────────────────────────
const GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_OUTPUT_TOKENS = 1000;
const MAX_MSG_HISTORY = 20;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // ── Health check ───────────────────────────────────────
    if (pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Chat API ────────────────────────────────────────────
    if (request.method === 'POST' && pathname === '/api/chat') {
      // Rate limit check
      const ip = request.headers.get('cf-connecting-ip') ||
                 request.headers.get('x-forwarded-for')?.split(',')[0] ||
                 'unknown';
      
      if (!checkRateLimit(ip)) {
        return new Response(
          JSON.stringify({ error: 'Too many requests — please wait a moment.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }

      try {
        const { messages, system } = await request.json();

        if (!messages || !Array.isArray(messages)) {
          return new Response(
            JSON.stringify({ error: 'Invalid request body.' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: 'GEMINI_API_KEY not configured.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const clipped = messages.slice(-MAX_MSG_HISTORY);
        const geminiContents = clipped.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: system ? { parts: [{ text: system }] } : undefined,
            contents: geminiContents,
            generationConfig: {
              maxOutputTokens: MAX_OUTPUT_TOKENS,
              temperature: 0.8,
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const msg = data.error?.message || 'Gemini API error';
          return new Response(JSON.stringify({ error: msg }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return new Response(JSON.stringify({ content: [{ type: 'text', text }] }), {
          headers: { 'Content-Type': 'application/json' },
        });

      } catch (err) {
        console.error('Proxy error:', err);
        return new Response(
          JSON.stringify({ error: 'Internal server error.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── Let Pages handle static files & other routes ──────
    // Return undefined/null to let the default Pages behavior take over
    return undefined;
  },
};

