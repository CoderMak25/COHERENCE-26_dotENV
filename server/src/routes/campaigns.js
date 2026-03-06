import { Router } from 'express'
import * as cc from '../controllers/campaignController.js'

const router = Router()

router.get('/', cc.getCampaigns)
router.get('/stats', cc.getCampaignStats)
router.get('/analytics', cc.getCampaignAnalytics)
router.get('/:id', cc.getOneCampaign)
router.post('/', cc.createCampaign)
router.put('/:id', cc.updateCampaign)
router.post('/:id/run', cc.runCampaign)
router.post('/:id/pause', cc.pauseCampaign)
router.delete('/:id', cc.deleteCampaign)

export default router
