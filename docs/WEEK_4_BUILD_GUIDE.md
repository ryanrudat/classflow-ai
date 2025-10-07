# Week 4 Build Guide - Quizzes, Analytics & Polish

**Goal:** Auto-quiz generation, analytics dashboard, and launch-ready polish

---

## Day 22-23: Quiz Generation

### Quiz Generator (Backend)

**Update:** `backend/src/services/aiService.js`

**Tell Windsurf:**
```
Add generateQuiz function:

Inputs:
- sessionId (to analyze what was covered)
- questionCount (default 10)
- difficulty
- focusAreas (optional array of topics to emphasize)

Process:
- Query activities table for this session
- Extract topics/content covered
- Build prompt: "Generate a quiz based on these topics: [X, Y, Z]"
- Claude generates multiple choice questions as JSON:
  {
    "questions": [
      {
        "question": "...",
        "options": ["A", "B", "C", "D"],
        "correct": 0,
        "explanation": "..."
      }
    ]
  }
- Returns formatted quiz
```

### Quiz Controller & Routes (Backend)

**Create:** `backend/src/controllers/quizController.js`

**Tell Windsurf:**
```
Functions:
- generateQuiz: creates quiz from session content
- submitQuiz: accepts student answers, grades automatically, returns score
- getQuizResults: shows teacher all student scores
```

Add routes to `backend/src/routes/sessions.js`:
```
POST /sessions/:id/quiz/generate
POST /sessions/:id/quiz/submit
GET /sessions/:id/quiz/results
```

### Quiz UI (Frontend)

**Create:** `frontend/src/components/QuizView.jsx`

**Tell Windsurf:**
```
Teacher view:
- "Generate Quiz" button (appears after activities created)
- Shows preview of quiz questions
- "Push Quiz to Students" button
- Real-time results as students complete

Student view:
- Receives quiz via socket
- Shows one question at a time (or all at once - teacher choice)
- Multiple choice selection
- Submit button
- See score immediately after submit
- Can't retake (or allow retakes - teacher setting)
```

---

## Day 24-25: Analytics Dashboard

### Analytics Service (Backend)

**Create:** `backend/src/services/analyticsService.js`

**Tell Windsurf:**
```
Functions to calculate:

getTeacherStats(teacherId, period='week'):
- Sessions run
- Total students reached
- AI generations used
- Most used subject
- Most used feature
- Average session length

getSessionAnalytics(sessionId):
- Number of students
- Activities created
- Student engagement rate (% who responded)
- Average accuracy
- Time spent per activity
- Top performing students
- Struggling students

getRetentionMetrics(teacherId):
- Days used in last 30 days
- Week-over-week usage
- Feature adoption rates
```

### Analytics API & Routes (Backend)

**Create:** `backend/src/routes/analytics.js`

**Tell Windsurf:**
```
Routes:
- GET /analytics/dashboard - teacher's usage stats
- GET /analytics/session/:id - detailed session analytics
- GET /analytics/retention - retention metrics
```

### Analytics Dashboard (Frontend)

**Create:** `frontend/src/pages/Analytics.jsx`

**Tell Windsurf:**
```
Dashboard showing:

This Week:
- 🎯 Sessions Run: 12
- 👥 Students Reached: 408
- 🤖 AI Generations: 89
- ⏱️ Avg Session: 42 min

Most Used:
- Subject: History
- Feature: Generate Questions
- Template: Primary Source Analysis

Charts:
- Sessions per day (last 7 days)
- Students per session
- AI usage over time

Recent Sessions:
- List of past sessions with stats
- Click to see detailed breakdown
```

Use a charting library like recharts or chart.js

---

## Day 26-27: Polish & UX Improvements

### Loading States & Error Handling

**Tell Windsurf for each major component:**
```
Add comprehensive loading states:
- Skeleton loaders while data fetches
- Spinners for AI generation (with estimated time)
- Progress bars for long operations

Add error handling:
- Network errors → "Lost connection. Retry?" button
- AI errors → "Generation failed. Try again or rephrase prompt"
- Database errors → "Couldn't save. Retrying..."

Add success feedback:
- Toast notifications for successful actions
- Checkmarks for completed tasks
- Animations for state transitions
```

### Mobile Responsiveness

**Tell Windsurf:**
```
Make all components mobile-responsive:
- Teacher dashboard should work on iPad
- Student view must work on phones
- Use Tailwind breakpoints (sm, md, lg, xl)
- Test on different screen sizes
- Hamburger menu for mobile navigation
```

### Keyboard Shortcuts (Teacher productivity)

**Create:** `frontend/src/hooks/useKeyboardShortcuts.js`

**Tell Windsurf:**
```
Add keyboard shortcuts for teacher:
- Cmd/Ctrl + G: Generate content
- Cmd/Ctrl + P: Push to students
- Cmd/Ctrl + L: Lock screens
- Cmd/Ctrl + U: Unlock screens
- Cmd/Ctrl + Q: Generate quiz
- Escape: Close modals

Show shortcut hints in UI (tooltip on hover)
```

### Help & Onboarding

**Create:** `frontend/src/components/OnboardingTour.jsx`

**Tell Windsurf:**
```
First-time user experience:
- Welcome modal on first login
- Guided tour of features (use react-joyride or similar)
- Tooltips on key features
- "Help" button that shows tutorial again
- Link to documentation
```

---

## Day 28: Final Testing & Documentation

### End-to-End Testing Checklist

Test complete user journey:

**Teacher:**
- [ ] Register account
- [ ] Create session
- [ ] Generate content (reading, questions)
- [ ] Push to students
- [ ] See live student responses
- [ ] Use screen controls
- [ ] Generate quiz
- [ ] View analytics

**Student:**
- [ ] Join with code
- [ ] Receive activities
- [ ] Submit responses
- [ ] See screen lock
- [ ] Complete quiz
- [ ] See score

**Cross-browser:**
- [ ] Chrome
- [ ] Safari
- [ ] Firefox
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Bug Fixes

Create list of known issues and prioritize:
- Critical (blocks core functionality) - fix immediately
- Major (impacts UX significantly) - fix this week
- Minor (polish issues) - can defer to post-launch

### Documentation

**Create:** `docs/USER_GUIDE.md`

Quick guide for teachers:
- How to create session
- How to generate content
- How to use screen controls
- Best practices

**Create:** `docs/TECHNICAL_NOTES.md`

For future development:
- Architecture decisions
- API documentation
- Database schema notes
- Deployment instructions

---

## ✅ Week 4 Complete When (MVP DONE):

- ✅ Auto-quiz generation works
- ✅ Analytics dashboard shows usage stats
- ✅ All major features polished and responsive
- ✅ Error handling robust
- ✅ Help/onboarding for new users
- ✅ Fully tested end-to-end
- ✅ Ready for pilot testing with other teachers

---

## 🚀 Launch Checklist

Before inviting other teachers:

- [ ] Deployed to production (Railway + Vercel)
- [ ] Custom domain configured (optional)
- [ ] Environment variables secured
- [ ] Database backed up
- [ ] Error monitoring set up (Sentry or similar)
- [ ] Analytics tracking working (Posthog)
- [ ] Terms of Service + Privacy Policy (basic versions)
- [ ] Support email set up
- [ ] Demo video recorded
- [ ] Teacher signup form ready

---

## Next: Get First 5 Teachers

**Month 2-3 Goal:** Validate with 5-10 teachers

Strategies:
1. Your colleagues at school (easiest)
2. Teacher friends from other schools
3. Teacher Facebook groups (get permission first)
4. Teacher subreddit r/Teachers (share your story)
5. Twitter/X education hashtags (#EdTech #TeacherLife)

**Track these metrics:**
- How many teachers sign up
- How many create > 1 session
- How many use it > 3x/week
- What features they use most
- What pain points they report

**Month 3 Decision Point:**
Hit validation criteria? → Scale it up
Not hitting criteria? → Pivot to WebhookHub or iterate

---

You've got this! 🎉
