import Bull from 'bull'

const redisUrl = process.env.REDIS_URL

<<<<<<< HEAD
let outreachQueue = null
=======
// Configure Bull/ioredis so connection failures don't crash the app
const bullOptions = redisUrl
    ? {
          redis: {
              // Use Upstash TLS endpoint via REDIS_URL
              url: redisUrl,
              // Prevent MaxRetriesPerRequestError from crashing the process
              maxRetriesPerRequest: null
          }
      }
    : {
          redis: {
              host: 'localhost',
              port: 6379,
              maxRetriesPerRequest: null
          }
      }

export const outreachQueue = new Bull('outreach', bullOptions)
>>>>>>> 48925e81898f1b917118369c61819c8d193b9ce4

if (redisUrl) {
    try {
        outreachQueue = new Bull('outreach', redisUrl)

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
    console.warn('Bull queue skipped: REDIS_URL not configured. (Bull requires a standard Redis TCP connection and does not work with Upstash REST). Background automation jobs will not run.')
}

export { outreachQueue }
export default outreachQueue
