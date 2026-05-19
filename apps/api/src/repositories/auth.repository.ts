import { eq, and } from 'drizzle-orm';
import { players, refreshTokens } from '../db/schema';
import { db } from '../plugins/db';

export class AuthRepository {
  static async createUser(data: typeof players.$inferInsert) {
    const [user] = await db.insert(players).values(data).returning();
    return user;
  }

  static async findUserByEmail(email: string) {
    const [user] = await db.select().from(players).where(eq(players.email, email)).limit(1);
    return user;
  }

  static async findUserById(id: string) {
    const [user] = await db.select().from(players).where(eq(players.id, id)).limit(1);
    return user;
  }

  static async createRefreshToken(playerId: string, tokenHash: string, expiresAt: Date) {
    const [rt] = await db
      .insert(refreshTokens)
      .values({
        playerId,
        tokenHash,
        expiresAt,
      })
      .returning();
    return rt;
  }

  static async findRefreshToken(tokenHash: string) {
    const [rt] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), eq(refreshTokens.revoked, false)))
      .limit(1);
    return rt;
  }

  static async revokeRefreshToken(tokenHash: string) {
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }
}
