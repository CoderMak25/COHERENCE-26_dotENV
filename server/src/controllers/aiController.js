import Lead from '../models/Lead.js'
import { generateMessage } from '../services/aiService.js'

// POST /api/ai/generate
export const generateAIMessage = async (req, res, next) => {
    try {
        const { leadId, nodeType, template } = req.body

        if (!leadId) {
            return res.status(400).json({ error: 'leadId is required' })
        }

        const lead = await Lead.findById(leadId)
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' })
        }

        const result = await generateMessage(lead, nodeType || 'email')
        res.json(result)
    } catch (err) {
        next(err)
    }
}
