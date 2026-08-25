// v2.0.0 - Cut down to the speaking core: auth, sessions, reverse tutoring.
// Everything else was unmounted (see /LEGACY.md). Database tables are untouched.
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Import routes (kept)
import authRoutes from './routes/auth.js'
import sessionRoutes from './routes/sessions.js'
import reverseTutoringRoutes from './routes/reverseTutoring.js'
import subjectsStandardsRoutes from './routes/subjectsStandards.js'
import speakingRoutes from './routes/speaking.js'
import { loadPacks } from './services/packService.js'

// Validate speaking packs before accepting traffic (fails fast on a bad pack)
loadPacks()

// Import socket handler
import { setupSocketIO } from './services/socketService.js'
import { setIO } from './services/ioInstance.js'

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://classflow-ai-frontend.onrender.com',
  'https://classflow-ai.onrender.com'
]

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
})

// CORS configuration
const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// Handle preflight requests
app.options('*', cors(corsOptions))

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`)
  next()
})

// Health check
app.get('/health', async (req, res) => {
  try {
    const { default: db } = await import('./database/db.js')
    await db.query('SELECT 1')
    const connectedSockets = await io.fetchSockets()

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      websocket: {
        status: 'running',
        connectedClients: connectedSockets.length
      },
      env: {
        claudeApiKey: process.env.CLAUDE_API_KEY ? 'set' : 'missing',
        openaiApiKey: process.env.OPENAI_API_KEY ? 'set' : 'missing',
        nodeEnv: process.env.NODE_ENV,
        frontendUrl: process.env.FRONTEND_URL
      }
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/reverse-tutoring', reverseTutoringRoutes)
app.use('/api/subjects', subjectsStandardsRoutes)
app.use('/api/standards', subjectsStandardsRoutes)
app.use('/api/speaking', speakingRoutes)

// Setup WebSocket (presence only)
setIO(io)
setupSocketIO(io)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

const PORT = process.env.PORT || 3000

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`)
  console.log(`🔌 WebSocket ready`)
})

export { io }
