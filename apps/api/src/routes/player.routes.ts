import { FastifyPluginAsync } from 'fastify';
import { getPlayersQuerySchema, updateBanStatusSchema, hardwareFingerprintSchema } from '../schemas';
import { PlayerService } from '../services/player.service';

const playerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const query = getPlayersQuerySchema.parse(request.query);
    const result = await PlayerService.getPlayers(query);

    return reply.status(200).send({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  });

  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await PlayerService.getPlayerById(id);

    return reply.status(200).send({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  });

  fastify.patch(
    '/:id/ban-status',
    { onRequest: [fastify.requireRoles(['tournament_admin', 'super_admin'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = updateBanStatusSchema.parse(request.body);
      const result = await PlayerService.updateBanStatus(id, data, request.user.id);

      return reply.status(200).send({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
        error: null,
      });
    }
  );

  fastify.post(
    '/:id/hardware-fingerprint',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = hardwareFingerprintSchema.parse(request.body);
      const result = await PlayerService.updateHardwareFingerprint(id, data.fingerprintHash);

      return reply.status(200).send({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
        error: null,
      });
    }
  );
};

export default playerRoutes;
