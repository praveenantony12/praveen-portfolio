# Praveen Antony — AI Portfolio

Personal portfolio for an AI Engineering role, featuring a **reverse-interview AI agent** that asks recruiters smart questions and generates a tailored "why hire me" pitch.

---

## Project Structure

```
portfolio/
├── src/
│   └── worker.js          # Cloudflare Worker (API proxy, replaces Express)
├── public/
│   └── index.html         # Portfolio site (served by Cloudflare Pages)
├── wrangler.toml          # Cloudflare Worker config
├── package.json
└── MIGRATION_GUIDE.md     # Step-by-step Render → Cloudflare guide
```

### Architecture
- **Cloudflare Pages:** Serves static files globally (low latency)
- **Cloudflare Worker:** Handles `/api/chat` proxy to Gemini (keeps API key secure)
- **Both:** Deploy independently, work together seamlessly

---

## Local Development (Cloudflare)

```bash
# 1. Install dependencies
npm install

# 2. Set your API key (local development only)
export GEMINI_API_KEY=YOUR_KEY_HERE

# 3. Run Worker locally
npm run dev

# 4. Open http://localhost:8787
```

The Worker will serve static files from `public/` and handle API requests at `/api/chat`.

---

## Deploy to Cloudflare (Free)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial portfolio commit"
gh repo create praveen-portfolio --public --push
```

### Step 2 — Deploy Cloudflare Pages (Static Files)
1. Go to **https://dash.cloudflare.com** → **Workers & Pages**
2. Click **Create Application** → **Pages**
3. Select **Connect to Git** → authorize GitHub
4. Select your `praveen-portfolio` repo
5. Configure build settings:
   - **Framework:** None
   - **Build command:** `npm run pages:build` (or leave empty)
   - **Build output directory:** `public/`
6. Click **Save and Deploy**

Your Pages site will be live at: `https://praveen-portfolio.pages.dev`

### Step 3 — Deploy Cloudflare Worker (API Proxy)
1. Go to **https://dash.cloudflare.com** → **Workers & Pages** → **Workers**
2. Click **Create Worker** → name it `praveen-portfolio-api`
3. Copy the code from `src/worker.js` into the editor
4. Click **Save & Deploy**

Your Worker will be at: `https://praveen-portfolio-api.workers.dev`

### Step 4 — Add API Key (Secrets)
1. In **Workers Dashboard** → **praveen-portfolio-api** → **Settings** → **Secrets**
2. Click **Add Secret**
   - Name: `GEMINI_API_KEY`
   - Value: `your-gemini-api-key-here`
3. Click **Save**

### Step 5 — Route Worker to Pages (Optional: Use Custom Domain)
To use a custom domain instead of `.pages.dev`:
1. Add your domain to Cloudflare (DNS pointed to Cloudflare nameservers)
2. In **Pages** → **Settings** → **Domains & Redirects**
3. Add your custom domain
4. In **Workers** → **Routes**, add a route:
   - Pattern: `yourdomain.com/api/*`
   - Service: `praveen-portfolio-api`

Or use the free domain: `https://praveen-portfolio.pages.dev`

---

## Cloudflare vs. Render Comparison

| Feature | Render | Cloudflare |
|---------|--------|-----------|
| **Static Hosting** | ✅ Web Service | ✅ Pages (better CDN) |
| **API Server** | ✅ Node.js | ✅ Workers (better perf) |
| **Free Tier** | 750 hrs/mo | ∞ (100k req/day on Workers) |
| **Cold Starts** | ~500ms | <10ms |
| **Pricing** | $7/mo after free tier | Free (5.00M req/month on Workers) |
| **Free Domain** | ❌ | ✅ `*.pages.dev` |

---

## Cost Controls (Same as Before)

| Control | Detail |
|---|---|
| Model | `gemini-2.5-flash` — free tier, 250 req/day |
| Max tokens | 1,000 per response (hard cap) |
| Rate limit | 15 requests / IP / minute |
| History clip | Last 20 messages only |
| Payload guard | 50kb max request size |

### Typical monthly cost estimate
- A recruiter session: ~10 exchanges × ~500 tokens avg = **~5,000 tokens**
- 100 recruiter sessions/month = 500,000 tokens = **~$0.05–$0.15/month**
- **Cloudflare Workers:** Free tier covers this easily

---

## Getting an Anthropic API Key (Free to Start)

See the full guide in the deployment instructions below, or:
1. Go to https://console.anthropic.com
2. Sign up → Verify email
3. Go to **API Keys** → **Create Key**
4. Copy the key (shown once!)
5. Set a **spending limit** in Billing → $5/month cap recommended

---

## Adding Real GitHub Links

In `public/index.html`, search for:
```
href="https://github.com/praveenantony12"
```
Replace with your actual repo URLs for each project.
