import { outreachQueue } from '../outreachQueue.js'

// Only set up workers if queue is available
if (outreachQueue) {
    let processJob
    let pollForReplies, sendAiReply, initReplyWorker

    try {
        const engine = await import('../../services/executionEngine.js')
        processJob = engine.processJob
    } catch (e) {
        console.warn('Execution engine not available:', e.message)
    }

    try {
        const replyMod = await import('./replyWorker.js')
        pollForReplies = replyMod.pollForReplies
        sendAiReply = replyMod.sendAiReply
        initReplyWorker = replyMod.initReplyWorker
    } catch (e) {
        console.warn('Reply worker not available:', e.message)
    }

    // Process all queue jobs concurrently (up to 10 at a time) to speed up sending
    outreachQueue.process(10, async (job) => {
        const data = job.data

        if (data.type === 'poll_replies' && pollForReplies) {
            await pollForReplies()
            return
        }

        if (data.type === 'ai_reply' && sendAiReply) {
            await sendAiReply(data.leadId, data.replyText)
            return
        }

        if (processJob) {
            const { leadId, workflowId, nodeId, campaignId } = data
            await processJob({ leadId, workflowId, nodeId, campaignId })
        }
    })

    if (initReplyWorker) {
        try {
            initReplyWorker()
        } catch (e) {
            console.warn('Reply worker init failed:', e.message)
        }
    }
} else {
    console.warn('Queue not available — workers disabled')
}
