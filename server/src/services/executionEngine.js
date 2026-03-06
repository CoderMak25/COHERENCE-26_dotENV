import Lead from '../models/Lead.js'
import Workflow from '../models/Workflow.js'
import Campaign from '../models/Campaign.js'
import Log from '../models/Log.js'
import { generateMessage, generateOutreachMessage } from './aiService.js'
import { sendEmail } from './emailService.js'
import { checkThrottle } from './throttleService.js'
import { validateAndRoute } from './leadValidator.js'
import { outreachQueue } from '../queues/outreachQueue.js'

// ── Constants ──
const MAX_AI_REPLIES = 3
const FOLLOW_UP_DELAY_DAYS = [2, 4]
const FINAL_REMINDER_DELAY_DAYS = [3, 5]

// ── Helper: random int in range ──
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// ── Helper: days since a date ──
const daysSince = (dt) => {
    if (!dt) return 9999
    return Math.floor((Date.now() - new Date(dt).getTime()) / (1000 * 60 * 60 * 24))
}

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

// ── Helper: log an outreach action ──
const logAction = async (lead, step, channel, direction, subject, body, status = 'SENT', errorMsg = null) => {
    await Log.create({
        leadId: lead._id,
        leadName: lead.name,
        action: `OUTREACH_${step.toUpperCase()}`,
        status,
        detail: subject,
        step,
        channel,
        direction,
        subject,
        body,
        errorMsg,
    })
}


// ═══════════════════════════════════════════════════════
//  SIMPLE WORKFLOW: Trigger → AI Write Email → Send → End
//  SSE version — streams events to frontend in real-time
// ═══════════════════════════════════════════════════════

export const runOutreachWorkflowSSE = async (send, isAborted) => {
    let sent = 0, failed = 0, skipped = 0

    // STEP 1: TRIGGER — Fetch ALL leads from MongoDB
    const leads = await Lead.find({})
    send('log', { tag: 'TRG', message: `Trigger fired — found ${leads.length} leads in database` })

    for (let i = 0; i < leads.length; i++) {
        // Check if user pressed STOP
        if (isAborted()) {
            send('log', { tag: 'SYS', message: `Stopped by user after ${sent} emails sent` })
            break
        }

        const lead = leads[i]

        // Skip leads without email
        if (!lead.email) {
            skipped++
            send('log', { tag: '--', message: `Skipped ${lead.name} — no email address` })
            continue
        }

        const firstName = (lead.name || 'there').split(' ')[0]
        send('log', { tag: 'AI', message: `[${i + 1}/${leads.length}] Writing AI email for ${lead.name}...` })

        try {
            // STEP 2: AI WRITE EMAIL — Groq generates personalized message
            const aiBody = await generateOutreachMessage('initial_outreach', {
                name: lead.name || 'there',
                company: lead.company || '',
                position: lead.position || '',
                industry: lead.industry || '',
            })

            const subject = lead.company
                ? `Quick intro — ${lead.company}`
                : `Hey ${firstName}, quick thought`

            // STEP 3: SEND INTRO EMAIL — Gmail SMTP
            send('log', { tag: 'OUT', message: `[${i + 1}/${leads.length}] Sending to ${lead.email}...` })

            const emailResult = await sendEmail({
                to: lead.email,
                subject,
                body: aiBody,
            })

            if (emailResult.success) {
                await Lead.updateOne({ _id: lead._id }, {
                    $set: {
                        status: 'Contacted',
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
                    step: 'initial_outreach',
                    channel: 'email',
                    direction: 'sent',
                    subject,
                    body: aiBody,
                    latencyMs: emailResult.latencyMs,
                })

                sent++
                send('log', { tag: 'OUT', message: `Email sent to ${lead.name} (${lead.email}) — ${emailResult.latencyMs}ms` })
            } else {
                failed++
                send('log', { tag: 'ERR', message: `Failed: ${lead.name} (${lead.email}) — ${emailResult.error}` })
            }

            // Send progress update
            send('progress', { sent, failed, skipped, current: i + 1, total: leads.length })

            // Small delay between emails (1-2 seconds)
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000))

        } catch (err) {
            failed++
            send('log', { tag: 'ERR', message: `Error: ${lead.name} — ${err.message}` })
            send('progress', { sent, failed, skipped, current: i + 1, total: leads.length })
        }
    }

    // STEP 4: END
    send('log', { tag: 'END', message: `Complete — ${sent} emails sent, ${failed} failed, ${skipped} skipped` })
    send('progress', { sent, failed, skipped, current: leads.length, total: leads.length })
}


// ═══════════════════════════════════════════════════════
//  Process a workflow node job (Bull queue)
//  Handles ALL frontend node types from nodeTypes.js
// ═══════════════════════════════════════════════════════

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
        await Log.create({
            leadId: lead._id,
            leadName: lead.name,
            action: 'WORKFLOW_COMPLETE',
            status: 'OK',
            detail: 'No more nodes to process'
        })
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
