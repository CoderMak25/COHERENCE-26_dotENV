import Workflow from '../models/Workflow.js'
import { outreachQueue } from '../queues/outreachQueue.js'
import { runOutreachWorkflowSSE } from '../services/executionEngine.js'

// GET /api/workflows/run — SSE streaming endpoint for real-time execution
export const runWorkflow = async (req, res, next) => {
    // Set up SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    })

    const send = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    // Handle client disconnect (STOP button)
    let aborted = false
    req.on('close', () => { aborted = true })

    try {
        await runOutreachWorkflowSSE(send, () => aborted)
        send('done', { message: 'Workflow complete' })
    } catch (err) {
        send('error', { message: err.message })
    }

    res.end()
}

// GET /api/workflows
export const getWorkflows = async (req, res, next) => {
    try {
        const workflows = await Workflow.find().sort({ createdAt: -1 })
        res.json({ data: workflows })
    } catch (err) {
        next(err)
    }
}

// GET /api/workflows/:id
export const getOneWorkflow = async (req, res, next) => {
    try {
        const workflow = await Workflow.findById(req.params.id)
        if (!workflow) return res.status(404).json({ error: 'Workflow not found' })
        res.json(workflow)
    } catch (err) {
        next(err)
    }
}

// POST /api/workflows
export const saveWorkflow = async (req, res, next) => {
    try {
        const { name } = req.body
        if (!name) return res.status(400).json({ error: 'Name is required' })
        const workflow = await Workflow.create(req.body)
        res.status(201).json(workflow)
    } catch (err) {
        next(err)
    }
}

// PUT /api/workflows/:id
export const updateWorkflow = async (req, res, next) => {
    try {
        const workflow = await Workflow.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        if (!workflow) return res.status(404).json({ error: 'Workflow not found' })
        res.json(workflow)
    } catch (err) {
        next(err)
    }
}

// POST /api/workflows/:id/execute
export const executeWorkflow = async (req, res, next) => {
    try {
        const { leadIds } = req.body
        if (!leadIds || !Array.isArray(leadIds)) {
            return res.status(400).json({ error: 'leadIds array is required' })
        }

        const workflow = await Workflow.findById(req.params.id)
        if (!workflow) return res.status(404).json({ error: 'Workflow not found' })

        let queued = 0
        const firstNode = workflow.nodes[0]

        for (const leadId of leadIds) {
            await outreachQueue.add({
                leadId,
                workflowId: workflow._id.toString(),
                nodeId: firstNode?.id || null,
                campaignId: null
            })
            queued++
        }

        workflow.status = 'Active'
        await workflow.save()

        res.json({ queued })
    } catch (err) {
        next(err)
    }
}

// DELETE /api/workflows/:id
export const deleteWorkflow = async (req, res, next) => {
    try {
        const workflow = await Workflow.findByIdAndDelete(req.params.id)
        if (!workflow) return res.status(404).json({ error: 'Workflow not found' })
        res.json({ success: true })
    } catch (err) {
        next(err)
    }
}
