import Campaign from '../models/Campaign.js'
import Lead from '../models/Lead.js'
import Log from '../models/Log.js'
import { outreachQueue } from '../queues/outreachQueue.js'

// GET /api/campaigns
export const getCampaigns = async (req, res, next) => {
    try {
        const campaigns = await Campaign.find().sort({ createdAt: -1 })
        res.json({ data: campaigns })
    } catch (err) {
        next(err)
    }
}

// GET /api/campaigns/stats
export const getCampaignStats = async (req, res, next) => {
    try {
        const totalLeads = await Lead.countDocuments()
        const campaigns = await Campaign.find()

        let totalSent = 0
        let totalOpened = 0
        let totalReplied = 0

        campaigns.forEach(c => {
            totalSent += c.stats.sent || 0
            totalOpened += c.stats.opened || 0
            totalReplied += c.stats.replied || 0
        })

        const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0
        const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : 0

        // Weekly data from logs
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const weeklyLogs = await Log.aggregate([
            { $match: { createdAt: { $gte: weekAgo } } },
            {
                $group: {
                    _id: { $dayOfWeek: '$createdAt' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ])

        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
        const weeklyData = dayNames.map((name, i) => {
            const found = weeklyLogs.find(l => l._id === i + 1)
            return { name, value: found ? found.count : 0 }
        })

        res.json({
            totalLeads,
            totalSent,
            openRate: Number(openRate),
            replyRate: Number(replyRate),
            weeklyData
        })
    } catch (err) {
        next(err)
    }
}

// GET /api/campaigns/analytics
export const getCampaignAnalytics = async (req, res, next) => {
    try {
        const campaigns = await Campaign.find()

        const barData = campaigns.slice(0, 7).map(c => ({
            name: c.name.substring(0, 10),
            sent: c.stats.sent || 0,
            opened: c.stats.opened || 0,
            replied: c.stats.replied || 0
        }))

        const statusCounts = { Draft: 0, Active: 0, Paused: 0, Completed: 0 }
        campaigns.forEach(c => {
            if (statusCounts[c.status] !== undefined) statusCounts[c.status]++
        })

        const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

        res.json({ barData, pieData })
    } catch (err) {
        next(err)
    }
}

// GET /api/campaigns/:id
export const getOneCampaign = async (req, res, next) => {
    try {
        const campaign = await Campaign.findById(req.params.id).populate('workflowId')
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
        res.json(campaign)
    } catch (err) {
        next(err)
    }
}

// POST /api/campaigns
export const createCampaign = async (req, res, next) => {
    try {
        const { name } = req.body
        if (!name) return res.status(400).json({ error: 'Name is required' })
        const campaign = await Campaign.create(req.body)
        res.status(201).json(campaign)
    } catch (err) {
        next(err)
    }
}

// PUT /api/campaigns/:id
export const updateCampaign = async (req, res, next) => {
    try {
        const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
        res.json(campaign)
    } catch (err) {
        next(err)
    }
}

// POST /api/campaigns/:id/run
export const runCampaign = async (req, res, next) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

        campaign.status = 'Active'
        await campaign.save()

        let queued = 0
        for (const leadId of campaign.leadIds) {
            await outreachQueue.add({
                leadId: leadId.toString(),
                workflowId: campaign.workflowId?.toString(),
                campaignId: campaign._id.toString(),
                nodeId: null
            })
            queued++
        }

        res.json({ queued })
    } catch (err) {
        next(err)
    }
}

// POST /api/campaigns/:id/pause
export const pauseCampaign = async (req, res, next) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

        campaign.status = 'Paused'
        await campaign.save()

        // Drain pending jobs for this campaign
        const waiting = await outreachQueue.getWaiting()
        const delayed = await outreachQueue.getDelayed()
        const allJobs = [...waiting, ...delayed]

        for (const job of allJobs) {
            if (job.data.campaignId === campaign._id.toString()) {
                await job.remove()
            }
        }

        res.json({ success: true })
    } catch (err) {
        next(err)
    }
}

// DELETE /api/campaigns/:id
export const deleteCampaign = async (req, res, next) => {
    try {
        const campaign = await Campaign.findByIdAndDelete(req.params.id)
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
        res.json({ success: true })
    } catch (err) {
        next(err)
    }
}
