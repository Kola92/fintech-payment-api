import crypto from 'crypto';
import { getPool, getClient } from '../db/client';
import { getRedis } from '../redis/client';
import { getWebhookQueue } from '../queues/webhookQueue';
import type {
  Payment,
  Webhook,
  WebhookDeliveryJobData,
} from '../types/index';

// Idempotency keys expire after 24 hours — long enough to catch retries,
// short enough not to grow Redis indefinitely
const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

export interface CreatePaymentInput {
  idempotency_key: string;
  amount: number;         // in kobo/cents
  currency?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

function generateReference(): string {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `PAY-${timestamp}-${suffix}`;
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<Payment> {
  const redis = getRedis();
  const redisKey = `idempotency:payment:${input.idempotency_key}`;

  // Step 1: Hot-path idempotency check — Redis first, no DB touch
  const cached = await redis.get(redisKey);
  if (cached) {
    console.log(`[payment] Idempotency hit: ${input.idempotency_key}`);
    return JSON.parse(cached) as Payment;
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Step 2: Insert payment record
    const { rows: paymentRows } = await client.query<Payment>(
      `INSERT INTO payments
        (idempotency_key, amount, currency, status, reference, description, metadata)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6)
       RETURNING *`,
      [
        input.idempotency_key,
        input.amount,
        input.currency ?? 'NGN',
        generateReference(),
        input.description ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ]
    );

    const payment = paymentRows[0];

    // Step 3: Find all active webhooks subscribed to payment.created
    const { rows: webhooks } = await client.query<Webhook>(
      `SELECT * FROM webhooks
       WHERE is_active = true
       AND events @> ARRAY['payment.created']::TEXT[]`
    );

    // Step 4: Insert a webhook_delivery record for each webhook —
    // inside the transaction so delivery records only exist if payment commits
    const deliveryJobData: WebhookDeliveryJobData[] = [];

    for (const webhook of webhooks) {
      const payload = {
        event: 'payment.created',
        data: payment,
        timestamp: new Date().toISOString(),
      };

      const { rows: deliveryRows } = await client.query(
        `INSERT INTO webhook_deliveries
          (webhook_id, payment_id, event, payload, status)
         VALUES ($1, $2, 'payment.created', $3, 'pending')
         RETURNING id`,
        [webhook.id, payment.id, JSON.stringify(payload)]
      );

      deliveryJobData.push({
        webhookDeliveryId: deliveryRows[0].id,
        webhookId: webhook.id,
        paymentId: payment.id,
        event: 'payment.created',
        payload,
        url: webhook.url,
        secret: webhook.secret,
      });
    }

    await client.query('COMMIT');

    // Step 5: Enqueue AFTER commit — DB records are now guaranteed to exist.
    // If enqueue fails after commit, the worker can recover via a sweep of
    // pending webhook_deliveries. This is the at-least-once delivery trade-off.
    const queue = getWebhookQueue();
    for (const jobData of deliveryJobData) {
      await queue.add('deliver-webhook', jobData, {
        jobId: jobData.webhookDeliveryId, // idempotent job ID — prevents duplicate enqueue
      });
    }

    // Step 6: Cache the result in Redis — subsequent requests with same
    // idempotency key return this immediately without hitting the DB
    await redis.set(redisKey, JSON.stringify(payment), 'EX', IDEMPOTENCY_TTL_SECONDS);

    return payment;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    // Always release — otherwise the pool starves under concurrent load
    client.release();
  }
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const pool = getPool();
  const { rows } = await pool.query<Payment>(
    'SELECT * FROM payments WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

export async function listPayments(options: {
  limit?: number;
  offset?: number;
  status?: string;
}): Promise<{ payments: Payment[]; total: number }> {
  const pool = getPool();
  const { limit = 20, offset = 0, status } = options;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit);
  params.push(offset);

  const { rows: payments } = await pool.query<Payment>(
    `SELECT * FROM payments ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) as total FROM payments ${where}`,
    conditions.length ? params.slice(0, -2) : []
  );

  return {
    payments,
    total: parseInt(countRows[0].total, 10),
  };
}
