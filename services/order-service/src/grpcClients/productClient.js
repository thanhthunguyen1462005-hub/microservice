import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = process.env.PRODUCT_PROTO_PATH || path.resolve(__dirname, '../../../../shared/proto/product.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const productProto = grpc.loadPackageDefinition(packageDefinition).product;
const host = process.env.PRODUCT_GRPC_HOST || 'localhost:50053';

export const productClient = new productProto.ProductService(
  host,
  grpc.credentials.createInsecure()
);

export function checkAndDeductStock(items) {
  return new Promise((resolve, reject) => {
    productClient.CheckAndDeductStock({ items }, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}
