import Lead from '../models/Lead.js'
import Log from '../models/Log.js'
import Workflow from '../models/Workflow.js'
import * as XLSX from 'xlsx'
import { calculateLeadScore, getScoreLabel, processEngagementEvent } from '../services/leadScoringService.js'

// GET /api/leads
export const getLeads = async (req, res, next) => {
    try {
        const { page = 1, limit = 25, status, search, workflow } = req.query
        const filter = {}

        if (status && status !== 'ALL') {
            filter.status = status
        }

        if (workflow && workflow !== 'ALL') {
            filter.workflow = workflow
        }

        if (search) {
            const regex = new RegExp(search, 'i')
            filter.$or = [
                { name: regex },
                { email: regex },
                { company: regex },
                { position: regex }
            ]
        }

        const total = await Lead.countDocuments(filter)
        const leads = await Lead.find(filter)
            .sort({ score: -1, createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))

        res.json({
            data: leads,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        })
    } catch (err) {
        next(err)
    }
}

// GET /api/leads/:id
export const getOneLead = async (req, res, next) => {
    try {
        const lead = await Lead.findById(req.params.id)
        if (!lead) return res.status(404).json({ error: 'Lead not found' })
        res.json(lead)
    } catch (err) {
        next(err)
    }
}

// POST /api/leads
export const createLead = async (req, res, next) => {
    try {
        const { name, email } = req.body
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' })
        }
        // Calculate lead score before saving
        const score = calculateLeadScore(req.body)
        const scoreLabel = getScoreLabel(score)
        const lead = await Lead.create({ ...req.body, score, scoreLabel })
        res.status(201).json(lead)
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Email already exists' })
        }
        next(err)
    }
}

// PUT /api/leads/:id
export const updateLead = async (req, res, next) => {
    try {
        const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        if (!lead) return res.status(404).json({ error: 'Lead not found' })
        res.json(lead)
    } catch (err) {
        next(err)
    }
}

// DELETE /api/leads/:id
export const deleteLead = async (req, res, next) => {
    try {
        const lead = await Lead.findByIdAndDelete(req.params.id)
        if (!lead) return res.status(404).json({ error: 'Lead not found' })
        res.json({ success: true })
    } catch (err) {
        next(err)
    }
}

// DELETE /api/leads/bulk
export const bulkDeleteLeads = async (req, res, next) => {
    try {
        const { ids } = req.body
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: 'ids array is required' })
        }
        const result = await Lead.deleteMany({ _id: { $in: ids } })
        res.json({ deleted: result.deletedCount })
    } catch (err) {
        next(err)
    }
}

// GET /api/leads/:id/history — outreach history for a lead
export const getLeadHistory = async (req, res, next) => {
    try {
        const logs = await Log.find({ leadId: req.params.id })
            .sort({ createdAt: 1 })
        res.json({
            data: logs.map(l => ({
                id: l._id,
                action: l.action,
                step: l.step,
                channel: l.channel,
                direction: l.direction,
                subject: l.subject,
                body: l.body,
                status: l.status,
                error: l.errorMsg,
                detail: l.detail,
                createdAt: l.createdAt,
            }))
        })
    } catch (err) {
        next(err)
    }
}

// POST /api/leads/:id/takeover — human takes over automation
export const takeOverLead = async (req, res, next) => {
    try {
        const lead = await Lead.findById(req.params.id)
        if (!lead) return res.status(404).json({ error: 'Lead not found' })
        lead.humanTakeover = true
        lead.status = 'manual_conversation'
        lead.takenOverAt = new Date()
        await lead.save()
        res.json({ status: 'taken_over', message: `Automation stopped for ${lead.name}.` })
    } catch (err) {
        next(err)
    }
}

// POST /api/leads/:id/pause -- pause lead automation
export const pauseLead = async (req, res, next) => {
    try {
        const lead = await Lead.findById(req.params.id)
        if (!lead) return res.status(404).json({ error: 'Lead not found' })
        lead.status = 'paused'
        await lead.save()
        res.json({ status: 'paused' })
    } catch (err) {
        next(err)
    }
}

// POST /api/leads/:id/resume -- resume lead automation
export const resumeLead = async (req, res, next) => {
    try {
        const lead = await Lead.findById(req.params.id)
        if (!lead) return res.status(404).json({ error: 'Lead not found' })
        lead.status = 'contacted'
        lead.humanTakeover = false
        await lead.save()
        res.json({ status: 'resumed' })
    } catch (err) {
        next(err)
    }
}

// GET /api/leads/dashboard/stats
export const getDashboardStats = async (req, res, next) => {
    try {
        const allLeads = await Lead.find()
        const statuses = {}
        for (const l of allLeads) {
            statuses[l.status] = (statuses[l.status] || 0) + 1
        }

        const totalSent = await Log.countDocuments({ direction: 'sent', status: 'SENT' })
        const totalReplied = await Log.countDocuments({ direction: 'received' })

        // Fetch all workflows (Active and Draft)
        const allWorkflows = await Workflow.find()
        const workflowCounts = allWorkflows.map(wf => ({
            id: wf._id,
            name: wf.name || wf._id,
            count: wf.assignedLeads?.length || 0,
            status: wf.status || 'Draft',
            active: wf.status === 'Active'
        }))

        res.json({
            total_leads: allLeads.length,
            by_status: statuses,
            total_sent: totalSent,
            total_replied: totalReplied,
            reply_rate: totalSent > 0 ? Math.round(totalReplied / totalSent * 1000) / 10 : 0,
            needs_attention: statuses.needs_human || 0,
            workflowCounts, // Add real workflow counts
        })
    } catch (err) {
        next(err)
    }
}

// POST /api/leads/import
export const importLeads = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' })
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(sheet)

        let imported = 0
        let skipped = 0
        const errors = []

        for (const row of rows) {
            try {
                const leadData = {
                    name: row.name || row.Name || '',
                    email: (row.email || row.Email || '').toLowerCase().trim(),
                    company: row.company || row.Company || '',
                    position: row.position || row.Position || row.role || row.Role || '',
                    tags: row.tags ? String(row.tags).split(',').map(t => t.trim()) : [],
                    status: 'New'
                }

                if (!leadData.name || !leadData.email) {
                    skipped++
                    continue
                }

                // Calculate lead score for imported lead
                const score = calculateLeadScore(leadData)
                const scoreLabel = getScoreLabel(score)
                await Lead.findOneAndUpdate(
                    { email: leadData.email },
                    { $set: { ...leadData, score, scoreLabel } },
                    { upsert: true, new: true }
                )
                imported++
            } catch (err) {
                if (err.code === 11000) {
                    skipped++
                } else {
                    errors.push({ row: row, error: err.message })
                }
            }
        }

        res.json({ imported, skipped, errors })
    } catch (err) {
        next(err)
    }
}

// POST /api/leads/:id/engagement — record engagement event and recalculate score
export const recordEngagement = async (req, res, next) => {
    try {
        const { eventType } = req.body
        if (!eventType) {
            return res.status(400).json({ error: 'eventType is required' })
        }

        const lead = await Lead.findById(req.params.id)
        if (!lead) return res.status(404).json({ error: 'Lead not found' })

        const updates = processEngagementEvent(lead.toObject(), eventType)
        lead.engagementHistory = updates.engagementHistory
        lead.score = updates.score
        lead.scoreLabel = updates.scoreLabel
        await lead.save()

        res.json({
            score: lead.score,
            scoreLabel: lead.scoreLabel,
            engagementHistory: lead.engagementHistory
        })
    } catch (err) {
        next(err)
    }
}

// POST /api/leads/rescore-all — bulk recalculate all lead scores
export const rescoreAll = async (req, res, next) => {
    try {
        const leads = await Lead.find({})
        let updated = 0
        for (const lead of leads) {
            const score = calculateLeadScore(lead.toObject())
            const scoreLabel = getScoreLabel(score)
            if (lead.score !== score || lead.scoreLabel !== scoreLabel) {
                lead.score = score
                lead.scoreLabel = scoreLabel
                await lead.save()
                updated++
            }
        }
        res.json({ total: leads.length, updated })
    } catch (err) {
        next(err)
    }
}
