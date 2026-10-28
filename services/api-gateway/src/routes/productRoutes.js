import express from 'express';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.js';
import { cacheMiddleware, clearCache } from '../middlewares/cache.js';
import { productClient } from '../grpcClients/index.js';

export function createProductRoutes(redisClient) {
  const router = express.Router();

  // API-PRO-01: Get product list (cached in Redis)
  router.get('/', authenticateJWT, cacheMiddleware(redisClient, 30), (_req, res) => {
    productClient.GetProducts({}, (err, response) => {
      if (err) {
        return res.status(500).json({ error: err.details || err.message });
      }
      return res.status(200).json(response);
    });
  });

  // API-PRO-02: Get product by ID
  router.get('/:pid', authenticateJWT, (req, res) => {
    const pid = Number(req.params.pid);
    if (isNaN(pid)) {
      return res.status(400).json({ error: 'Invalid product PID' });
    }

    productClient.GetProductById({ pid }, (err, response) => {
      if (err) {
        if (err.code === 5 || (err.details && err.details.includes('not found'))) {
          return res.status(404).json({ error: 'Product not found' });
        }
        return res.status(500).json({ error: err.details || err.message });
      }
      return res.status(200).json(response);
    });
  });

  // API-PRO-03: Create product (Admin only)
  router.post('/', authenticateJWT, authorizeRoles('Admin'), async (req, res) => {
    const { pname, price, quantity } = req.body;
    if (!pname || price === undefined || quantity === undefined) {
      return res.status(400).json({ error: 'Missing required product fields (pname, price, quantity)' });
    }

    productClient.CreateProduct({ pname, price: Number(price), quantity: Number(quantity) }, async (err, response) => {
      if (err) {
        return res.status(400).json({ error: err.details || err.message });
      }
      await clearCache(redisClient, 'cache:/api/products');
      return res.status(201).json(response);
    });
  });

  // API-PRO-04: Update product (Admin only)
  router.put('/:pid', authenticateJWT, authorizeRoles('Admin'), async (req, res) => {
    const pid = Number(req.params.pid);
    if (isNaN(pid)) {
      return res.status(400).json({ error: 'Invalid product PID' });
    }

    const { pname, price, quantity } = req.body;
    productClient.UpdateProduct({
      pid,
      pname: pname || '',
      price: price !== undefined ? Number(price) : -1,
      quantity: quantity !== undefined ? Number(quantity) : -1,
    }, async (err, response) => {
      if (err) {
        if (err.code === 5 || (err.details && err.details.includes('not found'))) {
          return res.status(404).json({ error: 'Product not found' });
        }
        return res.status(400).json({ error: err.details || err.message });
      }
      await clearCache(redisClient, 'cache:/api/products');
      return res.status(200).json({
        message: 'Product updated successfully',
        pid: response.pid,
      });
    });
  });

  // API-PRO-05: Delete product (Admin only)
  router.delete('/:pid', authenticateJWT, authorizeRoles('Admin'), async (req, res) => {
    const pid = Number(req.params.pid);
    if (isNaN(pid)) {
      return res.status(400).json({ error: 'Invalid product PID' });
    }

    productClient.DeleteProduct({ pid }, async (err, response) => {
      if (err) {
        if (err.code === 5 || (err.details && err.details.includes('not found'))) {
          return res.status(404).json({ error: 'Product not found' });
        }
        return res.status(400).json({ error: err.details || err.message });
      }
      await clearCache(redisClient, 'cache:/api/products');
      return res.status(200).json({
        message: 'Product deleted successfully',
        pid: response.pid,
      });
    });
  });

  return router;
}
