import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadProto(relPath, envKey, pkgName, serviceName) {
  const protoPath = process.env[envKey] || path.resolve(__dirname, '../../../../shared/proto', relPath);
  const pkgDef = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  return grpc.loadPackageDefinition(pkgDef)[pkgName][serviceName];
}

const AuthService = loadProto('auth.proto', 'AUTH_PROTO_PATH', 'auth', 'AuthService');
const CustomerService = loadProto('customer.proto', 'CUSTOMER_PROTO_PATH', 'customer', 'CustomerService');
const ProductService = loadProto('product.proto', 'PRODUCT_PROTO_PATH', 'product', 'ProductService');
const OrderService = loadProto('order.proto', 'ORDER_PROTO_PATH', 'order', 'OrderService');
const ShipmentService = loadProto('shipment.proto', 'SHIPMENT_PROTO_PATH', 'shipment', 'ShipmentService');

export const authClient = new AuthService(
  process.env.AUTH_GRPC_HOST || 'localhost:50051',
  grpc.credentials.createInsecure()
);

export const customerClient = new CustomerService(
  process.env.CUSTOMER_GRPC_HOST || 'localhost:50052',
  grpc.credentials.createInsecure()
);

export const productClient = new ProductService(
  process.env.PRODUCT_GRPC_HOST || 'localhost:50053',
  grpc.credentials.createInsecure()
);

export const orderClient = new OrderService(
  process.env.ORDER_GRPC_HOST || 'localhost:50054',
  grpc.credentials.createInsecure()
);

export const shipmentClient = new ShipmentService(
  process.env.SHIPMENT_GRPC_HOST || 'localhost:50055',
  grpc.credentials.createInsecure()
);
