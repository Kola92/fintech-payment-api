import { FastifyInstance } from 'fastify';
import {
  createPayment,
  getPaymentById,
  listPayments,
} from '@fintech/shared';

export async function paymentRoutes(app: FastifyInstance) {
  // POST /api/v1/payments
  app.post('/payments', {
    schema: {
      description: 'Create a new payment. Requires an idempotency key.',
      tags: ['Payments'],
      headers: {
        type: 'object',
        required: ['x-idempotency-key'],
        properties: {
          'x-idempotency-key': {
            type: 'string',
            description: 'Unique key to prevent duplicate payments',
          },
        },
      },
      body: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: {
            type: 'integer',
            minimum: 1,
            description: 'Amount in kobo/cents (e.g. 150000 = ₦1,500.00)',
          },
          currency: {
            type: 'string',
            enum: ['NGN', 'USD', 'GBP', 'EUR'],
            default: 'NGN',
          },
          description: { type: 'string' },
          metadata: { type: 'object' },
        },
      },
      response: {
        201: { $ref: 'Payment#' },
        400: { $ref: 'Error#' },
      },
    },
  }, async (request, reply) => {
    const idempotencyKey = request.headers['x-idempotency-key'] as string;

    if (!idempotencyKey) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'x-idempotency-key header is required',
      });
    }

    const body = request.body as {
      amount: number;
      currency?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    };

    const payment = await createPayment({
      idempotency_key: idempotencyKey,
      amount: body.amount,
      currency: body.currency,
      description: body.description,
      metadata: body.metadata,
    });

    return reply.status(201).send(payment);
  });

  // GET /api/v1/payments
  app.get('/payments', {
    schema: {
      description: 'List payments with optional status filter and pagination',
      tags: ['Payments'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            payments: { type: 'array', items: { $ref: 'Payment#' } },
            total: { type: 'integer' },
            limit: { type: 'integer' },
            offset: { type: 'integer' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as {
      limit?: number;
      offset?: number;
      status?: string;
    };

    const result = await listPayments({
      limit: query.limit,
      offset: query.offset,
      status: query.status,
    });

    return reply.send({
      ...result,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    });
  });

  // GET /api/v1/payments/:id
  app.get('/payments/:id', {
    schema: {
      description: 'Fetch a single payment by ID',
      tags: ['Payments'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: { $ref: 'Payment#' },
        404: { $ref: 'Error#' },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const payment = await getPaymentById(id);

    if (!payment) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Payment ${id} not found`,
      });
    }

    return reply.send(payment);
  });
}
