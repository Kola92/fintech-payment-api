import 'dotenv/config';
import { Worker } from 'bullmq';
import { WEBHOOK_QUEUE_NAME, getBullMQRedis } from '@fintech/shared';
import { processWebhookDelivery } from './processors/webhookDelivery';

const worker = new Worker(
  WEBHOOK_QUEUE_NAME,
  processWebhookDelivery,
  {
    connection: getBullMQRedis(),
    concurrency: 5, // process up to 5 delivery jobs simultaneously
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

// Graceful shutdown — finish in-flight jobs before exiting
process.on('SIGTERM', async () => {
  console.log('[worker] Shutting down gracefully...');
  await worker.close();
  process.exit(0);
});
