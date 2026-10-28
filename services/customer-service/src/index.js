import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import dotenv from 'dotenv';
import { getCustomer, updateCustomer, getMembership } from './customerService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = process.env.CUSTOMER_PROTO_PATH || path.resolve(__dirname, '../../../shared/proto/customer.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const customerProto = grpc.loadPackageDefinition(packageDefinition).customer;

const server = new grpc.Server();

server.addService(customerProto.CustomerService.service, {
  GetCustomer: async (call, callback) => {
    try {
      const response = await getCustomer(call.request);
      callback(null, response);
    } catch (err) {
      const code = err.code === 'NOT_FOUND' ? grpc.status.NOT_FOUND : grpc.status.INTERNAL;
      callback({ code, details: err.message });
    }
  },

  UpdateCustomer: async (call, callback) => {
    try {
      const response = await updateCustomer(call.request);
      callback(null, response);
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, details: err.message });
    }
  },

  GetMembership: async (call, callback) => {
    try {
      const response = await getMembership(call.request);
      callback(null, response);
    } catch (err) {
      const code = err.code === 'NOT_FOUND' ? grpc.status.NOT_FOUND : grpc.status.INTERNAL;
      callback({ code, details: err.message });
    }
  },
});

const PORT = process.env.PORT || '50052';
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) {
    console.error('Failed to bind Customer Service gRPC server:', err);
    process.exit(1);
  }
  console.log(`[Customer Service] gRPC running on port ${port}`);
});
