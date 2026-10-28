import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  checkAndDeductStock,
} from './productService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = process.env.PRODUCT_PROTO_PATH || path.resolve(__dirname, '../../../shared/proto/product.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const productProto = grpc.loadPackageDefinition(packageDefinition).product;

async function startServer() {
  await connectDB();

  const server = new grpc.Server();

  server.addService(productProto.ProductService.service, {
    GetProducts: async (_call, callback) => {
      try {
        const response = await getProducts();
        callback(null, response);
      } catch (err) {
        callback({ code: grpc.status.INTERNAL, details: err.message });
      }
    },

    GetProductById: async (call, callback) => {
      try {
        const response = await getProductById(call.request);
        callback(null, response);
      } catch (err) {
        const code = err.code === 'NOT_FOUND' ? grpc.status.NOT_FOUND : grpc.status.INTERNAL;
        callback({ code, details: err.message });
      }
    },

    CreateProduct: async (call, callback) => {
      try {
        const response = await createProduct(call.request);
        callback(null, response);
      } catch (err) {
        callback({ code: grpc.status.INVALID_ARGUMENT, details: err.message });
      }
    },

    UpdateProduct: async (call, callback) => {
      try {
        const response = await updateProduct(call.request);
        callback(null, response);
      } catch (err) {
        const code = err.code === 'NOT_FOUND' ? grpc.status.NOT_FOUND : grpc.status.INVALID_ARGUMENT;
        callback({ code, details: err.message });
      }
    },

    DeleteProduct: async (call, callback) => {
      try {
        const response = await deleteProduct(call.request);
        callback(null, response);
      } catch (err) {
        const code = err.code === 'NOT_FOUND' ? grpc.status.NOT_FOUND : grpc.status.INTERNAL;
        callback({ code, details: err.message });
      }
    },

    CheckAndDeductStock: async (call, callback) => {
      try {
        const response = await checkAndDeductStock(call.request);
        callback(null, response);
      } catch (err) {
        let code = grpc.status.INTERNAL;
        if (err.code === 'NOT_FOUND') code = grpc.status.NOT_FOUND;
        if (err.code === 'FAILED_PRECONDITION') code = grpc.status.FAILED_PRECONDITION;
        callback({ code, details: err.message });
      }
    },
  });

  const PORT = process.env.PORT || '50053';
  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('Failed to bind Product Service gRPC server:', err);
      process.exit(1);
    }
    console.log(`[Product Service] gRPC running on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('[Product Service] Startup error:', err);
  process.exit(1);
});
