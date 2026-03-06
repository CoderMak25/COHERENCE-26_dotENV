import Workflow from '../models/Workflow.js'
import { outreachQueue } from '../queues/outreachQueue.js'
import { runWorkflowGraphSSE } from '../services/executionEngine.js'

// POST /api/workflows/run — SSE streaming, graph-driven execution
export const runWorkflow = async (req, res, next) => {
    // Parse workflow graph from request body
    const workflow = req.body?.workflow

    if (!workflow || !workflow.nodes || !workflow.nodes.length) {
        return res.status(400).json({ error: 'No workflow graph provided. Send { workflow: { nodes, edges } }' })
    }

    if (!workflow.edges) workflow.edges = []

    // Disable any compression for SSE — must stream unbuffered
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')  // nginx
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(200)
    res.flushHeaders()

    const send = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        // Force flush — critical for real-time SSE
        if (typeof res.flush === 'function') res.flush()
    }

    // Handle client disconnect (STOP button) — use RES close, not REQ close
    // req.on('close') fires when POST body ends, res.on('close') fires on actual disconnect
    let aborted = false
    res.on('close', () => { aborted = true })

    try {
        const leadIds = req.body?.leadIds || []
        await runWorkflowGraphSSE(workflow, send, () => aborted, leadIds)
        send('done', { message: 'Workflow complete' })
    } catch (err) {
        console.error('[WorkflowController] Error:', err)
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
