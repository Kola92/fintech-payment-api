import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on('connect', () => {
      console.log('[redis] Connected');
    });

    redisClient.on('error', (err) => {
      console.error('[redis] Client error:', err.message);
    });
  }

  return redisClient;
}
