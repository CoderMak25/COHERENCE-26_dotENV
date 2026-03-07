import { Router } from 'express'
import { generateAIMessage, generateWorkflow } from '../controllers/aiController.js'

const router = Router()

router.post('/generate', generateAIMessage)
router.post('/generate-workflow', generateWorkflow)

export default router
