import Bull from 'bull'

const redisUrl = process.env.REDIS_URL

let outreachQueue = null

if (redisUrl) {
    try {
        const isTls = redisUrl.startsWith('rediss://')
        const bullOptions = {
            redis: {
                maxRetriesPerRequest: null,
                retryStrategy: () => null, // Just drop the connection instead of crashing apps
                enableReadyCheck: false,
                ...(isTls ? { tls: { rejectUnauthorized: false } } : {})
            }
        }

        // Bull handles parsing the redisUrl if we pass it as string with opts
        outreachQueue = new Bull('outreach', redisUrl, bullOptions)

        outreachQueue.on('completed', (job) => {
            console.log(`Job ${job.id} completed`)
        })

        outreachQueue.on('failed', (job, err) => {
            console.error(`Job ${job.id} failed:`, err.message)
        })

        outreachQueue.on('error', (err) => {
            console.error('Queue error:', err.message)
        })
    } catch (err) {
        console.warn('Bull queue init failed:', err.message)
        outreachQueue = null
    }
} else {
    console.warn('Bull queue skipped: REDIS_URL not configured. Background automation jobs will not run.')
}

export { outreachQueue }
export default outreachQueue
