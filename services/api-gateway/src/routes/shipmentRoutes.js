import express from 'express';
import { authenticateJWT,  authorizeRoles } from '../middlewares/auth.js';
import { shipmentClient } from '../grpcClients/index.js';

const router = express.Router();

// API-SHP-01: Get shipment by ID
router.get('/:shipid', authenticateJWT, (req, res) => {
  const shipid = Number(req.params.shipid);
  if (isNaN(shipid)) {
    return res.status(400).json({ error: 'Invalid shipment ID' });
  }

  shipmentClient.GetShipmentById({ shipid }, (err, response) => {
    if (err) {
      if (err.code === 5 || (err.details && err.details.includes('not found'))) {
        return res.status(404).json({ error: 'Shipment not found' });
      }
      return res.status(500).json({ error: err.details || err.message });
    }
    return res.status(200).json({
      shipid: response.shipid,
      oid: response.oid,
      status: response.status,
    });
  });
});

// API-SHP-02: Update shipment status (ShipmentStaff or Admin)
router.patch('/:shipid/status', authenticateJWT, authorizeRoles('ShipmentStaff', 'Admin'), (req, res) => {
  const shipid = Number(req.params.shipid);
  if (isNaN(shipid)) {
    return res.status(400).json({ error: 'Invalid shipment ID' });
  }

  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  shipmentClient.UpdateShipmentStatus({ shipid, status }, (err, response) => {
    if (err) {
      if (err.code === 5 || (err.details && err.details.includes('not found'))) {
        return res.status(404).json({ error: 'Shipment not found' });
      }
      if (err.code === 3 || (err.details && err.details.includes('Invalid status'))) {
        return res.status(400).json({ error: err.details || err.message });
      }
      return res.status(500).json({ error: err.details || err.message });
    }
    return res.status(200).json({
      shipid: response.shipid,
      oid: response.oid,
      status: response.status,
    });
  });
});

export default router;
