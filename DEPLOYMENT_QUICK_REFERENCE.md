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
# Visit: http://localhost:3000
# Test chat, then Ctrl+C to stop
```

### 2️⃣ Push to GitHub
```bash
git add .
git commit -m "Cloudflare Pages Functions migration"
git push origin main
```

### 3️⃣ Deploy Pages (Static Files + Functions)
1. Go to **https://dash.cloudflare.com** → **Workers & Pages**
2. Click **Create Application** → **Pages** → **Connect to Git**
3. Authorize GitHub and select your `praveen-portfolio` repo
4. Configure build settings:
   - **Framework:** None
   - **Build command:** (leave blank)
   - **Build output directory:** `public`
5. Click **Save and Deploy**
   - Your Pages URL: **`https://praveenantony.pages.dev`** ✅

### 4️⃣ Add Your API Key (Environment Variable)
1. In Cloudflare dashboard → **Pages** → **praveen-portfolio** → **Settings** → **Environment Variables**
2. Click **Add**
   - Variable name: `GEMINI_API_KEY`
   - Value: (paste your Gemini API key)
3. Click **Deploy** — Pages redeploys automatically

### 5️⃣ Test Everything
Visit **https://praveenantony.pages.dev** and test the chat. Done! 🎉

---

## 📍 Your URLs After Deploy

| Component | URL |
|-----------|-----|
| **Portfolio (Pages)** | `https://praveenantony.pages.dev` |
| **API Route** | `/api/chat` (auto-routed via Functions) |
| **Health Check** | `https://praveenantony.pages.dev/api/health` |

---

## 🔧 Key Files for DevOps

| File | Purpose |
|------|---------|
| `functions/api/chat.js` | Pages Function (handles /api/chat) |
| `public/` | Static files (index.html, CSS, JS) |
| `wrangler.toml` | Cloudflare Pages config |
| `MIGRATION_GUIDE.md` | Detailed step-by-step guide |

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 on `/` or static files | Check Pages Settings → Build output = `public/` |
| "GEMINI_API_KEY not configured" | Add env var in Pages → Settings → Environment Variables |
| /api/chat returns 404 | Check that `functions/api/chat.js` exists and Pages auto-detected it |
| Functions not executing | Verify Pages dashboard shows "Functions: 1 detected" |

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
