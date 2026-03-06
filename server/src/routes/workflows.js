import { Router } from 'express'
import * as wc from '../controllers/workflowController.js'

const router = Router()

router.get('/', wc.getWorkflows)
router.get('/:id', wc.getOneWorkflow)
router.post('/', wc.saveWorkflow)
router.put('/:id', wc.updateWorkflow)
router.post('/:id/execute', wc.executeWorkflow)
router.delete('/:id', wc.deleteWorkflow)

export default router
