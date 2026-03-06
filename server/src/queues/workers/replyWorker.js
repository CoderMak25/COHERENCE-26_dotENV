import Lead from '../../models/Lead.js'
import Log from '../../models/Log.js'
import { checkForReply } from '../../services/replyDetector.js'
import { generateOutreachMessage } from '../../services/aiService.js'
import { sendEmail } from '../../services/emailService.js'
import { outreachQueue } from '../outreachQueue.js'

const MAX_AI_REPLIES = 3
const REPLY_DELAY_MIN_MS = 45 * 60 * 1000    // 45 minutes
const REPLY_DELAY_MAX_MS = 300 * 60 * 1000   // 5 hours

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

/**
 * Poll Gmail inbox for replies from all active leads.
 * Called as a repeating Bull job every 5 minutes.
 */
export const pollForReplies = async () => {
    console.log('[ReplyWorker] Polling for replies...')

    const activeLeads = await Lead.find({
        status: { $in: ['contacted', 'follow_up_sent', 'final_reminder_sent', 'replied'] },
        humanTakeover: { $ne: true },
        channel: { $in: ['email', 'both'] },
        gmailThreadSubject: { $ne: null },
    })

    let repliesFound = 0

    for (const lead of activeLeads) {
        try {
            const result = await checkForReply(lead.email, lead.gmailThreadSubject)

            if (result.replied && result.replyText) {
                // Check if we already logged this reply
                const alreadyHandled = await Log.findOne({
                    leadId: lead._id,
                    direction: 'received',
                }).sort({ createdAt: -1 })

                if (alreadyHandled) continue

                await handleReply(lead, result.replyText)
                repliesFound++
            }
        } catch (err) {
            console.error(`[ReplyWorker] Error checking ${lead.email}:`, err.message)
        }
    }

    console.log(`[ReplyWorker] Done. Found ${repliesFound} new replies.`)
    return { repliesFound }
}

/**
 * Handle a detected reply from a lead.
 */
const handleReply = async (lead, replyText) => {
    // Log the received reply
    await Log.create({
        leadId: lead._id,
        leadName: lead.name,
        action: 'REPLY_RECEIVED',
        status: 'RECEIVED',
        step: 'reply_received',
        channel: 'email',
        direction: 'received',
        subject: `Re: ${lead.gmailThreadSubject}`,
        body: replyText,
    })

    lead.status = 'replied'
    lead.lastRepliedAt = new Date()
    await lead.save()

    // Stop if human took over
    if (lead.humanTakeover) return

    // Stop if AI reply limit reached
    if (lead.aiReplyCount >= MAX_AI_REPLIES) {
        lead.status = 'needs_human'
        await lead.save()
        return
    }

    // Schedule AI reply with human-like delay
    const delayMs = randInt(REPLY_DELAY_MIN_MS, REPLY_DELAY_MAX_MS)

    await outreachQueue.add(
        { type: 'ai_reply', leadId: lead._id.toString(), replyText },
        { delay: delayMs }
    )

    console.log(`[ReplyWorker] Scheduled AI reply for ${lead.name} in ${Math.round(delayMs / 60000)} min`)
}

/**
 * Send an AI-generated reply to a lead's message.
 * Called from Bull queue after delay.
 */
export const sendAiReply = async (leadId, replyText) => {
    const lead = await Lead.findById(leadId)
    if (!lead) return

    // Guard — check if taken over while waiting
    if (lead.humanTakeover || ['needs_human', 'manual_conversation'].includes(lead.status)) {
        return
    }

    // Re-check limit
    if (lead.aiReplyCount >= MAX_AI_REPLIES) {
        lead.status = 'needs_human'
        await lead.save()
        return
    }

    // Generate AI response
    const responseBody = await generateOutreachMessage('reply_response', {
        name: lead.name || 'there',
        leadReply: replyText,
    })

    // Send
    const result = await sendEmail({
        to: lead.email,
        subject: `Re: ${lead.gmailThreadSubject}`,
        body: responseBody,
    })

    if (result.success) {
        lead.aiReplyCount++

        await Log.create({
            leadId: lead._id,
            leadName: lead.name,
            action: `AI_REPLY_${lead.aiReplyCount}`,
            status: 'SENT',
            step: `ai_reply_${lead.aiReplyCount}`,
            channel: 'email',
            direction: 'sent',
            subject: `Re: ${lead.gmailThreadSubject}`,
            body: responseBody,
        })

        if (lead.aiReplyCount >= MAX_AI_REPLIES) {
            lead.status = 'needs_human'
        } else {
            lead.status = 'replied'
        }

        await lead.save()
    } else {
        console.error(`[ReplyWorker] Failed to send AI reply to ${lead.email}:`, result.error)
    }
}


// ── Register the repeating job and AI reply handler ──
export const initReplyWorker = () => {
    // Add repeating job for reply polling (every 5 minutes)
    outreachQueue.add(
        { type: 'poll_replies' },
        {
            repeat: { every: 5 * 60 * 1000 },
            jobId: 'reply-poll',
            removeOnComplete: true,
        }
    )
    console.log('[ReplyWorker] Registered reply polling job (every 5 min)')
}
