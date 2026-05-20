import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { players } from '../db/schema';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set.');
  process.exit(1);
}

async function main() {
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  console.log('🔄 Connecting to database...');
  const queryClient = postgres(databaseUrl, { max: 1 });
  const db = drizzle(queryClient);

  const email = 'admin@r6ac.ir';
  const username = 'admin';
  const password = 'AdminPassword123!';

  console.log(`🔍 Checking if admin (${email}) already exists...`);
  const existing = await db.select().from(players).where(eq(players.email, email)).limit(1);



  console.log('🔑 Hashing password...');
  const passwordHash = await bcrypt.hash(password, 10);

  if (existing.length > 0) {
    console.log('🔄 Admin user already exists. Updating role to super_admin and password...');
    await db.update(players).set({ role: 'super_admin', passwordHash }).where(eq(players.email, email));
    console.log('✅ Admin user successfully updated!');
  } else {
    console.log('👤 Creating admin user...');
    await db.insert(players).values({
      username,
      email,
      passwordHash,
      role: 'super_admin',
      banStatus: 'clean',
    });
  }

  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error creating admin user:', err);
  process.exit(1);
});
