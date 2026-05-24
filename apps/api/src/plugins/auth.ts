import fastifyJwt from '@fastify/jwt';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { UserRole } from '../types';

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const secret =
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'change_me_in_production';

  await fastify.register(fastifyJwt, {
    secret,
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // For WebSocket connections, allow token in query param
      const tokenQuery = (request.query as { token?: string })?.token;
      if (tokenQuery) {
        request.headers.authorization = `Bearer ${tokenQuery}`;
      }
      await request.jwtVerify();
      if (request.user.banStatus === 'banned') {
        reply.status(403).send({
          success: false,
          data: null,
          meta: { timestamp: new Date().toISOString() },
          error: {
            code: 'ACCOUNT_BANNED',
            message: 'Your account is permanently banned.',
            messageFA: 'حساب کاربری شما مسدود شده است.',
          },
        });
        return;
      }
    } catch (err) {
      reply.status(401).send({
        success: false,
        data: null,
        meta: { timestamp: new Date().toISOString() },
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token is invalid or expired.',
          messageFA: 'توکن احراز هویت نامعتبر یا منقضی شده است.',
        },
      });
    }
  });

  fastify.decorate('requireRoles', (roles: UserRole[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      await fastify.authenticate(request, reply);
      if (reply.sent) return;

      const userRole = request.user.role;
      if (!roles.includes(userRole) && userRole !== 'super_admin') {
        reply.status(403).send({
          success: false,
          data: null,
          meta: { timestamp: new Date().toISOString() },
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to perform this action.',
            messageFA: 'شما دسترسی لازم برای انجام این کار را ندارید.',
          },
        });
      }
    };
  });
};

export default fp(authPlugin, { name: 'auth' });
