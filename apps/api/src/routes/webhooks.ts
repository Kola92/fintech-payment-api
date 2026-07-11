import { FastifyInstance } from 'fastify';
import {
  registerWebhook,
  listWebhooks,
  deleteWebhook,
  getDeliveriesForPayment,
} from '@fintech/shared';
import type { WebhookEvent } from '@fintech/shared';

export async function webhookRoutes(app: FastifyInstance) {
  // POST /api/v1/webhooks
  app.post('/webhooks', {
    schema: {
      description: 'Register a webhook endpoint to receive payment events',
      tags: ['Webhooks'],
      body: {
        type: 'object',
        required: ['url', 'events'],
        properties: {
          url: { type: 'string', format: 'uri' },
          events: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'payment.created',
                'payment.completed',
                'payment.failed',
                'payment.refunded',
              ],
            },
            minItems: 1,
          },
        },
      },
      response: {
        201: { $ref: 'Webhook#' },
        400: { $ref: 'Error#' },
      },
    },
  }, async (request, reply) => {
    const body = request.body as {
      url: string;
      events: WebhookEvent[];
    };

    const webhook = await registerWebhook({
      url: body.url,
      events: body.events,
    });

    return reply.status(201).send(webhook);
  });

  // GET /api/v1/webhooks
  app.get('/webhooks', {
    schema: {
      description: 'List all registered webhook endpoints',
      tags: ['Webhooks'],
      response: {
        200: {
          type: 'array',
          items: { $ref: 'Webhook#' },
        },
      },
    },
  }, async (_request, reply) => {
    const webhooks = await listWebhooks();
    return reply.send(webhooks);
  });

  // DELETE /api/v1/webhooks/:id
  app.delete('/webhooks/:id', {
    schema: {
      description: 'Remove a registered webhook endpoint',
      tags: ['Webhooks'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        204: { type: 'null' },
        404: { $ref: 'Error#' },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await deleteWebhook(id);

    if (!deleted) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Webhook ${id} not found`,
      });
    }

    return reply.status(204).send();
  });

  // GET /api/v1/payments/:id/deliveries
  app.get('/payments/:id/deliveries', {
    schema: {
      description: 'List all webhook delivery attempts for a payment',
      tags: ['Webhooks'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: { $ref: 'WebhookDelivery#' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deliveries = await getDeliveriesForPayment(id);
    return reply.send(deliveries);
  });
}
