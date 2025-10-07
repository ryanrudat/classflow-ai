# ClassFlow AI - Setup Instructions

**Follow these steps to get your development environment running.**

---

## ✅ Step 1: Get Your Claude API Key (5 minutes)

1. Go to: **https://console.anthropic.com/**
2. Sign up or log in with your email
3. Click on your profile (top right) → **Settings**
4. Go to **API Keys** section
5. Click **Create Key**
6. Give it a name like "ClassFlow AI Development"
7. **Copy the key** (starts with `sk-ant-...`)
   - ⚠️ You can only see it once! Save it somewhere safe
8. Go to **Settings** → **Billing**
9. Add a payment method and **add $25 credit**
   - This will last 1-2 months of development
   - Cost during testing: ~$10-25/month

**Save your API key - you'll need it in Step 3!**

---

## ✅ Step 2: Set Up PostgreSQL Database

### Option A: Local PostgreSQL (Recommended for Development)

**Install PostgreSQL:**
```bash
# Mac (using Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Verify it's running
psql --version
# Should show: psql (PostgreSQL) 15.x
```

**Create Database:**
```bash
# Create database
createdb classflow_ai

# Load schema
cd ~/Desktop/classflow-ai
psql classflow_ai < database/schema.sql

# Verify tables were created
psql classflow_ai -c "\dt"
# Should list: users, sessions, session_students, activities, etc.
```

**Your DATABASE_URL will be:**
```
postgresql://localhost:5432/classflow_ai
```

### Option B: Railway Cloud Database (Easier, but costs $5/month)

1. Go to **https://railway.app**
2. Sign up with GitHub
3. Create new project → **Provision PostgreSQL**
4. Click on PostgreSQL service → **Variables**
5. Copy the **DATABASE_URL**
6. In Railway PostgreSQL → **Data** tab → **Query**
7. Copy/paste contents of `database/schema.sql` and execute

**Use the DATABASE_URL from Railway in Step 3**

---

## ✅ Step 3: Configure Environment Variables

### Backend Configuration

```bash
cd ~/Desktop/classflow-ai/backend
cp .env.example .env
```

**Edit `backend/.env` with your favorite editor:**
```bash
open .env  # Mac: opens in default editor
# or
nano .env
# or open in Windsurf
```

**Fill in these values:**
```bash
PORT=3000
NODE_ENV=development

# If using local PostgreSQL:
DATABASE_URL=postgresql://localhost:5432/classflow_ai

# If using Railway:
DATABASE_URL=postgresql://user:pass@host:5432/railway

# Generate a random secret (run this command to generate one):
# openssl rand -base64 32
JWT_SECRET=paste-generated-secret-here

# Your Claude API key from Step 1
CLAUDE_API_KEY=sk-ant-your-key-here

# Frontend URL (leave as is for development)
FRONTEND_URL=http://localhost:5173
```

### Frontend Configuration

```bash
cd ~/Desktop/classflow-ai/frontend
cp .env.example .env
```

**Edit `frontend/.env`:**
```bash
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

**That's it for frontend - just 2 lines!**

---

## ✅ Step 4: Start Development Servers

**Open TWO terminal windows/tabs:**

### Terminal 1: Backend
```bash
cd ~/Desktop/classflow-ai/backend
npm run dev
```

**You should see:**
```
🚀 Server running on port 3000
📱 Frontend URL: http://localhost:5173
🔌 WebSocket ready
✅ Database connected
```

**If you see errors:**
- "Database connection failed" → Check PostgreSQL is running: `brew services list`
- "CLAUDE_API_KEY not found" → Check your `.env` file
- "Port 3000 in use" → Something else is using port 3000, kill it: `lsof -ti:3000 | xargs kill`

**Leave this terminal running!**

### Terminal 2: Frontend
```bash
cd ~/Desktop/classflow-ai/frontend
npm run dev
```

**You should see:**
```
  VITE v5.1.0  ready in 523 ms

  ➜  Local:   http://localhost:5173/
```

**Open your browser:** http://localhost:5173

---

## ✅ Step 5: Verify Everything Works

### Test 1: Backend Health Check
```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"2025-10-06T..."}
```

### Test 2: Frontend Loads
- Open http://localhost:5173 in browser
- Should see ClassFlow AI login page
- No console errors (press F12 to check)

### Test 3: Database Connection
```bash
psql classflow_ai -c "SELECT COUNT(*) FROM users;"
```

**Expected:** `count: 0` (no users yet - that's correct!)

---

## ✅ Step 6: Create Your First Account (Test)

1. Go to http://localhost:5173
2. Click "Sign up"
3. Fill in:
   - Name: Your name
   - Email: your-email@example.com
   - Password: anything (min 6 chars)
   - School: Your school name
4. Click "Sign Up"

**Should:**
- Redirect to /dashboard
- See "Teacher Dashboard" page

**If it works, you're all set! 🎉**

---

## 🆘 Troubleshooting

### "Can't connect to database"

**Check if PostgreSQL is running:**
```bash
brew services list | grep postgresql
```

**If not running:**
```bash
brew services start postgresql@15
```

**If still issues:**
```bash
# Check if port 5432 is in use
lsof -i:5432

# Restart PostgreSQL
brew services restart postgresql@15
```

### "Claude API error: Invalid API key"

- Check `.env` file has correct key
- Key should start with `sk-ant-`
- Make sure there's no extra spaces or quotes
- Verify key works at: https://console.anthropic.com/

### "Module not found"

```bash
# Reinstall dependencies
cd backend  # or frontend
rm -rf node_modules package-lock.json
npm install
```

### "CORS error" in browser

- Make sure backend is running
- Check `FRONTEND_URL` in backend `.env` matches `http://localhost:5173`
- Restart backend server

---

## 📁 Project Structure (for Windsurf)

```
~/Desktop/classflow-ai/
├── backend/
│   ├── src/
│   │   ├── server.js          # Main server file
│   │   ├── routes/            # API routes
│   │   ├── controllers/       # Business logic
│   │   ├── services/          # AI service, etc.
│   │   ├── database/          # Database connection
│   │   └── middleware/        # Auth middleware
│   └── .env                   # Your secrets HERE
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main React app
│   │   ├── pages/             # Login, Dashboard, etc.
│   │   ├── components/        # Reusable UI components
│   │   ├── services/          # API calls
│   │   └── stores/            # State management
│   └── .env                   # API URLs HERE
│
├── database/
│   └── schema.sql             # Database structure
│
└── docs/                      # Build guides
```

---

## 🎯 Next Steps

Once everything is running:

1. **Test the app** - Create account, explore dashboard
2. **Check the code in Windsurf** - Open ~/Desktop/classflow-ai
3. **Follow my build progress** - I'll be building features and you can see them appear

**I'm now building:**
- ✅ Authentication (register/login) - DONE, test it!
- ⏳ Session creation & join flow - IN PROGRESS
- ⏳ AI content generation - NEXT
- ⏳ Teacher & student UI - AFTER THAT

---

## 💡 Tips

**Keep both terminals running** while developing - backend and frontend need to be live.

**If you edit code in Windsurf:**
- Backend changes → Server auto-restarts (nodemon)
- Frontend changes → Page auto-refreshes (Vite HMR)

**If something breaks:**
- Check terminal for errors
- Check browser console (F12)
- Restart the server if needed (Ctrl+C, then `npm run dev` again)

---

**You're ready! Everything should be working now. 🚀**

Open http://localhost:5173 and try registering an account!
