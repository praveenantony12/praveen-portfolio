#!/usr/bin/env node
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle /api/chat
  if (pathname === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { messages, system } = JSON.parse(body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }));
          return;
        }

        const GEMINI_MODEL = 'gemini-2.5-flash';
        const MAX_OUTPUT_TOKENS = 1000;
        const MAX_MSG_HISTORY = 20;

        const clipped = messages.slice(-MAX_MSG_HISTORY);
        const geminiContents = clipped.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
          {
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
          }
        );

        const data = await response.json();

        if (!response.ok) {
          res.writeHead(response.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: data.error?.message || 'API error' }));
          return;
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ content: [{ type: 'text', text }] }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Serve static files from public/
  let filePath = path.join(PUBLIC_DIR, pathname);

  // If it's a directory, try index.html
  if (pathname === '/') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // For SPA routing, serve index.html on 404
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (indexErr, indexData) => {
        if (indexErr) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexData);
      });
      return;
    }

    let contentType = 'text/plain';
    if (filePath.endsWith('.html')) contentType = 'text/html';
    if (filePath.endsWith('.css')) contentType = 'text/css';
    if (filePath.endsWith('.js')) contentType = 'application/javascript';
    if (filePath.endsWith('.json')) contentType = 'application/json';
    if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';
    if (filePath.endsWith('.png')) contentType = 'image/png';
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
    if (filePath.endsWith('.gif')) contentType = 'image/gif';
    if (filePath.endsWith('.webp')) contentType = 'image/webp';
    if (filePath.endsWith('.woff2')) contentType = 'font/woff2';
    if (filePath.endsWith('.woff')) contentType = 'font/woff';
    if (filePath.endsWith('.ttf')) contentType = 'font/ttf';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ Server running at http://localhost:${PORT}\n`);
});
