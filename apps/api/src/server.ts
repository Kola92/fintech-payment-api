import 'dotenv/config';
import Fastify from 'fastify';
import { swaggerPlugin } from './plugins/swagger';
import { apiKeyPlugin } from './plugins/apiKey';
import { healthRoutes } from './routes/health';
import { paymentRoutes } from './routes/payments';
import { webhookRoutes } from './routes/webhooks';
import { paymentSchema, errorSchema } from './schemas/payment.schema';
import { webhookSchema, webhookDeliverySchema } from './schemas/webhook.schema';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty' }
          : undefined,
    },
  });

  // Register shared schemas before routes — routes reference these via $ref
  app.addSchema(paymentSchema);
  app.addSchema(errorSchema);
  app.addSchema(webhookSchema);
  app.addSchema(webhookDeliverySchema);

  await app.register(swaggerPlugin);
  await app.register(apiKeyPlugin);

  await app.register(healthRoutes);
  await app.register(paymentRoutes, { prefix: '/api/v1' });
  await app.register(webhookRoutes, { prefix: '/api/v1' });

  return app;
}

async function start() {
  const app = await buildApp();
  const port = parseInt(process.env.PORT ?? '3000', 10);

  try {
    await app.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
