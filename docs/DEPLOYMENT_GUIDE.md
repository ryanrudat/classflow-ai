# Deployment Guide - ClassFlow AI

This guide covers deploying your MVP to production using Railway (backend) and Vercel (frontend).

---

## Prerequisites

1. GitHub account: ryanrudat ✅
2. Railway account: https://railway.app (sign up with GitHub)
3. Vercel account: https://vercel.com (sign up with GitHub)
4. Claude API key with credits
5. Code pushed to GitHub

---

## Part 1: Push Code to GitHub

### Create Repositories

**Create two repos on GitHub:**
1. `classflow-ai-backend`
2. `classflow-ai-frontend`

### Push Code

```bash
# Backend
cd ~/classflow-ai/backend
git init
git add .
git commit -m "Initial backend setup"
git remote add origin https://github.com/ryanrudat/classflow-ai-backend.git
git branch -M main
git push -u origin main

# Frontend
cd ~/classflow-ai/frontend
git init
git add .
git commit -m "Initial frontend setup"
git remote add origin https://github.com/ryanrudat/classflow-ai-frontend.git
git branch -M main
git push -u origin main
```

---

## Part 2: Deploy Database (Railway)

### Setup Railway Database

1. Go to https://railway.app
2. Click "New Project"
3. Select "Provision PostgreSQL"
4. Once created, click on PostgreSQL service
5. Go to "Variables" tab
6. Copy the `DATABASE_URL` (starts with `postgresql://`)

### Run Database Schema

**Option A: Railway CLI** (recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run schema
railway run psql $DATABASE_URL < ~/classflow-ai/database/schema.sql
```

**Option B: Railway Web Interface**
1. Click on PostgreSQL service
2. Go to "Data" tab
3. Click "Query"
4. Copy/paste contents of `database/schema.sql`
5. Execute

---

## Part 3: Deploy Backend (Railway)

### Create Backend Service

1. In Railway, click "+ New"
2. Select "GitHub Repo"
3. Choose `classflow-ai-backend`
4. Railway auto-detects Node.js and deploys

### Configure Environment Variables

1. Click on backend service
2. Go to "Variables" tab
3. Add these variables:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=[paste from PostgreSQL service]
JWT_SECRET=[generate random string: openssl rand -base64 32]
CLAUDE_API_KEY=sk-ant-your-api-key
FRONTEND_URL=https://classflow-ai.vercel.app
```

**To reference DATABASE_URL from PostgreSQL service:**
- Click "Add Reference"
- Select PostgreSQL service
- Select DATABASE_URL variable

### Custom Domain (Optional)

1. Go to "Settings" tab
2. Under "Domains", click "Generate Domain"
3. Copy the URL (like `classflow-ai-backend.up.railway.app`)
4. Or add custom domain if you have one

### Verify Deployment

1. Go to "Deployments" tab
2. Wait for build to complete (2-3 minutes)
3. Check logs for errors
4. Test health endpoint: `https://your-backend-url.railway.app/health`

---

## Part 4: Deploy Frontend (Vercel)

### Create Vercel Project

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import `classflow-ai-frontend` from GitHub
4. Vercel auto-detects Vite

### Configure Build Settings

Framework Preset: Vite
Build Command: `npm run build`
Output Directory: `dist`
Install Command: `npm install`

### Environment Variables

Add these in Vercel project settings:

```
VITE_API_URL=https://your-backend-url.railway.app
VITE_WS_URL=https://your-backend-url.railway.app
```

### Deploy

1. Click "Deploy"
2. Wait 1-2 minutes
3. Vercel gives you URL: `https://classflow-ai.vercel.app`

### Update Backend CORS

Go back to Railway backend, update `FRONTEND_URL` environment variable to your Vercel URL:

```
FRONTEND_URL=https://classflow-ai.vercel.app
```

Backend will auto-redeploy with new CORS settings.

---

## Part 5: Custom Domain (Optional)

### For Frontend (Vercel)

1. Buy domain (Namecheap, Google Domains, etc.) like `classflow.ai`
2. In Vercel project settings → Domains
3. Add your domain
4. Update DNS records (Vercel shows you exactly what to add)
5. Wait for DNS propagation (15 min - 24 hours)

### For Backend (Railway)

1. In Railway backend service → Settings → Domains
2. Add custom domain like `api.classflow.ai`
3. Update DNS with CNAME record
4. Update `VITE_API_URL` and `VITE_WS_URL` in Vercel to use new domain

---

## Part 6: Monitoring & Logs

### Railway Logs

- Click backend service → "Deployments" → Click latest deployment → "View Logs"
- Look for errors, database connection issues, API errors

### Vercel Logs

- Project → "Deployments" → Click deployment → "View Function Logs"
- Build logs show compile errors

### Error Monitoring (Optional but recommended)

**Sentry** (free tier available):
```bash
npm install @sentry/node  # backend
npm install @sentry/react # frontend
```

Initialize in `backend/src/server.js` and `frontend/src/main.jsx`

---

## Part 7: Auto-Deploy Setup

### GitHub Actions (Optional)

Both Railway and Vercel auto-deploy when you push to main branch by default.

**To control deployment:**

1. Railway: Settings → "Deployment Triggers" → Choose branch
2. Vercel: Settings → Git → Production Branch

**Best practice:**
- `main` branch → production
- `dev` branch → staging (create separate Railway/Vercel projects)

---

## Part 8: Database Backups

### Railway Automatic Backups

1. Click PostgreSQL service
2. Go to "Backups" tab
3. Enable automatic backups (paid plans only)

### Manual Backups

```bash
# Backup database
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore from backup
railway run psql $DATABASE_URL < backup_20250106.sql
```

**Set up weekly backup cron job:**
```bash
crontab -e

# Add line:
0 0 * * 0 cd ~/classflow-ai && railway run pg_dump $DATABASE_URL > backups/backup_$(date +\%Y\%m\%d).sql
```

---

## Part 9: Cost Management

### Railway Costs

- Free tier: $5 credit/month
- PostgreSQL: ~$5-10/month
- Backend: ~$5-10/month
- Total: ~$10-20/month

**Monitor usage:**
- Railway dashboard shows credit usage
- Set up billing alerts

### Claude API Costs

**During MVP testing (1 teacher):**
- ~$10-25/month

**With 10 teachers:**
- ~$100-200/month

**Cost controls:**
- Implement AI cache (already in schema)
- Rate limiting (20 gen/day for free tier)
- Monitor usage in Claude console

### Vercel Costs

- Free tier: 100GB bandwidth
- Should cover 50-100 students easily
- Upgrade if needed (~$20/month)

---

## Part 10: Production Checklist

Before sharing with other teachers:

### Security
- [ ] All environment variables secured (not in code)
- [ ] JWT secret is strong random string
- [ ] Database password is strong
- [ ] HTTPS enabled (automatic with Railway/Vercel)
- [ ] CORS configured correctly

### Performance
- [ ] AI caching working (check cache hit rate)
- [ ] Database indexes created (schema.sql includes them)
- [ ] WebSocket connections stable
- [ ] No console errors in browser

### Monitoring
- [ ] Error tracking set up (Sentry)
- [ ] Analytics working (Posthog)
- [ ] Can access logs easily
- [ ] Health check endpoint responding

### Documentation
- [ ] README with basic info
- [ ] User guide for teachers
- [ ] Privacy policy (basic)
- [ ] Terms of service (basic)

### Backup
- [ ] Database backup strategy
- [ ] Code in GitHub
- [ ] Environment variables documented

---

## Troubleshooting

### "Database connection failed"

- Check DATABASE_URL is correct in Railway
- Verify PostgreSQL service is running
- Check SSL settings (Railway requires SSL in production)

### "CORS error"

- Verify FRONTEND_URL in Railway matches Vercel URL exactly
- Check no trailing slash
- Verify CORS middleware in backend

### "WebSocket connection failed"

- Check VITE_WS_URL is correct
- Verify backend is running
- Railway supports WebSockets by default

### "AI generation timeout"

- Claude API might be slow (30-60 seconds possible)
- Increase timeout in axios config
- Add retry logic

### "Build failed" on Vercel

- Check build logs for errors
- Verify all dependencies in package.json
- Try building locally: `npm run build`

---

## Scaling Considerations

### When you hit 50+ teachers:

**Database:**
- Upgrade Railway PostgreSQL plan
- Add connection pooling
- Optimize slow queries

**Backend:**
- Scale Railway instances (horizontal scaling)
- Add Redis for session storage
- Implement job queue for AI generation (BullMQ)

**Frontend:**
- Vercel auto-scales
- Consider CDN for static assets

**Costs:**
- ~$200-500/month for 50-100 active teachers
- Revenue target: 30 paid × $25 = $750/month = profitable!

---

## Rolling Back Deployments

### Railway Rollback

1. Go to "Deployments"
2. Find previous working deployment
3. Click "..." → "Redeploy"

### Vercel Rollback

1. Go to "Deployments"
2. Find previous deployment
3. Click "..." → "Promote to Production"

---

## Next Steps After Deployment

1. Test full flow in production
2. Fix any production-only bugs
3. Share with first test teacher (your colleague)
4. Monitor logs for errors
5. Iterate based on feedback

---

**You're live! 🚀**
