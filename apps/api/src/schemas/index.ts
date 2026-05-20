import { z } from 'zod';

// Auth Schemas
export const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  usernameFA: z.string().max(100).optional(),
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().optional(),
  password: z.string().min(8),
}).refine((data) => data.email || data.username, {
  message: 'Either email or username is required.',
});


// Player Schemas
export const getPlayersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  banStatus: z.enum(['clean', 'flagged', 'banned']).optional(),
  teamId: z.string().uuid().optional(),
});

export const updateBanStatusSchema = z.object({
  banStatus: z.enum(['clean', 'flagged', 'banned']),
  reason: z.string().min(1),
  banType: z.enum(['warning', 'match_ban', 'tournament_ban', 'permanent_ban']),
  expiresAt: z.string().datetime().optional().nullable(),
  tournamentId: z.string().uuid().optional().nullable(),
});

export const hardwareFingerprintSchema = z.object({
  fingerprintHash: z.string().length(64).regex(/^[a-fA-F0-9]{64}$/),
});

// Tournament Schemas
export const getTournamentsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.enum(['upcoming', 'registration', 'active', 'completed']).optional(),
});

export const createTournamentSchema = z.object({
  name: z.string().min(3).max(200),
  nameFA: z.string().max(400).optional(),
  status: z.enum(['upcoming', 'registration', 'active', 'completed']).default('upcoming'),
  maxTeams: z.number().int().min(2).max(128).default(16),
  prizePool: z.number().min(0).default(0),
  currency: z.enum(['IRR', 'USDT']).default('IRR'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
});

export const updateMatchSchema = z.object({
  status: z.enum(['scheduled', 'live', 'paused', 'completed']),
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
  electroSessionCode: z.string().max(50).optional().nullable(),
});

// Report Schemas
export const createReportSchema = z.object({
  playerId: z.string().uuid(),
  matchId: z.string().uuid(),
  detectionType: z.enum([
    'AIMBOT',
    'WALLHACK',
    'RADAR_HACK',
    'TRIGGER_BOT',
    'NO_RECOIL',
    'SPEED_HACK',
    'SPOOFER',
    'DMA_CARD',
    'KMBOX',
    'ARDUINO_INPUT',
    'DUAL_PC_STREAM',
    'MACRO_PATTERN',
    'STATISTICAL_OUTLIER',
  ]),
  confidence: z.number().min(0).max(1),
  reasonCode: z.string().max(100),
  evidence: z.string().optional().nullable(),
});

export const getReportsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  playerId: z.string().uuid().optional(),
  matchId: z.string().uuid().optional(),
  detectionType: z.string().optional(),
  reviewStatus: z.enum(['pending', 'reviewed', 'actioned', 'dismissed']).optional(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
  maxConfidence: z.coerce.number().min(0).max(1).optional(),
});

export const reviewReportSchema = z.object({
  reviewStatus: z.enum(['pending', 'reviewed', 'actioned', 'dismissed']),
  action: z.enum(['none', 'flag', 'ban']).optional(),
  banType: z.enum(['warning', 'match_ban', 'tournament_ban', 'permanent_ban']).optional(),
  reason: z.string().optional(),
});
