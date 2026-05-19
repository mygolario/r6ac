import { sql } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            version: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            database: { type: 'string' },
            redis: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    let dbStatus = 'ok';
    let redisStatus = 'ok';

    try {
      await fastify.db.execute(sql`SELECT 1`);
    } catch {
      dbStatus = 'error';
    }

    try {
      await fastify.redis.ping();
    } catch {
      redisStatus = 'error';
    }

    const status = dbStatus === 'ok' && redisStatus === 'ok' ? 'ok' : 'degraded';

    return reply.status(status === 'ok' ? 200 : 503).send({
      status,
      version: process.env.npm_package_version ?? '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      redis: redisStatus,
    });
  });
}
