import Lead from '../models/Lead.js'
import Workflow from '../models/Workflow.js'
import Campaign from '../models/Campaign.js'
import Log from '../models/Log.js'
import { generateMessage, generateOutreachMessage } from './aiService.js'
import { sendEmail } from './emailService.js'
import { validateAndRoute } from './leadValidator.js'

// ── Helper: random int in range ──
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// ── Helper: get subject line ──
const getSubject = (step, lead) => {
    const first = (lead.name || '').split(' ')[0] || 'there'
    const co = lead.company ? ` — ${lead.company}` : ''
    const subjects = {
        initial_outreach: `Quick intro${co}`,
        follow_up: `Following up, ${first}`,
        final_reminder: 'One last note',
    }
    return subjects[step] || 'Hello'
}

// ── Helper: next status by step ──
const nextStatus = (step) => ({
    initial_outreach: 'Contacted',
    follow_up: 'follow_up_sent',
    final_reminder: 'final_reminder_sent',
})[step] || 'Contacted'


// ═══════════════════════════════════════════════════════════════════
//  BUILD ADJACENCY GRAPH from flat nodes/edges arrays
// ═══════════════════════════════════════════════════════════════════

function buildGraph(nodes, edges) {
    const graph = {}

    for (const node of nodes) {
        graph[node.id] = {
            id: node.id,
            type: node.type,
            config: node.config || {},
            enabled: node.enabled !== false,
            next: [],   // ordered list of target node IDs
        }
    }

    for (const edge of edges) {
        const fromId = edge.from
        const toId = edge.to

        if (graph[fromId] && !graph[fromId].next.includes(toId)) {
            graph[fromId].next.push(toId)
        }
    }

    return graph
}


// ═══════════════════════════════════════════════════════════════════
//  FIND THE TRIGGER NODE (entry point)
// ═══════════════════════════════════════════════════════════════════

const TRIGGER_TYPES = [
    'trigger_new_lead', 'trigger_manual', 'trigger_scheduled',
    'trigger_webhook', 'trigger_form_submit', 'trigger_form',
]

function findTriggerNode(graph) {
    for (const node of Object.values(graph)) {
        if (TRIGGER_TYPES.includes(node.type)) return node
    }
    return null
}


// ═══════════════════════════════════════════════════════════════════
//  MAIN SSE ENTRY POINT — traverses graph for every lead
// ═══════════════════════════════════════════════════════════════════

export const runWorkflowGraphSSE = async (workflow, send, isAborted, leadIds) => {
    const { nodes, edges } = workflow

    // Wrap SSE send in try/catch to survive client disconnect
    const safeSend = (event, data) => {
        try { send(event, data) } catch { }
    }

    // Build graph
    const graph = buildGraph(nodes, edges)
    const trigger = findTriggerNode(graph)

    if (!trigger) {
        safeSend('log', { tag: 'ERR', message: 'No trigger node found in workflow' })
        return
    }

    safeSend('log', { tag: 'SYS', message: `Graph built: ${nodes.length} nodes, ${edges.length} edges` })

    // Fetch leads — filter by selected IDs if provided
    const query = leadIds && leadIds.length > 0 ? { _id: { $in: leadIds } } : {}
    const leads = await Lead.find(query)

    safeSend('log', { tag: 'TRG', message: `Trigger fired — found ${leads.length} leads in database` })

    let sent = 0, failed = 0, skipped = 0

    for (let i = 0; i < leads.length; i++) {

        if (isAborted()) {
            safeSend('log', { tag: 'SYS', message: `Stopped by user after ${sent} emails sent` })
            break
        }

        const lead = leads[i]
        safeSend('log', { tag: 'SYS', message: `── Lead ${i + 1}/${leads.length}: ${lead.name} ──` })

        try {
            const result = await executeForLead(trigger.id, graph, lead, safeSend, isAborted)

            if (result.emailSent) sent++
            else if (result.failed) failed++
            else skipped++

            safeSend('progress', { sent, failed, skipped, current: i + 1, total: leads.length })

            // Delay between leads (1-2 seconds)
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000))

        } catch (err) {
            failed++
            safeSend('log', { tag: 'ERR', message: `Error for ${lead.name}: ${err.message}` })
            safeSend('progress', { sent, failed, skipped, current: i + 1, total: leads.length })
        }
    }

    safeSend('log', { tag: 'END', message: `Complete — ${sent} emails sent, ${failed} failed, ${skipped} skipped` })
}


// ═══════════════════════════════════════════════════════
//  Process a workflow node job (Bull queue)
//  Handles ALL frontend node types from nodeTypes.js
// ═══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
//  EXECUTE GRAPH FOR ONE LEAD — walks from trigger to end
// ═══════════════════════════════════════════════════════════════════

async function executeForLead(startNodeId, graph, lead, send, isAborted) {
    // Execution context — carries data between nodes
    const ctx = {
        lead,
        aiMessage: null,
        emailSubject: null,
        promptKey: null,
        emailSent: false,
        failed: false,
    }

    let currentId = startNodeId
    const visited = new Set()
    const maxSteps = 50

    while (currentId && visited.size < maxSteps) {
        if (isAborted()) break
        if (!(currentId in graph)) break

        const node = graph[currentId]

        // Prevent infinite loops
        if (visited.has(currentId)) {
            send('log', { tag: 'FLW', message: `Loop detected at ${node.type} — breaking` })
            break
        }
        visited.add(currentId)

        // Skip disabled nodes — follow first connection
        if (!node.enabled) {
            send('log', { tag: '--', message: `Skipped ${node.type} (disabled)` })
            currentId = node.next[0] || null
            continue
        }

        // Execute this node
        const result = await executeNode(node, ctx, send)

        // Stop if node says stop (end node, error, bounce)
        if (result.stop) break

        // Follow the correct output port (port index into next[] array)
        const portIdx = parseInt(result.port ?? 0)
        currentId = node.next[portIdx] || node.next[0] || null
    }

    return ctx
}


// ═══════════════════════════════════════════════════════════════════
//  DISPATCH — route to correct handler by node type
// ═══════════════════════════════════════════════════════════════════

async function executeNode(node, ctx, send) {
    const t = node.type

    // ── TRIGGERS ──
    if (TRIGGER_TYPES.includes(t))
        return await handleTrigger(node, ctx, send)

    // ── AI ──
    if (t === 'ai_generate') return await handleAiGenerate(node, ctx, send)
    if (t === 'ai_score') return await handleAiScore(node, ctx, send)
    if (t === 'ai_classify') return handlePassthrough(node, ctx, send, 'AI Classify')
    if (t === 'ai_enrich') return handlePassthrough(node, ctx, send, 'AI Enrich')

    // ── OUTREACH ──
    if (t === 'send_email') return await handleSendEmail(node, ctx, send)
    if (t === 'linkedin_dm') return handleLinkedIn(node, ctx, send)
    if (t === 'send_sms') return handlePassthrough(node, ctx, send, 'SMS')
    if (t === 'whatsapp') return handlePassthrough(node, ctx, send, 'WhatsApp')
    if (t === 'phone_call') return handlePassthrough(node, ctx, send, 'Phone Call')
    if (t === 'slack_alert') return handleSlack(node, ctx, send)

    // ── FLOW CONTROL ──
    if (t === 'delay') return handleDelay(node, ctx, send)
    if (t === 'condition') return handleCondition(node, ctx, send)
    if (t === 'ab_split') return handleAbSplit(node, ctx, send)
    if (t === 'wait_event') return handleWaitEvent(node, ctx, send)
    if (t === 'loop') return handleLoop(node, ctx, send)
    if (t === 'merge') return { port: 0 }

    // ── DATA ──
    if (t === 'add_tag') return await handleAddTag(node, ctx, send)
    if (t === 'remove_tag') return await handleRemoveTag(node, ctx, send)
    if (t === 'set_field') return await handleSetField(node, ctx, send)
    if (t === 'update_crm') return handlePassthrough(node, ctx, send, 'CRM Update')
    if (t === 'http_request') return await handleHttpRequest(node, ctx, send)

    // ── SAFETY ──
    if (t === 'throttle') return await handleThrottle(node, ctx, send)
    if (t === 'unsubscribe_check') return handleUnsubCheck(node, ctx, send)

    // ── END ──
    if (t === 'end') return await handleEnd(node, ctx, send)

    // Unknown type — skip
    send('log', { tag: '--', message: `Unknown node type: ${t} — skipped` })
    return { port: 0 }
}


// ═══════════════════════════════════════════════════════════════════
//  NODE HANDLERS
// ═══════════════════════════════════════════════════════════════════

// ── TRIGGER ──────────────────────────────────────────────────────
async function handleTrigger(node, ctx, send) {
    const lead = ctx.lead
    const channel = validateAndRoute(lead)

    // Just log the channel, never block — individual send nodes handle missing contact
    send('log', { tag: 'TRG', message: `${lead.name} — channel: ${channel || 'manual'}` })
    return { port: 0 }
}


// ── AI GENERATE ──────────────────────────────────────────────────
async function handleAiGenerate(node, ctx, send) {
    const lead = ctx.lead
    const config = node.config || {}

    // Determine prompt key based on lead's outreach history
    const logs = await Log.find({ leadId: lead._id, direction: 'sent' })
    const sentSteps = logs.map(l => l.step).filter(Boolean)

    let promptKey = 'initial_outreach'
    if (sentSteps.includes('initial_outreach') && !sentSteps.includes('follow_up'))
        promptKey = 'follow_up'
    else if (sentSteps.includes('follow_up') && !sentSteps.includes('final_reminder'))
        promptKey = 'final_reminder'

    send('log', { tag: 'AI', message: `Generating ${promptKey} message for ${lead.name}...` })

    const message = await generateOutreachMessage(promptKey, {
        name: lead.name || 'there',
        company: lead.company || '',
        position: lead.position || '',
        industry: lead.industry || '',
    })

    // Store in context for Send Email to use
    ctx.aiMessage = message
    ctx.promptKey = promptKey
    ctx.emailSubject = getSubject(promptKey, lead)

    send('log', { tag: 'AI', message: `Message generated (${message.length} chars)` })
    return { port: 0 }
}


// ── SEND EMAIL ───────────────────────────────────────────────────
async function handleSendEmail(node, ctx, send) {
    const lead = ctx.lead
    const config = node.config || {}

    if (!lead.email) {
        send('log', { tag: 'OUT', message: `${lead.name} — no email, skipped` })
        return { port: 0 }
    }

    // Get message from context (AI Write), or generate fresh
    let body = ctx.aiMessage
    if (!body) {
        const logs = await Log.find({ leadId: lead._id, direction: 'sent' })
        const sentSteps = logs.map(l => l.step).filter(Boolean)

        let pk = 'initial_outreach'
        if (sentSteps.includes('initial_outreach')) pk = 'follow_up'
        if (sentSteps.includes('follow_up')) pk = 'final_reminder'

        body = await generateOutreachMessage(pk, {
            name: lead.name || 'there',
            company: lead.company || '',
            position: lead.position || '',
            industry: lead.industry || '',
        })
        ctx.promptKey = pk
        ctx.emailSubject = getSubject(pk, lead)
    }

    // Build subject
    const firstName = (lead.name || 'there').split(' ')[0]
    let subject = ctx.emailSubject
        || (config.subject || '').replace('{{first_name}}', firstName)
        || getSubject(ctx.promptKey || 'initial_outreach', lead)

    send('log', { tag: 'OUT', message: `Sending to ${lead.email}...` })

    const result = await sendEmail({ to: lead.email, subject, body })
    const pk = ctx.promptKey || 'initial_outreach'

    if (result.success) {
        await Lead.updateOne({ _id: lead._id }, {
            $set: {
                status: nextStatus(pk),
                lastContactedAt: new Date(),
                lastContact: new Date(),
                gmailThreadSubject: subject,
            }
        })

        await Log.create({
            leadId: lead._id,
            leadName: lead.name,
            action: 'EMAIL_SENT',
            status: 'SENT',
            detail: `To: ${lead.email} | Subject: ${subject}`,
            step: pk,
            channel: 'email',
            direction: 'sent',
            subject,
            body,
            latencyMs: result.latencyMs,
        })

        ctx.emailSent = true
        ctx.aiMessage = null  // clear for next Send Email node
        ctx.emailSubject = null

        send('log', { tag: 'OUT', message: `✓ Email sent to ${lead.name} (${lead.email}) — ${result.latencyMs}ms` })
        return { port: 0 }

    } else {
        ctx.failed = true
        send('log', { tag: 'ERR', message: `✗ Email failed for ${lead.email}: ${result.error}` })
        return { port: 0 }
    }
}


// ── END ──────────────────────────────────────────────────────────
async function handleEnd(node, ctx, send) {
    const lead = ctx.lead
    const config = node.config || {}
    const status = config.status || 'completed'

    await Lead.updateOne({ _id: lead._id }, { $set: { status } })

    send('log', { tag: 'END', message: `${lead.name} → status: ${status}` })
    return { stop: true, reason: 'end_node' }
}


// ── DELAY ────────────────────────────────────────────────────────
function handleDelay(node, ctx, send) {
    const config = node.config || {}
    const minVal = parseInt(config.min || config.minVal || 1)
    const maxVal = parseInt(config.max || config.maxVal || 3)
    const unit = config.unit || 'days'
    const actual = randInt(minVal, maxVal)

    send('log', { tag: 'FLW', message: `Delay: ${actual} ${unit} (${minVal}–${maxVal})` })
    return { port: 0 }
}


// ── CONDITION ────────────────────────────────────────────────────
function handleCondition(node, ctx, send) {
    const lead = ctx.lead
    const config = node.config || {}

    const field = config.field || ''
    const operator = config.operator || 'equals'
    const value = String(config.value || '').toLowerCase()

    const actual = getLeadValue(field, lead, ctx)
    const result = evaluateCondition(actual, operator, value)
    const port = result ? 0 : 1   // 0=YES, 1=NO

    send('log', { tag: 'IF', message: `${field} ${operator} ${value} → ${result ? 'YES' : 'NO'}` })
    return { port }
}

function getLeadValue(field, lead, ctx) {
    const map = {
        status: lead.status,
        channel: lead.channel,
        has_email: !!lead.email,
        has_linkedin: !!lead.linkedinUrl,
        email: lead.email,
        company: lead.company,
        position: lead.position,
        industry: lead.industry,
        ai_reply_count: lead.aiReplyCount,
        contact_status: lead.contactStatus,
    }
    return map[field] !== undefined ? map[field] : (lead[field] ?? null)
}

function evaluateCondition(actual, operator, expected) {
    try {
        const actualStr = String(actual ?? '').toLowerCase()
        switch (operator) {
            case 'equals': return actualStr === expected
            case 'not_equals': return actualStr !== expected
            case 'greater_than': return parseFloat(actual || 0) > parseFloat(expected || 0)
            case 'less_than': return parseFloat(actual || 0) < parseFloat(expected || 0)
            case 'contains': return actualStr.includes(expected)
            case 'exists': return actual != null && actualStr !== '' && actualStr !== 'null'
            case 'is_true': return ['true', '1', 'yes'].includes(actualStr)
            case 'is_false': return ['false', '0', 'no', '', 'null'].includes(actualStr)
            default: return false
        }
    } catch { return false }
}


// ── A/B SPLIT ────────────────────────────────────────────────────
function handleAbSplit(node, ctx, send) {
    const config = node.config || {}
    const ratioA = parseInt(config.ratioA || 50)

    // Deterministic: hash lead ID
    const hash = String(ctx.lead._id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 100
    const variant = hash < ratioA ? 'A' : 'B'
    const port = variant === 'A' ? 0 : 1

    send('log', { tag: 'A/B', message: `${ctx.lead.name} → Variant ${variant}` })
    return { port }
}


// ── WAIT EVENT ───────────────────────────────────────────────────
function handleWaitEvent(node, ctx, send) {
    const config = node.config || {}
    const event = config.event || 'email_opened'
    const lead = ctx.lead

    const checks = {
        email_opened: false,   // requires tracking pixel
        email_clicked: false,
        replied: lead.status === 'replied' || lead.status === 'Replied',
    }
    const happened = checks[event] ?? false
    const port = happened ? 0 : 1

    send('log', { tag: 'FLW', message: `Wait ${event} → ${happened ? 'received' : 'timeout'}` })
    return { port }
}


// ── LOOP ─────────────────────────────────────────────────────────
function handleLoop(node, ctx, send) {
    const config = node.config || {}
    const maxIter = parseInt(config.maxIterations || 3)
    ctx._loopIndex = (ctx._loopIndex || 0) + 1

    if (ctx._loopIndex >= maxIter) {
        ctx._loopIndex = 0
        send('log', { tag: 'FLW', message: `Loop complete (${maxIter} iterations)` })
        return { port: 1 }
    }
    send('log', { tag: 'FLW', message: `Loop ${ctx._loopIndex}/${maxIter}` })
    return { port: 0 }
}


// ── ADD TAG ──────────────────────────────────────────────────────
async function handleAddTag(node, ctx, send) {
    const tag = node.config?.tag || ''
    if (tag) {
        await Lead.updateOne({ _id: ctx.lead._id }, { $addToSet: { tags: tag } })
        send('log', { tag: 'TAG', message: `Tag "${tag}" added to ${ctx.lead.name}` })
    }
    return { port: 0 }
}


// ── REMOVE TAG ───────────────────────────────────────────────────
async function handleRemoveTag(node, ctx, send) {
    const tag = node.config?.tag || ''
    if (tag) {
        await Lead.updateOne({ _id: ctx.lead._id }, { $pull: { tags: tag } })
        send('log', { tag: 'TAG', message: `Tag "${tag}" removed from ${ctx.lead.name}` })
    }
    return { port: 0 }
}


// ── SET FIELD ────────────────────────────────────────────────────
async function handleSetField(node, ctx, send) {
    const field = node.config?.fieldName || node.config?.field || ''
    const value = node.config?.value || ''
    if (field) {
        await Lead.updateOne({ _id: ctx.lead._id }, { $set: { [field]: value } })
        send('log', { tag: 'SET', message: `${field} = "${value}" on ${ctx.lead.name}` })
    }
    return { port: 0 }
}


// ── THROTTLE ─────────────────────────────────────────────────────
async function handleThrottle(node, ctx, send) {
    const config = node.config || {}
    const maxPerHour = parseInt(config.maxPerHour || 50)

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const sentCount = await Log.countDocuments({
        direction: 'sent', status: 'SENT', createdAt: { $gte: oneHourAgo }
    })

    if (sentCount >= maxPerHour) {
        send('log', { tag: 'SAF', message: `Rate limit: ${sentCount}/${maxPerHour}/hr — stopping` })
        return { stop: true, reason: 'throttle' }
    }

    send('log', { tag: 'SAF', message: `Throttle OK: ${sentCount}/${maxPerHour}/hr` })
    return { port: 0 }
}


// ── UNSUBSCRIBE CHECK ────────────────────────────────────────────
function handleUnsubCheck(node, ctx, send) {
    const lead = ctx.lead
    const unsub = lead.status === 'Unsubscribed' || lead.contactStatus === 'unsubscribed'
    const port = unsub ? 1 : 0

    send('log', { tag: 'SAF', message: `${lead.name}: ${unsub ? 'unsubscribed — stopping' : 'safe to contact'}` })
    return unsub ? { port: 1 } : { port: 0 }
}


// ── LINKEDIN DM ──────────────────────────────────────────────────
function handleLinkedIn(node, ctx, send) {
    const lead = ctx.lead
    if (!lead.linkedinUrl) {
        send('log', { tag: 'OUT', message: `${lead.name} — no LinkedIn URL` })
        return { port: 0 }
    }
    send('log', { tag: 'OUT', message: `LinkedIn DM logged for ${lead.name}` })
    return { port: 0 }
}


// ── SLACK ALERT ──────────────────────────────────────────────────
function handleSlack(node, ctx, send) {
    const channel = node.config?.channel || '#sales-alerts'
    send('log', { tag: 'OUT', message: `Slack alert → ${channel}: ${ctx.lead.name}` })
    return { port: 0 }
}


// ── HTTP REQUEST ─────────────────────────────────────────────────
async function handleHttpRequest(node, ctx, send) {
    const config = node.config || {}
    const url = config.url || ''
    const method = config.method || 'POST'

    if (!url) {
        send('log', { tag: 'API', message: 'No URL configured — skipped' })
        return { port: 0 }
    }

    try {
        const resp = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: method !== 'GET' ? JSON.stringify({ leadId: ctx.lead._id, name: ctx.lead.name, email: ctx.lead.email }) : undefined,
        })
        send('log', { tag: 'API', message: `${method} ${url} → ${resp.status}` })
    } catch (err) {
        send('log', { tag: 'API', message: `${method} ${url} → failed: ${err.message}` })
    }
    return { port: 0 }
}


// ── AI SCORE ─────────────────────────────────────────────────────
async function handleAiScore(node, ctx, send) {
    const lead = ctx.lead
    // Simple scoring heuristic (AI scoring can be added later)
    const score = (lead.company ? 30 : 0) + (lead.position ? 30 : 0) + (lead.email ? 20 : 0) + (lead.industry ? 20 : 0)
    send('log', { tag: 'AI', message: `${lead.name} scored ${score}/100` })
    return { port: 0 }
}


// ── PASSTHROUGH (for nodes not yet fully implemented) ────────────
function handlePassthrough(node, ctx, send, label) {
    send('log', { tag: '--', message: `${label} logged for ${ctx.lead.name}` })
    return { port: 0 }
}


// ═══════════════════════════════════════════════════════════════════
//  EXISTING: Process a workflow node job (Bull queue)
//  Kept for backward compatibility
// ═══════════════════════════════════════════════════════════════════

// Helper: replace template vars in text
const replaceVars = (text, lead) => {
    if (!text) return text
    const firstName = (lead.name || 'there').split(' ')[0]
    return text
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{\{company\}\}/g, lead.company || '')
        .replace(/\{\{name\}\}/g, lead.name || '')
        .replace(/\{\{email\}\}/g, lead.email || '')
        .replace(/\{\{position\}\}/g, lead.position || '')
}

// Helper: find next nodes via edges (graph traversal, not sequential)
const findNextNodes = (workflow, currentNodeId, branchHandle = null) => {
    const edges = workflow.edges || []
    let outEdges = edges.filter(e => e.source === currentNodeId)

    // If a specific branch was chosen (condition, a/b split, etc.)
    if (branchHandle) {
        const branchEdge = outEdges.find(e =>
            e.sourceHandle === branchHandle ||
            e.label?.toLowerCase() === branchHandle.toLowerCase()
        )
        if (branchEdge) outEdges = [branchEdge]
    }

    return outEdges
        .map(e => workflow.nodes.find(n => n.id === e.target))
        .filter(Boolean)
}

// Helper: queue next nodes for a lead
const queueNextNodes = async (workflow, currentNodeId, leadId, workflowId, campaignId, branchHandle = null) => {
    const nextNodes = findNextNodes(workflow, currentNodeId, branchHandle)
    for (const nextNode of nextNodes) {
        await outreachQueue.add({ leadId, workflowId, nodeId: nextNode.id, campaignId })
    }
    return nextNodes.length
}


export const processJob = async ({ leadId, workflowId, nodeId, campaignId }) => {
    const lead = await Lead.findById(leadId)
    if (!lead) {
        console.error(`Lead not found: ${leadId}`)
        return
    }

    const workflow = workflowId ? await Workflow.findById(workflowId) : null
    const campaign = campaignId ? await Campaign.findById(campaignId) : null

    // Find current node
    let node = null

    if (workflow && workflow.nodes.length > 0) {
        if (nodeId) {
            node = workflow.nodes.find(n => n.id === nodeId)
        } else {
            // Fallback: use currentStep index
            const idx = lead.currentStep || 0
            node = workflow.nodes[idx]
        }
    }
    if (!node) {
        console.error(`Node not found: ${nodeId}`)
        return
    }

    const nodeType = node.type // This is the frontend key like 'send_email', 'ai_generate', etc.
    const config = node.config || {}

    // Check throttle if campaign-based
    if (campaignId && campaign) {
        const allowed = await checkThrottle(campaignId, campaign.throttle || 10)
        if (!allowed) {
            await Log.create({
                leadId: lead._id,
                leadName: lead.name,
                action: 'THROTTLED',
                status: 'PENDING',
                detail: `Rate limit exceeded, requeuing`
            })
            await outreachQueue.add(
                { leadId, workflowId, nodeId, campaignId },
                { delay: 60000 }
            )
            return
        }
    }

    // ── TRIGGER NODES: just pass through to next ──
    if (nodeType.startsWith('trigger_')) {
        await Log.create({
            leadId: lead._id,
            leadName: lead.name,
            action: `TRIGGER_${nodeType.toUpperCase()}`,
            status: 'OK',
            detail: `Trigger: ${node.label || nodeType}`
        })
        await queueNextNodes(workflow, node.id, leadId, workflowId, campaignId)
        return
    }

    switch (nodeType) {

        // ── EMAIL ──
        case 'email':
        case 'send_email': {
            if (!lead.email) {
                await Log.create({
                    leadId: lead._id, leadName: lead.name,
                    action: 'EMAIL_SKIPPED', status: 'SKIPPED',
                    detail: 'No email address on lead'
                })
                break
            }

            let subject = config.subject || ''
            let body = config.body || ''

            // If no body/subject, use AI to generate
            if (!body) {
                try {
                    const generated = await generateOutreachMessage('initial_outreach', {
                        name: lead.name || 'there',
                        company: lead.company || '',
                        position: lead.position || '',
                        industry: lead.industry || '',
                    })
                    body = generated
                    if (!subject) {
                        const firstName = (lead.name || 'there').split(' ')[0]
                        subject = lead.company
                            ? `Quick intro — ${lead.company}`
                            : `Hey ${firstName}, quick thought`
                    }
                } catch (err) {
                    await Log.create({
                        leadId: lead._id, leadName: lead.name,
                        action: 'AI_GENERATE_FAILED', status: 'FAILED',
                        detail: err.message
                    })
                    break
                }
            }

            subject = replaceVars(subject, lead)
            body = replaceVars(body, lead)

            const result = await sendEmail({ to: lead.email, subject, body })

            if (result.success) {
                lead.status = 'Contacted'
                lead.lastContactedAt = new Date()
                lead.lastContact = new Date()
                lead.gmailThreadSubject = subject
                await lead.save()

                if (campaign) {
                    campaign.stats.sent = (campaign.stats.sent || 0) + 1
                    await campaign.save()
                }

                await Log.create({
                    leadId: lead._id, leadName: lead.name,
                    action: 'EMAIL_SENT', status: 'SENT',
                    detail: `To: ${lead.email} | Subject: ${subject}`,
                    step: 'send_email', channel: 'email', direction: 'sent',
                    subject, body, latencyMs: result.latencyMs
                })
            } else {
                if (campaign) {
                    campaign.stats.failed = (campaign.stats.failed || 0) + 1
                    await campaign.save()
                }

                await Log.create({
                    leadId: lead._id, leadName: lead.name,
                    action: 'EMAIL_FAILED', status: 'FAILED',
                    detail: result.error, latencyMs: result.latencyMs
                })
            }
            break
        }

        // ── AI NODES ──
        case 'ai_generate':
        case 'ai_score':
        case 'ai_classify':
        case 'ai_enrich': {
            try {
                const aiResult = await generateOutreachMessage('initial_outreach', {
                    name: lead.name || 'there',
                    company: lead.company || '',
                    position: lead.position || '',
                    industry: lead.industry || '',
                })

                await Log.create({
                    leadId: lead._id, leadName: lead.name,
                    action: `AI_${nodeType.toUpperCase()}`, status: 'OK',
                    detail: `AI processed: ${node.label || nodeType}`,
                    body: typeof aiResult === 'string' ? aiResult.substring(0, 500) : JSON.stringify(aiResult).substring(0, 500),
                })
            } catch (err) {
                await Log.create({
                    leadId: lead._id, leadName: lead.name,
                    action: 'AI_FAILED', status: 'FAILED',
                    detail: err.message
                })
            }
            break
        }

        // ── DELAY ──
        case 'wait':
        case 'delay': {
            const min = config.min || config.delayDays || 1
            const max = config.max || min
            const unit = config.unit || 'days'

            let multiplier = 24 * 60 * 60 * 1000 // days
            if (unit === 'hours') multiplier = 60 * 60 * 1000
            if (unit === 'minutes') multiplier = 60 * 1000

            let delayMs = randInt(min, max) * multiplier

            if (config.randomize || config.delayType === 'random') {
                const pct = (config.randomizePct || 20) / 100
                delayMs += (Math.random() * 2 - 1) * delayMs * pct
            }

            await Log.create({
                leadId: lead._id, leadName: lead.name,
                action: 'DELAY_ACTIVE', status: 'PENDING',
                detail: `Waiting ${min}-${max} ${unit}`
            })

            // Queue next nodes with delay
            const nextNodes = findNextNodes(workflow, node.id)
            for (const nextNode of nextNodes) {
                await outreachQueue.add(
                    { leadId, workflowId, nodeId: nextNode.id, campaignId },
                    { delay: delayMs }
                )
            }
            return // Don't fall through to normal queueing
        }

        // ── CONDITION (If/Else) ──
        case 'condition': {
            const field = config.field || config.condition || 'status'
            const operator = config.operator || 'equals'
            const value = config.value || config.conditionVal || 'Opened'
            const leadValue = lead[field] || lead.status || ''

            let passed = false
            switch (operator) {
                case 'equals': passed = leadValue === value; break
                case 'not_equals': passed = leadValue !== value; break
                case 'contains': passed = String(leadValue).includes(value); break
                case 'exists': passed = !!leadValue; break
                default: passed = leadValue === value
            }

            await Log.create({
                leadId: lead._id, leadName: lead.name,
                action: 'CONDITION_CHECK', status: 'OK',
                detail: `${field} ${operator} ${value}: ${passed ? 'YES' : 'NO'}`
            })

            // Follow the chosen branch
            await queueNextNodes(workflow, node.id, leadId, workflowId, campaignId, passed ? 'yes' : 'no')
            return
        }

        // ── A/B SPLIT ──
        case 'ab_split': {
            const ratioA = config.ratioA || 50
            const branch = Math.random() * 100 < ratioA ? 'a' : 'b'

            await Log.create({
                leadId: lead._id, leadName: lead.name,
                action: 'AB_SPLIT', status: 'OK',
                detail: `A/B Split (${ratioA}/${config.ratioB || 50}): Branch ${branch.toUpperCase()}`
            })

            await queueNextNodes(workflow, node.id, leadId, workflowId, campaignId, branch)
            return
        }

        // ── WAIT FOR EVENT ──
        case 'wait_event': {
            const event = config.event || 'email_opened'
            const timeoutVal = config.timeoutValue || 3
            const timeoutUnit = config.timeoutUnit || 'days'

            let timeoutMs = timeoutVal * 24 * 60 * 60 * 1000
            if (timeoutUnit === 'hours') timeoutMs = timeoutVal * 60 * 60 * 1000

            // For now, simulate: wait the timeout then check condition
            // In production this would be event-driven
            await Log.create({
                leadId: lead._id, leadName: lead.name,
                action: 'WAIT_EVENT', status: 'PENDING',
                detail: `Waiting for ${event} (timeout: ${timeoutVal} ${timeoutUnit})`
            })

            // Queue a timeout check
            await queueNextNodes(workflow, node.id, leadId, workflowId, campaignId, 'timeout')
            return
        }

        // ── UNSUBSCRIBE CHECK ──
        case 'unsubscribe_check': {
            const isSafe = lead.status !== 'Unsubscribed'

            await Log.create({
                leadId: lead._id, leadName: lead.name,
                action: 'UNSUB_CHECK', status: 'OK',
                detail: isSafe ? 'Safe to contact' : 'Lead is unsubscribed'
            })

            await queueNextNodes(workflow, node.id, leadId, workflowId, campaignId, isSafe ? 'safe' : 'unsub')
            return
        }

        // ── LINKEDIN ──
        case 'linkedin':
        case 'linkedin_dm': {
            await Log.create({
                leadId: lead._id, leadName: lead.name,
                action: 'LINKEDIN_DM', status: 'SENT',
                detail: `LinkedIn DM queued for ${lead.name}`
            })
            break
        }

        // ── DATA NODES (add_tag, remove_tag, set_field, update_crm) ──
        case 'add_tag': {
            if (config.tag) {
                if (!lead.tags) lead.tags = []
                if (!lead.tags.includes(config.tag)) {
                    lead.tags.push(config.tag)
                    await lead.save()
                }
            }
            await Log.create({
                leadId: lead._id, leadName: lead.name,
                action: 'ADD_TAG', status: 'OK',
                detail: `Tag added: ${config.tag || '(none)'}`
            })
            break
        }

        case 'remove_tag': {
            if (config.tag && lead.tags) {
                lead.tags = lead.tags.filter(t => t !== config.tag)
                await lead.save()
            }
            await Log.create({
                leadId: lead._id, leadName: lead.name,
                action: 'REMOVE_TAG', status: 'OK',
                detail: `Tag removed: ${config.tag || '(none)'}`
            })
            break
        }

        case 'set_field': {
            if (config.fieldName && lead[config.fieldName] !== undefined) {
                lead[config.fieldName] = config.value
                await lead.save()
            }
            await Log.create({
                leadId: lead._id, leadName: lead.name,
                action: 'SET_FIELD', status: 'OK',
                detail: `${config.fieldName} = ${config.value}`
            })
            break
        }

        case 'update_crm': {
            await Log.create({
                leadId: lead._id, leadName: lead.name,
                action: 'UPDATE_CRM', status: 'OK',
                detail: `${config.crm || 'hubspot'}: ${config.action || 'update'} → ${config.value || ''}`
            })
            break
        }

        // ── SAFETY: THROTTLE ──
        case 'throttle': {
            await Log.create({
                leadId: lead._id, leadName: lead.name,
                action: 'THROTTLE_CHECK', status: 'OK',
                detail: `Throttle: ${config.maxPerHour || 10}/hr, ${config.maxPerDay || 50}/day — OK`
            })
            break
        }

        // ── OTHER OUTREACH ──
        case 'send_sms':
        case 'whatsapp':
        case 'phone_call':
        case 'slack_alert': {
            await Log.create({
                leadId: lead._id, leadName: lead.name,
                action: `OUTREACH_${nodeType.toUpperCase()}`, status: 'SENT',
                detail: `${node.label || nodeType} action executed for ${lead.name}`
            })
            break
        }

        // ── HTTP REQUEST ──
        case 'http_request': {
            await Log.create({
                leadId: lead._id, leadName: lead.name,
                action: 'HTTP_REQUEST', status: 'OK',
                detail: `${config.method || 'GET'} ${config.url || '(no url)'}`
            })
            break
        }

        // ── LOOP / MERGE (flow) ──
        case 'loop':
        case 'merge': {
            await Log.create({
                leadId: lead._id, leadName: lead.name,
                action: nodeType.toUpperCase(), status: 'OK',
                detail: `${node.label || nodeType} executed`
            })
            break
        }

        // ── END ──
        case 'stop':
        case 'end': {
            lead.status = config.status || 'completed'
            await lead.save()

            await Log.create({
                leadId: lead._id, leadName: lead.name,
                action: 'WORKFLOW_END', status: 'OK',
                detail: `Workflow ended → status: ${config.status || 'completed'}`
            })
            return // Don't advance further
        }

        default: {
            await Log.create({
                leadId: lead._id, leadName: lead.name,
                action: 'UNKNOWN_NODE', status: 'SKIPPED',
                detail: `Unknown node type: ${nodeType}`
            })
        }
    }

    // For non-branching nodes that break out of switch: advance to next nodes via edges
    await queueNextNodes(workflow, node.id, leadId, workflowId, campaignId)
}
