import { Queue, QueueOptions } from 'bullmq';
import type { WebhookDeliveryJobData } from '../types/index';

export const WEBHOOK_QUEUE_NAME = 'webhook-delivery';

// Pass Redis URL string instead of ioredis instance — avoids type conflicts
// between BullMQ's bundled ioredis and our top-level ioredis installation.
// BullMQ creates its own connection internally when given connection options.
function getRedisConnection() {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  // Parse URL into host/port for BullMQ connection options
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
  };
}

export const WEBHOOK_QUEUE_OPTIONS: QueueOptions = {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,
    },
  },
};

let webhookQueue: Queue<WebhookDeliveryJobData> | null = null;

export function getWebhookQueue(): Queue<WebhookDeliveryJobData> {
  if (!webhookQueue) {
    webhookQueue = new Queue<WebhookDeliveryJobData>(
      WEBHOOK_QUEUE_NAME,
      {
        connection: getRedisConnection(),
        defaultJobOptions: WEBHOOK_QUEUE_OPTIONS.defaultJobOptions,
      }
    );

    webhookQueue.on('error', (err) => {
      console.error('[queue] Webhook queue error:', err.message);
    });
  }

  return webhookQueue;
}
