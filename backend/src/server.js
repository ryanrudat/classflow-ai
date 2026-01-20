// v1.2.0 - Removed slides/presentation feature
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

// Load environment variables
dotenv.config()

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../public/uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log('✅ Created uploads directory:', uploadsDir)
}

// Import routes
import authRoutes from './routes/auth.js'
import sessionRoutes from './routes/sessions.js'
import aiRoutes from './routes/ai.js'
import activityRoutes from './routes/activities.js'
import analyticsRoutes from './routes/analytics.js'
import uploadRoutes from './routes/upload.js'
import studentHelpRoutes from './routes/studentHelp.js'
import studentRoutes from './routes/students.js'
import reverseTutoringRoutes from './routes/reverseTutoring.js'
import subjectsStandardsRoutes from './routes/subjectsStandards.js'
import collaborationRoutes from './routes/collaboration.js'
import googleClassroomRoutes from './routes/googleClassroom.js'
import libraryRoutes from './routes/library.js'
import documentRoutes from './routes/documents.js'
import videoRoutes from './routes/videos.js'
import mediaRoutes from './routes/media.js'
import interactiveVideoRoutes from './routes/interactiveVideo.js'
import matchingRoutes from './routes/matching.js'
import pollRoutes from './routes/poll.js'
import lessonFlowRoutes from './routes/lessonFlow.js'
import learningWorldsRoutes from './routes/learningWorlds.js'

// Import socket handler
import { setupSocketIO } from './services/socketService.js'
import { setIO } from './services/ioInstance.js'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'https://classflow-ai-frontend.onrender.com',
      'https://classflow-ai.onrender.com'
    ],
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
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://classflow-ai-frontend.onrender.com',
    'https://classflow-ai.onrender.com'
  ],
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

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')))

// Health check
app.get('/health', async (req, res) => {
  try {
    // Import db
    const { default: db } = await import('./database/db.js')

    // Check database connection
    await db.query('SELECT 1')

    // Check library tables
    const libraryTablesResult = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('content_library', 'library_tags', 'library_activity_tags')
      ORDER BY table_name
    `)

    const existingLibraryTables = libraryTablesResult.rows.map(r => r.table_name)
    const requiredLibraryTables = ['content_library', 'library_activity_tags', 'library_tags']
    const missingLibraryTables = requiredLibraryTables.filter(t => !existingLibraryTables.includes(t))

    // Get WebSocket connection count
    const connectedSockets = await io.fetchSockets()

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      websocket: {
        status: 'running',
        connectedClients: connectedSockets.length
      },
      libraryTables: {
        existing: existingLibraryTables,
        missing: missingLibraryTables.length > 0 ? missingLibraryTables : null,
        ready: missingLibraryTables.length === 0
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
app.use('/api/ai', aiRoutes)
app.use('/api/activities', activityRoutes)
app.use('/api', analyticsRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/student-help', studentHelpRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/reverse-tutoring', reverseTutoringRoutes)
app.use('/api/subjects', subjectsStandardsRoutes)
app.use('/api/standards', subjectsStandardsRoutes)
app.use('/api/collaboration', collaborationRoutes)
app.use('/api/google', googleClassroomRoutes)
app.use('/api/library', libraryRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/videos', videoRoutes)
app.use('/api/media', mediaRoutes)
app.use('/api', interactiveVideoRoutes)
app.use('/api', matchingRoutes)
app.use('/api', pollRoutes)
app.use('/api', lessonFlowRoutes)
app.use('/api', learningWorldsRoutes)

// Setup WebSocket
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
