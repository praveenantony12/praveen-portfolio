# 🚀 Cloudflare Deployment Quick Reference

**Status:** ✅ Refactoring Complete — Ready to Deploy

---

## 📋 Pre-Deployment Checklist

- [ ] Cloudflare account created (free at https://dash.cloudflare.com)
- [ ] GitHub repo with code pushed
- [ ] Gemini API key ready (get from https://console.anthropic.com)
- [ ] `wrangler` CLI installed: `npm install`

---

## ⚡ Quick Deployment (5 steps, ~15 min)

### 1️⃣ Test Locally
```bash
export GEMINI_API_KEY=your-key-here
npm run dev
# Visit: http://localhost:8787
# Test chat, then Ctrl+C to stop
```

### 2️⃣ Deploy Worker to Cloudflare
```bash
npm run deploy
# Worker will be at: https://praveen-portfolio-api.workers.dev
```

### 3️⃣ Add API Secret (via Dashboard)
1. Go to https://dash.cloudflare.com
2. **Workers & Pages** → **praveen-portfolio-api** → **Settings** → **Secrets**
3. Click **Add Secret**
   - Name: `GEMINI_API_KEY`
   - Value: (paste your key)
4. Click **Save** ← Worker redeploys automatically

### 4️⃣ Deploy Pages (Static Files)
1. Go to https://dash.cloudflare.com → **Workers & Pages** → **Create Application** → **Pages** → **Connect to Git**
2. Select `praveen-portfolio` repo
3. Build settings:
   - Output directory: `public/`
   - (leave build command blank)
4. Click **Save and Deploy**
   - Your Pages URL: `https://praveen-portfolio.pages.dev`

### 5️⃣ Test Everything
Visit your Pages URL and test the chat. Done! 🎉

---

## 📍 Your URLs After Deploy

| Component | URL |
|-----------|-----|
| **Portfolio (Pages)** | `https://praveen-portfolio.pages.dev` |
| **Worker API** | `https://praveen-portfolio-api.workers.dev` |
| **Health Check** | `https://praveen-portfolio-api.workers.dev/health` |

---

## 🔧 Key Files for DevOps

| File | Purpose |
|------|---------|
| `src/worker.js` | Worker code (deploy with `npm run deploy`) |
| `wrangler.toml` | Worker config |
| `public/` | Static files (deploy to Pages) |
| `MIGRATION_GUIDE.md` | Detailed step-by-step guide |

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "GEMINI_API_KEY not configured" | Add secret in Dashboard → Worker → Settings → Secrets |
| Rate limit hit (429) | Wait 60 seconds, or edit `RATE_LIMIT` in `src/worker.js` |
| CORS errors | Worker adds headers automatically — not your issue |
| Pages shows old version | Clear cache: Pages → Deployments → check latest |

---

## 💰 Cost

- **Cloudflare Workers:** Free (100k req/day)
- **Cloudflare Pages:** Free
- **Free domain:** `pages.dev`
- **Total:** ~**$0.05-0.15/month** (Gemini API only)

---

## 📚 Resources

- Full guide: `MIGRATION_GUIDE.md`
- Summary: `CLOUDFLARE_SUMMARY.md`
- Wrangler docs: https://developers.cloudflare.com/workers/wrangler/
- Cloudflare Workers: https://developers.cloudflare.com/workers/

---

## ⚠️ Important Notes

1. **API Key Security:** Never commit API keys. Use Cloudflare Secrets.
2. **In-Memory Rate Limiting:** Resets on Worker redeploy (expected free tier behavior).
3. **Old Render Service:** Keep for 24hrs, then delete for cleanup.
4. **Frontend:** No changes needed! Same `index.html` works.

---

**Ready? Start with Step 1, work through Step 5, and you're done!** 🚀
