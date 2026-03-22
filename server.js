import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Rate limiting (simple in-memory, per IP) ──────────────────
const rateLimitMap = new Map();
const RATE_LIMIT    = 20;   // max requests
const RATE_WINDOW   = 60_000; // per 60 seconds

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

// ── Max tokens guard (prevent runaway bills) ──────────────────
const MAX_TOKENS_PER_REQUEST = 1000;
const MAX_MESSAGES_IN_HISTORY = 20; // clip history so context doesn't bloat

app.use(cors());
app.use(express.json({ limit: '50kb' })); // reject oversized payloads
app.use(express.static(path.join(__dirname, 'public')));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// ── Proxy endpoint ────────────────────────────────────────────
app.post('/api/chat', rateLimit, async (req, res) => {
  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  // Clip history to avoid context bloat
  const clippedMessages = messages.slice(-MAX_MESSAGES_IN_HISTORY);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001', // cheapest model — plenty for chat
        max_tokens: MAX_TOKENS_PER_REQUEST,
        system,
        messages: clippedMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic error:', data);
      return res.status(response.status).json({ error: data.error?.message || 'API error' });
    }

    res.json({ content: data.content });
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
