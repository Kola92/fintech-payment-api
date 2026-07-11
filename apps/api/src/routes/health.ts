import { FastifyInstance } from 'fastify';
import { getPool } from '@fintech/shared';
import { getRedis } from '@fintech/shared';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', {
    schema: {
      description: 'Liveness check — verifies DB and Redis connectivity',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            postgres: { type: 'string' },
            redis: { type: 'string' },
            uptime: { type: 'number' },
          },
        },
      },
    },
  }, async (_request, reply) => {
    const checks: Record<string, string> = {
      postgres: 'ok',
      redis: 'ok',
    };

    try {
      await getPool().query('SELECT 1');
    } catch (err) {
      checks.postgres = 'error';
      console.error('[health] PostgreSQL error:', (err as Error).message);
    }

    try {
      await getRedis().ping();
    } catch (err) {
      checks.redis = 'error';
      console.error('[health] Redis error:', (err as Error).message);
    }

    const healthy = Object.values(checks).every((v) => v === 'ok');

    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'ok' : 'degraded',
      ...checks,
      uptime: process.uptime(),
    });
  });
}
