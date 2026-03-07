import Bull from 'bull'

const redisUrl = process.env.REDIS_URL

let outreachQueue = null

if (redisUrl) {
    try {
        const isTls = redisUrl.startsWith('rediss://')
        const bullOptions = {
            redis: {
                maxRetriesPerRequest: null,
                retryStrategy: () => null,
                enableReadyCheck: false,
                reconnectOnError: () => false,
                ...(isTls ? { tls: { rejectUnauthorized: false } } : {})
            }
        }

        outreachQueue = new Bull('outreach', redisUrl, bullOptions)

        // Attach error handlers to Bull's internal ioredis clients
        // so DNS/connection failures don't become unhandled rejections
        const silenceClient = (client) => {
            if (client && typeof client.on === 'function') {
                client.on('error', (err) => {
                    console.warn('Bull redis client error (non-fatal):', err.message)
                })
            }
        }
        silenceClient(outreachQueue.client)
        outreachQueue.on('error', (err) => {
            console.error('Queue error:', err.message)
        })

        outreachQueue.on('completed', (job) => {
            console.log(`Job ${job.id} completed`)
        })

        outreachQueue.on('failed', (job, err) => {
            console.error(`Job ${job.id} failed:`, err.message)
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
