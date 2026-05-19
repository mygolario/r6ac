import * as dotenv from 'dotenv';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import postgres from 'postgres';
import * as schema from '../db/schema';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/r6ac';

// Client for queries
export const queryClient = postgres(connectionString, { max: 10, onnotice: () => {} });
export const db = drizzle(queryClient, { schema });

declare module 'fastify' {
  interface FastifyInstance {
    db: PostgresJsDatabase<typeof schema>;
  }
}

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('db', db);
  fastify.addHook('onClose', async () => {
    await queryClient.end();
  });
};

export default fp(dbPlugin, { name: 'db' });
