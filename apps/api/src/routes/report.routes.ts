import { FastifyPluginAsync } from 'fastify';
import { createReportSchema, getReportsQuerySchema, reviewReportSchema } from '../schemas';
import { ReportService } from '../services/report.service';

const reportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/', async (request, reply) => {
    const data = createReportSchema.parse(request.body);
    const result = await ReportService.ingestReport(data);

    return reply.status(201).send({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  });

  fastify.get(
    '/',
    { onRequest: [fastify.requireRoles(['tournament_admin', 'super_admin'])] },
    async (request, reply) => {
      const query = getReportsQuerySchema.parse(request.query);
      const result = await ReportService.getReports(query);

      return reply.status(200).send({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
        error: null,
      });
    }
  );

  fastify.get(
    '/:id',
    { onRequest: [fastify.requireRoles(['tournament_admin', 'super_admin'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await ReportService.getReportById(id);

      return reply.status(200).send({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
        error: null,
      });
    }
  );

  fastify.patch(
    '/:id/review',
    { onRequest: [fastify.requireRoles(['tournament_admin', 'super_admin'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = reviewReportSchema.parse(request.body);
      const result = await ReportService.reviewReport(id, request.user.id, data);

      return reply.status(200).send({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
        error: null,
      });
    }
  );
};

export default reportRoutes;
