import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import dotenv from 'dotenv';
import { createOrder, getOrdersByUid, getOrderById } from './orderService.js';
import { OutboxPublisher } from './outboxPublisher.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = process.env.ORDER_PROTO_PATH || path.resolve(__dirname, '../../../shared/proto/order.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const orderProto = grpc.loadPackageDefinition(packageDefinition).order;

async function start() {
  const server = new grpc.Server();

  server.addService(orderProto.OrderService.service, {
    CreateOrder: async (call, callback) => {
      try {
        const response = await createOrder(call.request);
        callback(null, response);
      } catch (err) {
        let code = grpc.status.INTERNAL;
        if (err.code === 'NOT_FOUND') code = grpc.status.NOT_FOUND;
        if (err.code === 'FAILED_PRECONDITION') code = grpc.status.FAILED_PRECONDITION;
        if (err.code === 'INVALID_ARGUMENT') code = grpc.status.INVALID_ARGUMENT;
        callback({ code, details: err.message });
      }
    },

    GetOrdersByUid: async (call, callback) => {
      try {
        const response = await getOrdersByUid(call.request);
        callback(null, response);
      } catch (err) {
        callback({ code: grpc.status.INTERNAL, details: err.message });
      }
    },

    GetOrderById: async (call, callback) => {
      try {
        const response = await getOrderById(call.request);
        callback(null, response);
      } catch (err) {
        let code = grpc.status.INTERNAL;
        if (err.code === 'NOT_FOUND') code = grpc.status.NOT_FOUND;
        if (err.code === 'PERMISSION_DENIED') code = grpc.status.PERMISSION_DENIED;
        callback({ code, details: err.message });
      }
    },
  });

  const PORT = process.env.PORT || '50054';
  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('Failed to bind Order Service gRPC server:', err);
      process.exit(1);
    }
    console.log(`[Order Service] gRPC running on port ${port}`);
  });

  // Start Transactional Outbox Publisher
  const publisher = new OutboxPublisher();
  publisher.start().catch((err) => {
    console.error('[Order Service] OutboxPublisher startup failed:', err.message);
  });
}

start().catch((err) => {
  console.error('[Order Service] Startup fatal error:', err);
  process.exit(1);
});
