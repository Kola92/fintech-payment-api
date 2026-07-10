import Redis from 'ioredis';

let redisClient: Redis | null = null;

// General-purpose Redis client — idempotency keys, caching, ad-hoc ops
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

// BullMQ-dedicated connection — separate instance to avoid subscriber
// mode conflicts. BullMQ docs explicitly require a dedicated connection.
export function getBullMQRedis(): Redis {
  return new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null, // required by BullMQ — null means retry forever
    enableReadyCheck: false,    // required by BullMQ
    lazyConnect: false,
  });
}
