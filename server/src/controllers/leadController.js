import Lead from '../models/Lead.js'
import * as XLSX from 'xlsx'

// GET /api/leads
export const getLeads = async (req, res, next) => {
    try {
        const { page = 1, limit = 25, status, search } = req.query
        const filter = {}

        if (status && status !== 'ALL') {
            filter.status = status
        }

        if (search) {
            const regex = new RegExp(search, 'i')
            filter.$or = [
                { name: regex },
                { email: regex },
                { company: regex }
            ]
        }

        const total = await Lead.countDocuments(filter)
        const leads = await Lead.find(filter)
            .sort({ createdAt: -1 })
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
        const lead = await Lead.create(req.body)
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

                await Lead.findOneAndUpdate(
                    { email: leadData.email },
                    { $setOnInsert: leadData },
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
