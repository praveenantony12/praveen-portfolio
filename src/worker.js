/**
 * Cloudflare Worker — API Proxy for Gemini
 * Replaces the Express server.js for Cloudflare deployment
 * Keeps API key secure and applies rate limiting
 */

import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

// ── In-memory rate limiting (per IP, per deployments) ─────────────────
// NOTE: In-memory state resets on Worker redeploy. For persistent rate limits,
// use Durable Objects (more complex, but recommended for production)
let rateLimitMap = new Map();
const RATE_LIMIT = 15;      // max requests per window
const RATE_WINDOW = 60_000; // 60 seconds

function checkRateLimit(ip) {
  const now = Date.now();
  const rec = rateLimitMap.get(ip) || { count: 0, reset: now + RATE_WINDOW };
  
  if (now > rec.reset) {
    rec.count = 0;
    rec.reset = now + RATE_WINDOW;
  }
  
  rec.count++;
  rateLimitMap.set(ip, rec);
  
  return rec.count <= RATE_LIMIT;
}

// ── Config ────────────────────────────────────────────────────
const GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_OUTPUT_TOKENS = 1000;
const MAX_MSG_HISTORY = 20;

/**
 * Main Worker handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── Health check ──────────────────────────────────────
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Chat proxy → Gemini ───────────────────────────────
    if (request.method === 'POST' && url.pathname === '/api/chat') {
      return handleChatRequest(request, env);
    }

    // ── Static files: Serve from public/ directory ──────────────────
    try {
      return await getAssetFromKV(
        { request, waitUntil: ctx.waitUntil },
        {
          ASSET_NAMESPACE: env.ASSETS,
          ASSET_MANIFEST: env.__STATIC_CONTENT_MANIFEST || {},
        }
      );
    } catch (err) {
      // For SPA routing: serve index.html on 404 for non-API routes
      if (request.method === 'GET' && !url.pathname.startsWith('/api/')) {
        try {
          return await getAssetFromKV(
            {
              request: new Request(
                new URL('/', request.url).toString(),
                request
              ),
              waitUntil: ctx.waitUntil,
            },
            {
              ASSET_NAMESPACE: env.ASSETS,
              ASSET_MANIFEST: env.__STATIC_CONTENT_MANIFEST || {},
            }
          );
        } catch (e) {
          // Still not found, return 404
        }
      }
    }

    // ── Default 404 ──────────────────────────────────────────────
    return new Response('Not Found', { status: 404 });
  },
};




/**
 * Handle POST /api/chat request
 */
async function handleChatRequest(request, env) {
  // ── Get client IP ──────────────────────────────────────
  const ip = request.headers.get('cf-connecting-ip') || 
             request.headers.get('x-forwarded-for')?.split(',')[0] || 
             'unknown';

  // ── Rate limit check ───────────────────────────────────
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests — please wait a moment.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── CORS headers ──────────────────────────────────────– 
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Parse request body ─────────────────────────────────
    const { messages, system } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // ── Get API key from environment ────────────────────────
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // ── Clip history to avoid context bloat ──────────────────
    const clipped = messages.slice(-MAX_MSG_HISTORY);

    // ── Convert from Anthropic format → Gemini format ────────
    // Anthropic: [{ role: 'user'|'assistant', content: '...' }]
    // Gemini:    [{ role: 'user'|'model', parts: [{ text: '...' }] }]
    const geminiContents = clipped.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    // ── Call Gemini API ────────────────────────────────────
    const response = await fetch(geminiUrl, {
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
      console.error('Gemini error:', JSON.stringify(data));
      const msg = data.error?.message || 'Gemini API error';
      return new Response(JSON.stringify({ error: msg }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // ── Extract response and return ────────────────────────
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return new Response(JSON.stringify({ content: [{ type: 'text', text }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (err) {
    console.error('Proxy error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}
