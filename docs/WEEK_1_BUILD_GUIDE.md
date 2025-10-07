# Week 1 Build Guide - ClassFlow AI

**Goal:** By end of Week 1, you'll have a working MVP where:
- Teachers can register/login
- Teachers can create a session with join code
- Students can join with the code
- Teachers can generate basic AI content (reading passages + questions)
- Content is pushed to all students in real-time

---

## Prerequisites

### 1. Install Dependencies

**Frontend:**
```bash
cd ~/classflow-ai/frontend
npm install
```

**Backend:**
```bash
cd ~/classflow-ai/backend
npm install
```

### 2. Set Up Database

**Option A: Local PostgreSQL** (recommended for development)
```bash
# Install PostgreSQL (if not installed)
# Mac: brew install postgresql
# Then start it: brew services start postgresql

# Create database
createdb classflow_ai

# Run schema
psql classflow_ai < ../database/schema.sql
```

**Option B: Railway** (cloud database - easier but costs money)
- Go to railway.app
- Create new project
- Add PostgreSQL
- Copy DATABASE_URL
- Run schema using Railway's psql web interface

### 3. Environment Variables

**Backend (.env):**
```bash
cd ~/classflow-ai/backend
cp .env.example .env
```

Edit `.env`:
```
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/classflow_ai
JWT_SECRET=your-random-secret-here-make-it-long
CLAUDE_API_KEY=sk-ant-YOUR-KEY-HERE
FRONTEND_URL=http://localhost:5173
```

**Frontend (.env):**
```bash
cd ~/classflow-ai/frontend
cp .env.example .env
```

Edit `.env`:
```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

---

## Day 1-2: Authentication System

### Task 1.1: Build Auth Controller (Backend)

**Open in Windsurf:** `backend/src/controllers/authController.js` (create new file)

**Tell Windsurf:**
```
Create an authentication controller with:
- register function: accepts {name, email, password, school}, hashes password with bcrypt, saves to users table, returns user + JWT token
- login function: accepts {email, password}, verifies password, returns user + JWT token
- Use the users table from schema.sql
- Import db from '../database/db.js'
- Import bcrypt and jsonwebtoken
- JWT should expire in 7 days
- Don't return password_hash in user object
```

**Windsurf will generate code like:**
```javascript
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db from '../database/db.js'

export async function register(req, res) {
  try {
    const { name, email, password, school } = req.body

    // Check if user exists
    const existing = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    // Insert user
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, school) VALUES ($1, $2, $3, $4) RETURNING id, name, email, school, created_at',
      [name, email, password_hash, school]
    )

    const user = result.rows[0]

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ user, token })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Registration failed' })
  }
}

export async function login(req, res) {
  // Similar implementation...
}
```

### Task 1.2: Connect Routes to Controller

**Open:** `backend/src/routes/auth.js`

**Tell Windsurf:**
```
Update this file to import authController and connect routes to the register and login functions
```

**Result should be:**
```javascript
import express from 'express'
import { register, login } from '../controllers/authController.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)

export default router
```

### Task 1.3: Test Authentication

**Start the backend:**
```bash
cd ~/classflow-ai/backend
npm run dev
```

**Test with curl:**
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Teacher","email":"test@test.com","password":"password123","school":"Test School"}'

# Should return: {"user":{...},"token":"jwt-token-here"}

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
```

**✅ Checkpoint:** You should be able to register and login via API

---

## Day 3-4: Session Creation & Join Flow

### Task 2.1: Generate Join Codes

**Create:** `backend/src/utils/generateCode.js`

**Tell Windsurf:**
```
Create a function that generates a random 8-character alphanumeric join code (uppercase letters and numbers only, no confusing characters like O/0, I/1)
```

### Task 2.2: Session Controller

**Create:** `backend/src/controllers/sessionController.js`

**Tell Windsurf:**
```
Create session controller with these functions:

createSession:
- Accepts {title, subject} from authenticated teacher
- Generates unique join code
- Creates session in sessions table
- Returns session object with join code

getSession:
- Gets session by ID
- Returns session with list of students who joined
- Include activities created in this session

endSession:
- Marks session as ended
- Sets ended_at timestamp

joinSession:
- Accepts {joinCode, studentName, deviceType}
- No authentication needed
- Finds session by join code
- Adds student to session_students table
- Returns sessionId and studentId
```

### Task 2.3: Auth Middleware

**Create:** `backend/src/middleware/auth.js`

**Tell Windsurf:**
```
Create JWT authentication middleware that:
- Checks Authorization header for "Bearer <token>"
- Verifies JWT token
- Attaches user info to req.user
- Returns 401 if token invalid
```

### Task 2.4: Update Session Routes

**Update:** `backend/src/routes/sessions.js`

**Tell Windsurf:**
```
Import sessionController and auth middleware
Connect routes:
- POST / -> createSession (protected with auth middleware)
- GET /:id -> getSession (protected)
- POST /:id/end -> endSession (protected)
- POST /join -> joinSession (NOT protected - students don't have accounts)
```

### Task 2.5: Test Sessions

```bash
# Create session (need token from login)
TOKEN="your-jwt-token-from-login"

curl -X POST http://localhost:3000/api/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Period 3 - English","subject":"English"}'

# Should return: {"id":"uuid","joinCode":"ABC123XY",...}

# Join as student (no auth needed)
curl -X POST http://localhost:3000/api/sessions/join \
  -H "Content-Type: application/json" \
  -d '{"joinCode":"ABC123XY","studentName":"John Doe","deviceType":"chromebook"}'
```

**✅ Checkpoint:** Teachers can create sessions, students can join with code

---

## Day 5-6: AI Content Generation

### Task 3.1: AI Service

**Create:** `backend/src/services/aiService.js`

**Tell Windsurf:**
```
Create an AI service using Anthropic's Claude API with these functions:

generateContent(prompt, options):
- options includes: type, difficulty, length, subject
- First check ai_cache table for existing content (hash the prompt+options)
- If cached, return cached content
- If not cached, call Claude API
- Save response to ai_cache
- Return content + metadata (cached: true/false, generationTime)

generateReading(topic, subject, difficulty, length):
- Builds prompt for reading passage
- Calls Claude to generate educational content
- Returns formatted text

generateQuestions(topic, subject, difficulty, count):
- Builds prompt for comprehension questions
- Calls Claude to generate questions as JSON
- Returns array of questions

Use @anthropic-ai/sdk package
Model: claude-3-5-sonnet-20241022
```

**Example structure:**
```javascript
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'
import db from '../database/db.js'

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
})

export async function generateContent(prompt, options = {}) {
  // Generate cache key
  const cacheKey = crypto
    .createHash('md5')
    .update(JSON.stringify({ prompt, options }))
    .digest('hex')

  // Check cache
  const cached = await db.query(
    'SELECT * FROM ai_cache WHERE prompt_hash = $1',
    [cacheKey]
  )

  if (cached.rows.length > 0) {
    // Update usage count
    await db.query(
      'UPDATE ai_cache SET usage_count = usage_count + 1, last_used = NOW() WHERE prompt_hash = $1',
      [cacheKey]
    )

    return {
      content: cached.rows[0].response,
      cached: true,
      generationTime: 0
    }
  }

  // Generate new content
  const startTime = Date.now()

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: options.maxTokens || 2000,
    messages: [{
      role: 'user',
      content: buildPrompt(prompt, options)
    }]
  })

  const content = message.content[0].text
  const generationTime = Date.now() - startTime

  // Cache it
  await db.query(
    'INSERT INTO ai_cache (prompt_hash, prompt, response) VALUES ($1, $2, $3)',
    [cacheKey, prompt, content]
  )

  return {
    content,
    cached: false,
    generationTime
  }
}

function buildPrompt(basePrompt, options) {
  // Construct detailed prompt based on type, subject, difficulty
  // ... implementation
}

export async function generateReading(topic, subject, difficulty = 'medium', length = 500) {
  // ... implementation
}

export async function generateQuestions(topic, subject, difficulty = 'medium', count = 5) {
  // ... implementation
}
```

### Task 3.2: AI Controller

**Create:** `backend/src/controllers/aiController.js`

**Tell Windsurf:**
```
Create AI controller with:

generate function:
- Accepts {sessionId, prompt, type, difficulty, length, subject}
- Calls appropriate aiService function based on type
- Saves activity to activities table
- Returns activity with generated content

Use the activities table from schema.sql
```

### Task 3.3: Update AI Routes

**Update:** `backend/src/routes/ai.js`

```
Import aiController and auth middleware
Connect:
- POST /generate -> aiController.generate (protected)
```

### Task 3.4: Test AI Generation

```bash
curl -X POST http://localhost:3000/api/ai/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id",
    "prompt": "Galileo galilei trial",
    "type": "reading",
    "difficulty": "medium",
    "length": 500,
    "subject": "History"
  }'

# Should return generated reading passage
```

**✅ Checkpoint:** AI can generate reading passages and questions

---

## Day 7: Frontend Integration & Testing

### Task 4.1: Build Teacher Dashboard

**Update:** `frontend/src/pages/TeacherDashboard.jsx`

**Tell Windsurf:**
```
Create a teacher dashboard with:
- Button to create new session (opens modal)
- Modal asks for: session title, subject (dropdown: English, History, Social Studies, Government, Biology)
- On create, call sessionsAPI.create()
- Display created session with join code prominently
- Section for AI content generation:
  - Text input for prompt
  - Dropdown for type (reading, questions)
  - Dropdown for difficulty (easy, medium, hard)
  - Generate button
- Display generated content in preview area
- Use Tailwind CSS for styling
- Show loading states
```

### Task 4.2: Build Student Join Flow

**Update:** `frontend/src/pages/StudentView.jsx`

**Tell Windsurf:**
```
Create student view that:
- If no join code in URL, show join form (asks for code + student name)
- On join, calls sessionsAPI.join()
- After joining, shows "Waiting for teacher..."
- Will later show activities pushed by teacher

Use react-router-dom to get joinCode from URL params
```

### Task 4.3: Add WebSocket Connection

**Create:** `frontend/src/services/socket.js`

**Tell Windsurf:**
```
Create WebSocket service using socket.io-client:
- Connect to backend WebSocket
- Export functions: joinSession(sessionId), onActivityPushed(callback)
- Handle connection/disconnection
```

### Task 4.4: Full End-to-End Test

**Start both servers:**
```bash
# Terminal 1: Backend
cd ~/classflow-ai/backend
npm run dev

# Terminal 2: Frontend
cd ~/classflow-ai/frontend
npm run dev
```

**Test Flow:**
1. Open http://localhost:5173
2. Register new teacher account
3. Login
4. Create new session
5. Copy join code
6. Open incognito window: http://localhost:5173
7. Join as student with code
8. Back in teacher view, generate reading passage
9. (Week 2 will add pushing content to students)

**✅ Week 1 Complete when:**
- ✅ Teachers can register/login
- ✅ Teachers can create sessions
- ✅ Students can join sessions
- ✅ AI can generate content
- ✅ Teacher can see generated content

---

## Troubleshooting

### Database Connection Errors
```bash
# Check if PostgreSQL is running
pg_isready

# If not, start it
brew services start postgresql
```

### Claude API Errors
- Check your API key in `.env`
- Verify you have credits: https://console.anthropic.com/

### CORS Errors
- Make sure FRONTEND_URL in backend .env matches frontend URL
- Check backend is running on port 3000
- Check frontend is running on port 5173

### "Module not found" Errors
- Run `npm install` in both frontend and backend
- Make sure you're using Node.js v18 or higher: `node --version`

---

## Next Steps

After completing Week 1, move to **Week 2: Real-Time Tracking & Screen Control**

Week 2 adds:
- WebSocket real-time sync
- Push content to students
- Live student list with status
- Screen control features
