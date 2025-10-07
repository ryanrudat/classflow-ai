# ClassFlow AI - Technical Specification Document

**Version:** 1.0
**Last Updated:** 2025-10-06
**Product Name:** ClassFlow AI
**Tagline:** *AI teaching assistant that adapts your lesson in real-time while you teach*

---

## Table of Contents

1. [Product Overview](#product-overview)
2. [Core Features](#core-features)
3. [Teacher Control Features](#teacher-control-features)
4. [Technical Architecture](#technical-architecture)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [UI Wireframes](#ui-wireframes)
8. [AI Implementation](#ai-implementation)
9. [Analytics & Tracking](#analytics--tracking)
10. [Security & Privacy](#security--privacy)
11. [Week-by-Week Build Plan](#week-by-week-build-plan)
12. [Deployment Strategy](#deployment-strategy)
13. [Pricing Model](#pricing-model)

---

## 1. Product Overview

### Problem
Teachers need real-time AI assistance during class to:
- Generate adaptive content on the fly
- Track student understanding in real-time
- Differentiate instruction automatically
- Manage classroom engagement

### Solution
ClassFlow AI is a live classroom orchestration tool that:
- Generates AI content during class based on teacher prompts
- Tracks student responses in real-time
- Adapts difficulty based on student performance
- Gives teachers control over student screens
- Provides instant struggle detection

### Target User
- **Primary:** High school teachers (English, History, History of Science)
- **Secondary:** Middle school humanities teachers
- **Class Size:** 30-35 students
- **Devices:** Chromebooks, iPads, smartphones

### Key Differentiators
1. **Live generative AI** (not pre-made content like Pear Deck/Nearpod)
2. **Real-time screen control** (like GoGuardian, but integrated with AI)
3. **Humanities-focused** (not just math/science)
4. **Teacher orchestration** (not student-facing like Khanmigo)

---

## 2. Core Features

### MVP Features (Weeks 1-4)

#### A. Session Management
- Teacher creates live session with join code
- Students join via web browser (no app install)
- Session persists for class period (45-60 minutes)
- Session ends, data saved for later review

#### B. AI Content Generation
Teacher can generate:
- Reading passages (custom length, difficulty, topic)
- Comprehension questions (multiple choice, short answer)
- Discussion prompts
- Writing prompts with scaffolding
- Primary source analysis activities
- Comparison charts
- Timeline activities
- Quiz questions

**Generation time:** 3-5 seconds
**Customization:** Reading level, length, complexity

#### C. Real-Time Student Tracking
- Live student list showing who's joined
- Color-coded status:
  - 🟢 Green: Performing well (80%+ correct)
  - 🟡 Yellow: Struggling somewhat (50-79% correct)
  - 🔴 Red: Needs immediate help (<50% correct)
- Click on student to see their responses
- View what they're currently working on

#### D. Adaptive Difficulty
- AI detects struggling students automatically
- Generates easier content for red/yellow students
- Generates harder content for green students (extension)
- Teacher can approve/reject AI suggestions

#### E. Push Content to Students
- Teacher generates content
- Reviews it
- Pushes to all students OR specific students
- Students see content appear in real-time on their screens

---

## 3. Teacher Control Features

### A. Screen Control (NEW - YOUR REQUEST)

#### **Mode 1: Lock Screen**
```
Teacher clicks "Lock All Screens"
→ All student devices show: "Teacher is presenting. Please look at the board."
→ Students cannot interact until teacher unlocks

Use case: Teacher is lecturing, doesn't want distractions
```

#### **Mode 2: Focus Mode**
```
Teacher clicks "Focus Mode"
→ Students can ONLY see the current activity
→ Can't navigate away, can't open other tabs
→ Students see: "Focus Mode Active - Complete current task"

Use case: Quiz time, prevent cheating
```

#### **Mode 3: Free Navigate (Default)**
```
Students can work at own pace
Students can navigate between activities
Teacher sees what each student is viewing

Use case: Independent work time
```

#### **Mode 4: View Student Screen (Real-Time)**
```
Teacher clicks on student name
→ Sees exactly what student sees in real-time
→ Can see if student is stuck, confused, or off-task
→ Student gets notification: "Teacher is viewing your screen"

Privacy setting: Teacher can toggle notification on/off

Use case: Check if Kevin is actually working or browsing other sites
```

#### **Mode 5: Take Over Student Screen**
```
Teacher clicks "Take Over" on student's screen
→ Teacher can draw, highlight, guide student through problem
→ Like screen sharing but teacher controls student device
→ Student sees: "Teacher is helping you"

Use case: Walk a struggling student through a problem remotely
```

### B. Control Settings (Teacher Preferences)

Teachers can set defaults per session:
- ☐ Allow students to navigate freely (default: ON)
- ☐ Notify students when screen is viewed (default: ON - privacy)
- ☐ Allow screen lock feature (default: ON)
- ☐ Auto-lock screens during presentations (default: OFF)
- ☐ Require focus mode during quizzes (default: ON)

### C. Student Privacy Dashboard
```
Students see in corner of their screen:
- 🟢 "Free mode" (can navigate)
- 🔒 "Locked by teacher"
- 👁️ "Teacher is viewing"
- ✋ "Teacher is helping"

Transparency builds trust.
```

---

## 4. Technical Architecture

### Stack Overview

```
┌─────────────────────────────────────────┐
│           FRONTEND (React)              │
│  ┌────────────┐      ┌──────────────┐  │
│  │  Teacher   │      │   Student    │  │
│  │ Dashboard  │      │   View       │  │
│  └────────────┘      └──────────────┘  │
│         │                    │          │
│         └────────┬───────────┘          │
│                  │ WebSocket            │
└──────────────────┼──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         BACKEND (Node.js)               │
│  ┌────────────────────────────────┐    │
│  │  Socket.io (Real-time sync)    │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │  Express API (REST endpoints)  │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │  AI Service (Claude API)       │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │  Analytics (Posthog)           │    │
│  └────────────────────────────────┘    │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│       DATABASE (PostgreSQL)             │
│  - Sessions                             │
│  - Students                             │
│  - Activities                           │
│  - Responses                            │
│  - AI Cache                             │
└─────────────────────────────────────────┘
```

### Technology Choices

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React + Vite + Tailwind CSS | Fast, modern, responsive |
| **Real-time** | Socket.io | Reliable WebSockets with fallbacks |
| **Backend** | Node.js + Express | Fast, good for real-time |
| **Database** | PostgreSQL | Relational data, good JSON support |
| **AI** | Claude API (Sonnet 3.5) | Best for educational content generation |
| **Analytics** | Posthog | Free tier, privacy-focused |
| **Hosting - Frontend** | Vercel | Free, auto-deploy from GitHub |
| **Hosting - Backend** | Railway | $5/month, easy PostgreSQL |
| **Auth** | JWT tokens | Simple, stateless |

---

## 5. Database Schema

### Tables

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'teacher' or 'student'
  school VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
```

#### `sessions`
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100), -- 'English', 'History', etc.
  join_code VARCHAR(8) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'ended'

  -- Control settings
  screen_lock_enabled BOOLEAN DEFAULT false,
  focus_mode_enabled BOOLEAN DEFAULT false,
  view_notification_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);
```

#### `session_students`
```sql
CREATE TABLE session_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  student_name VARCHAR(255) NOT NULL, -- No auth needed, just name
  device_type VARCHAR(50), -- 'chromebook', 'ipad', 'phone'

  -- Screen state
  current_screen_state VARCHAR(50) DEFAULT 'free', -- 'free', 'locked', 'viewing', 'takeover'
  current_activity_id UUID,

  joined_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW()
);
```

#### `activities`
```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  type VARCHAR(100) NOT NULL, -- 'reading', 'questions', 'quiz', etc.

  -- AI generation metadata
  prompt TEXT NOT NULL, -- What teacher asked for
  ai_generated BOOLEAN DEFAULT true,
  generation_time_ms INTEGER, -- How long AI took

  -- Content
  content JSONB NOT NULL, -- Flexible structure for different activity types
  difficulty_level VARCHAR(50), -- 'easy', 'medium', 'hard'

  -- Targeting
  pushed_to VARCHAR(50) DEFAULT 'all', -- 'all', 'struggling', 'advanced', 'specific'
  specific_student_ids UUID[], -- If pushed to specific students

  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `student_responses`
```sql
CREATE TABLE student_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities(id),
  student_id UUID REFERENCES session_students(id),

  -- Response data
  response JSONB NOT NULL, -- Flexible for different response types
  is_correct BOOLEAN,
  time_spent_seconds INTEGER,

  -- AI feedback
  ai_feedback TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `ai_cache`
```sql
CREATE TABLE ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash VARCHAR(64) UNIQUE NOT NULL, -- MD5 of prompt
  prompt TEXT NOT NULL,
  response JSONB NOT NULL,
  usage_count INTEGER DEFAULT 1,

  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP DEFAULT NOW()
);
```

#### `analytics_events`
```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL, -- 'session_created', 'ai_generated', etc.
  user_id UUID REFERENCES users(id),
  session_id UUID REFERENCES sessions(id),

  properties JSONB, -- Flexible event metadata

  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. API Endpoints

### Authentication

```
POST /api/auth/register
Body: { email, password, name, school }
Response: { token, user }

POST /api/auth/login
Body: { email, password }
Response: { token, user }
```

### Sessions

```
POST /api/sessions
Headers: Authorization: Bearer {token}
Body: { title, subject, settings }
Response: { session, joinCode }

GET /api/sessions/:id
Headers: Authorization: Bearer {token}
Response: { session, students, activities }

POST /api/sessions/:id/end
Headers: Authorization: Bearer {token}
Response: { success: true }

POST /api/sessions/join
Body: { joinCode, studentName, deviceType }
Response: { sessionId, studentId }
```

### AI Generation

```
POST /api/ai/generate
Headers: Authorization: Bearer {token}
Body: {
  sessionId,
  prompt,
  type, // 'reading', 'questions', 'quiz'
  difficulty, // optional
  length // optional
}
Response: { activityId, content, generationTime }

POST /api/ai/adapt
Headers: Authorization: Bearer {token}
Body: {
  activityId,
  studentId,
  direction // 'easier' or 'harder'
}
Response: { newActivityId, content }
```

### Screen Control

```
POST /api/sessions/:sessionId/screen-control
Headers: Authorization: Bearer {token}
Body: {
  action, // 'lock', 'unlock', 'focus', 'free'
  studentIds // optional, defaults to all
}
Response: { success: true }

GET /api/sessions/:sessionId/student/:studentId/screen
Headers: Authorization: Bearer {token}
Response: {
  screenState,
  currentActivity,
  lastAction,
  timestamp
}

POST /api/sessions/:sessionId/student/:studentId/takeover
Headers: Authorization: Bearer {token}
Body: { enabled: true/false }
Response: { success: true }
```

### Activities

```
POST /api/activities/:activityId/push
Headers: Authorization: Bearer {token}
Body: {
  target, // 'all', 'struggling', 'advanced', 'specific'
  studentIds // if target is 'specific'
}
Response: { success: true, pushedTo: [...] }

GET /api/sessions/:sessionId/activities
Headers: Authorization: Bearer {token}
Response: { activities: [...] }
```

### Student Responses

```
POST /api/activities/:activityId/respond
Body: { studentId, response }
Response: {
  success: true,
  isCorrect,
  feedback // AI-generated if applicable
}

GET /api/sessions/:sessionId/responses
Headers: Authorization: Bearer {token}
Response: { responses: [...], analytics: {...} }
```

### Analytics

```
GET /api/analytics/dashboard
Headers: Authorization: Bearer {token}
Query: ?period=week&teacherId={id}
Response: {
  sessionsRun,
  studentsReached,
  mostUsedFeatures,
  avgSessionLength,
  retentionMetrics
}
```

---

## 7. UI Wireframes

### Teacher Dashboard

```
┌────────────────────────────────────────────────────────────┐
│  ClassFlow AI                    [Profile] [Settings] [⚡]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  📚 Period 3 - History of Science                          │
│  Join Code: JFKD8273                    [End Session]      │
│                                                            │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │  AI Content          │  │  Students (34)           │   │
│  │  Generator           │  │                          │   │
│  │                      │  │  🟢 Sarah M.    ✓✓✓      │   │
│  │  "Generate reading   │  │  🟢 Jake T.     ✓✓✓      │   │
│  │   passage about      │  │  🟡 Tom R.      ✓✓✗  👁️  │   │
│  │   Galileo's trial"   │  │  🔴 Kevin L.    ✗✗✗  [↻] │   │
│  │                      │  │  🔴 Ashley P.   ✗✓✗      │   │
│  │  [Generate]          │  │  🟢 Maria S.    ✓✓✓      │   │
│  │                      │  │  ...                     │   │
│  │  Difficulty: [Med ▼] │  │                          │   │
│  │  Length: [500 words] │  │  [Lock Screens]          │   │
│  │                      │  │  [Focus Mode]            │   │
│  └──────────────────────┘  └──────────────────────────┘   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Generated Content Preview                         │   │
│  │                                                    │   │
│  │  "In 1633, Galileo Galilei stood trial before     │   │
│  │   the Roman Inquisition for supporting the        │   │
│  │   heliocentric model of the solar system..."      │   │
│  │                                                    │   │
│  │  Questions:                                        │   │
│  │  1. Why was Galileo put on trial?                 │   │
│  │  2. What evidence did he present?                 │   │
│  │                                                    │   │
│  │  [Edit] [Regenerate] [Push to All Students]       │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Student View

```
┌────────────────────────────────────────────────────────────┐
│  ClassFlow AI                             🟢 Free Mode      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Period 3 - History of Science                             │
│  Mrs. Rodriguez                                            │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  📖 Reading Activity                               │   │
│  │                                                    │   │
│  │  In 1633, Galileo Galilei stood trial before      │   │
│  │  the Roman Inquisition for supporting the         │   │
│  │  heliocentric model of the solar system...        │   │
│  │                                                    │   │
│  │  [Scroll to read more]                            │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  ❓ Questions                                      │   │
│  │                                                    │   │
│  │  1. Why was Galileo put on trial?                 │   │
│  │  ┌─────────────────────────────────────────────┐  │   │
│  │  │ Your answer:                                │  │   │
│  │  │                                             │  │   │
│  │  └─────────────────────────────────────────────┘  │   │
│  │  [Submit Answer]                                   │   │
│  │                                                    │   │
│  │  2. What evidence did he present?                 │   │
│  │  [Not answered yet]                                │   │
│  │                                                    │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Student View - Locked Screen

```
┌────────────────────────────────────────────────────────────┐
│  ClassFlow AI                             🔒 Locked         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                                                            │
│                                                            │
│                    🔒                                      │
│                                                            │
│          Teacher is presenting                             │
│                                                            │
│          Please look at the board                          │
│                                                            │
│                                                            │
│                                                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Student View - Teacher Viewing

```
┌────────────────────────────────────────────────────────────┐
│  ClassFlow AI                      👁️ Teacher is viewing   │
├────────────────────────────────────────────────────────────┤
│  [Rest of student view remains the same]                   │
│  ...                                                       │
└────────────────────────────────────────────────────────────┘
```

---

## 8. AI Implementation

### AI Service Architecture

```javascript
// ai-service.js

class AIService {
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY;
    this.cache = new AICache(); // PostgreSQL-backed cache
  }

  async generateContent(prompt, options = {}) {
    // Check cache first
    const cacheKey = this.generateCacheKey(prompt, options);
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      await this.cache.incrementUsage(cacheKey);
      return {
        content: cached.content,
        cached: true,
        generationTime: 0
      };
    }

    // Generate new content
    const startTime = Date.now();
    const content = await this.callClaudeAPI(prompt, options);
    const generationTime = Date.now() - startTime;

    // Cache for future use
    await this.cache.set(cacheKey, content);

    return {
      content,
      cached: false,
      generationTime
    };
  }

  async callClaudeAPI(prompt, options) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: options.maxTokens || 2000,
        messages: [{
          role: 'user',
          content: this.buildPrompt(prompt, options)
        }]
      })
    });

    const data = await response.json();
    return this.parseAIResponse(data, options.type);
  }

  buildPrompt(basePrompt, options) {
    const { type, difficulty, length, subject } = options;

    let systemContext = `You are an expert ${subject} teacher creating content for high school students. `;

    if (difficulty === 'easy') {
      systemContext += 'Use simple vocabulary and clear explanations. ';
    } else if (difficulty === 'hard') {
      systemContext += 'Use advanced vocabulary and complex concepts. ';
    }

    if (type === 'reading') {
      return `${systemContext}

Generate a reading passage about: ${basePrompt}

Requirements:
- Length: approximately ${length || 500} words
- Reading level: ${difficulty || 'medium'}
- Include specific details and examples
- Format as plain text with paragraphs

Return ONLY the reading passage, no titles or metadata.`;
    }

    if (type === 'questions') {
      return `${systemContext}

Generate comprehension questions about: ${basePrompt}

Requirements:
- Number of questions: ${options.count || 5}
- Difficulty: ${difficulty || 'medium'}
- Mix of question types (multiple choice, short answer)
- Include correct answers

Return as JSON:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct": 0
    },
    {
      "type": "short_answer",
      "question": "...",
      "sampleAnswer": "..."
    }
  ]
}`;
    }

    if (type === 'quiz') {
      return `${systemContext}

Generate a quiz based on the following content: ${basePrompt}

Requirements:
- ${options.questionCount || 10} questions
- Difficulty: ${difficulty || 'medium'}
- All multiple choice (4 options each)
- Cover main concepts from the content

Return as JSON:
{
  "quiz": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "..."
    }
  ]
}`;
    }

    // Default
    return basePrompt;
  }

  parseAIResponse(apiResponse, type) {
    const content = apiResponse.content[0].text;

    if (type === 'questions' || type === 'quiz') {
      // Parse JSON response
      try {
        return JSON.parse(content);
      } catch (e) {
        // AI didn't return valid JSON, wrap in error
        return {
          error: 'Failed to parse AI response',
          rawContent: content
        };
      }
    }

    // Plain text response
    return content;
  }

  generateCacheKey(prompt, options) {
    const crypto = require('crypto');
    const cacheString = JSON.stringify({ prompt, ...options });
    return crypto.createHash('md5').update(cacheString).digest('hex');
  }
}
```

### AI Content Types

| Type | Input | Output | Avg Tokens | Cost |
|---|---|---|---|---|
| Reading Passage | Topic, length, difficulty | Formatted text | 600-1000 | $0.01-0.02 |
| Questions | Topic/passage, count | JSON array of questions | 400-800 | $0.01 |
| Quiz | Content summary, count | JSON quiz object | 800-1500 | $0.02 |
| Adaptive Easier | Original content, student error | Simplified version | 500-800 | $0.01 |
| Adaptive Harder | Original content | Advanced version | 600-1000 | $0.015 |
| Discussion Prompts | Topic | Array of prompts | 300-500 | $0.008 |
| Primary Source Analysis | Document/topic | Guided questions | 400-700 | $0.01 |

---

## 9. Analytics & Tracking

### Events to Track

#### Teacher Events
```javascript
{
  event: 'session_created',
  properties: {
    teacherId,
    subject,
    expectedStudents
  }
}

{
  event: 'ai_content_generated',
  properties: {
    teacherId,
    sessionId,
    type,
    difficulty,
    generationTime,
    cached,
    promptLength,
    outputLength
  }
}

{
  event: 'content_pushed',
  properties: {
    teacherId,
    sessionId,
    activityId,
    targetType, // 'all', 'struggling', etc.
    studentCount
  }
}

{
  event: 'screen_control_used',
  properties: {
    teacherId,
    sessionId,
    action, // 'lock', 'unlock', 'view', 'takeover'
    studentCount
  }
}

{
  event: 'session_ended',
  properties: {
    teacherId,
    sessionId,
    duration,
    studentsJoined,
    activitiesCreated,
    responsesCollected
  }
}
```

#### Student Events
```javascript
{
  event: 'student_joined',
  properties: {
    sessionId,
    deviceType,
    joinTime
  }
}

{
  event: 'student_response',
  properties: {
    sessionId,
    activityId,
    isCorrect,
    timeSpent,
    attemptNumber
  }
}

{
  event: 'student_struggling',
  properties: {
    sessionId,
    studentId,
    activityId,
    consecutiveWrong,
    triggered: 'ai_adaptive_content'
  }
}
```

#### System Events
```javascript
{
  event: 'ai_cache_hit',
  properties: {
    promptHash,
    savedCost,
    savedTime
  }
}

{
  event: 'ai_cache_miss',
  properties: {
    promptHash,
    generationTime,
    cost
  }
}
```

### Analytics Dashboard Metrics

**For Teachers:**
- Sessions run (week/month/all-time)
- Students reached
- Most used features
- Average session length
- Content generation count
- Screen control usage frequency

**For Us (Product Analytics):**
- DAU/WAU/MAU
- Retention (D1, D7, D30)
- Feature adoption rates
- AI cost per user
- Cache hit rate (target: 40-60%)
- Session completion rate
- Avg students per session

---

## 10. Security & Privacy

### Student Data Privacy

**Compliance:**
- FERPA compliant (no PII required for MVP)
- COPPA safe (no accounts for students)
- No student emails collected
- No persistent student tracking across sessions

**Data Retention:**
- Session data: 90 days
- Student responses: 90 days (anonymized after)
- Analytics: Aggregated only, no individual student tracking

### Authentication & Authorization

**Teachers:**
- JWT-based authentication
- Password hashing with bcrypt
- Token expiration: 7 days
- Refresh token mechanism

**Students:**
- No authentication required
- Session-based access only
- Cannot access data after session ends

### Screen Control Privacy

**Safeguards:**
- Students notified when screen is viewed (default ON)
- Students can see control status (locked, viewing, takeover)
- No recording/screenshot capability
- All control actions logged for transparency
- Teachers can disable view notifications (but logged)

### API Security

- Rate limiting: 100 req/min per user
- AI generation limit (free tier): 20/day
- CORS restricted to frontend domain
- Input validation on all endpoints
- SQL injection protection (parameterized queries)

---

## 11. Week-by-Week Build Plan

### Week 1: Core Foundation

**Goals:**
- Teacher can create session
- Students can join
- Basic AI generation works
- Real-time connection established

**Tasks:**

**Day 1-2: Project Setup**
- [ ] Initialize Git repo
- [ ] Set up React frontend (Vite + Tailwind)
- [ ] Set up Node.js backend (Express + Socket.io)
- [ ] Configure PostgreSQL database
- [ ] Deploy to Railway (backend) and Vercel (frontend)
- [ ] Set up environment variables

**Day 3-4: Authentication & Sessions**
- [ ] Build teacher registration/login
- [ ] Create session creation flow
- [ ] Generate unique join codes
- [ ] Build student join flow (no auth)
- [ ] WebSocket connection for real-time sync

**Day 5-6: Basic AI Generation**
- [ ] Integrate Claude API
- [ ] Build AI service with caching
- [ ] Create "Generate Reading Passage" feature
- [ ] Create "Generate Questions" feature
- [ ] Teacher can preview AI-generated content

**Day 7: Testing & Polish**
- [ ] Test with YOU in your classroom
- [ ] Fix bugs
- [ ] Basic error handling
- [ ] Deploy Week 1 version

**Deliverable:** You can create a session, students join, you generate content (reading + questions), students see it.

---

### Week 2: Real-Time Tracking & Screen Control

**Goals:**
- Live student list with status
- Color-coded performance tracking
- Screen lock/unlock functionality
- View student screen feature

**Tasks:**

**Day 8-9: Student Tracking**
- [ ] Live student list (who's online)
- [ ] Track student responses in real-time
- [ ] Calculate performance (correct/incorrect)
- [ ] Color-code students (green/yellow/red)
- [ ] Click student to see their responses

**Day 10-11: Screen Control**
- [ ] Lock/unlock all screens feature
- [ ] Focus mode (students can only see current activity)
- [ ] Student screen shows status (locked/free)
- [ ] View student screen in real-time
- [ ] Student notification when screen viewed

**Day 12-13: Teacher Dashboard**
- [ ] Clean UI for teacher control panel
- [ ] Activity feed (what students are doing now)
- [ ] Control settings (toggle notifications, etc.)
- [ ] Quick actions (push content, lock screens)

**Day 14: Testing**
- [ ] Test with your classes
- [ ] Test screen control features
- [ ] Fix real-time sync issues
- [ ] Deploy Week 2 version

**Deliverable:** You can see live student performance, lock screens when needed, view what students are doing.

---

### Week 3: Adaptive AI & Subject-Specific Content

**Goals:**
- AI detects struggling students automatically
- AI generates easier/harder versions
- Subject-specific templates (English, History, etc.)
- Push content to specific students

**Tasks:**

**Day 15-16: Adaptive Content**
- [ ] AI analyzes student performance
- [ ] Auto-suggest easier content for struggling students
- [ ] Auto-suggest harder content for advanced students
- [ ] Teacher approves/rejects AI suggestions
- [ ] Generate adaptive versions in real-time

**Day 17-18: Subject Templates**
- [ ] English: Reading comprehension, writing prompts, literary analysis
- [ ] History: Primary source analysis, timelines, comparison charts
- [ ] History of Science: Case studies, ethical debates, thought experiments
- [ ] Pre-built prompt templates for each subject

**Day 19-20: Targeted Push**
- [ ] Push content to "all students"
- [ ] Push to "struggling students" only
- [ ] Push to "advanced students" only
- [ ] Push to specific students by name
- [ ] Students see content appear on their screen

**Day 21: Testing**
- [ ] Test adaptive features in your classroom
- [ ] Test subject-specific templates
- [ ] Gather feedback on what prompts work best
- [ ] Deploy Week 3 version

**Deliverable:** AI automatically helps struggling students, you can push different content to different groups.

---

### Week 4: Quizzes, Analytics & Polish

**Goals:**
- Auto-generate quizzes from lesson content
- Teacher analytics dashboard
- Usage tracking (Posthog integration)
- Overall polish and bug fixes

**Tasks:**

**Day 22-23: Quiz Generation**
- [ ] "Generate Quiz" button
- [ ] AI analyzes what was covered in session
- [ ] Creates 5-10 question quiz
- [ ] Multiple choice with instant feedback
- [ ] Results shown to teacher in real-time

**Day 24-25: Analytics**
- [ ] Integrate Posthog
- [ ] Track all key events (see section 9)
- [ ] Teacher analytics dashboard
- [ ] Show: sessions run, students reached, most used features
- [ ] Backend analytics for us (retention, costs, etc.)

**Day 26-27: Polish & UX**
- [ ] Improve UI/UX based on your feedback
- [ ] Mobile responsive (works on phones)
- [ ] Loading states and error messages
- [ ] Keyboard shortcuts for teacher
- [ ] Help/tutorial for first-time users

**Day 28: Final Testing & Launch**
- [ ] Full end-to-end testing
- [ ] Test with 2-3 other teachers (if possible)
- [ ] Fix critical bugs
- [ ] Write basic documentation
- [ ] Deploy production version

**Deliverable:** Full MVP ready for pilot testing with other teachers.

---

## 12. Deployment Strategy

### Infrastructure

**Frontend (Vercel):**
```
Repository: GitHub (classflow-ai-frontend)
Auto-deploy: Push to main → deploy
Custom domain: app.classflow.ai (later)
Environment: Production
Cost: $0 (free tier)
```

**Backend (Railway):**
```
Repository: GitHub (classflow-ai-backend)
Services:
  - Node.js API (PORT 3000)
  - PostgreSQL database
  - Redis (for Socket.io - if needed)
Auto-deploy: Push to main → deploy
Environment variables:
  - DATABASE_URL
  - CLAUDE_API_KEY
  - JWT_SECRET
  - POSTHOG_KEY
Cost: $5-20/month (scales with usage)
```

### Environment Variables

**Frontend (.env.production):**
```
VITE_API_URL=https://api.classflow.ai
VITE_WS_URL=wss://api.classflow.ai
VITE_POSTHOG_KEY=...
```

**Backend (.env):**
```
DATABASE_URL=postgresql://...
CLAUDE_API_KEY=sk-ant-...
JWT_SECRET=...
POSTHOG_KEY=...
ALLOWED_ORIGINS=https://app.classflow.ai
NODE_ENV=production
```

### Deployment Checklist

**Before Each Deploy:**
- [ ] Run tests locally
- [ ] Check database migrations
- [ ] Update environment variables if needed
- [ ] Test on staging environment (if exists)
- [ ] Deploy backend first, then frontend
- [ ] Monitor error logs for 1 hour post-deploy

### Monitoring

**Tools:**
- Railway logs (backend errors)
- Vercel logs (frontend errors)
- Posthog (user analytics)
- PostgreSQL query performance
- Claude API usage dashboard

**Alerts:**
- Server down (99% uptime target)
- High AI costs (>$100/day)
- Database connection errors
- WebSocket disconnections

---

## 13. Pricing Model

### Free Tier
**Price:** $0

**Limits:**
- 20 AI generations per day
- 1 active session at a time
- Up to 35 students per session
- 90-day data retention
- Basic analytics

**Target:** Get teachers hooked, validate product

---

### Pro Tier
**Price:** $25/month

**Features:**
- Unlimited AI generations
- Unlimited sessions
- Unlimited students
- Save and reuse content library
- Export to Google Classroom/Canvas
- 1-year data retention
- Advanced analytics
- Priority support

**Target:** Teachers who use it daily (3+ times/week)

---

### School Tier
**Price:** $2,500/year (negotiable)

**Features:**
- 20 teachers included (unlimited students)
- All Pro features for each teacher
- Admin dashboard (see all teachers' usage)
- District-level analytics
- Pooled AI credits (fair usage)
- Custom branding (later)
- Dedicated support
- Training sessions for teachers

**Target:** Schools/districts adopting at scale

---

### Revenue Projections

**Month 1-2 (MVP + Pilot):**
- Users: 1-5 teachers (free)
- Revenue: $0
- Costs: $50-100 (AI + hosting)
- NET: -$100

**Month 3-6 (Early Launch):**
- Users: 50 teachers (15 paid)
- Revenue: $375/month
- Costs: $300 (AI + hosting)
- NET: +$75/month (barely break-even)

**Month 7-12 (Growth):**
- Users: 200 teachers (60 paid) + 2 schools
- Revenue: $1,500 + $417 = $1,917/month
- Costs: $1,200 (AI + hosting)
- NET: +$717/month

**Year 2 Goal:**
- Users: 1,000 teachers (300 paid) + 20 schools
- Revenue: $7,500 + $4,167 = $11,667/month
- Costs: $6,000 (AI + hosting + 1 contractor)
- NET: +$5,667/month = $68k/year profit

**Exit Scenario (18-24 months):**
- 5,000 active teachers
- 100 school districts
- $50-100k ARR
- Sell to EdTech company for 3-5x revenue = $150-500k

---

## Next Steps

1. **Review this spec** - Any changes needed?
2. **Approve to proceed** - I start building Week 1
3. **Set up accounts:**
   - GitHub account (if you don't have one)
   - Claude API key (I can help)
   - Posthog account (free)
4. **Testing schedule** - Which class periods can you test in?

---

## Questions for You

1. What should we name it? (ClassFlow AI is placeholder)
2. Do you have a school email? (For testing with colleagues)
3. Any specific features I missed that you NEED for your classroom?
4. Timeline: Can we start Week 1 immediately?

---

**End of Technical Specification**

*Version 1.0 - Ready for development pending approval*
