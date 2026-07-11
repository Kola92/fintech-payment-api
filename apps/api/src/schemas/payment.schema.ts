export const paymentSchema = {
  $id: 'Payment',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    idempotency_key: { type: 'string' },
    amount: { type: 'integer' },
    currency: { type: 'string' },
    status: { type: 'string' },
    reference: { type: 'string' },
    description: { type: 'string', nullable: true },
    metadata: { type: 'object', nullable: true },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

export const errorSchema = {
  $id: 'Error',
  type: 'object',
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
};
