import { eq, and, count, asc, or } from 'drizzle-orm';
import { tournaments, tournamentTeams, matches, teams } from '../db/schema';
import { db } from '../plugins/db';

export class TournamentRepository {
  static async findAll(params: {
    page: number;
    limit: number;
    status?: 'upcoming' | 'registration' | 'active' | 'completed';
  }) {
    const offset = (params.page - 1) * params.limit;
    const whereClause = params.status ? eq(tournaments.status, params.status) : undefined;

    const list = await db
      .select()
      .from(tournaments)
      .where(whereClause)
      .limit(params.limit)
      .offset(offset)
      .orderBy(asc(tournaments.startDate));

    const [totalRes] = await db.select({ count: count() }).from(tournaments).where(whereClause);

    // Get registered teams count for each
    const result = await Promise.all(
      list.map(async (t) => {
        const [regCount] = await db
          .select({ count: count() })
          .from(tournamentTeams)
          .where(eq(tournamentTeams.tournamentId, t.id));
        return {
          ...t,
          registeredTeams: regCount?.count || 0,
        };
      })
    );

    return {
      items: result,
      tournaments: result,
      total: totalRes?.count || 0,
    };
  }

  static async create(data: typeof tournaments.$inferInsert) {
    const [t] = await db.insert(tournaments).values(data).returning();
    return t;
  }

  static async findByName(name: string) {
    const [t] = await db.select().from(tournaments).where(eq(tournaments.name, name)).limit(1);
    return t;
  }

  static async findById(id: string) {
    const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
    if (!t) return null;

    const registered = await db
      .select({
        id: teams.id,
        name: teams.name,
        nameFa: teams.nameFa,
        registeredAt: tournamentTeams.registeredAt,
      })
      .from(tournamentTeams)
      .innerJoin(teams, eq(tournamentTeams.teamId, teams.id))
      .where(eq(tournamentTeams.tournamentId, id));

    return {
      ...t,
      registeredTeamsList: registered,
      registeredTeamsCount: registered.length,
    };
  }

  static async registerTeam(tournamentId: string, teamId: string) {
    const [entry] = await db
      .insert(tournamentTeams)
      .values({
        tournamentId,
        teamId,
      })
      .returning();
    return entry;
  }

  static async isTeamRegistered(tournamentId: string, teamId: string) {
    const [res] = await db
      .select({ count: count() })
      .from(tournamentTeams)
      .where(and(eq(tournamentTeams.tournamentId, tournamentId), eq(tournamentTeams.teamId, teamId)));
    return (res?.count || 0) > 0;
  }

  static async getBracket(tournamentId: string) {
    const matchList = await db
      .select({
        id: matches.id,
        tournamentId: matches.tournamentId,
        teamAId: matches.teamAId,
        teamBId: matches.teamBId,
        status: matches.status,
        round: matches.round,
        scoreA: matches.scoreA,
        scoreB: matches.scoreB,
        startedAt: matches.startedAt,
        endedAt: matches.endedAt,
        electroSessionCode: matches.electroSessionCode,
        teamAName: teams.name,
        teamANameFa: teams.nameFa,
      })
      .from(matches)
      .leftJoin(teams, eq(matches.teamAId, teams.id))
      .where(eq(matches.tournamentId, tournamentId));

    // Get team B names
    const fullMatches = await Promise.all(
      matchList.map(async (m) => {
        const [tb] = await db.select({ name: teams.name, nameFa: teams.nameFa }).from(teams).where(eq(teams.id, m.teamBId)).limit(1);
        return {
          ...m,
          teamBName: tb?.name,
          teamBNameFa: tb?.nameFa,
        };
      })
    );

    return fullMatches;
  }

  static async updateMatch(
    matchId: string,
    data: {
      status: 'scheduled' | 'live' | 'paused' | 'completed';
      scoreA: number;
      scoreB: number;
      electroSessionCode?: string | null;
    }
  ) {
    const [updated] = await db
      .update(matches)
      .set({
        ...data,
        updatedAt: new Date(),
        startedAt: data.status === 'live' ? new Date() : undefined,
        endedAt: data.status === 'completed' ? new Date() : undefined,
      })
      .where(eq(matches.id, matchId))
      .returning();
    return updated;
  }

  static async findMatchById(matchId: string) {
    const [m] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    return m;
  }

  static async findLiveMatches() {
    const matchList = await db
      .select({
        id: matches.id,
        tournamentId: matches.tournamentId,
        teamAId: matches.teamAId,
        teamBId: matches.teamBId,
        status: matches.status,
        round: matches.round,
        scoreA: matches.scoreA,
        scoreB: matches.scoreB,
        startedAt: matches.startedAt,
        endedAt: matches.endedAt,
        electroSessionCode: matches.electroSessionCode,
        teamAName: teams.name,
        teamANameFa: teams.nameFa,
      })
      .from(matches)
      .leftJoin(teams, eq(matches.teamAId, teams.id))
      .where(or(eq(matches.status, 'live'), eq(matches.status, 'paused')));

    // Get team B names
    const fullMatches = await Promise.all(
      matchList.map(async (m) => {
        const [tb] = await db
          .select({ name: teams.name, nameFa: teams.nameFa })
          .from(teams)
          .where(eq(teams.id, m.teamBId))
          .limit(1);
        return {
          ...m,
          teamBName: tb?.name,
          teamBNameFa: tb?.nameFa,
        };
      })
    );

    return fullMatches;
  }
}
