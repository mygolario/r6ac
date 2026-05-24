import { db, queryClient } from '../plugins/db';
import { players, teams, tournaments, matches, tournamentTeams } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Starting seed process...');

  try {
    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Create a super admin if not exists
    let admin = await db.select().from(players).where(eq(players.username, 'admin')).limit(1).then(res => res[0]);
    if (!admin) {
      console.log('Creating Admin user...');
      const [newAdmin] = await db.insert(players).values({
        username: 'admin',
        email: 'admin@r6ac.com',
        passwordHash,
        role: 'super_admin',
        banStatus: 'clean',
      }).returning();
      admin = newAdmin;
    }

    // 2. Create some dummy players
    const dummyPlayersData = [
      { username: 'player1', email: 'p1@test.com', passwordHash, role: 'player' as const, banStatus: 'clean' as const },
      { username: 'player2', email: 'p2@test.com', passwordHash, role: 'player' as const, banStatus: 'clean' as const },
      { username: 'captain1', email: 'c1@test.com', passwordHash, role: 'team_captain' as const, banStatus: 'clean' as const },
      { username: 'captain2', email: 'c2@test.com', passwordHash, role: 'team_captain' as const, banStatus: 'clean' as const },
    ];

    const dummyPlayers = [];
    for (const dp of dummyPlayersData) {
      let p = await db.select().from(players).where(eq(players.username, dp.username)).limit(1).then(res => res[0]);
      if (!p) {
        const [inserted] = await db.insert(players).values(dp).returning();
        p = inserted;
      }
      dummyPlayers.push(p);
    }

    // 3. Create Teams
    const teamsData = [
      { name: 'Team Alpha', captainId: dummyPlayers[2].id },
      { name: 'Team Bravo', captainId: dummyPlayers[3].id },
    ];

    const dummyTeams = [];
    for (const dt of teamsData) {
      let t = await db.select().from(teams).where(eq(teams.name, dt.name)).limit(1).then(res => res[0]);
      if (!t) {
        const [inserted] = await db.insert(teams).values(dt).returning();
        t = inserted;
      }
      dummyTeams.push(t);
    }

    // 4. Create Tournaments
    const tournamentsData = [
      {
        name: 'Summer Championship 2026',
        status: 'upcoming' as const,
        maxTeams: 16,
        prizePool: 50000000,
        currency: 'IRR' as const,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        createdBy: admin.id,
      },
      {
        name: 'Winter Qualifier',
        status: 'active' as const,
        maxTeams: 8,
        prizePool: 1000,
        currency: 'USDT' as const,
        startDate: new Date(),
        createdBy: admin.id,
      }
    ];

    const dummyTournaments = [];
    for (const dt of tournamentsData) {
      let t = await db.select().from(tournaments).where(eq(tournaments.name, dt.name)).limit(1).then(res => res[0]);
      if (!t) {
        const [inserted] = await db.insert(tournaments).values(dt).returning();
        t = inserted;
      }
      dummyTournaments.push(t);
    }

    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await queryClient.end();
  }
}

seed();
