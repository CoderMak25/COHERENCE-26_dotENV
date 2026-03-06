import { Router } from 'express'
import * as auth from '../controllers/authController.js'

const router = Router()

// OAuth flow
router.get('/google', auth.startGoogleAuth)
router.get('/google/callback', auth.googleCallback)

// Gmail connection management
router.get('/gmail/status', auth.gmailStatus)
router.post('/gmail/disconnect', auth.gmailDisconnect)

export default router
