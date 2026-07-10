CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded'
);

CREATE TYPE payment_currency AS ENUM (
  'NGN',
  'USD',
  'GBP',
  'EUR'
);

CREATE TABLE IF NOT EXISTS payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key   TEXT NOT NULL,
  amount            BIGINT NOT NULL CHECK (amount > 0),
  currency          payment_currency NOT NULL DEFAULT 'NGN',
  status            payment_status NOT NULL DEFAULT 'pending',
  reference         TEXT NOT NULL,
  description       TEXT,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint on idempotency_key is the DB-level guarantee.
-- Application check is a fast-path optimisation, not the source of truth.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key
  ON payments (idempotency_key);

-- Reference lookups and status filtering are common query patterns
CREATE INDEX IF NOT EXISTS idx_payments_reference
  ON payments (reference);

CREATE INDEX IF NOT EXISTS idx_payments_status
  ON payments (status);

CREATE INDEX IF NOT EXISTS idx_payments_created_at
  ON payments (created_at DESC);
