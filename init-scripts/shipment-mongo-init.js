db = db.getSiblingDB('shipment_db');
db.shipments.createIndex({ shipid: 1 }, { unique: true });
db.shipments.createIndex({ oid: 1 }, { unique: true });