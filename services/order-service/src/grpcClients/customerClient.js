import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = process.env.CUSTOMER_PROTO_PATH || path.resolve(__dirname, '../../../../shared/proto/customer.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const customerProto = grpc.loadPackageDefinition(packageDefinition).customer;
const host = process.env.CUSTOMER_GRPC_HOST || 'localhost:50052';

export const customerClient = new customerProto.CustomerService(
  host,
  grpc.credentials.createInsecure()
);

export function getCustomer(uid) {
  return new Promise((resolve, reject) => {
    customerClient.GetCustomer({ uid }, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

export function getMembership(mid) {
  return new Promise((resolve, reject) => {
    customerClient.GetMembership({ mid }, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}
