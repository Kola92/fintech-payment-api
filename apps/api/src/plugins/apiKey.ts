import fp from 'fastify-plugin';

export const apiKeyPlugin = fp(async (app) => {
  app.addHook('onRequest', async (request, reply) => {
    // Skip auth for docs and health — these are public endpoints
    const publicPaths = ['/docs', '/health', '/documentation'];
    const isPublic = publicPaths.some((p) => request.url.startsWith(p));
    if (isPublic) return;

    const apiKey = request.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing or invalid API key',
      });
    }
  });
});
