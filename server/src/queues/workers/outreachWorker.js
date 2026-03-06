import { outreachQueue } from '../outreachQueue.js'
import { processJob } from '../../services/executionEngine.js'

outreachQueue.process(async (job) => {
    const { leadId, workflowId, nodeId, campaignId } = job.data
    await processJob({ leadId, workflowId, nodeId, campaignId })
})
