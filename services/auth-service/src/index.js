import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import dotenv from 'dotenv';
import { registerUser, loginUser, verifyToken } from './authService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = process.env.AUTH_PROTO_PATH || path.resolve(__dirname, '../../../shared/proto/auth.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const authProto = grpc.loadPackageDefinition(packageDefinition).auth;

const server = new grpc.Server();

server.addService(authProto.AuthService.service, {
  Register: async (call, callback) => {
    try {
      const response = await registerUser(call.request);
      callback(null, response);
    } catch (err) {
      const status = err.code === 'ALREADY_EXISTS' ? grpc.status.ALREADY_EXISTS : grpc.status.INVALID_ARGUMENT;
      callback({ code: status, details: err.message });
    }
  },

  Login: async (call, callback) => {
    try {
      const response = await loginUser(call.request);
      callback(null, response);
    } catch (err) {
      const status = err.code === 'UNAUTHENTICATED' ? grpc.status.UNAUTHENTICATED : grpc.status.INVALID_ARGUMENT;
      callback({ code: status, details: err.message });
    }
  },

  VerifyToken: async (call, callback) => {
    try {
      const response = await verifyToken(call.request);
      callback(null, response);
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, details: err.message });
    }
  },
});

const PORT = process.env.PORT || '50051';
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) {
    console.error('Failed to bind Auth Service gRPC server:', err);
    process.exit(1);
  }
  console.log(`[Auth Service] gRPC running on port ${port}`);
});
