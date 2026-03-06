import Lead from '../models/Lead.js'
import Workflow from '../models/Workflow.js'
import Campaign from '../models/Campaign.js'
import Log from '../models/Log.js'
import { generateMessage } from './aiService.js'
import { sendEmail } from './emailService.js'
import { checkThrottle } from './throttleService.js'
import { outreachQueue } from '../queues/outreachQueue.js'

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
            // Requeue with delay
            await outreachQueue.add(
                { leadId, workflowId, nodeId, campaignId },
                { delay: 60000 } // retry in 1 minute
            )
            return
        }
    }

    switch (node.type) {
        case 'email': {
            let subject = node.config?.subject || ''
            let body = node.config?.body || ''

            // If no body, generate via AI
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

            // Replace template variables
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

            // Apply randomization
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

            // Queue next node after delay
            const nextNode = workflow.nodes[nodeIndex + 1]
            if (nextNode) {
                lead.currentStep = nodeIndex + 1
                await lead.save()

                await outreachQueue.add(
                    { leadId, workflowId, nodeId: nextNode.id, campaignId },
                    { delay: delayMs }
                )
            }
            return // Don't advance to next node below
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

            // Find YES/NO branch edges
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
            return // Don't advance linearly
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

    // Advance to next node (linear progression)
    const nextIndex = nodeIndex + 1
    if (workflow && nextIndex < workflow.nodes.length) {
        lead.currentStep = nextIndex
        await lead.save()

        const nextNode = workflow.nodes[nextIndex]
        await outreachQueue.add({ leadId, workflowId, nodeId: nextNode.id, campaignId })
    }
}
