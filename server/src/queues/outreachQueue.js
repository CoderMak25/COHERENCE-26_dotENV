import Bull from 'bull'

export const outreachQueue = new Bull('outreach', {
    redis: { host: 'localhost', port: 6379 }
})

outreachQueue.on('completed', (job) => {
    console.log(`Job ${job.id} completed`)
})

outreachQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err)
})

export default outreachQueue
