# ClassFlow AI

**AI teaching assistant that adapts your lesson in real-time while you teach**

Built by a teacher, for teachers. Focused on high school humanities: English, History, Social Studies, Government, and Biology.

---

## 🎯 What This Is

ClassFlow AI is a live classroom tool that:
- Generates adaptive content during class using AI
- Tracks student understanding in real-time
- Gives teachers control over student screens
- Differentiates instruction automatically

**Target:** High school teachers with 30-35 students using Chromebooks, iPads, or phones

---

## 📊 Project Status

**Phase:** MVP Development (4 weeks)
**Timeline:** Week 1 starting now
**Goal:** Get to 5-10 pilot teachers by Month 3
**Success Criteria:** 40% of pilots use it 4+ times/week

**Validation Gate:** Month 3 - If criteria not met, pivot to different idea

---

## 🗂️ Project Structure

```
classflow-ai/
├── frontend/          # React + Vite + Tailwind CSS
├── backend/           # Node.js + Express + Socket.io
├── database/          # PostgreSQL schema
├── docs/              # Build guides and documentation
│   ├── WEEK_1_BUILD_GUIDE.md
│   ├── WEEK_2_BUILD_GUIDE.md
│   ├── WEEK_3_BUILD_GUIDE.md
│   ├── WEEK_4_BUILD_GUIDE.md
│   └── DEPLOYMENT_GUIDE.md
└── CLASSFLOW_AI_TECHNICAL_SPEC.md  # Complete technical specification
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18+ (`node --version`)
- PostgreSQL installed and running
- Claude API key (get at console.anthropic.com)
- Windsurf IDE (for development)

### Setup

1. **Install dependencies:**
```bash
cd frontend && npm install
cd ../backend && npm install
```

2. **Set up database:**
```bash
createdb classflow_ai
psql classflow_ai < database/schema.sql
```

3. **Configure environment:**
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit both .env files with your values
```

4. **Start development servers:**
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

5. **Open:** http://localhost:5173

---

## 📚 Documentation

### For Development (Start Here!)

1. **[Week 1 Build Guide](docs/WEEK_1_BUILD_GUIDE.md)** - Authentication, sessions, AI generation
2. **[Week 2 Build Guide](docs/WEEK_2_BUILD_GUIDE.md)** - Real-time tracking, screen control
3. **[Week 3 Build Guide](docs/WEEK_3_BUILD_GUIDE.md)** - Adaptive AI, subject templates
4. **[Week 4 Build Guide](docs/WEEK_4_BUILD_GUIDE.md)** - Quizzes, analytics, polish

### For Deployment

- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Railway + Vercel deployment

### For Understanding Architecture

- **[Technical Specification](CLASSFLOW_AI_TECHNICAL_SPEC.md)** - Complete system design

---

## 🛠️ Tech Stack

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Socket.io Client
- Zustand (state management)
- Axios

**Backend:**
- Node.js + Express
- Socket.io (WebSockets)
- PostgreSQL
- Claude API (Sonnet 3.5)
- JWT authentication
- bcrypt

**Infrastructure:**
- Vercel (frontend hosting)
- Railway (backend + database)
- Posthog (analytics)

---

## ✨ Core Features

### Week 1 (MVP Core)
- ✅ Teacher authentication
- ✅ Session creation with join codes
- ✅ Student join (no auth required)
- ✅ AI content generation (reading passages, questions)

### Week 2 (Real-Time)
- ⏳ Live student list with color-coded performance
- ⏳ Screen control (lock, view, focus mode)
- ⏳ Push activities to students in real-time
- ⏳ Student responses tracked live

### Week 3 (Adaptive)
- ⏳ AI detects struggling students automatically
- ⏳ Generate easier/harder versions on demand
- ⏳ Subject-specific templates
- ⏳ Web article integration

### Week 4 (Polish)
- ⏳ Auto-quiz generation
- ⏳ Teacher analytics dashboard
- ⏳ Mobile responsive
- ⏳ Help & onboarding

---

## 🎓 Subjects Supported

- **English** - Reading comprehension, literary analysis, writing prompts
- **History** - Primary source analysis, timelines, cause & effect
- **Social Studies** - Current events, geography, economic principles
- **Government** - Constitutional analysis, civic engagement, policy debates
- **Biology** - Scientific method, processes, ecosystem analysis

---

## 💰 Pricing Strategy (Post-Launch)

**Free Tier:**
- 20 AI generations/day
- 1 active session
- Up to 35 students
- 90-day data retention

**Pro Tier ($25/month):**
- Unlimited AI generations
- Unlimited sessions
- Save & reuse content
- Export to LMS
- 1-year data retention

**School Tier ($2,500/year):**
- 20 teachers included
- Admin dashboard
- Priority support
- Training sessions

---

## 📈 Success Metrics

### Month 1 (MVP)
- ✅ MVP built and tested
- ✅ You use it in your classroom 4+ times/week

### Month 2-3 (Pilot)
- 🎯 5-10 teachers actively using it
- 🎯 3+ uses per week per teacher
- 🎯 Clear usage patterns showing value

### Month 3 (Decision Point)
**If success criteria met:**
- Scale to 50-100 teachers
- Launch paid tiers
- Attend teacher conferences

**If NOT met:**
- Pivot to WebhookHub or other idea
- Lessons learned documented
- Tool still useful for your classroom

---

## 🐛 Known Issues / TODO

**Week 1:**
- [ ] Implement authentication controller
- [ ] Session creation & join flow
- [ ] AI service with caching
- [ ] Basic UI components

**Week 2:**
- [ ] WebSocket real-time sync
- [ ] Screen control features
- [ ] Live student tracking

**Week 3:**
- [ ] Adaptive content generation
- [ ] Subject templates
- [ ] Web scraping service

**Week 4:**
- [ ] Quiz generation
- [ ] Analytics dashboard
- [ ] Mobile responsive
- [ ] Error handling & polish

---

## 🤝 Development Workflow

**Using Windsurf:**
1. Open project in Windsurf
2. Follow weekly build guides
3. Tell Windsurf what to build (prompts provided in guides)
4. Test locally
5. Iterate based on feedback
6. Commit to GitHub
7. Auto-deploy to Railway/Vercel

**Getting Help:**
- Windsurf AI for code questions
- Claude Code (me!) for architecture/design questions
- Weekly reviews to check progress

---

## 📊 Cost Estimates

**Development (Month 1):**
- AI: $10-25
- Hosting: $0 (free tiers)
- Domain (optional): $15/year

**Testing (Month 2-3, 1-10 teachers):**
- AI: $50-200
- Hosting: $20-50
- Total: ~$100-250

**Scale (Month 4+, 50 teachers):**
- AI: ~$200-300
- Hosting: ~$50-100
- Revenue (30 paid): ~$750
- **Net: +$300-500/month profit**

---

## 🎯 Competitive Positioning

**vs Magic School AI:** They do lesson planning (before class), we do live orchestration (during class)

**vs Khanmigo:** They do 1-on-1 tutoring, we do whole-class management

**vs Pear Deck:** They use pre-made content, we generate AI content in real-time

**Our edge:** Live AI content generation + screen control + real-time adaptation, built by a teacher for teachers

---

## 🔐 Privacy & Security

- FERPA compliant (no student PII required)
- COPPA safe (no student accounts)
- JWT authentication for teachers
- Bcrypt password hashing
- HTTPS only (Railway/Vercel enforce this)
- Data retention: 90 days (configurable)

---

## 📝 License

Proprietary - Not open source (yet)

© 2025 Ryan Rudat

---

## 📞 Contact

**Builder:** Ryan Rudat
**GitHub:** ryanrudat
**Purpose:** Side income → potential full-time if successful

---

## 🚦 Next Steps

1. ✅ Read this README
2. ✅ Review [Technical Spec](CLASSFLOW_AI_TECHNICAL_SPEC.md)
3. ⏭️ Start [Week 1 Build Guide](docs/WEEK_1_BUILD_GUIDE.md)
4. ⏭️ Get Claude API key
5. ⏭️ Set up local development environment
6. ⏭️ Begin building in Windsurf

**Let's build this! 🚀**

---

## 💭 Philosophy

*"Build something useful for yourself first. If it helps you, it'll help others like you. If it doesn't help you, why would it help anyone else?"*

This is not about getting rich quick. It's about:
1. Solving a real problem you face daily as a teacher
2. Learning product development
3. Building sustainable side income
4. Helping other teachers if it works

**Success = $2-3k/month after 12 months**

Not life-changing, but meaningful. And the skills you learn building this? Those are invaluable.

---

**Ready? Open [Week 1 Build Guide](docs/WEEK_1_BUILD_GUIDE.md) and let's start! 🏗️**
