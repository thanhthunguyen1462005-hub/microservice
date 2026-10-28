import express from 'express';
import { authenticateJWT } from '../middlewares/auth.js';
import { customerClient } from '../grpcClients/index.js';

const router = express.Router();

// API-CUS-01: Get customer information
router.get('/:uid', authenticateJWT, (req, res) => {
  const uid = Number(req.params.uid);
  if (isNaN(uid)) {
    return res.status(400).json({ error: 'Invalid customer UID' });
  }

  customerClient.GetCustomer({ uid }, (err, response) => {
    if (err) {
      if (err.code === 5 || (err.details && err.details.includes('not found'))) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      return res.status(500).json({ error: err.details || err.message });
    }
    return res.status(200).json({
      uid: response.uid,
      fullname: response.fullname,
      mid: response.mid,
    });
  });
});

// API-CUS-02: Update customer information
router.put('/:uid', authenticateJWT, (req, res) => {
  const uid = Number(req.params.uid);
  if (isNaN(uid)) {
    return res.status(400).json({ error: 'Invalid customer UID' });
  }

  const { fullname, mid } = req.body;
  if (!fullname && mid === undefined) {
    return res.status(400).json({ error: 'No update data provided' });
  }

  customerClient.UpdateCustomer({ uid, fullname, mid: mid ? Number(mid) : 0 }, (err, response) => {
    if (err) {
      return res.status(400).json({ error: err.details || err.message });
    }
    return res.status(200).json({
      message: 'Customer updated successfully',
      uid: response.uid,
    });
  });
});

export default router;
