# 🚀 Deploy ClassFlow AI to Render

Complete guide to deploy your app to Render.

---

## 📋 Overview

You'll deploy 3 things:
1. **PostgreSQL Database** (Render managed database)
2. **Backend API** (Node.js Web Service)
3. **Frontend** (Static Site)

**Time:** 30-45 minutes
**Cost:** Free tier available, ~$7-15/month for production

---

## Step 1: Create PostgreSQL Database

### 1.1 Go to Render Dashboard
- Navigate to https://dashboard.render.com/
- Click **"New +"** → **"PostgreSQL"**

### 1.2 Configure Database
- **Name:** `classflow-ai-db`
- **Database:** `classflow_ai`
- **User:** (auto-generated)
- **Region:** Choose closest to you
- **Plan:** Free (for testing) or Starter ($7/month for production)
- Click **"Create Database"**

### 1.3 Get Connection Details
After creation, Render will show you:
- **Internal Database URL** - Copy this!
- **External Database URL** - Also copy this
- Example: `postgresql://user:pass@dpg-xxxxx/classflow_ai`

### 1.4 Load Schema
From your terminal:
```bash
# Get the External Database URL from Render
# Then run:
psql <EXTERNAL_DATABASE_URL> < /Users/ryanrudat/Desktop/classflow-ai/database/schema.sql
```

Or use Render's Web Shell:
- Go to your database in Render
- Click "Connect" → "PSQL Command"
- Paste the schema SQL manually

---

## Step 2: Deploy Backend

### 2.1 Push Code to GitHub (if not already)
```bash
cd /Users/ryanrudat/Desktop/classflow-ai
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/classflow-ai.git
git push -u origin main
```

### 2.2 Create Web Service on Render
- Go to https://dashboard.render.com/
- Click **"New +"** → **"Web Service"**
- Connect your GitHub repository
- Select `classflow-ai` repository

### 2.3 Configure Backend Service
**Basic Settings:**
- **Name:** `classflow-ai-backend`
- **Region:** Same as database
- **Branch:** `main`
- **Root Directory:** `backend`
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Plan:** Free (for testing) or Starter ($7/month)

**Environment Variables:** (Click "Advanced" → "Add Environment Variable")
```
NODE_ENV=production
PORT=3000
DATABASE_URL=<INTERNAL_DATABASE_URL_FROM_STEP_1>
JWT_SECRET=<YOUR_JWT_SECRET_FROM_LOCAL_ENV>
CLAUDE_API_KEY=<YOUR_CLAUDE_API_KEY>
FRONTEND_URL=https://classflow-ai-frontend.onrender.com
```

**Important Notes:**
- Use the **Internal Database URL** (starts with `postgresql://`)
- `FRONTEND_URL` will be your frontend URL (we'll get this in Step 3)
- You can update `FRONTEND_URL` after deploying frontend

### 2.4 Deploy
- Click **"Create Web Service"**
- Render will build and deploy (takes 2-5 minutes)
- Once deployed, you'll get a URL like: `https://classflow-ai-backend.onrender.com`
- **Copy this URL!**

### 2.5 Test Backend
```bash
curl https://classflow-ai-backend.onrender.com/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

## Step 3: Deploy Frontend

### 3.1 Update Frontend Environment Variables
Before deploying, update the frontend to point to your backend:

**Edit:** `/Users/ryanrudat/Desktop/classflow-ai/frontend/.env`
```bash
VITE_API_URL=https://classflow-ai-backend.onrender.com
VITE_WS_URL=https://classflow-ai-backend.onrender.com
```

Commit and push:
```bash
git add frontend/.env
git commit -m "Update frontend env for production"
git push
```

### 3.2 Create Static Site on Render
- Go to https://dashboard.render.com/
- Click **"New +"** → **"Static Site"**
- Connect your GitHub repository
- Select `classflow-ai` repository

### 3.3 Configure Frontend Service
**Basic Settings:**
- **Name:** `classflow-ai-frontend`
- **Branch:** `main`
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`

**Environment Variables:**
```
VITE_API_URL=https://classflow-ai-backend.onrender.com
VITE_WS_URL=https://classflow-ai-backend.onrender.com
```

### 3.4 Deploy
- Click **"Create Static Site"**
- Render will build and deploy (takes 2-5 minutes)
- Once deployed, you'll get a URL like: `https://classflow-ai-frontend.onrender.com`
- **This is your app URL!**

---

## Step 4: Update Backend CORS

Now that you have the frontend URL, update the backend:

### 4.1 Update Backend Environment Variable
- Go to your backend service in Render
- Go to "Environment" tab
- Update `FRONTEND_URL` to: `https://classflow-ai-frontend.onrender.com`
- Click "Save Changes"
- Backend will auto-redeploy

---

## Step 5: Test Everything

### 5.1 Open Your App
Go to: `https://classflow-ai-frontend.onrender.com`

### 5.2 Test Flow
1. Click "🚀 Quick Demo Login"
2. Create a new session
3. Note the join code
4. Try generating content (make sure Claude API key is set)
5. Open incognito window
6. Go to your app URL
7. Join as student with the code
8. Push content from teacher view
9. Verify it appears in student view

---

## 🎉 You're Live!

**Your App URLs:**
- **Frontend:** `https://classflow-ai-frontend.onrender.com`
- **Backend API:** `https://classflow-ai-backend.onrender.com`
- **Database:** Managed by Render

**Share with students:**
- Students go to: `https://classflow-ai-frontend.onrender.com`
- They enter the join code
- Works from any device!

---

## 💰 Cost Breakdown

**Free Tier (Testing):**
- Database: Free for 90 days, then $7/month
- Backend: Free (sleeps after 15 min inactivity)
- Frontend: Free
- **Total:** $0 initially, $7/month after trial

**Production (Recommended):**
- Database: Starter ($7/month)
- Backend: Starter ($7/month - always on)
- Frontend: Free
- **Total:** $14/month

**With Claude API:**
- Light use: ~$10-25/month
- **Grand Total:** ~$24-39/month

---

## 🔧 Troubleshooting

### "Database connection failed"
- Check `DATABASE_URL` uses **Internal URL** (not External)
- Verify schema was loaded (`\dt` in psql should show 7 tables)
- Check backend logs in Render dashboard

### "CORS error"
- Make sure `FRONTEND_URL` in backend matches your frontend URL exactly
- No trailing slash
- Use https://

### "API key invalid"
- Verify `CLAUDE_API_KEY` is set in backend environment variables
- Check you have credits at console.anthropic.com

### "WebSocket not connecting"
- Make sure `VITE_WS_URL` points to backend
- Use https:// (not wss://)
- Check backend is running

### "Free tier sleeping"
- Free backend sleeps after 15 min inactivity
- First request takes ~30 seconds to wake up
- Upgrade to Starter plan ($7/month) for always-on

---

## 🚀 Next Steps After Deployment

1. **Custom Domain** (Optional)
   - Go to your frontend service in Render
   - Click "Settings" → "Custom Domain"
   - Add your domain (e.g., `classflow.yourdomain.com`)
   - Update DNS records as shown

2. **Auto-Deploy**
   - Already enabled! Push to GitHub = auto-deploy
   - Render rebuilds both frontend and backend

3. **Monitor Usage**
   - Render dashboard shows logs and metrics
   - Claude console shows API usage
   - Check costs monthly

4. **Share with Others**
   - Share your frontend URL with teachers
   - Students just need the URL + join code
   - No installation required!

---

## 📊 Deployment Checklist

Before going live:
- [ ] Database created and schema loaded
- [ ] Backend deployed and health check passes
- [ ] Frontend deployed and loads
- [ ] Environment variables all set correctly
- [ ] CORS configured (FRONTEND_URL in backend)
- [ ] Claude API key added and has credits
- [ ] Tested teacher login
- [ ] Tested session creation
- [ ] Tested AI generation
- [ ] Tested student join
- [ ] Tested real-time activity push
- [ ] WebSocket connections working

---

**Ready to deploy? Start with Step 1!**

Need help at any step? Just ask!
