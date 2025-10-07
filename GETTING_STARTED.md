# Getting Started - ClassFlow AI

**Quick start guide for your first day.**

---

## ✅ What You Need

Before you start coding:

1. **Claude API Key**
   - Go to: https://console.anthropic.com/
   - Sign up / log in
   - Settings → API Keys → Create Key
   - Add $25 credit (Settings → Billing)
   - Copy key (starts with `sk-ant-...`)

2. **GitHub Repos**
   - You have GitHub username: `ryanrudat` ✅
   - Need to create 2 repos:
     - `classflow-ai-frontend`
     - `classflow-ai-backend`
   - (You can do this later, not needed for local development)

3. **PostgreSQL**
   - Mac: `brew install postgresql`
   - Start: `brew services start postgresql`
   - Verify: `psql --version`

4. **Node.js**
   - Check version: `node --version` (should be 18+)
   - If not installed: `brew install node`

---

## 🚀 Setup (10 minutes)

### Step 1: Install Dependencies

```bash
# Frontend
cd ~/classflow-ai/frontend
npm install

# Backend
cd ~/classflow-ai/backend
npm install
```

**Expect:** Takes 2-3 minutes, installs ~500 packages total

---

### Step 2: Create Database

```bash
# Create database
createdb classflow_ai

# Load schema
psql classflow_ai < ~/classflow-ai/database/schema.sql

# Verify it worked
psql classflow_ai -c "SELECT tablename FROM pg_tables WHERE schemaname='public';"
```

**Should see:**
- users
- sessions
- session_students
- activities
- student_responses
- ai_cache
- analytics_events

---

### Step 3: Configure Environment

**Backend:**
```bash
cd ~/classflow-ai/backend
cp .env.example .env
nano .env  # or open in Windsurf
```

**Edit `.env` to have:**
```
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/classflow_ai
JWT_SECRET=change-this-to-random-string-abc123xyz789
CLAUDE_API_KEY=sk-ant-YOUR-KEY-HERE
FRONTEND_URL=http://localhost:5173
```

**Frontend:**
```bash
cd ~/classflow-ai/frontend
cp .env.example .env
nano .env
```

**Edit `.env` to have:**
```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

---

### Step 4: Test Backend

```bash
cd ~/classflow-ai/backend
npm run dev
```

**Should see:**
```
🚀 Server running on port 3000
📱 Frontend URL: http://localhost:5173
🔌 WebSocket ready
✅ Database connected
```

**If errors:**
- "Database error" → Check PostgreSQL is running: `brew services start postgresql`
- "Module not found" → Run `npm install` again
- "Port 3000 in use" → Kill other process: `lsof -ti:3000 | xargs kill`

**Test health endpoint:**
```bash
curl http://localhost:3000/health
```

Should return: `{"status":"ok","timestamp":"..."}`

**Leave this running!** Open new terminal for frontend.

---

### Step 5: Test Frontend

**New terminal:**
```bash
cd ~/classflow-ai/frontend
npm run dev
```

**Should see:**
```
  VITE v5.1.0  ready in 523 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**Open browser:** http://localhost:5173

**Should see:** Login page for ClassFlow AI

---

## 🎯 Verify Everything Works

### Test 1: Backend Health
```bash
curl http://localhost:3000/health
```
✅ Should return JSON with status: ok

### Test 2: Frontend Loads
- Open http://localhost:5173
- ✅ Should see login/register page (no errors in console)

### Test 3: Database Connection
```bash
psql classflow_ai -c "SELECT COUNT(*) FROM users;"
```
✅ Should return count: 0 (no users yet)

---

## 🛠️ Open in Windsurf

1. Open Windsurf
2. File → Open Folder
3. Select `~/classflow-ai`
4. You should see:
   - frontend/
   - backend/
   - database/
   - docs/

**Split view:**
- Left: File tree
- Center: Code editor
- Right: AI assistant

---

## 📖 Next Steps

Now you're ready to build! Follow these in order:

1. **[Week 1 Build Guide](docs/WEEK_1_BUILD_GUIDE.md)**
   - Start with Day 1-2: Authentication
   - Use Windsurf AI to help build each feature
   - Test as you go

2. **First Feature to Build:**
   - `backend/src/controllers/authController.js`
   - Registration & login endpoints
   - See Week 1 guide for detailed instructions

---

## 🆘 Troubleshooting

### "Can't connect to database"

**Fix:**
```bash
# Start PostgreSQL
brew services start postgresql

# Check it's running
brew services list | grep postgresql

# Should say "started"
```

### "Module not found"

**Fix:**
```bash
cd frontend  # or backend
rm -rf node_modules package-lock.json
npm install
```

### "Port already in use"

**Fix:**
```bash
# Find what's using port 3000
lsof -ti:3000

# Kill it
kill -9 [PID from above]
```

### "Claude API error"

**Fix:**
- Check API key in `backend/.env`
- Verify it starts with `sk-ant-`
- Check you have credits: https://console.anthropic.com/settings/billing

---

## 💡 Tips for Using Windsurf

### How to Ask Windsurf to Build Something

**Good prompts:**
```
"Create an authentication controller with register and login functions.
Use bcrypt for password hashing, JWT for tokens.
Save users to the users table from schema.sql.
Return user object without password_hash."
```

**Bad prompts:**
```
"make auth"
```

**Be specific:**
- What file to create/update
- What the function should do
- What it should return
- What errors to handle

### Iterating with Windsurf

1. Ask Windsurf to create code
2. Review what it generated
3. Test it
4. If bugs, tell Windsurf: "This gives error X, fix it"
5. Windsurf will iterate

### When Windsurf Gets Stuck

- Try rephrasing your request
- Break it into smaller steps
- Ask Claude Code (me!) for guidance
- Check the build guides for hints

---

## 🎓 Learning Resources

**New to React?**
- React docs: https://react.dev/learn
- Focus on: components, state, props, hooks

**New to Node.js?**
- Node docs: https://nodejs.org/docs/latest/api/
- Focus on: Express, async/await, PostgreSQL

**New to APIs?**
- REST API basics: https://restfulapi.net/

**But honestly:**
- Windsurf will teach you as you build
- Follow the build guides
- Ask questions when stuck

---

## 📊 Time Estimates

**Setup (today):** 30 minutes
**Week 1 (Days 1-7):** 15-20 hours total
**Week 2:** 15-20 hours
**Week 3:** 15-20 hours
**Week 4:** 10-15 hours

**Total to MVP:** 60-75 hours over 4 weeks = ~2 hours/day

**Manageable?** Yes, if you commit to it!

---

## ✅ Ready to Build

Everything working? Great!

**Next action:**
1. Open `docs/WEEK_1_BUILD_GUIDE.md`
2. Start Day 1-2: Authentication
3. Use Windsurf to build it
4. Test it works
5. Move to next task

**You've got this! 🚀**

---

**Questions?** Ask Claude Code (me!) anytime.
**Stuck?** Check the troubleshooting sections in each build guide.
**Excited?** You should be - you're building something real!

**LET'S GO! 🏗️**
