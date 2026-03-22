# Praveen Antony — AI Portfolio

Personal portfolio for an AI Engineering role, featuring a **reverse-interview AI agent** that asks recruiters smart questions and generates a tailored "why hire me" pitch.

---

## Project Structure

```
portfolio/
├── server.js          # Node.js proxy server (keeps API key secure)
├── package.json
├── render.yaml        # One-click Render deployment config
└── public/
    └── index.html     # Full portfolio site (served as static files)
```

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# 3. Start the server
npm run dev

# 4. Open http://localhost:3000
```

---

## Deploy to Render (Free)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial portfolio commit"
gh repo create praveen-portfolio --public --push
# or: git remote add origin https://github.com/praveenantony12/praveen-portfolio.git
#     git push -u origin main
```

### Step 2 — Create Render Web Service
1. Go to https://render.com and sign in with GitHub
2. Click **New → Web Service**
3. Select your `praveen-portfolio` repo
4. Render auto-detects `render.yaml` — confirm settings:
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Click **Create Web Service**

### Step 3 — Add your API Key
1. In Render dashboard → your service → **Environment**
2. Click **Add Environment Variable**
3. Key: `ANTHROPIC_API_KEY`  Value: `sk-ant-your-key-here`
4. Click **Save** — Render redeploys automatically

Your site will be live at: `https://praveen-portfolio.onrender.com`

---

## Cost Controls Built In

| Control | Detail |
|---|---|
| Model | `claude-haiku-4-5` — cheapest Claude model, ~$1/M input tokens |
| Max tokens | 1,000 per response (hard cap) |
| Rate limit | 20 requests / IP / minute |
| History clip | Last 20 messages only (prevents context bloat) |
| Payload guard | 50kb max request size |

### Typical monthly cost estimate
- A recruiter session: ~10 exchanges × ~500 tokens avg = **~5,000 tokens**
- 100 recruiter sessions/month = 500,000 tokens = **~$0.05–$0.15/month**
- Well within Anthropic's free trial credits for the first month

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
