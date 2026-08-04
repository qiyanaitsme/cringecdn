/**
 * ImageHost Database Seed
 */
import { BcryptService } from '../src/utils/bcrypt.service';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  const bcryptService = BcryptService.getInstance();
  const adminPassword = await bcryptService.hash('Admin123!@#');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@imagehost.local' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@imagehost.local',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log(`Admin user: ${admin.username} (${admin.email})`);

  console.log('Seed complete!');
}

main()
  .catch((e: Error) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};