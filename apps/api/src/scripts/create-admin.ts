import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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

function generateSecurePassword() {
  return crypto.randomBytes(12).toString('base64').replace(/[/+=]/g, '') + 'A1!'; // Ensuring uppercase, number, special char
}

async function main() {
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  console.log('🔄 Connecting to database...');
  const queryClient = postgres(databaseUrl, { max: 1 });
  const db = drizzle(queryClient);

  const admins = [
    { email: 'admin1@r6ac.ir', username: 'admin1', password: generateSecurePassword() },
    { email: 'admin2@r6ac.ir', username: 'admin2', password: generateSecurePassword() },
    { email: 'admin3@r6ac.ir', username: 'admin3', password: generateSecurePassword() },
  ];

  console.log(`\n🔍 Checking and creating ${admins.length} admin accounts...`);

  for (const admin of admins) {
    console.log(`\n---------------------------------`);
    console.log(`👤 Processing: ${admin.username} (${admin.email})`);
    
    const existing = await db.select().from(players).where(eq(players.email, admin.email)).limit(1);
    const passwordHash = await bcrypt.hash(admin.password, 10);

    if (existing.length > 0) {
      console.log('🔄 Admin user already exists. Updating role to super_admin and password...');
      await db.update(players).set({ role: 'super_admin', passwordHash }).where(eq(players.email, admin.email));
      console.log('✅ Admin user successfully updated!');
    } else {
      console.log('✨ Creating new admin user...');
      await db.insert(players).values({
        username: admin.username,
        email: admin.email,
        passwordHash,
        role: 'super_admin',
        banStatus: 'clean',
      });
      console.log('✅ Admin user successfully created!');
    }

    console.log(`\n🔐 CREDENTIALS FOR ${admin.username}:`);
    console.log(`📧 Email:    ${admin.email}`);
    console.log(`🔑 Password: ${admin.password}`);
    console.log(`⚠️  SAVE THIS PASSWORD NOW. It will not be shown again.`);
  }

  console.log(`\n---------------------------------`);
  console.log('🎉 All admin accounts processed successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error creating admin user:', err);
  process.exit(1);
});
