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
//  EXISTING: Process a workflow node job (Bull queue)
// ═══════════════════════════════════════════════════════

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
    let nodeIndex = -1

    if (workflow && workflow.nodes.length > 0) {
        if (nodeId) {
            nodeIndex = workflow.nodes.findIndex(n => n.id === nodeId)
            node = workflow.nodes[nodeIndex]
        } else {
            nodeIndex = lead.currentStep || 0
            node = workflow.nodes[nodeIndex]
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

    // Check throttle
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

    switch (node.type) {
        case 'email': {
            let subject = node.config?.subject || ''
            let body = node.config?.body || ''

            if (!body) {
                try {
                    const generated = await generateMessage(lead, 'email')
                    subject = generated.subject
                    body = generated.body
                } catch (err) {
                    await Log.create({
                        leadId: lead._id,
                        leadName: lead.name,
                        action: 'AI_GENERATE_FAILED',
                        status: 'FAILED',
                        detail: err.message
                    })
                    return
                }
            }

            subject = subject.replace(/\{\{first_name\}\}/g, lead.name.split(' ')[0])
                .replace(/\{\{company\}\}/g, lead.company || '')
                .replace(/\{\{name\}\}/g, lead.name)
            body = body.replace(/\{\{first_name\}\}/g, lead.name.split(' ')[0])
                .replace(/\{\{company\}\}/g, lead.company || '')
                .replace(/\{\{name\}\}/g, lead.name)

            const result = await sendEmail({ to: lead.email, subject, body })

            if (result.success) {
                lead.status = 'Contacted'
                lead.lastContact = new Date()
                await lead.save()

                if (campaign) {
                    campaign.stats.sent = (campaign.stats.sent || 0) + 1
                    await campaign.save()
                }

                await Log.create({
                    leadId: lead._id,
                    leadName: lead.name,
                    action: 'EMAIL_SENT',
                    status: 'SENT',
                    detail: `subject: ${subject}`,
                    latencyMs: result.latencyMs
                })
            } else {
                if (campaign) {
                    campaign.stats.failed = (campaign.stats.failed || 0) + 1
                    await campaign.save()
                }

                await Log.create({
                    leadId: lead._id,
                    leadName: lead.name,
                    action: 'EMAIL_FAILED',
                    status: 'FAILED',
                    detail: result.error,
                    latencyMs: result.latencyMs
                })
            }
            break
        }

        case 'wait': {
            const delayDays = node.config?.delayDays || 1
            let delayMs = delayDays * 24 * 60 * 60 * 1000

            if (node.config?.randomize) {
                const pct = (node.config.randomizePct || 20) / 100
                const variance = delayMs * pct
                delayMs += (Math.random() * 2 - 1) * variance
            }

            await Log.create({
                leadId: lead._id,
                leadName: lead.name,
                action: 'DELAY_ACTIVE',
                status: 'PENDING',
                detail: `wait: ${delayDays} days`
            })

            const nextNode = workflow.nodes[nodeIndex + 1]
            if (nextNode) {
                lead.currentStep = nodeIndex + 1
                await lead.save()

                await outreachQueue.add(
                    { leadId, workflowId, nodeId: nextNode.id, campaignId },
                    { delay: delayMs }
                )
            }
            return
        }

        case 'condition': {
            const conditionField = node.config?.condition || 'status'
            const conditionVal = node.config?.conditionVal || 'Opened'
            const leadValue = lead[conditionField] || lead.status

            const passed = leadValue === conditionVal

            await Log.create({
                leadId: lead._id,
                leadName: lead.name,
                action: 'CONDITION_CHECK',
                status: 'OK',
                detail: `${conditionField} ${passed ? '=' : '≠'} ${conditionVal}`
            })

            const edges = workflow.edges || []
            const yesEdge = edges.find(e => e.source === node.id && (e.label === 'YES' || e.label === 'yes'))
            const noEdge = edges.find(e => e.source === node.id && (e.label === 'NO' || e.label === 'no'))

            const nextEdge = passed ? yesEdge : noEdge
            if (nextEdge) {
                const nextNode = workflow.nodes.find(n => n.id === nextEdge.target)
                if (nextNode) {
                    await outreachQueue.add({ leadId, workflowId, nodeId: nextNode.id, campaignId })
                }
            }
            return
        }

        case 'linkedin': {
            await Log.create({
                leadId: lead._id,
                leadName: lead.name,
                action: 'LINKEDIN_DM',
                status: 'SENT',
                detail: `LinkedIn DM queued for ${lead.name}`
            })
            break
        }

        case 'stop': {
            await Log.create({
                leadId: lead._id,
                leadName: lead.name,
                action: 'WORKFLOW_STOP',
                status: 'OK',
                detail: 'Workflow stopped'
            })
            return
        }

        default: {
            await Log.create({
                leadId: lead._id,
                leadName: lead.name,
                action: 'UNKNOWN_NODE',
                status: 'SKIPPED',
                detail: `Unknown node type: ${node.type}`
            })
        }
    }

    // Advance to next node
    const nextIndex = nodeIndex + 1
    if (workflow && nextIndex < workflow.nodes.length) {
        lead.currentStep = nextIndex
        await lead.save()

        const nextNode = workflow.nodes[nextIndex]
        await outreachQueue.add({ leadId, workflowId, nodeId: nextNode.id, campaignId })
    }
}
