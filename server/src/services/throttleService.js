import { redis } from '../config/redis.js'

export const checkThrottle = async (campaignId, limitPerHour) => {
    const key = `throttle:${campaignId}:${new Date().getHours()}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 3600)
    return count <= limitPerHour
}
