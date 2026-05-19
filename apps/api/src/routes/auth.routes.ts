import { FastifyPluginAsync } from 'fastify';
import { registerSchema, loginSchema } from '../schemas';
import { AuthService } from '../services/auth.service';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/register', async (request, reply) => {
    const data = registerSchema.parse(request.body);
    const result = await AuthService.register(data);

    return reply.status(201).send({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  });

  fastify.post('/login', async (request, reply) => {
    const data = loginSchema.parse(request.body);
    const result = await AuthService.login(fastify, data);

    reply.setCookie('r6ac_refresh_token', result.refreshToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return reply.status(200).send({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  });

  fastify.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies.r6ac_refresh_token;
    if (!refreshToken) {
      return reply.status(401).send({
        success: false,
        data: null,
        meta: { timestamp: new Date().toISOString() },
        error: { code: 'UNAUTHORIZED', message: 'Refresh cookie missing.', messageFA: 'کوکی احراز هویت یافت نشد.' },
      });
    }

    const result = await AuthService.refresh(fastify, refreshToken);

    return reply.status(200).send({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  });

  fastify.post('/logout', async (request, reply) => {
    const refreshToken = request.cookies.r6ac_refresh_token;
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }

    reply.clearCookie('r6ac_refresh_token', { path: '/' });

    return reply.status(200).send({
      success: true,
      data: { loggedOut: true },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  });

  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    return reply.status(200).send({
      success: true,
      data: request.user,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  });
};

export default authRoutes;
