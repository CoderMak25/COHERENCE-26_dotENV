import { Router } from 'express'
import { upload } from '../middleware/upload.js'
import * as lc from '../controllers/leadController.js'

const router = Router()

router.get('/', lc.getLeads)
router.get('/:id', lc.getOneLead)
router.post('/', lc.createLead)
router.post('/import', upload.single('file'), lc.importLeads)
router.put('/:id', lc.updateLead)
router.delete('/bulk', lc.bulkDeleteLeads)
router.delete('/:id', lc.deleteLead)

export default router
