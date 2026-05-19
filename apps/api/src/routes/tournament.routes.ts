import { FastifyPluginAsync } from 'fastify';
import { getTournamentsQuerySchema, createTournamentSchema, updateMatchSchema } from '../schemas';
import { TournamentService } from '../services/tournament.service';

const tournamentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const query = getTournamentsQuerySchema.parse(request.query);
    const result = await TournamentService.getTournaments(query);

    return reply.status(200).send({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  });

  fastify.post(
    '/',
    { onRequest: [fastify.requireRoles(['tournament_admin', 'super_admin'])] },
    async (request, reply) => {
      const data = createTournamentSchema.parse(request.body);
      const result = await TournamentService.createTournament(data, request.user.id);

      return reply.status(201).send({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
        error: null,
      });
    }
  );

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await TournamentService.getTournamentById(id);

    return reply.status(200).send({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  });

  fastify.post('/:id/register', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await TournamentService.registerTeam(id, request.user.id);

    return reply.status(200).send({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  });

  fastify.get('/:id/bracket', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await TournamentService.getBracket(id);

    return reply.status(200).send({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  });

  fastify.patch(
    '/:id/matches/:matchId',
    { onRequest: [fastify.requireRoles(['tournament_admin', 'super_admin'])] },
    async (request, reply) => {
      const { id, matchId } = request.params as { id: string; matchId: string };
      const data = updateMatchSchema.parse(request.body);
      const result = await TournamentService.updateMatch(id, matchId, data);

      return reply.status(200).send({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
        error: null,
      });
    }
  );
};

export default tournamentRoutes;
