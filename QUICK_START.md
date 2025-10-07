# 🚀 QUICK START - Get ClassFlow AI Running in 15 Minutes

**Everything is built! You just need to:**
1. Get your Claude API key
2. Set up the database
3. Configure environment variables
4. Start the servers

---

## ✅ Step 1: Get Claude API Key (5 min)

1. **Go to:** https://console.anthropic.com/
2. **Sign up** with your email
3. Click **Settings** (gear icon)
4. Go to **API Keys** → **Create Key**
5. **Copy the key** (starts with `sk-ant-...`)
   - ⚠️ Save it! You can only see it once
6. Go to **Settings** → **Billing**
7. Add payment method
8. **Add $25 credit** (lasts 1-2 months of testing)

**✅ Save your API key - you'll need it in Step 3!**

---

## ✅ Step 2: Set Up Database (5 min)

### Option A: Local PostgreSQL (Recommended)

```bash
# Install PostgreSQL (if not installed)
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb classflow_ai

# Load schema
cd ~/Desktop/classflow-ai
psql classflow_ai < database/schema.sql

# Verify (should show 7 tables)
psql classflow_ai -c "\dt"
```

### Option B: Railway Cloud Database

1. Go to https://railway.app
2. Sign up with GitHub
3. **New Project** → **Provision PostgreSQL**
4. Click PostgreSQL → **Variables** → Copy **DATABASE_URL**
5. Click **Data** → **Query** → Paste contents of `database/schema.sql` → Execute

**✅ Save your DATABASE_URL if using Railway!**

---

## ✅ Step 3: Configure Environment (3 min)

### Backend Setup:

```bash
cd ~/Desktop/classflow-ai/backend
cp .env.example .env
```

**Edit `backend/.env`:** (use `open .env` or `nano .env`)

```bash
PORT=3000
NODE_ENV=development

# If LOCAL PostgreSQL:
DATABASE_URL=postgresql://localhost:5432/classflow_ai

# If RAILWAY:
DATABASE_URL=paste-railway-url-here

# Generate a random JWT secret:
# Run: openssl rand -base64 32
# Then paste the output below:
JWT_SECRET=paste-random-secret-here

# Your Claude API key from Step 1:
CLAUDE_API_KEY=sk-ant-paste-your-key-here

FRONTEND_URL=http://localhost:5173
```

**Save the file!**

### Frontend Setup:

```bash
cd ~/Desktop/classflow-ai/frontend
cp .env.example .env
open .env
```

**Edit `frontend/.env`:**

```bash
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

**Save the file!**

---

## ✅ Step 4: Start the Servers (2 min)

**Open TWO terminal windows/tabs:**

### Terminal 1 - Backend:

```bash
cd ~/Desktop/classflow-ai/backend
npm run dev
```

**Should see:**
```
🚀 Server running on port 3000
📱 Frontend URL: http://localhost:5173
🔌 WebSocket ready
✅ Database connected
```

**✅ Leave this running!**

### Terminal 2 - Frontend:

```bash
cd ~/Desktop/classflow-ai/frontend
npm run dev
```

**Should see:**
```
  VITE v5.1.0  ready in 523 ms
  ➜  Local:   http://localhost:5173/
```

**✅ Leave this running too!**

---

## ✅ Step 5: Open & Test! (2 min)

1. **Open browser:** http://localhost:5173

2. **Create account:**
   - Click "Sign up"
   - Fill in your info
   - Click "Sign Up"
   - Should redirect to dashboard ✅

3. **Create session:**
   - Click "+ New Session"
   - Title: "Test Session"
   - Subject: "History"
   - Click "Create Session"
   - You'll see a JOIN CODE (like `ABC123XY`) ✅

4. **Test AI generation:**
   - In the prompt field, type: `The American Revolution`
   - Type: Reading Passage
   - Difficulty: Medium
   - Click "✨ Generate Content"
   - Wait 5-10 seconds...
   - **You should see AI-generated content!** ✅

5. **Test student join** (open incognito window):
   - Go to http://localhost:5173
   - Enter the join code from step 3
   - Enter your name
   - Click "Join Session"
   - Should show "Waiting for teacher..." ✅

---

## 🎉 SUCCESS! What You Can Do Now:

### ✅ Teacher Features:
- Create multiple sessions
- Generate AI content (reading, questions, quizzes)
- Select subject & difficulty
- See join codes for students
- End sessions

### ✅ Student Features:
- Join with code
- See "waiting for teacher" (real-time push coming in Week 2)

### ✅ AI Integration:
- Claude API working
- Subject-specific prompts (English, History, Social Studies, Government, Biology)
- Difficulty levels (easy, medium, hard)
- Content caching (saves money on repeated prompts)

---

## 🔧 Troubleshooting

### "Database connection failed"
```bash
brew services restart postgresql@15
```

### "Claude API error: Invalid API key"
- Check `backend/.env` has correct key
- Key should start with `sk-ant-`
- No extra spaces

### "Port 3000 in use"
```bash
lsof -ti:3000 | xargs kill
cd ~/Desktop/classflow-ai/backend
npm run dev
```

### AI generation is slow
- First generation: 5-10 seconds (normal)
- Subsequent identical prompts: Instant (cached!)

### Can't log in
- Check backend terminal for errors
- Verify database has `users` table: `psql classflow_ai -c "SELECT * FROM users;"`

---

## 📋 What's Working:

**Backend API:**
- ✅ Authentication (register, login)
- ✅ Session management
- ✅ AI content generation
- ✅ Student join
- ✅ Activity tracking
- ✅ Auto-grading (multiple choice)

**Frontend UI:**
- ✅ Login/Register
- ✅ Teacher dashboard
- ✅ Session creation
- ✅ AI content generator
- ✅ Student join flow
- ✅ Content preview

**AI Features:**
- ✅ Claude API integrated
- ✅ Reading passages
- ✅ Comprehension questions
- ✅ Quizzes
- ✅ Discussion prompts
- ✅ Subject-specific (5 subjects)
- ✅ Difficulty levels (3 levels)
- ✅ Response caching

---

## 🔮 Coming in Week 2:

- Real-time WebSocket updates
- Push activities to students live
- Student response tracking
- Color-coded student performance
- Screen control features

---

## 💡 Tips:

**Try different prompts:**
- "Romeo and Juliet themes"
- "Cell division process"
- "Causes of World War 1"
- "The Constitution"

**Try different content types:**
- Reading Passage (good for introducing topics)
- Comprehension Questions (test understanding)
- Quiz (formal assessment)
- Discussion Prompts (class discussion)

**Try different difficulty levels:**
- Easy: Simpler vocabulary, more scaffolding
- Medium: Grade-appropriate
- Hard: Advanced concepts, critical thinking

---

## ❓ Common Questions:

**"How much does AI cost?"**
- ~$0.01-0.02 per reading passage
- ~$0.005-0.01 per set of questions
- Cached prompts cost $0 (repeats are free!)
- Your $25 credit = ~1,000-2,000 generations

**"Can students see content yet?"**
- Not yet - they see "waiting for teacher"
- Week 2 adds real-time push via WebSockets
- For now, you can test generation on teacher side

**"Is this production-ready?"**
- Backend: Yes (with proper secrets)
- Frontend: Yes
- Need: Real-time features (Week 2)

**"Can I deploy this now?"**
- Yes! See `docs/DEPLOYMENT_GUIDE.md`
- Railway (backend) + Vercel (frontend)
- Takes ~30 min to deploy

---

## 🎯 Next Steps:

1. **Test it yourself** - Generate content for your actual lessons
2. **Week 2** - Add real-time features (WebSockets)
3. **Week 3** - Add adaptive AI & subject templates
4. **Week 4** - Add analytics & polish
5. **Month 2** - Get 5 teacher friends to pilot test

---

**You're 90% done with MVP! Just needs real-time features (Week 2).**

**Questions? Check `START_HERE.md` for detailed docs.**

**Ready to use it? Start generating content for your classes! 🎓**
