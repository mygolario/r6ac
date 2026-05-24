import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

// In-memory settings store (persists for lifetime of server process)
let platformSettings = {
  platformName: 'R6AC Anti-Cheat',
  defaultLanguage: 'fa' as 'fa' | 'en',
  logoUrl: null as string | null,
};

let tournamentSettings = {
  defaultMaxTeams: 16,
  defaultMatchFormat: 'BO3',
  defaultCurrency: 'IRR' as 'IRR' | 'USDT',
};

let antiCheatSettings = {
  autoFlagThreshold: 0.75,
  autoKickThreshold: 0.92,
  autoKickEnabled: true,
  enabledDetectionTypes: [
    'AIMBOT', 'WALLHACK', 'RADAR_HACK', 'TRIGGER_BOT', 'NO_RECOIL', 'SPEED_HACK',
    'SPOOFER', 'DMA_CARD', 'KMBOX', 'ARDUINO_INPUT', 'DUAL_PC_STREAM', 'MACRO_PATTERN',
    'STATISTICAL_OUTLIER',
  ] as string[],
};

const updatePlatformSchema = z.object({
  platformName: z.string().min(1).max(100).optional(),
  defaultLanguage: z.enum(['fa', 'en']).optional(),
  logoUrl: z.string().nullable().optional(),
});

const updateTournamentSchema = z.object({
  defaultMaxTeams: z.number().int().min(2).max(128).optional(),
  defaultMatchFormat: z.enum(['BO1', 'BO3', 'BO5']).optional(),
  defaultCurrency: z.enum(['IRR', 'USDT']).optional(),
});

const updateAntiCheatSchema = z.object({
  autoFlagThreshold: z.number().min(0).max(1).optional(),
  autoKickThreshold: z.number().min(0).max(1).optional(),
  autoKickEnabled: z.boolean().optional(),
  enabledDetectionTypes: z.array(z.string()).optional(),
});

const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET all settings
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      data: {
        platform: platformSettings,
        tournament: tournamentSettings,
        antiCheat: antiCheatSettings,
      },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  });

  // PATCH platform settings
  fastify.patch(
    '/platform',
    { onRequest: [fastify.requireRoles(['super_admin'])] },
    async (request, reply) => {
      const data = updatePlatformSchema.parse(request.body);
      platformSettings = { ...platformSettings, ...data };

      return reply.status(200).send({
        success: true,
        data: platformSettings,
        meta: { timestamp: new Date().toISOString() },
        error: null,
      });
    }
  );

  // PATCH tournament settings
  fastify.patch(
    '/tournament',
    { onRequest: [fastify.requireRoles(['tournament_admin', 'super_admin'])] },
    async (request, reply) => {
      const data = updateTournamentSchema.parse(request.body);
      tournamentSettings = { ...tournamentSettings, ...data };

      return reply.status(200).send({
        success: true,
        data: tournamentSettings,
        meta: { timestamp: new Date().toISOString() },
        error: null,
      });
    }
  );

  // PATCH anti-cheat settings
  fastify.patch(
    '/anticheat',
    { onRequest: [fastify.requireRoles(['tournament_admin', 'super_admin'])] },
    async (request, reply) => {
      const data = updateAntiCheatSchema.parse(request.body);
      antiCheatSettings = { ...antiCheatSettings, ...data };

      return reply.status(200).send({
        success: true,
        data: antiCheatSettings,
        meta: { timestamp: new Date().toISOString() },
        error: null,
      });
    }
  );
};

export default settingsRoutes;
