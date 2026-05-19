import { eq, and, gte, lte, count, desc } from 'drizzle-orm';
import { detectionReports, players, matches, banHistory } from '../db/schema';
import { db } from '../plugins/db';

export class ReportRepository {
  static async create(data: typeof detectionReports.$inferInsert) {
    const [report] = await db.insert(detectionReports).values(data).returning();
    return report;
  }

  static async findAll(params: {
    page: number;
    limit: number;
    playerId?: string;
    matchId?: string;
    detectionType?: string;
    reviewStatus?: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
    minConfidence?: number;
    maxConfidence?: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const conditions = [];

    if (params.playerId) conditions.push(eq(detectionReports.playerId, params.playerId));
    if (params.matchId) conditions.push(eq(detectionReports.matchId, params.matchId));
    if (params.detectionType) conditions.push(eq(detectionReports.detectionType, params.detectionType as any));
    if (params.reviewStatus) conditions.push(eq(detectionReports.reviewStatus, params.reviewStatus));
    if (params.minConfidence !== undefined) conditions.push(gte(detectionReports.confidence, params.minConfidence.toString()));
    if (params.maxConfidence !== undefined) conditions.push(lte(detectionReports.confidence, params.maxConfidence.toString()));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select({
        id: detectionReports.id,
        playerId: detectionReports.playerId,
        matchId: detectionReports.matchId,
        detectionType: detectionReports.detectionType,
        confidence: detectionReports.confidence,
        reasonCode: detectionReports.reasonCode,
        requiresHumanReview: detectionReports.requiresHumanReview,
        autoAction: detectionReports.autoAction,
        reviewStatus: detectionReports.reviewStatus,
        reviewedBy: detectionReports.reviewedBy,
        reviewedAt: detectionReports.reviewedAt,
        createdAt: detectionReports.createdAt,
        playerUsername: players.username,
      })
      .from(detectionReports)
      .leftJoin(players, eq(detectionReports.playerId, players.id))
      .where(whereClause)
      .limit(params.limit)
      .offset(offset)
      .orderBy(desc(detectionReports.createdAt));

    const [totalRes] = await db.select({ count: count() }).from(detectionReports).where(whereClause);

    return {
      reports: list,
      total: totalRes?.count || 0,
    };
  }

  static async findById(id: string) {
    const [report] = await db
      .select({
        id: detectionReports.id,
        playerId: detectionReports.playerId,
        matchId: detectionReports.matchId,
        detectionType: detectionReports.detectionType,
        confidence: detectionReports.confidence,
        reasonCode: detectionReports.reasonCode,
        evidenceEncrypted: detectionReports.evidenceEncrypted,
        requiresHumanReview: detectionReports.requiresHumanReview,
        autoAction: detectionReports.autoAction,
        reviewStatus: detectionReports.reviewStatus,
        reviewedBy: detectionReports.reviewedBy,
        reviewedAt: detectionReports.reviewedAt,
        createdAt: detectionReports.createdAt,
        playerUsername: players.username,
        playerBanStatus: players.banStatus,
        matchRound: matches.round,
        matchStatus: matches.status,
      })
      .from(detectionReports)
      .leftJoin(players, eq(detectionReports.playerId, players.id))
      .leftJoin(matches, eq(detectionReports.matchId, matches.id))
      .where(eq(detectionReports.id, id))
      .limit(1);

    if (!report) return null;

    return report;
  }

  static async reviewReport(
    reportId: string,
    reviewedBy: string,
    reviewStatus: 'pending' | 'reviewed' | 'actioned' | 'dismissed',
    action?: 'none' | 'flag' | 'ban',
    banType?: 'warning' | 'match_ban' | 'tournament_ban' | 'permanent_ban',
    reason?: string
  ) {
    const [updated] = await db
      .update(detectionReports)
      .set({
        reviewStatus,
        reviewedBy,
        reviewedAt: new Date(),
      })
      .where(eq(detectionReports.id, reportId))
      .returning();

    if (action === 'ban' && banType && reason && updated) {
      await db.update(players).set({ banStatus: 'banned', updatedAt: new Date() }).where(eq(players.id, updated.playerId));
      await db.insert(banHistory).values({
        playerId: updated.playerId,
        banType,
        reason,
        reportId,
        issuedBy: reviewedBy,
      });
    } else if (action === 'flag' && updated) {
      await db.update(players).set({ banStatus: 'flagged', updatedAt: new Date() }).where(eq(players.id, updated.playerId));
    }

    return updated;
  }
}
