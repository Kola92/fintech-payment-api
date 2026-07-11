import crypto from 'crypto';
import { Job } from 'bullmq';
import { getPool } from '@fintech/shared';
import type { WebhookDeliveryJobData } from '@fintech/shared';

// Signs the payload with HMAC-SHA256 using the webhook's secret.
// The receiving server computes the same signature and compares —
// if they match, the payload is authentic and untampered.
function signPayload(payload: unknown, secret: string): string {
  const body = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
}

export async function processWebhookDelivery(
  job: Job<WebhookDeliveryJobData>
): Promise<void> {
  const {
    webhookDeliveryId,
    url,
    payload,
    secret,
  } = job.data;

  const pool = getPool();
  const now = new Date();

  // Step 1: Mark attempt in progress — update attempt count and last_attempt_at
  await pool.query(
    `UPDATE webhook_deliveries
     SET attempt_count = attempt_count + 1,
         last_attempt_at = $1
     WHERE id = $2`,
    [now, webhookDeliveryId]
  );

  const signature = signPayload(payload, secret);
  const body = JSON.stringify(payload);

  let response: Response;

  try {
    // Step 2: POST to the registered webhook URL
    // 10s timeout — we don't wait indefinitely for slow receivers
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Delivery': webhookDeliveryId,
          'User-Agent': 'fintech-payment-api/1.0',
        },
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      // HTTP 4xx/5xx — treat as failure, BullMQ will retry per backoff config
      const errorText = await response.text();
      await pool.query(
        `UPDATE webhook_deliveries
         SET status = 'failed',
             error_message = $1,
             next_attempt_at = $2
         WHERE id = $3`,
        [
          `HTTP ${response.status}: ${errorText.slice(0, 500)}`,
          getNextAttemptTime(job.attemptsMade),
          webhookDeliveryId,
        ]
      );

      // Throwing here tells BullMQ the job failed — it will retry
      throw new Error(`Webhook delivery failed: HTTP ${response.status}`);
    }

    // Step 3: Success — mark delivered, clear error state
    await pool.query(
      `UPDATE webhook_deliveries
       SET status = 'delivered',
           delivered_at = $1,
           error_message = NULL,
           next_attempt_at = NULL
       WHERE id = $2`,
      [now, webhookDeliveryId]
    );

    console.log(
      `[worker] Delivered webhook ${webhookDeliveryId} to ${url}`
    );

  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      await pool.query(
        `UPDATE webhook_deliveries
         SET status = 'failed',
             error_message = $1,
             next_attempt_at = $2
         WHERE id = $3`,
        [
          'Delivery timeout after 10s',
          getNextAttemptTime(job.attemptsMade),
          webhookDeliveryId,
        ]
      );
    }

    // Re-throw so BullMQ records the failure and schedules retry
    throw err;
  }
}

// Mirrors the exponential backoff config in webhookQueue.ts —
// stored in DB so operators can see when the next attempt is scheduled
function getNextAttemptTime(attemptsMade: number): Date {
  const delayMs = 1000 * Math.pow(2, attemptsMade);
  return new Date(Date.now() + delayMs);
}
