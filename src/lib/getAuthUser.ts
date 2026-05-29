import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAIL = 'admin@togahh.com';

// Cache in module scope — avoids a DB query on every request
let _cached: { id: string; email: string; name: string | null; role: string } | null = null;

export async function getAuthUser() {
  const session = await getServerSession(authOptions);
  if (session?.user) return session.user;

  if (_cached) return _cached;

  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) return null;

  _cached = { id: admin.id, email: admin.email, name: admin.name ?? null, role: admin.role };
  return _cached;
}
