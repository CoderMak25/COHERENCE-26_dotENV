import Workflow from '../models/Workflow.js'
import Lead from '../models/Lead.js'
import { outreachQueue } from '../queues/outreachQueue.js'
import { runOutreachWorkflowSSE, processJob } from '../services/executionEngine.js'

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
// Queues each assigned lead individually so they each get unique personalized content
export const executeWorkflow = async (req, res, next) => {
    try {
        const { leadIds } = req.body
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ error: 'leadIds array is required and must not be empty' })
        }

        const workflow = await Workflow.findById(req.params.id)
        if (!workflow) return res.status(404).json({ error: 'Workflow not found' })

        if (!workflow.nodes || workflow.nodes.length === 0) {
            return res.status(400).json({ error: 'Workflow has no nodes' })
        }

        // Find the trigger node (first node with trigger type, or first node in list)
        const triggerNode = workflow.nodes.find(n => n.type?.startsWith('trigger_')) || workflow.nodes[0]

        // Verify all leads exist and fetch their data for logging
        const leads = await Lead.find({ _id: { $in: leadIds } })
        if (leads.length === 0) {
            return res.status(400).json({ error: 'No valid leads found from the provided IDs' })
        }

        let queued = 0
        const queuedLeads = []
        const errors = []

        // Queue each lead as a SEPARATE job — this ensures:
        // - Each lead's name/email/company is fetched individually inside processJob
        // - AI generates a UNIQUE personalized message for each lead
        // - Email is sent TO each lead's email FROM the env EMAIL_FROM address
        for (const lead of leads) {
            const jobPayload = {
                leadId: lead._id.toString(),
                workflowId: workflow._id.toString(),
                nodeId: triggerNode.id,
                campaignId: null
            }

            try {
                // Primary path: use Redis/Bull queue
                await outreachQueue.add(jobPayload)
            } catch (err) {
                // If Redis/Bull is misconfigured or unavailable, fall back to direct execution
                console.error('Queue error, executing job inline for lead', lead._id.toString(), err.message)
                try {
                    await processJob(jobPayload)
                } catch (innerErr) {
                    console.error('Inline workflow execution failed for lead', lead._id.toString(), innerErr)
                    errors.push({
                        id: lead._id,
                        name: lead.name,
                        email: lead.email,
                        error: innerErr.message || String(innerErr)
                    })
                    continue
                }
            }

            queued++
            queuedLeads.push({ id: lead._id, name: lead.name, email: lead.email })
        }

        // Update workflow status
        workflow.status = 'Active'
        await workflow.save()

        res.json({
            queued,
            leads: queuedLeads,
            firstNode: triggerNode.type,
            errors,
            message: `Queued/executed ${queued} leads for workflow execution. Each lead will receive a unique personalized message.`
        })
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
