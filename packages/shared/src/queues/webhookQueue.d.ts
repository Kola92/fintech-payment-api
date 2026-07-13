import { Queue, QueueOptions } from 'bullmq';
import type { WebhookDeliveryJobData } from '../types/index';
export declare const WEBHOOK_QUEUE_NAME = "webhook-delivery";
export declare const WEBHOOK_QUEUE_OPTIONS: QueueOptions;
export declare function getWebhookQueue(): Queue<WebhookDeliveryJobData>;
//# sourceMappingURL=webhookQueue.d.ts.map