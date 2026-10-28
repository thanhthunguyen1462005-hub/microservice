import { Kafka } from 'kafkajs';
import pool from './db.js';

export class OutboxPublisher {
  constructor() {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    this.kafka = new Kafka({
      clientId: 'order-outbox-publisher',
      brokers,
      retry: {
        initialRetryTime: 300,
        retries: 10,
      },
    });
    this.producer = this.kafka.producer();
    this.isRunning = false;
  }

  async start() {
    let connected = false;
    while (!connected) {
      try {
        await this.producer.connect();
        connected = true;
        console.log('[Outbox Publisher] Connected to Kafka producer successfully');
      } catch (err) {
        console.warn('[Outbox Publisher] Kafka connection failed, retrying in 3s...', err.message);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    this.isRunning = true;
    this.pollLoop();
  }

  async pollLoop() {
    while (this.isRunning) {
      try {
        const res = await pool.query(
          "SELECT id, aggregate_id, payload FROM outbox_events WHERE status = 'PENDING' ORDER BY id ASC LIMIT 20"
        );

        for (const row of res.rows) {
          await this.producer.send({
            topic: 'order-created',
            messages: [
              {
                key: String(row.aggregate_id),
                value: typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload),
              },
            ],
          });

          await pool.query("UPDATE outbox_events SET status = 'PUBLISHED' WHERE id = $1", [row.id]);
          console.log(`[Outbox Publisher] Published event OrderCreated for aggregate_id: ${row.aggregate_id}`);
        }
      } catch (err) {
        console.error('[Outbox Publisher] Polling error:', err.message);
      }

      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  async stop() {
    this.isRunning = false;
    await this.producer.disconnect();
  }
}
