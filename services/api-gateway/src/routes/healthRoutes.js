import express from 'express';

export function createHealthRoutes(redisClient) {
  const router = express.Router();

  router.get('/health', async (_req, res) => {
    try {
      await redisClient.ping();
      res.status(200).json({
        status: 'UP',
        message: 'E-commerce API is running',
        services: {
          gateway: 'UP',
          redis: 'UP',
        },
      });
    } catch (err) {
      res.status(503).json({
        status: 'DOWN',
        message: 'Health check failed: Redis unreachable',
        error: err.message,
      });
    }
  });

  return router;
}
