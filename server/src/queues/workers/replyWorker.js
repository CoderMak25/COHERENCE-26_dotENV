import Lead from '../../models/Lead.js'
import Log from '../../models/Log.js'
import { getThreadMessages, getConnectionStatus } from '../../services/gmailService.js'
import { generateOutreachMessage } from '../../services/aiService.js'
import { sendEmail } from '../../services/emailService.js'
import { outreachQueue } from '../outreachQueue.js'

const MAX_AI_REPLIES = 3
// ⚡ TESTING: 1 min delay (change back to 45*60*1000 / 300*60*1000 for production)
const REPLY_DELAY_MIN_MS = 1 * 60 * 1000     // 1 minute (testing)
const REPLY_DELAY_MAX_MS = 1 * 60 * 1000     // 1 minute (testing)

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

/**
 * Poll Gmail for replies using Gmail API (thread-based).
 */
export const pollForReplies = async () => {
    console.log('[ReplyWorker] Polling for replies...')

    // Check if Gmail is connected
    const gmailStatus = await getConnectionStatus()
    if (!gmailStatus.connected) {
        console.log('[ReplyWorker] Gmail not connected — skipping reply poll')
        return { repliesFound: 0 }
    }

    console.log(`[ReplyWorker] Gmail connected as ${gmailStatus.email}`)

    // Find ALL leads that have a Gmail threadId (any status except explicitly excluded ones)
    const activeLeads = await Lead.find({
        gmailThreadId: { $ne: null },
        humanTakeover: { $ne: true },
        status: { $nin: ['needs_human', 'manual_conversation', 'Unsubscribed', 'invalid_no_contact'] },
    })

    console.log(`[ReplyWorker] Found ${activeLeads.length} leads with threadId to check`)

    if (activeLeads.length === 0) {
        // Debug: check if any leads exist with the email
        const allLeads = await Lead.find({}).select('email status gmailThreadId').limit(10)
        console.log(`[ReplyWorker] Debug — sample leads:`, allLeads.map(l => ({
            email: l.email,
            status: l.status,
            threadId: l.gmailThreadId || 'NONE'
        })))
    }

    let repliesFound = 0

    for (const lead of activeLeads) {
        try {
            console.log(`[ReplyWorker] Checking thread ${lead.gmailThreadId} for ${lead.email}...`)

            // Get all messages in the thread
            const messages = await getThreadMessages(lead.gmailThreadId)
            console.log(`[ReplyWorker] Thread ${lead.gmailThreadId} has ${messages?.length || 0} messages`)

            if (!messages || messages.length <= 1) continue  // Only our sent message, no reply

            // Find messages NOT from us (replies from the lead)
            const replies = messages.filter(msg => {
                const fromEmail = msg.from.match(/<(.+?)>/)?.[1] || msg.from
                const isFromUs = fromEmail.toLowerCase() === gmailStatus.email.toLowerCase()
                if (!isFromUs) {
                    console.log(`[ReplyWorker] Found reply from ${fromEmail}: "${msg.snippet?.substring(0, 50)}..."`)
                }
                return !isFromUs
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

            if (alreadyHandled) {
                console.log(`[ReplyWorker] Reply ${latestReply.id} already handled, skipping`)
                continue
            }

            // New reply found!
            console.log(`[ReplyWorker] ✓ NEW REPLY from ${lead.email}!`)
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

    console.log(`[ReplyWorker] Lead ${lead.name} status → Replied`)

    // Stop if human took over
    if (lead.humanTakeover) return

    // Stop if AI reply limit reached
    if (lead.aiReplyCount >= MAX_AI_REPLIES) {
        lead.status = 'needs_human'
        await lead.save()
        console.log(`[ReplyWorker] Lead ${lead.name} hit max AI replies → needs_human`)
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

    console.log(`[ReplyWorker] Generating AI reply for ${lead.name} using past conversation...`)

    // Fetch past conversation logs for context
    const pastLogs = await Log.find({
        leadId: lead._id,
        channel: 'email',
        direction: { $in: ['sent', 'received'] },
    }).sort({ createdAt: 1 }).limit(20)

    // Build conversation history string
    const conversationHistory = pastLogs.map(log => {
        const role = log.direction === 'sent' ? 'Us' : lead.name
        return `[${role}]: ${log.body || log.detail || '(no content)'}`
    }).join('\n')

    const responseBody = await generateOutreachMessage('reply_response', {
        name: lead.name || 'there',
        company: lead.company || '',
        position: lead.position || '',
        leadReply: replyText,
        conversationHistory,
    })

    const result = await sendEmail({
        to: lead.email,
        subject: `Re: ${lead.gmailThreadSubject}`,
        body: responseBody,
        threadId: lead.gmailThreadId,  // Reply in same thread
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
        console.log(`[ReplyWorker] ✓ AI reply #${lead.aiReplyCount} sent to ${lead.email}`)
    } else {
        console.error(`[ReplyWorker] Failed to send AI reply to ${lead.email}:`, result.error)
    }
}


// ── Register the repeating job ──
export const initReplyWorker = () => {
    outreachQueue.add(
        { type: 'poll_replies' },
        {
            repeat: { every: 1 * 60 * 1000 },
            jobId: 'reply-poll-1min',
            removeOnComplete: true,
        }
    )
    console.log('[ReplyWorker] Registered reply polling job (every 1 min)')
}
