import { getDB } from './db.js';

const VALID_STATUSES = ['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];

export async function getShipmentById({ shipid }) {
  const db = getDB();
  const shipment = await db.collection('shipments').findOne(
    { shipid: Number(shipid) },
    { projection: { _id: 0 } }
  );

  if (!shipment) {
    const error = new Error(`Shipment with shipid ${shipid} not found`);
    error.code = 'NOT_FOUND';
    throw error;
  }

  return shipment;
}

export async function updateShipmentStatus({ shipid, status }) {
  const db = getDB();
  const sIdNum = Number(shipid);

  if (!status || !VALID_STATUSES.includes(status.toUpperCase())) {
    const error = new Error(`Invalid status '${status}'. Must be one of: ${VALID_STATUSES.join(', ')}`);
    error.code = 'INVALID_ARGUMENT';
    throw error;
  }

  const normalizedStatus = status.toUpperCase();

  const existing = await db.collection('shipments').findOne({ shipid: sIdNum });
  if (!existing) {
    const error = new Error(`Shipment with shipid ${shipid} not found`);
    error.code = 'NOT_FOUND';
    throw error;
  }

  await db.collection('shipments').updateOne(
    { shipid: sIdNum },
    { $set: { status: normalizedStatus, updatedAt: new Date() } }
  );

  const updated = await db.collection('shipments').findOne(
    { shipid: sIdNum },
    { projection: { _id: 0 } }
  );

  return updated;
}
