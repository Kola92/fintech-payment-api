import 'dotenv/config';
import Fastify from 'fastify';
import { swaggerPlugin } from './plugins/swagger';
import { apiKeyPlugin } from './plugins/apiKey';
import { healthRoutes } from './routes/health';
import { paymentRoutes } from './routes/payments';
import { webhookRoutes } from './routes/webhooks';

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

  // Plugins — order matters in Fastify. Swagger first so routes
  // registered after it are automatically included in the spec.
  await app.register(swaggerPlugin);
  await app.register(apiKeyPlugin);

  // Routes
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
