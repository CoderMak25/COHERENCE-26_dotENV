import { Router } from 'express'
import Log from '../models/Log.js'

const router = Router()

router.get('/', async (req, res) => {
    try {
        const { status, page = 1, limit = 50, search, startDate, endDate } = req.query
        const filter = {}

        if (status && status !== 'ALL') {
            filter.status = status
        }

        if (startDate || endDate) {
            filter.createdAt = {}
            if (startDate) filter.createdAt.$gte = new Date(startDate)
            if (endDate) filter.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999))
        }

        if (search) {
            const regex = new RegExp(search, 'i')
            filter.$or = [
                { leadName: regex },
                { detail: regex },
                { action: regex }
            ]
        }

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
