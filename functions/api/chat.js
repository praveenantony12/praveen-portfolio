const RATE_LIMIT = 15;
const RATE_WINDOW = 60_000;
const rateLimitMap = new Map();
const GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_OUTPUT_TOKENS = 1000;
const MAX_MSG_HISTORY = 20;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function getClientIp(request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('remote_addr') ||
    'unknown'
  );
}

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, reset: now + RATE_WINDOW };

  if (now > record.reset) {
    record.count = 0;
    record.reset = now + RATE_WINDOW;
  }

  record.count += 1;
  rateLimitMap.set(ip, record);

  return record.count <= RATE_LIMIT;
}

export function onRequestOptions() {
  return new Response('', {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests — please wait a moment.' }), {
      status: 429,
      headers: CORS_HEADERS,
    });
  }

  let body;

  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  const { messages, system } = body;
  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured.' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }

  const clipped = messages.slice(-MAX_MSG_HISTORY);
  const geminiContents = clipped.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));

  const geminiRequest = {
    system_instruction: system ? { parts: [{ text: system }] } : undefined,
    contents: geminiContents,
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.8,
    },
  };

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiRequest),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.error?.message || 'Gemini API error';
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: response.status,
      headers: CORS_HEADERS,
    });
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return new Response(JSON.stringify({ content: [{ type: 'text', text }] }), {
    headers: CORS_HEADERS,
  });
}
