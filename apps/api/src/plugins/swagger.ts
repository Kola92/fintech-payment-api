import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export const swaggerPlugin = fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Fintech Payment Processing API',
        description:
          'Production-grade payment API with idempotency, webhook delivery, and distributed job processing.',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          ApiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
          },
        },
      },
      security: [{ ApiKey: [] }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
});
