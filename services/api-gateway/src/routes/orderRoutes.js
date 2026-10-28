import express from 'express';
import { authenticateJWT } from '../middlewares/auth.js';
import { orderClient } from '../grpcClients/index.js';

const router = express.Router();

// API-ORD-01: Create order
router.post('/', authenticateJWT, (req, res) => {
  const uid = req.user.sub;
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order items array is required' });
  }

  // Validate items format
  for (const item of items) {
    if (!item.pid || !item.qty || Number(item.qty) <= 0) {
      return res.status(400).json({ error: 'Each item must have a valid pid and positive qty' });
    }
  }

  orderClient.CreateOrder({ uid, items }, (err, response) => {
    if (err) {
      const msg = err.details || err.message;
      if (err.code === 9 || msg.includes('Insufficient stock')) {
        return res.status(409).json({ error: msg });
      }
      if (err.code === 5 || msg.includes('not found')) {
        return res.status(404).json({ error: msg });
      }
      return res.status(400).json({ error: msg });
    }

    return res.status(201).json({
      oid: response.oid,
      uid: response.uid,
      discount: response.discount,
      total_amount: response.total_amount,
      items: response.items,
      shipment: response.shipment,
    });
  });
});

// API-ORD-02: Get current user's orders
router.get('/', authenticateJWT, (req, res) => {
  const uid = req.user.sub;

  orderClient.GetOrdersByUid({ uid }, (err, response) => {
    if (err) {
      return res.status(500).json({ error: err.details || err.message });
    }
    return res.status(200).json({
      items: response.items || [],
    });
  });
});

// API-ORD-03: Get order by ID
router.get('/:oid', authenticateJWT, (req, res) => {
  const oid = Number(req.params.oid);
  if (isNaN(oid)) {
    return res.status(400).json({ error: 'Invalid order OID' });
  }

  const uid = req.user.sub;
  const role = req.user.role;

  orderClient.GetOrderById({ oid, uid, role }, (err, response) => {
    if (err) {
      if (err.code === 5 || (err.details && err.details.includes('not found'))) {
        return res.status(404).json({ error: 'Order not found' });
      }
      if (err.code === 7 || (err.details && err.details.includes('Forbidden'))) {
        return res.status(403).json({ error: 'Forbidden: Cannot access this order' });
      }
      return res.status(500).json({ error: err.details || err.message });
    }

    return res.status(200).json({
      oid: response.oid,
      uid: response.uid,
      discount: response.discount,
      total_amount: response.total_amount,
      items: response.items,
      created_at: response.created_at,
    });
  });
});

export default router;
