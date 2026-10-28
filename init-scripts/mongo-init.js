// 1. PRODUCT DATABASE
db = db.getSiblingDB('product_db');
db.products.drop();
db.products.insertMany([
  { pid: 1, pname: "Laptop", price: 1500.0, quantity: 10 },
  { pid: 2, pname: "Wireless Mouse", price: 25.0, quantity: 50 },
  { pid: 3, pname: "Mechanical Keyboard", price: 100.0, quantity: 20 }
]);
db.products.createIndex({ pid: 1 }, { unique: true });

// 2. SHIPMENT DATABASE
db = db.getSiblingDB('shipment_db');
db.shipments.createIndex({ shipid: 1 }, { unique: true });
db.shipments.createIndex({ oid: 1 }, { unique: true });
