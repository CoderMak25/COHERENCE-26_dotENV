import { outreachQueue } from '../outreachQueue.js'
import { processJob } from '../../services/executionEngine.js'
import { pollForReplies, sendAiReply, initReplyWorker } from './replyWorker.js'

// Process all queue jobs
outreachQueue.process(async (job) => {
    const data = job.data

    // Route by job type
    if (data.type === 'poll_replies') {
        await pollForReplies()
        return
    }

    if (data.type === 'ai_reply') {
        await sendAiReply(data.leadId, data.replyText)
        return
    }

    // Default: existing workflow node processing
    const { leadId, workflowId, nodeId, campaignId } = data
    await processJob({ leadId, workflowId, nodeId, campaignId })
})

// Register the repeating reply poll job
initReplyWorker()
