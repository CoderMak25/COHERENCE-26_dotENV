import Lead from '../models/Lead.js'
import { generateMessage, generateWorkflowGraph } from '../services/aiService.js'

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

// POST /api/ai/generate-workflow
export const generateWorkflow = async (req, res, next) => {
    try {
        const { prompt } = req.body
        if (!prompt || !prompt.trim()) {
            return res.status(400).json({ error: 'A workflow description prompt is required' })
        }

        const result = await generateWorkflowGraph(prompt.trim())
        res.json(result)
    } catch (err) {
        console.error('AI workflow generation error:', err)
        if (err instanceof SyntaxError) {
            return res.status(422).json({ error: 'AI returned invalid JSON. Please try a simpler prompt.' })
        }
        next(err)
    }
}

