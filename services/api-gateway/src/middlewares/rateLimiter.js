import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

export function createRateLimiter(redisClient) {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // @ts-ignore
      sendCommand: (...args) => redisClient.call(...args),
    }),
    message: { error: 'Too many requests, please try again later.' },
  });
}
