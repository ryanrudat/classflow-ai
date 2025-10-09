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
import slidesRoutes from './routes/slides.js'
import uploadRoutes from './routes/upload.js'
import presentationRoutes from './routes/presentation.js'

// Import socket handler
import { setupSocketIO } from './services/socketService.js'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}))
app.use(express.json())

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/activities', activityRoutes)
app.use('/api', analyticsRoutes)
app.use('/api/slides', slidesRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/presentation', presentationRoutes)

// Setup WebSocket
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
