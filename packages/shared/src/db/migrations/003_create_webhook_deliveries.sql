CREATE TYPE delivery_status AS ENUM (
  'pending',
  'delivered',
  'failed'
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id        UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  payment_id        UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  event             TEXT NOT NULL,
  payload           JSONB NOT NULL,
  status            delivery_status NOT NULL DEFAULT 'pending',
  attempt_count     INTEGER NOT NULL DEFAULT 0,
  last_attempt_at   TIMESTAMPTZ,
  next_attempt_at   TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Worker queries pending deliveries by webhook_id and payment_id
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id
  ON webhook_deliveries (webhook_id);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_payment_id
  ON webhook_deliveries (payment_id);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status
  ON webhook_deliveries (status);
