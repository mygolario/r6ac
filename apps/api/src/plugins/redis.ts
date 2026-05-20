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

redis.on('error', () => {});
redisSub.on('error', () => {});

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
    redisSub: Redis;
  }
}

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  try {
    await Promise.race([
      redis.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500))
    ]).catch(() => {});
    await Promise.race([
      redisSub.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500))
    ]).catch(() => {});
  } catch (err) {
    fastify.log.warn('Redis connection failed, continuing without Redis');
  }
  fastify.decorate('redis', redis);
  fastify.decorate('redisSub', redisSub);

  fastify.addHook('onClose', async () => {
    redis.disconnect();
    redisSub.disconnect();
  });
};

export default fp(redisPlugin, { name: 'redis' });
