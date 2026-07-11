export const webhookSchema = {
  $id: 'Webhook',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    url: { type: 'string' },
    events: { type: 'array', items: { type: 'string' } },
    secret: { type: 'string' },
    is_active: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

export const webhookDeliverySchema = {
  $id: 'WebhookDelivery',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    webhook_id: { type: 'string', format: 'uuid' },
    payment_id: { type: 'string', format: 'uuid' },
    event: { type: 'string' },
    payload: {
      type: 'object',
      additionalProperties: true,  // allow the full event structure through
    },
    status: { type: 'string' },
    attempt_count: { type: 'integer' },
    last_attempt_at: { type: 'string', format: 'date-time', nullable: true },
    next_attempt_at: { type: 'string', format: 'date-time', nullable: true },
    delivered_at: { type: 'string', format: 'date-time', nullable: true },
    error_message: { type: 'string', nullable: true },
    created_at: { type: 'string', format: 'date-time' },
  },
};
