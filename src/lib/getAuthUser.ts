import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAIL = 'admin@togahh.com';

export async function getAuthUser() {
  const session = await getServerSession(authOptions);
  if (session?.user) return session.user;

  // No session — fall back to the single admin user (login-free mode)
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) return null;

  return { id: admin.id, email: admin.email, name: admin.name ?? null, role: admin.role };
}
