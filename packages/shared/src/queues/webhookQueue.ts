import { Queue, QueueOptions } from 'bullmq';
import { getBullMQRedis } from '../redis/client';
import type { WebhookDeliveryJobData } from '../types/index';

// Single source of truth for queue name — if this changes,
// TypeScript will catch every reference that needs updating
export const WEBHOOK_QUEUE_NAME = 'webhook-delivery';

// Shared queue options — producer and consumer must agree on these.
// Defining once here prevents silent config drift between services.
export const WEBHOOK_QUEUE_OPTIONS: QueueOptions = {
  connection: getBullMQRedis(),
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000, // first retry after 1s, then 2s, 4s, 8s, 16s
    },
    removeOnComplete: {
      age: 24 * 3600, // keep completed jobs for 24 hours
      count: 1000,    // keep last 1000 completed jobs max
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep failed jobs for 7 days — audit trail
    },
  },
};

// Queue instance used by the API to enqueue webhook delivery jobs.
// Typed with WebhookDeliveryJobData so TypeScript catches payload
// shape mismatches at the call site, not at runtime in the worker.
let webhookQueue: Queue<WebhookDeliveryJobData> | null = null;

export function getWebhookQueue(): Queue<WebhookDeliveryJobData> {
  if (!webhookQueue) {
    webhookQueue = new Queue<WebhookDeliveryJobData>(
      WEBHOOK_QUEUE_NAME,
      WEBHOOK_QUEUE_OPTIONS
    );

    webhookQueue.on('error', (err) => {
      console.error('[queue] Webhook queue error:', err.message);
    });
  }

  return webhookQueue;
}
