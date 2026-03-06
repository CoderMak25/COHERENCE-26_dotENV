import Bull from 'bull'

const redisUrl = process.env.REDIS_URL

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

outreachQueue.on('completed', (job) => {
    console.log(`Job ${job.id} completed`)
})

outreachQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err)
})

export default outreachQueue
