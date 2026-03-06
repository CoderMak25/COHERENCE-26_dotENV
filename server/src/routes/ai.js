import { Router } from 'express'
import { generateAIMessage } from '../controllers/aiController.js'

const router = Router()

router.post('/generate', generateAIMessage)

export default router
