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
  // Cast JSONB payload explicitly — pg driver returns JSONB as parsed object
  // but only when selected directly. Explicit cast ensures consistent behaviour.
  const { rows } = await pool.query<WebhookDelivery>(
    `SELECT
       id, webhook_id, payment_id, event,
       payload::jsonb as payload,
       status, attempt_count, last_attempt_at,
       next_attempt_at, delivered_at, error_message, created_at
     FROM webhook_deliveries
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
    `SELECT
       id, webhook_id, payment_id, event,
       payload::jsonb as payload,
       status, attempt_count, last_attempt_at,
       next_attempt_at, delivered_at, error_message, created_at
     FROM webhook_deliveries
     WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}
