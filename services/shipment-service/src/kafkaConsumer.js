import { Kafka } from 'kafkajs';
import { getDB } from './db.js';

export class OrderCreatedConsumer {
  constructor() {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    this.kafka = new Kafka({
      clientId: 'shipment-order-consumer',
      brokers,
      retry: {
        initialRetryTime: 300,
        retries: 10,
      },
    });
    this.consumer = this.kafka.consumer({ groupId: 'shipment-service-group' });
    this.isRunning = false;
  }

  async start() {
    let connected = false;
    while (!connected) {
      try {
        await this.consumer.connect();
        await this.consumer.subscribe({ topic: 'order-created', fromBeginning: true });
        connected = true;
        console.log('[Shipment Service] Kafka Consumer connected & subscribed to order-created');
      } catch (err) {
        console.warn('[Shipment Service] Kafka connection failed, retrying in 3s...', err.message);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    this.isRunning = true;
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (!message.value) return;
          const raw = message.value.toString();
          const event = JSON.parse(raw);

          // TC-SHP-02: Event thiếu oid -> Ghi nhận lỗi, không tạo shipment
          if (!event || !event.oid) {
            console.error('[Shipment Service] Received invalid OrderCreated event without oid:', raw);
            return;
          }

          const oid = Number(event.oid);
          const db = getDB();

          // TC-SHP-05: Nhận cùng Event hai lần -> Idempotent check
          const existing = await db.collection('shipments').findOne({ oid });
          if (existing) {
            console.log(`[Shipment Service] Shipment for oid ${oid} already exists. Skipping duplicate.`);
            return;
          }

          // Generate shipid
          const shipid = 5000 + oid;
          const shipmentDoc = {
            shipid,
            oid,
            status: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await db.collection('shipments').insertOne(shipmentDoc);
          console.log(`[Shipment Service] TC-SHP-01: Successfully created shipment ${shipid} for order ${oid}`);
        } catch (err) {
          console.error('[Shipment Service] Error processing Kafka message:', err);
        }
      },
    });
  }

  async stop() {
    this.isRunning = false;
    await this.consumer.disconnect();
  }
}
