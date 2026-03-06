import { Router } from 'express'
import Lead from '../models/Lead.js'
import Log from '../models/Log.js'

const router = Router()

router.get('/stats', async (req, res) => {
    try {
        // --- Lead counts by status ---
        const totalLeads = await Lead.countDocuments()
        const statusCounts = await Lead.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ])
        const statusMap = {}
        statusCounts.forEach(s => { statusMap[s._id || 'Unknown'] = s.count })

        // --- Log counts by status ---
        const totalLogs = await Log.countDocuments()
        const logStatusCounts = await Log.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ])
        const logStatusMap = {}
        logStatusCounts.forEach(s => { logStatusMap[s._id || 'Unknown'] = s.count })

        // --- Logs per day for chart (last 7 days) ---
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const dailyLogs = await Log.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dayOfWeek: '$createdAt' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ])
        // dayOfWeek: 1=Sun, 2=Mon, ..., 7=Sat
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
        const chartData = dayNames.map((name, i) => {
            const entry = dailyLogs.find(d => d._id === i + 1)
            return { name, value: entry ? entry.count : 0 }
        })
        // Reorder to MON-SUN
        const reordered = [...chartData.slice(1), chartData[0]]

        // --- Top 5 recent leads with activity ---
        const topLeads = await Lead.find()
            .sort({ updatedAt: -1 })
            .limit(5)
            .lean()

        // --- Recent logs for live feed ---
        const recentLogs = await Log.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .lean()

        // --- Workflows count ---
        const workflowCounts = await Lead.aggregate([
            { $match: { workflow: { $ne: null } } },
            { $group: { _id: '$workflow', count: { $sum: 1 } } }
        ])

        res.json({
            totalLeads,
            statusMap,
            totalLogs,
            logStatusMap,
            chartData: reordered,
            topLeads,
            recentLogs,
            workflowCounts,
            pipeline: {
                total: totalLeads,
                contacted: statusMap['Contacted'] || 0,
                opened: statusMap['Opened'] || 0,
                replied: statusMap['Replied'] || 0,
                converted: statusMap['Converted'] || 0,
                new: statusMap['New'] || 0,
            }
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

export default router
