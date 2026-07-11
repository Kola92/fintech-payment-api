import crypto from 'crypto';
import { getPool } from '../db/client';
import type { Webhook, WebhookDelivery, WebhookEvent } from '../types/index';

export interface RegisterWebhookInput {
  url: string;
  events: WebhookEvent[];
}

export async function registerWebhook(
  input: RegisterWebhookInput
): Promise<Webhook> {
  const pool = getPool();

  // Generate a random signing secret — the caller never provides this.
  // It's used by the worker to sign outbound payloads via HMAC-SHA256.
  // The receiving server uses it to verify the signature on their end.
  const secret = crypto.randomBytes(32).toString('hex');

  const { rows } = await pool.query<Webhook>(
    `INSERT INTO webhooks (url, events, secret, is_active)
     VALUES ($1, $2, $3, true)
     RETURNING *`,
    [input.url, input.events, secret]
  );

  return rows[0];
}

export async function listWebhooks(): Promise<Webhook[]> {
  const pool = getPool();
  const { rows } = await pool.query<Webhook>(
    'SELECT * FROM webhooks ORDER BY created_at DESC'
  );
  return rows;
}

export async function getWebhookById(id: string): Promise<Webhook | null> {
  const pool = getPool();
  const { rows } = await pool.query<Webhook>(
    'SELECT * FROM webhooks WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

export async function deleteWebhook(id: string): Promise<boolean> {
  const pool = getPool();
  const { rowCount } = await pool.query(
    'DELETE FROM webhooks WHERE id = $1',
    [id]
  );
  return (rowCount ?? 0) > 0;
}

export async function getDeliveriesForPayment(
  paymentId: string
): Promise<WebhookDelivery[]> {
  const pool = getPool();
  const { rows } = await pool.query<WebhookDelivery>(
    `SELECT * FROM webhook_deliveries
     WHERE payment_id = $1
     ORDER BY created_at DESC`,
    [paymentId]
  );
  return rows;
}

export async function getDeliveryById(
  id: string
): Promise<WebhookDelivery | null> {
  const pool = getPool();
  const { rows } = await pool.query<WebhookDelivery>(
    'SELECT * FROM webhook_deliveries WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}
