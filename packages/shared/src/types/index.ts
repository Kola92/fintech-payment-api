export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded';

export type PaymentCurrency = 'NGN' | 'USD' | 'GBP' | 'EUR';

export type WebhookEvent =
  | 'payment.created'
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.refunded';

export type DeliveryStatus = 'pending' | 'delivered' | 'failed';

export interface Payment {
  id: string;
  idempotency_key: string;
  amount: number;           // stored in kobo/cents — never floats for money
  currency: PaymentCurrency;
  status: PaymentStatus;
  reference: string;        // human-readable, e.g. PAY-20240101-XXXX
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];   // which events this endpoint subscribes to
  secret: string;           // used to sign payloads (HMAC-SHA256)
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  payment_id: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  status: DeliveryStatus;
  attempt_count: number;
  last_attempt_at: Date | null;
  next_attempt_at: Date | null;
  delivered_at: Date | null;
  error_message: string | null;
  created_at: Date;
}

// Job payload shape for BullMQ — what the API enqueues, what the worker receives
export interface WebhookDeliveryJobData {
  webhookDeliveryId: string;
  webhookId: string;
  paymentId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  url: string;
  secret: string;
}
