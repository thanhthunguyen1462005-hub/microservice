import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import { getShipmentById, updateShipmentStatus } from './shipmentService.js';
import { OrderCreatedConsumer } from './kafkaConsumer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = process.env.SHIPMENT_PROTO_PATH || path.resolve(__dirname, '../../../shared/proto/shipment.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const shipmentProto = grpc.loadPackageDefinition(packageDefinition).shipment;

async function start() {
  await connectDB();

  const server = new grpc.Server();

  server.addService(shipmentProto.ShipmentService.service, {
    GetShipmentById: async (call, callback) => {
      try {
        const response = await getShipmentById(call.request);
        callback(null, response);
      } catch (err) {
        const code = err.code === 'NOT_FOUND' ? grpc.status.NOT_FOUND : grpc.status.INTERNAL;
        callback({ code, details: err.message });
      }
    },

    UpdateShipmentStatus: async (call, callback) => {
      try {
        const response = await updateShipmentStatus(call.request);
        callback(null, response);
      } catch (err) {
        let code = grpc.status.INTERNAL;
        if (err.code === 'NOT_FOUND') code = grpc.status.NOT_FOUND;
        if (err.code === 'INVALID_ARGUMENT') code = grpc.status.INVALID_ARGUMENT;
        callback({ code, details: err.message });
      }
    },
  });

  const PORT = process.env.PORT || '50055';
  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('Failed to bind Shipment Service gRPC server:', err);
      process.exit(1);
    }
    console.log(`[Shipment Service] gRPC running on port ${port}`);
  });

  // Start Kafka Consumer
  const consumer = new OrderCreatedConsumer();
  consumer.start().catch((err) => {
    console.error('[Shipment Service] Kafka Consumer startup failed:', err.message);
  });
}

start().catch((err) => {
  console.error('[Shipment Service] Startup fatal error:', err);
  process.exit(1);
});
