export function cacheMiddleware(redisClient, durationSeconds = 30) {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(JSON.parse(cached));
      }

      res.setHeader('X-Cache', 'MISS');
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.setex(key, durationSeconds, JSON.stringify(body)).catch((err) => {
            console.error('Redis cache error:', err.message);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error('Redis cache read error:', err.message);
      next();
    }
  };
}

export async function clearCache(redisClient, key) {
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error('Failed to clear cache for key:', key, err.message);
  }
}
