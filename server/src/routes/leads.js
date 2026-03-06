import { Router } from 'express'
import { upload } from '../middleware/upload.js'
import * as lc from '../controllers/leadController.js'

const router = Router()

// Dashboard stats — must be before :id routes
router.get('/dashboard/stats', lc.getDashboardStats)

router.get('/', lc.getLeads)
router.get('/:id', lc.getOneLead)
router.get('/:id/history', lc.getLeadHistory)
router.post('/', lc.createLead)
router.post('/import', upload.single('file'), lc.importLeads)
router.post('/:id/takeover', lc.takeOverLead)
router.post('/:id/pause', lc.pauseLead)
router.post('/:id/resume', lc.resumeLead)
router.put('/:id', lc.updateLead)
router.delete('/bulk', lc.bulkDeleteLeads)
router.delete('/:id', lc.deleteLead)

export default router
