import cors from 'cors';
import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Rate limiting (in-memory, per IP) ─────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT   = 15;        // max requests per window
const RATE_WINDOW  = 60_000;    // 60 seconds

function rateLimit(req, res, next) {
  const ip  = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const now = Date.now();
  const rec = rateLimitMap.get(ip) || { count: 0, reset: now + RATE_WINDOW };
  if (now > rec.reset) { rec.count = 0; rec.reset = now + RATE_WINDOW; }
  rec.count++;
  rateLimitMap.set(ip, rec);
  if (rec.count > RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }
  next();
}

// ── Config ────────────────────────────────────────────────────
const GEMINI_MODEL        = 'gemini-2.5-flash';   // free tier, 250 req/day
const MAX_OUTPUT_TOKENS   = 1000;
const MAX_MSG_HISTORY     = 20;

app.use(cors());
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// ── Chat proxy → Gemini ───────────────────────────────────────
app.post('/api/chat', rateLimit, async (req, res) => {
  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server.' });
  }

  // Clip history to avoid context bloat
  const clipped = messages.slice(-MAX_MSG_HISTORY);

  // Convert from Anthropic message format → Gemini format
  // Anthropic: [{ role: 'user'|'assistant', content: '...' }]
  // Gemini:    [{ role: 'user'|'model',     parts: [{ text: '...' }] }]
  const geminiContents = clipped.map(m => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: system ? { parts: [{ text: system }] } : undefined,
        contents: geminiContents,
        generationConfig: {
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          temperature:     0.8,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini error:', JSON.stringify(data));
      const msg = data.error?.message || 'Gemini API error';
      return res.status(response.status).json({ error: msg });
    }

    // Extract text from Gemini response and return in Anthropic-compatible shape
    // so the frontend needs zero changes
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ content: [{ type: 'text', text }] });

  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));