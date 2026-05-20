import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import * as dotenv from 'dotenv';
import fastify from 'fastify';
import pino from 'pino';

dotenv.config();

import { errorHandler } from './middleware/error-handler';
import authPlugin from './plugins/auth';
import dbPlugin from './plugins/db';
import redisPlugin from './plugins/redis';

import authRoutes from './routes/auth.routes';
import playerRoutes from './routes/player.routes';
import reportRoutes from './routes/report.routes';
import settingsRoutes from './routes/settings.routes';
import tournamentRoutes from './routes/tournament.routes';
import { agentRoutes } from './routes/v1/agent';
import { healthRoutes } from './routes/v1/health';
import wsRoutes from './routes/ws.routes';
import { WebSocketService } from './services/websocket.service';

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || '0.0.0.0';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

const app = fastify({
  logger: logger as any,
  disableRequestLogging: false,
});

app.setErrorHandler(errorHandler);

export async function initApp() {
  // 1. Helmet
  await app.register(helmet, { global: true });

  // 2. CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 3. Cookie
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'r6ac_secure_cookie_secret_key_prod',
  });

  // 4. Rate Limit
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: (_request, _context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded, please try again later.',
    }),
  });

  // 5. Auth Plugin (registers @fastify/jwt)
  await app.register(authPlugin);

  // 6. WebSocket
  await app.register(websocket);

  // 7. Database
  await app.register(dbPlugin);

  // 8. Redis
  await app.register(redisPlugin);

  // Initialize WebSocket Pub/Sub Broadcast
  app.ready(async () => {
    await WebSocketService.init(app);
  });

  // 9. Routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(playerRoutes, { prefix: '/api/v1/players' });
  await app.register(tournamentRoutes, { prefix: '/api/v1/tournaments' });
  await app.register(reportRoutes, { prefix: '/api/v1/reports' });
  await app.register(settingsRoutes, { prefix: '/api/v1/settings' });
  await app.register(agentRoutes, { prefix: '/api/v1/agent' });
  await app.register(wsRoutes, { prefix: '/ws' });

  // Healthcheck
  await app.register(healthRoutes);

  await app.ready();
  return app;
}

async function start() {
  try {
    await initApp();
    await app.listen({ port, host });
    app.log.info(`🚀 R6AC Backend API running at http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful Shutdown
const listeners = ['SIGINT', 'SIGTERM'];
listeners.forEach((signal) => {
  process.on(signal, async () => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  });
});

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app };

