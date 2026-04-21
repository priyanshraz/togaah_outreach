import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('pass@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@togahh.com' },
    update: { password },
    create: {
      email: 'admin@togahh.com',
      name: 'Togahh Admin',
      password,
      role: 'ADMIN',
    },
  });

  console.log('Password updated for:', admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
