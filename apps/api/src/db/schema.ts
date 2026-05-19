import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  decimal,
  pgEnum,
  AnyPgColumn,
  foreignKey,
} from 'drizzle-orm/pg-core';

// Enums
export const roleEnum = pgEnum('role', ['player', 'team_captain', 'tournament_admin', 'super_admin']);
export const banStatusEnum = pgEnum('ban_status', ['clean', 'flagged', 'banned']);
export const tournamentStatusEnum = pgEnum('tournament_status', ['upcoming', 'registration', 'active', 'completed']);
export const currencyEnum = pgEnum('currency', ['IRR', 'USDT']);
export const matchStatusEnum = pgEnum('match_status', ['scheduled', 'live', 'paused', 'completed']);
export const detectionTypeEnum = pgEnum('detection_type', [
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
]);
export const autoActionEnum = pgEnum('auto_action', ['none', 'flag', 'kick']);
export const reviewStatusEnum = pgEnum('review_status', ['pending', 'reviewed', 'actioned', 'dismissed']);
export const banTypeEnum = pgEnum('ban_type', ['warning', 'match_ban', 'tournament_ban', 'permanent_ban']);

// Players Table
export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).unique().notNull(),
  usernameFa: varchar('username_fa', { length: 100 }),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: roleEnum('role').default('player').notNull(),
  teamId: uuid('team_id'), // FK to teams.id defined via relations/foreignKey
  banStatus: banStatusEnum('ban_status').default('clean').notNull(),
  hardwareFingerprintHash: varchar('hardware_fingerprint_hash', { length: 64 }),
  ipHash: varchar('ip_hash', { length: 64 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  teamFk: foreignKey({
    columns: [table.teamId],
    foreignColumns: [teams.id],
    name: 'fk_players_teams',
  }),
}));

// Teams Table
export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  nameFa: varchar('name_fa', { length: 200 }),
  captainId: uuid('captain_id').notNull().references((): AnyPgColumn => players.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Tournaments Table
export const tournaments = pgTable('tournaments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  nameFa: varchar('name_fa', { length: 400 }),
  status: tournamentStatusEnum('status').default('upcoming').notNull(),
  maxTeams: integer('max_teams').default(16).notNull(),
  prizePool: bigint('prize_pool', { mode: 'number' }).default(0).notNull(),
  currency: currencyEnum('currency').default('IRR').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  createdBy: uuid('created_by').notNull().references((): AnyPgColumn => players.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Tournament Teams Table
export const tournamentTeams = pgTable('tournament_teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id').notNull().references(() => tournaments.id),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  registeredAt: timestamp('registered_at').defaultNow().notNull(),
});

// Matches Table
export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id').notNull().references(() => tournaments.id),
  teamAId: uuid('team_a_id').notNull().references(() => teams.id),
  teamBId: uuid('team_b_id').notNull().references(() => teams.id),
  status: matchStatusEnum('status').default('scheduled').notNull(),
  round: varchar('round', { length: 50 }).notNull(),
  scoreA: integer('score_a').default(0).notNull(),
  scoreB: integer('score_b').default(0).notNull(),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  electroSessionCode: varchar('electro_session_code', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Detection Reports Table
export const detectionReports = pgTable('detection_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id').notNull().references((): AnyPgColumn => players.id),
  matchId: uuid('match_id').notNull().references(() => matches.id),
  detectionType: detectionTypeEnum('detection_type').notNull(),
  confidence: decimal('confidence', { precision: 3, scale: 2 }).notNull(),
  reasonCode: varchar('reason_code', { length: 100 }).notNull(),
  evidenceEncrypted: text('evidence_encrypted'),
  requiresHumanReview: boolean('requires_human_review').default(true).notNull(),
  autoAction: autoActionEnum('auto_action').default('none').notNull(),
  reviewStatus: reviewStatusEnum('review_status').default('pending').notNull(),
  reviewedBy: uuid('reviewed_by').references((): AnyPgColumn => players.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Ban History Table
export const banHistory = pgTable('ban_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id').notNull().references((): AnyPgColumn => players.id),
  banType: banTypeEnum('ban_type').notNull(),
  reason: text('reason').notNull(),
  reportId: uuid('report_id').references(() => detectionReports.id),
  issuedBy: uuid('issued_by').notNull().references((): AnyPgColumn => players.id),
  tournamentId: uuid('tournament_id').references(() => tournaments.id),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Refresh Tokens Table
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id').notNull().references((): AnyPgColumn => players.id),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  revoked: boolean('revoked').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const playersRelations = relations(players, ({ one, many }) => ({
  team: one(teams, {
    fields: [players.teamId],
    references: [teams.id],
  }),
  ledTeam: one(teams, {
    fields: [players.id],
    references: [teams.captainId],
  }),
  reports: many(detectionReports),
  bansIssued: many(banHistory, { relationName: 'issuedBans' }),
  bansReceived: many(banHistory, { relationName: 'receivedBans' }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  captain: one(players, {
    fields: [teams.captainId],
    references: [players.id],
  }),
  members: many(players),
  tournamentEntries: many(tournamentTeams),
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  creator: one(players, {
    fields: [tournaments.createdBy],
    references: [players.id],
  }),
  teams: many(tournamentTeams),
  matches: many(matches),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [matches.tournamentId],
    references: [tournaments.id],
  }),
  teamA: one(teams, {
    fields: [matches.teamAId],
    references: [teams.id],
  }),
  teamB: one(teams, {
    fields: [matches.teamBId],
    references: [teams.id],
  }),
  reports: many(detectionReports),
}));

export const detectionReportsRelations = relations(detectionReports, ({ one }) => ({
  player: one(players, {
    fields: [detectionReports.playerId],
    references: [players.id],
  }),
  match: one(matches, {
    fields: [detectionReports.matchId],
    references: [matches.id],
  }),
  reviewer: one(players, {
    fields: [detectionReports.reviewedBy],
    references: [players.id],
  }),
}));

export const banHistoryRelations = relations(banHistory, ({ one }) => ({
  player: one(players, {
    fields: [banHistory.playerId],
    references: [players.id],
    relationName: 'receivedBans',
  }),
  issuer: one(players, {
    fields: [banHistory.issuedBy],
    references: [players.id],
    relationName: 'issuedBans',
  }),
  report: one(detectionReports, {
    fields: [banHistory.reportId],
    references: [detectionReports.id],
  }),
  tournament: one(tournaments, {
    fields: [banHistory.tournamentId],
    references: [tournaments.id],
  }),
}));
