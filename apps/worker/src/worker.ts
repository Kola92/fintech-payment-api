import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { Worker } from 'bullmq';
import { WEBHOOK_QUEUE_NAME } from '@fintech/shared';
import { processWebhookDelivery } from './processors/webhookDelivery';

function getRedisConnection() {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
  };
}

const worker = new Worker(
  WEBHOOK_QUEUE_NAME,
  processWebhookDelivery,
  {
    connection: getRedisConnection(),
    concurrency: 5,
  }
);

worker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});

worker.on('error', (err) => {
  console.error('[worker] Worker error:', err.message);
});

console.log(`[worker] Listening on queue: ${WEBHOOK_QUEUE_NAME}`);

process.on('SIGTERM', async () => {
  console.log('[worker] Shutting down gracefully...');
  await worker.close();
  process.exit(0);
});
