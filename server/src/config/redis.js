import { Redis as UpstashRedis } from '@upstash/redis'
import IORedis from 'ioredis'

const hasUpstashRest = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

const createRedisClient = () => {
    if (hasUpstashRest) {
        return new UpstashRedis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN
        })
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    const isTls = redisUrl.startsWith('rediss://')
    return new IORedis(redisUrl, isTls ? { tls: {} } : undefined)
}

export const redis = createRedisClient()

if (typeof redis?.on === 'function') {
    redis.on('connect', () => console.log('Redis connected'))
    redis.on('error', (err) => console.error('Redis error:', err))
} else {
    console.log('Redis configured (Upstash REST)')
}

export default redis
