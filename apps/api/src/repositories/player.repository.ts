import { eq, ilike, or, and, count, sql } from 'drizzle-orm';
import { players, teams, banHistory } from '../db/schema';
import { db } from '../plugins/db';

export class PlayerRepository {
  static async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    banStatus?: 'clean' | 'flagged' | 'banned';
    teamId?: string;
  }) {
    const offset = (params.page - 1) * params.limit;
    const conditions = [];

    if (params.search) {
      conditions.push(
        or(
          ilike(players.username, `%${params.search}%`),
          ilike(players.usernameFa, `%${params.search}%`),
          ilike(players.email, `%${params.search}%`)
        )
      );
    }

    if (params.banStatus) {
      conditions.push(eq(players.banStatus, params.banStatus));
    }

    if (params.teamId) {
      conditions.push(eq(players.teamId, params.teamId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select({
        id: players.id,
        username: players.username,
        usernameFa: players.usernameFa,
        email: players.email,
        role: players.role,
        teamId: players.teamId,
        banStatus: players.banStatus,
        hwid: players.hwid,
        createdAt: players.createdAt,
        updatedAt: players.updatedAt,
      })
      .from(players)
      .where(whereClause)
      .limit(params.limit)
      .offset(offset);

    const [totalRes] = await db.select({ count: count() }).from(players).where(whereClause);

    return {
      items: list,
      players: list,
      total: totalRes?.count || 0,
    };
  }

  static async findById(id: string) {
    const [player] = await db
      .select({
        id: players.id,
        username: players.username,
        usernameFa: players.usernameFa,
        email: players.email,
        role: players.role,
        teamId: players.teamId,
        banStatus: players.banStatus,
        hwid: players.hwid,
        hardwareFingerprintHash: players.hardwareFingerprintHash,
        createdAt: players.createdAt,
        updatedAt: players.updatedAt,
        teamName: teams.name,
        teamNameFa: teams.nameFa,
      })
      .from(players)
      .leftJoin(teams, eq(players.teamId, teams.id))
      .where(eq(players.id, id))
      .limit(1);

    if (!player) return null;

    const history = await db
      .select()
      .from(banHistory)
      .where(eq(banHistory.playerId, id))
      .orderBy(sql`${banHistory.createdAt} DESC`);

    return {
      ...player,
      banHistory: history,
    };
  }

  static async updateBanStatus(
    playerId: string,
    banStatus: 'clean' | 'flagged' | 'banned',
    banType: 'warning' | 'match_ban' | 'tournament_ban' | 'permanent_ban',
    reason: string,
    issuedBy: string,
    expiresAt?: Date | null,
    tournamentId?: string | null
  ) {
    await db.transaction(async (tx) => {
      await tx
        .update(players)
        .set({ banStatus, updatedAt: new Date() })
        .where(eq(players.id, playerId));

      await tx.insert(banHistory).values({
        playerId,
        banType,
        reason,
        issuedBy,
        expiresAt: expiresAt || null,
        tournamentId: tournamentId || null,
      });
    });

    return this.findById(playerId);
  }

  static async updateHardwareFingerprint(playerId: string, fingerprintHash: string) {
    await db
      .update(players)
      .set({ hardwareFingerprintHash: fingerprintHash, updatedAt: new Date() })
      .where(eq(players.id, playerId));

    return this.findById(playerId);
  }

  static async updateHwid(playerId: string, hwid: string | null) {
    await db
      .update(players)
      .set({ hwid, updatedAt: new Date() })
      .where(eq(players.id, playerId));

    return this.findById(playerId);
  }
}
