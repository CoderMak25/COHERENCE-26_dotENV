/**
 * Voice Agent Routes
 *
 * All routes are PUBLIC (no auth middleware) so leads can access
 * the voice page via outreach links without logging in.
 */

import { Router } from 'express'
import multer from 'multer'
import Lead from '../models/Lead.js'
import Conversation from '../models/Conversation.js'
import { startSession, processMessage, endSession, getActiveSessionCount } from '../services/voiceAgentService.js'

const router = Router()

// Multer — accept audio as raw buffer in memory
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
})

/**
 * GET /api/voice/lead/:leadId
 * Load lead context for the voice page (public, no auth).
 */
router.get('/lead/:leadId', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.leadId).lean()
        if (!lead) return res.status(404).json({ error: 'Lead not found' })

        res.json({
            name: lead.name,
            company: lead.company || '',
            position: lead.position || '',
            industry: lead.industry || (lead.tags && lead.tags[0]) || '',
            score: lead.score || 0,
            scoreLabel: lead.scoreLabel || 'COLD'
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

/**
 * POST /api/voice/start
 * Start a voice session. Body: { leadId, language }
 * Returns greeting text + audio.
 */
router.post('/start', async (req, res) => {
    try {
        const { leadId, language } = req.body
        if (!leadId) return res.status(400).json({ error: 'leadId is required' })

        const result = await startSession(leadId, language)
        res.json(result)
    } catch (err) {
        console.error('[VoiceRoute] /start error:', err.message)
        res.status(500).json({ error: err.message })
    }
})

/**
 * POST /api/voice/message
 * Send audio, get AI response + audio.
 * Body: multipart form-data with 'audio' file + 'sessionId' + 'language' fields.
 */
router.post('/message', upload.single('audio'), async (req, res) => {
    try {
        const { sessionId, language } = req.body
        if (!sessionId) return res.status(400).json({ error: 'sessionId is required' })

        const audioBuffer = req.file ? req.file.buffer : null
        if (!audioBuffer || audioBuffer.length === 0) {
            return res.status(400).json({ error: 'Audio file is required' })
        }

        const result = await processMessage(sessionId, audioBuffer, language)
        res.json(result)
    } catch (err) {
        console.error('[VoiceRoute] /message error:', err.message)
        res.status(500).json({ error: err.message })
    }
})

/**
 * POST /api/voice/end
 * End a voice session. Body: { sessionId }
 * Returns analysis + updated score.
 */
router.post('/end', async (req, res) => {
    try {
        const { sessionId } = req.body
        if (!sessionId) return res.status(400).json({ error: 'sessionId is required' })

        const result = await endSession(sessionId)
        res.json(result)
    } catch (err) {
        console.error('[VoiceRoute] /end error:', err.message)
        res.status(500).json({ error: err.message })
    }
})

/**
 * GET /api/voice/conversations/all
 * Get all conversations across all leads for the Voice Logs dashboard.
 * Requires auth in a real app, but currently public for demo purposes.
 */
router.get('/conversations/all', async (req, res) => {
    try {
        const conversations = await Conversation.find()
            .populate('leadId', 'name company position score')
            .sort({ createdAt: -1 })
            .lean()
        res.json(conversations)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

/**
 * GET /api/voice/conversations/:leadId
 * Get past conversations for a lead.
 */
router.get('/conversations/:leadId', async (req, res) => {
    try {
        const conversations = await Conversation.find({ leadId: req.params.leadId })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean()
        res.json(conversations)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

/**
 * GET /api/voice/health
 * Health check for voice system.
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        activeSessions: getActiveSessionCount(),
        sarvamConfigured: Boolean(process.env.SARVAM_API_KEY)
    })
})

export default router
