import * as dotenv from 'dotenv';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import Redis from 'ioredis';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

export const redisSub = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
    redisSub: Redis;
  }
}

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  try {
    await redis.connect().catch(() => {}); // non-blocking for dev/tests
    await redisSub.connect().catch(() => {});
  } catch (err) {
    fastify.log.warn('Redis connection failed, continuing without Redis');
  }
  fastify.decorate('redis', redis);
  fastify.decorate('redisSub', redisSub);

  fastify.addHook('onClose', async () => {
    await redis.quit();
    await redisSub.quit();
  });
};

export default fp(redisPlugin, { name: 'redis' });
