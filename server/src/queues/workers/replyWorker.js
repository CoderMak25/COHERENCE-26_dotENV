import Lead from '../../models/Lead.js'
import Log from '../../models/Log.js'
import { getThreadMessages, getConnectionStatus } from '../../services/gmailService.js'
import { generateOutreachMessage } from '../../services/aiService.js'
import { sendEmail } from '../../services/emailService.js'
import { outreachQueue } from '../outreachQueue.js'

const MAX_AI_REPLIES = 3
const REPLY_DELAY_MIN_MS = 45 * 60 * 1000    // 45 minutes
const REPLY_DELAY_MAX_MS = 300 * 60 * 1000   // 5 hours

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

/**
 * Poll Gmail for replies using Gmail API (thread-based).
 * Falls back to subject-based matching if no threadId.
 */
export const pollForReplies = async () => {
    console.log('[ReplyWorker] Polling for replies...')

    // Check if Gmail is connected
    const gmailStatus = await getConnectionStatus()
    if (!gmailStatus.connected) {
        console.log('[ReplyWorker] Gmail not connected — skipping reply poll')
        return { repliesFound: 0 }
    }

    // Find leads that have been emailed and have a Gmail threadId
    const activeLeads = await Lead.find({
        status: { $in: ['Contacted', 'contacted', 'Replied', 'follow_up_sent', 'final_reminder_sent', 'replied'] },
        humanTakeover: { $ne: true },
        gmailThreadId: { $ne: null },
    })

    let repliesFound = 0

    for (const lead of activeLeads) {
        try {
            // Get all messages in the thread
            const messages = await getThreadMessages(lead.gmailThreadId)
            if (!messages || messages.length <= 1) continue  // Only our sent message, no reply

            // Find messages NOT from us (replies from the lead)
            const replies = messages.filter(msg => {
                const fromEmail = msg.from.match(/<(.+?)>/)?.[1] || msg.from
                return fromEmail.toLowerCase() !== gmailStatus.email.toLowerCase()
            })

            if (replies.length === 0) continue

            // Get the latest reply
            const latestReply = replies[replies.length - 1]

            // Check if we already logged this reply (by messageId)
            const alreadyHandled = await Log.findOne({
                leadId: lead._id,
                direction: 'received',
                detail: { $regex: latestReply.id }
            })

            if (alreadyHandled) continue

            // New reply found!
            await handleReply(lead, latestReply.snippet || latestReply.subject, latestReply.id)
            repliesFound++
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
const handleReply = async (lead, replyText, messageId) => {
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
        detail: `Gmail messageId: ${messageId}`,
    })

    lead.status = 'Replied'
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
 */
export const sendAiReply = async (leadId, replyText) => {
    const lead = await Lead.findById(leadId)
    if (!lead) return

    if (lead.humanTakeover || ['needs_human', 'manual_conversation'].includes(lead.status)) {
        return
    }

    if (lead.aiReplyCount >= MAX_AI_REPLIES) {
        lead.status = 'needs_human'
        await lead.save()
        return
    }

    const responseBody = await generateOutreachMessage('reply_response', {
        name: lead.name || 'there',
        leadReply: replyText,
    })

    const result = await sendEmail({
        to: lead.email,
        subject: `Re: ${lead.gmailThreadSubject}`,
        body: responseBody,
    })

    if (result.success) {
        lead.aiReplyCount++

        // Update threadId if new one returned (Gmail API)
        if (result.threadId) lead.gmailThreadId = result.threadId

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
            lead.status = 'Replied'
        }

        await lead.save()
    } else {
        console.error(`[ReplyWorker] Failed to send AI reply to ${lead.email}:`, result.error)
    }
}


// ── Register the repeating job ──
export const initReplyWorker = () => {
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
