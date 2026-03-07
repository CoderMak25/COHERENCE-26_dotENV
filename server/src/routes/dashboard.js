import { Router } from 'express'
import Lead from '../models/Lead.js'
import Log from '../models/Log.js'
import Workflow from '../models/Workflow.js'

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
            .sort({ score: -1, updatedAt: -1 })
            .limit(5)
            .lean()

        // --- Recent logs for live feed ---
        const recentLogs = await Log.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .lean()

        // --- All saved workflows ---
        const allWorkflows = await Workflow.find().lean()
        const workflowCounts = allWorkflows.map(wf => ({
            id: wf._id,
            name: wf.name || 'Untitled',
            count: wf.assignedLeads?.length || 0,
            status: wf.status || 'Draft',
            active: wf.status === 'Active',
            nodeCount: wf.nodes?.length || 0,
        }))

        // --- Lead scoring stats (4-tier) ---
        const scoringAgg = await Lead.aggregate([
            {
                $group: {
                    _id: null,
                    avgScore: { $avg: '$score' },
                    hot: { $sum: { $cond: [{ $gte: ['$score', 81] }, 1, 0] } },
                    qualified: { $sum: { $cond: [{ $and: [{ $gte: ['$score', 61] }, { $lt: ['$score', 81] }] }, 1, 0] } },
                    warm: { $sum: { $cond: [{ $and: [{ $gte: ['$score', 31] }, { $lt: ['$score', 61] }] }, 1, 0] } },
                    cold: { $sum: { $cond: [{ $lt: ['$score', 31] }, 1, 0] } },
                }
            }
        ])
        const scoring = scoringAgg[0] || { avgScore: 0, hot: 0, qualified: 0, warm: 0, cold: 0 }

        res.json({
            totalLeads,
            statusMap,
            totalLogs,
            logStatusMap,
            chartData: reordered,
            topLeads,
            recentLogs,
            workflowCounts,
            scoring: {
                hot: scoring.hot,
                qualified: scoring.qualified,
                warm: scoring.warm,
                cold: scoring.cold,
                avgScore: Math.round(scoring.avgScore || 0)
            },
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
