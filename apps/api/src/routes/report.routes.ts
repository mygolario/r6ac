import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createReportSchema, getReportsQuerySchema, reviewReportSchema } from '../schemas';
import { ReportService } from '../services/report.service';
import { WebSocketService } from '../services/websocket.service';

// Looser schema for agent reports — doesn't require valid UUIDs
const agentReportSchema = z.object({
  playerId: z.string().min(1).max(255),
  matchId: z.string().min(1).max(255),
  detectionType: z.enum([
    'AIMBOT', 'WALLHACK', 'RADAR_HACK', 'TRIGGER_BOT', 'NO_RECOIL', 'SPEED_HACK',
    'SPOOFER', 'DMA_CARD', 'KMBOX', 'ARDUINO_INPUT', 'DUAL_PC_STREAM', 'MACRO_PATTERN', 'STATISTICAL_OUTLIER',
  ]),
  confidence: z.number().min(0).max(1),
  reasonCode: z.string().max(100),
  evidence: z.string().optional().nullable(),
});

const reportRoutes: FastifyPluginAsync = async (fastify) => {
  // Agent-submitted report endpoint — no auth required, no strict UUID validation
  fastify.post('/agent', async (request, reply) => {
    try {
      const data = agentReportSchema.parse(request.body);

      // Broadcast live detection event to dashboard via WebSocket
      await WebSocketService.broadcast({
        type: 'report:new',
        payload: {
          playerId: data.playerId,
          matchId: data.matchId,
          detectionType: data.detectionType,
          confidence: data.confidence,
          reasonCode: data.reasonCode,
          autoAction: data.confidence > 0.92 ? 'kick' : data.confidence > 0.75 ? 'flag' : 'none',
          createdAt: new Date().toISOString(),
        },
      });

      return reply.status(201).send({
        success: true,
        data: { received: true, timestamp: new Date().toISOString() },
        meta: { timestamp: new Date().toISOString() },
        error: null,
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        data: null,
        meta: { timestamp: new Date().toISOString() },
        error: { code: 'VALIDATION_ERROR', message: err.message, messageFA: 'داده‌های ارسالی نامعتبر است.' },
      });
    }
  });

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
