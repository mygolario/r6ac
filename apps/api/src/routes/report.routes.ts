import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { players, matches, teams, tournaments } from '../db/schema';
import { db } from '../plugins/db';
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

      let finalPlayerId = data.playerId;
      let finalMatchId = data.matchId;

      // Check if playerId is a valid UUID, if not, find or create one
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (!uuidRegex.test(finalPlayerId)) {
        const existingPlayers = await db.select().from(players).limit(1);
        if (existingPlayers.length > 0) {
          finalPlayerId = existingPlayers[0].id;
        } else {
          const newPlayer = await db.insert(players).values({
            username: 'DummyPlayer',
            email: 'dummy@example.com',
            passwordHash: 'dummy',
            role: 'player',
          }).returning();
          finalPlayerId = newPlayer[0].id;
        }
      }

      if (!uuidRegex.test(finalMatchId)) {
        const existingMatches = await db.select().from(matches).limit(1);
        if (existingMatches.length > 0) {
          finalMatchId = existingMatches[0].id;
        } else {
          // Create dummy tournament, team, and match
          const newTournament = await db.insert(tournaments).values({
            name: 'Dummy Tournament',
            status: 'active',
            startDate: new Date(),
            createdBy: finalPlayerId,
          }).returning();
          const newTeam = await db.insert(teams).values({
            name: 'Dummy Team',
            captainId: finalPlayerId,
          }).returning();
          const newMatch = await db.insert(matches).values({
            tournamentId: newTournament[0].id,
            teamAId: newTeam[0].id,
            teamBId: newTeam[0].id,
            round: 'Final',
            status: 'live',
          }).returning();
          finalMatchId = newMatch[0].id;
        }
      }

      // Save the report to the database
      const result = await ReportService.ingestReport({
        playerId: finalPlayerId,
        matchId: finalMatchId,
        detectionType: data.detectionType as any,
        confidence: data.confidence,
        reasonCode: data.reasonCode,
        evidence: data.evidence || undefined,
      });

      // Broadcast live detection event to dashboard via WebSocket
      await WebSocketService.broadcast({
        type: 'report:new',
        payload: {
          id: result.id,
          playerId: finalPlayerId,
          matchId: finalMatchId,
          detectionType: data.detectionType,
          confidence: data.confidence,
          reasonCode: data.reasonCode,
          autoAction: data.confidence > 0.92 ? 'kick' : data.confidence > 0.75 ? 'flag' : 'none',
          createdAt: new Date().toISOString(),
        },
      });

      return reply.status(201).send({
        success: true,
        data: { received: true, id: result.id, timestamp: new Date().toISOString() },
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
