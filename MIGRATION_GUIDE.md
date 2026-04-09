# Render → Cloudflare Migration Guide

## Overview

This guide walks you through migrating from **Render** to **Cloudflare Workers + Pages** for hosting your AI portfolio.

### Key Benefits
- ✅ **Faster:** Global CDN (Pages) + edge computing (Workers)
- ✅ **Cheaper:** Free tier covers 100k requests/day on Workers
- ✅ **No Cold Starts:** Workers deploy instantly (vs. Render's ~500ms)
- ✅ **Free Domain:** `*.pages.dev` included
- ✅ **Same Architecture:** API proxy + static files

---

## Prerequisites

You'll need:
1. Cloudflare account (free, sign up at https://dash.cloudflare.com)
2. GitHub account with this repo
3. Gemini API key (from https://console.anthropic.com)
4. `wrangler` CLI installed: `npm install -g wrangler`

---

## Step 1: Update Your Repository

All files have been refactored:
- ✅ `src/worker.js` — New Cloudflare Worker (replaces Express)
- ✅ `wrangler.toml` — Cloudflare config (replaces render.yaml)
- ✅ `package.json` — Updated scripts
- ✅ `.gitignore` — Added Cloudflare-specific paths
- ✅ `public/index.html` — No changes needed! ✨

Commit and push:
```bash
git add .
git commit -m "Migrate from Render to Cloudflare"
git push origin main
```

---

## Step 2: Install Wrangler Locally

```bash
npm install
```

This installs `wrangler`, Cloudflare's CLI tool.

---

## Step 3: Test Locally

```bash
export GEMINI_API_KEY=your-actual-key-here
npm run dev
```

Visit `http://localhost:8787` and test the chat. You should see:
- ✅ Static files served from `public/`
- ✅ `/api/chat` proxy works
- ✅ Rate limiting active

Stop with `Ctrl+C`.

---

## Step 4: Deploy Pages (Static Files)

### 4a. Create Pages Project
1. Go to **https://dash.cloudflare.com**
2. Click **Workers & Pages** in the sidebar
3. Click **Create Application** → **Pages** → **Connect to Git**
4. Authorize GitHub and select your `praveen-portfolio` repo
5. Configure build settings:
   - **Framework:** None
   - **Build command:** (leave blank or use `npm run pages:build`)
   - **Build output directory:** `public/`
6. Click **Save and Deploy**

Pages will deploy automatically. Your site will be at: **`https://praveen-portfolio.pages.dev`**

### 4b. Verify Pages Deployment
Visit your Pages URL and check:
- ✅ HTML loads
- ✅ CSS/fonts render
- ✅ You see the portfolio page

---

## Step 5: Deploy Worker (API Proxy)

### 5a. Deploy from CLI (Recommended)
```bash
npm run deploy
```

This runs `wrangler deploy` and uploads `src/worker.js` to Cloudflare.

Your Worker will be at: **`https://praveen-portfolio-api.workers.dev`**

### 5b. Verify Worker Deployment
Test the API:
```bash
curl -X GET https://praveen-portfolio-api.workers.dev/health
```

Expected response: `{"status":"ok"}`

---

## Step 6: Add Your API Key as a Secret

Never commit API keys! Cloudflare Secrets are encrypted and isolated.

### 6a. Via Dashboard
1. Go to **https://dash.cloudflare.com**
2. **Workers & Pages** → **praveen-portfolio-api** → **Settings** → **Secrets**
3. Click **Add Secret**
   - Name: `GEMINI_API_KEY`
   - Value: (paste your Gemini API key)
4. Click **Save**

The Worker will redeploy automatically.

### 6b. Via CLI
```bash
wrangler secret put GEMINI_API_KEY
# Paste your key when prompted
```

---

## Step 7: Update Pages → Route to Worker

Now Pages needs to know to use the Worker for `/api/*` requests.

### Option A: Custom Domain with Routing (Best for Custom Domain)
If you own a domain and pointed it to Cloudflare:
1. **Workers & Pages** → **praveen-portfolio-api** (Worker)
2. Go to **Routes** → **Add Route**
   - Pattern: `yourdomain.com/api/*`
   - Service: `praveen-portfolio-api`
   - Environment: `production`
3. Click **Save**

### Option B: Test with Worker Direct URL
For now, test using the full Worker URL. Update your frontend code in `public/index.html`:

Find:
```javascript
const response = await fetch('/api/chat', {
```

Temporarily change to:
```javascript
const response = await fetch('https://praveen-portfolio-api.workers.dev/api/chat', {
```

Then test the chat on Pages to verify it works.

---

## Step 8: (Optional) Use Custom Domain

If you want a custom domain instead of `*.pages.dev`:

### 8a. Add Domain to Cloudflare
1. Go to **https://dash.cloudflare.com** → **Websites**
2. Click **Add Site**
3. Enter your domain (e.g., `myportfolio.com`)
4. Follow Cloudflare's nameserver setup

### 8b. Configure Pages Custom Domain
1. **Pages** → **praveen-portfolio** → **Custom domains**
2. Click **Set up custom domain**
3. Enter your domain
4. Cloudflare will verify the DNS

### 8c. Configure Worker Routes for Custom Domain
1. **Workers & Pages** → **praveen-portfolio-api** → **Routes**
2. Add route:
   - Pattern: `myportfolio.com/api/*`
   - Service: `praveen-portfolio-api`

Your site will be at: **`https://myportfolio.com`**

---

## Step 9: Test Everything

### Test Pages
```bash
curl https://praveen-portfolio.pages.dev
# Should return HTML
```

### Test Worker Health
```bash
curl https://praveen-portfolio-api.workers.dev/health
# Should return: {"status":"ok"}
```

### Test Chat API
Open your Pages site in a browser, click the chat interface, and test a message. You should see:
- ✅ Response from Gemini
- ✅ No CORS errors
- ✅ Rate limiting works

---

## Troubleshooting

### "GEMINI_API_KEY not configured"
- [ ] Did you add the secret in Cloudflare? Check **Workers** → **Settings** → **Secrets**
- [ ] Did the Worker redeploy? (Check the UI or run `npm run deploy` again)

### "Too many requests"
- [ ] Your IP hit the rate limit. Wait 60 seconds and try again.
- [ ] Increase `RATE_LIMIT` in `src/worker.js` if needed.

### "CORS Error"
- [ ] The Worker adds CORS headers automatically. This shouldn't happen.
- [ ] If using a different domain, check the routing config.

### Pages still shows old version
- [ ] Clear CloudFlare cache: **Pages** → **Deployments** → **View build log** → check if latest deploy succeeded

---

## Cleanup: Remove Render Service

Once deployed and tested:
1. Go to **https://render.com** → Your dashboard
2. Find the old portfolio service
3. Click **Settings** → **Delete Service**
4. Confirm

⚠️ Do this AFTER confirming Cloudflare works! Keep for 24hrs as backup.

---

## Comparison: Old vs New Setup

### Old (Render)
```
GitHub → Render Web Service
           ├── Node.js server (server.js)
           ├── Rate limiting (in-memory)
           └── /api/chat → Gemini
         Static files: public/
```

### New (Cloudflare)
```
GitHub → Cloudflare Pages
           └── Static files (public/)
           
         + Cloudflare Worker
           ├── /api/chat → Gemini
           ├── Rate limiting (in-memory, per-deploy)
           └── CORS headers (built-in)
```

---

## Monitoring & Logs

### View Worker Logs
```bash
wrangler tail
```

### View Pages Builds
1. **https://dash.cloudflare.com** → **Pages** → **praveen-portfolio** → **Deployments**

### Monitor Rate Limiting
Logs will show `429` responses when limit hit. In-memory rates reset on Worker redeploy (expected for Workers free tier).

For production persistence, upgrade to Durable Objects (paid, ~$5/month).

---

## Cost Recap

| Item | Cost |
|------|------|
| Cloudflare Workers | Free (100k req/day) |
| Cloudflare Pages | Free |
| Free domain (pages.dev) | Free |
| API calls to Gemini | ~$0.05-0.15/month for 100 sessions |
| **Total** | **~$0.05-0.15/month** |

---

## Next Steps

1. ✅ Deploy Pages
2. ✅ Deploy Worker
3. ✅ Add API secret
4. ✅ Test chat
5. ✅ (Optional) Add custom domain
6. ✅ Remove Render service
7. ✅ Update GitHub links in `public/index.html`

---

## Need Help?

- Cloudflare Docs: https://developers.cloudflare.com/workers/
- Wrangler CLI: https://developers.cloudflare.com/workers/wrangler/
- Gemini API: https://ai.google.dev/
