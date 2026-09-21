import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { AdminRole, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const rootEmail = process.env.ROOT_EMAIL;
const rootPassword = process.env.ROOT_PASSWORD;

if (!rootEmail || !rootPassword) {
  throw new Error('ROOT_EMAIL and ROOT_PASSWORD must be set');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main(): Promise<void> {
  const rootCount = await prisma.admin.count({
    where: { role: AdminRole.ROOT },
  });

  if (rootCount > 1) {
    throw new Error('Database contains more than one root administrator');
  }

  if (rootCount === 1) {
    console.log('Root administrator already exists');
    return;
  }

  const passwordHash = await bcrypt.hash(rootPassword, 12);

  await prisma.admin.create({
    data: {
      name: 'Root administrator',
      email: rootEmail,
      passwordHash,
      role: AdminRole.ROOT,
    },
  });

  console.log('Root administrator created');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });