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
//  OUTREACH WORKFLOW ENGINE — called when user clicks RUN
// ═══════════════════════════════════════════════════════

export const runOutreachWorkflow = async () => {
    const results = {
        total: 0,
        initial_sent: 0,
        follow_up_sent: 0,
        final_reminder_sent: 0,
        skipped_no_contact: 0,
        skipped_bounced: 0,
        skipped_too_soon: 0,
        already_done: 0,
        errors: [],
    }

    // Query all leads in actionable states
    const leads = await Lead.find({
        status: { $nin: ['completed', 'invalid_no_contact', 'email_bounced', 'needs_human', 'manual_conversation'] },
        humanTakeover: { $ne: true },
    })

    results.total = leads.length

    for (const lead of leads) {
        try {
            await processLead(lead, results)
            // Human-like delay between leads (1-3 seconds)
            await new Promise(r => setTimeout(r, randInt(1000, 3000)))
        } catch (err) {
            results.errors.push({
                leadId: lead._id.toString(),
                name: lead.name,
                error: err.message,
            })
        }
    }

    return results
}


// ── Process a single lead ──
const processLead = async (lead, results) => {

    // 1. Validate & route
    const channel = validateAndRoute(lead)
    lead.channel = channel
    await lead.save()

    if (channel === 'none') {
        lead.status = 'invalid_no_contact'
        lead.contactStatus = 'invalid_no_contact'
        await lead.save()
        results.skipped_no_contact++
        return
    }

    // 2. Skip already-bounced
    if (['email_bounced', 'linkedin_failed'].includes(lead.contactStatus)) {
        results.skipped_bounced++
        return
    }

    // 3. Skip paused
    if (lead.status === 'paused') {
        results.skipped_too_soon++
        return
    }

    // 4. Determine next step
    const sentLogs = await Log.find({ leadId: lead._id, direction: 'sent' }).sort({ createdAt: 1 })
    const sentSteps = sentLogs.map(l => l.step).filter(Boolean)

    let step
    if (!sentSteps.includes('initial_outreach')) {
        step = 'initial_outreach'
    } else if (!sentSteps.includes('follow_up')) {
        const days = daysSince(lead.lastContactedAt)
        const minWait = randInt(...FOLLOW_UP_DELAY_DAYS)
        if (days < minWait) {
            results.skipped_too_soon++
            return
        }
        step = 'follow_up'
    } else if (!sentSteps.includes('final_reminder')) {
        const days = daysSince(lead.lastContactedAt)
        const minWait = randInt(...FINAL_REMINDER_DELAY_DAYS)
        if (days < minWait) {
            results.skipped_too_soon++
            return
        }
        step = 'final_reminder'
    } else {
        // All steps sent — mark completed
        if (!['replied', 'needs_human', 'manual_conversation'].includes(lead.status)) {
            lead.status = 'completed'
            await lead.save()
        }
        results.already_done++
        return
    }

    // 5. Generate AI message
    const leadData = {
        name: lead.name || 'there',
        company: lead.company || '',
        position: lead.position || '',
        industry: lead.industry || '',
    }
    const body = await generateOutreachMessage(step, leadData)
    const subject = getSubject(step, lead)

    // 6. Send
    if (['email', 'both'].includes(channel)) {
        const result = await sendEmail({
            to: lead.email,
            subject,
            body,
        })

        if (!result.success) {
            // Check if bounce
            const isBounce = (result.error || '').toLowerCase().includes('refused') ||
                (result.error || '').toLowerCase().includes('bounce')

            if (isBounce) {
                lead.contactStatus = 'email_bounced'
                lead.status = 'email_bounced'
                await lead.save()
                await logAction(lead, step, 'email', 'sent', subject, body, 'BOUNCED', result.error)
                results.skipped_bounced++

                // Fallback to LinkedIn if available
                if (lead.linkedinUrl && lead.linkedinUrl.toLowerCase().includes('linkedin.com')) {
                    lead.channel = 'linkedin'
                    lead.status = 'contacted'
                    await lead.save()
                    await logAction(lead, step, 'linkedin', 'sent', subject, `[LinkedIn fallback — email bounced]\n\n${body}`)
                }
            } else {
                await logAction(lead, step, 'email', 'sent', subject, body, 'FAILED', result.error)
            }
            return
        }

        // Success
        if (!lead.gmailThreadSubject) {
            lead.gmailThreadSubject = subject
        }
        lead.lastContactedAt = new Date()
        lead.status = step === 'initial_outreach' ? 'contacted'
            : step === 'follow_up' ? 'follow_up_sent'
                : 'final_reminder_sent'
        await lead.save()
        await logAction(lead, step, 'email', 'sent', subject, body)

        if (step === 'initial_outreach') results.initial_sent++
        else if (step === 'follow_up') results.follow_up_sent++
        else results.final_reminder_sent++

    } else if (channel === 'linkedin') {
        // Log as LinkedIn attempt (actual send requires LinkedIn API)
        await logAction(lead, step, 'linkedin', 'sent', subject, body)
        lead.lastContactedAt = new Date()
        lead.status = 'contacted'
        await lead.save()
        results.initial_sent++
    }
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
