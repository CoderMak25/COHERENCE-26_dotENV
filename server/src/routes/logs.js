import { Router } from 'express'
import Log from '../models/Log.js'

const router = Router()

router.get('/', async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query
        const filter = status && status !== 'ALL' ? { status } : {}

        const total = await Log.countDocuments(filter)
        const data = await Log.find(filter)
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))

        res.json({
            data,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

export default router
