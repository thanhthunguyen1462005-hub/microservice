import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { createRateLimiter } from './middlewares/rateLimiter.js';
import { createHealthRoutes } from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import { createProductRoutes } from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import shipmentRoutes from './routes/shipmentRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = Number(process.env.REDIS_PORT) || 6379;

const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redisClient.on('connect', () => {
  console.log('[API Gateway] Connected to Redis successfully');
});

redisClient.on('error', (err) => {
  console.warn('[API Gateway] Redis error:', err.message);
});

// Redis-backed Rate Limiter
app.use(createRateLimiter(redisClient));

// Register API Routes
app.use('/api', createHealthRoutes(redisClient));
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', createProductRoutes(redisClient));
app.use('/api/orders', orderRoutes);
app.use('/api/shipments', shipmentRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.url}` });
});

// Central Error Handler
app.use((err, _req, res, _next) => {
  console.error('[API Gateway] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[API Gateway] Listening on http://0.0.0.0:${PORT}`);
});
