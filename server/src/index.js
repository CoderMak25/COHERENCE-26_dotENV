import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { connectDB } from './config/db.js'
import leadsRouter from './routes/leads.js'
import campaignsRouter from './routes/campaigns.js'
import workflowsRouter from './routes/workflows.js'
import aiRouter from './routes/ai.js'
import logsRouter from './routes/logs.js'
import { errorHandler } from './middleware/errorHandler.js'
import './queues/workers/outreachWorker.js'

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(helmet())
app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/leads', leadsRouter)
app.use('/api/campaigns', campaignsRouter)
app.use('/api/workflows', workflowsRouter)
app.use('/api/ai', aiRouter)
app.use('/api/logs', logsRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Error handler (must be last)
app.use(errorHandler)

// Start
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
})
