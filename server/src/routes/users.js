import { Router } from 'express'
import { getProfile, updateProfile, updateSettings } from '../controllers/userController.js'

const router = Router()

router.get('/profile', getProfile)
router.put('/profile', updateProfile)
router.put('/settings', updateSettings)

export default router
