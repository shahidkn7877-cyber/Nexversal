import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';

export const SESSION_COOKIE_NAME = 'seo_user_session';
export const SESSION_DURATION_DAYS = 7;

export interface SafeUser {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionData {
  token: string;
  userId: string;
  expiresAt: Date;
  user: SafeUser;
}

export function toSafeUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function createSession(
  userId: string,
  durationDays = SESSION_DURATION_DAYS
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      sessionToken: token,
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function getSession(token?: string | null): Promise<SessionData | null> {
  if (!token || typeof token !== 'string' || !token.trim()) {
    return null;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: true },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return {
      token: session.sessionToken,
      userId: session.userId,
      expiresAt: session.expiresAt,
      user: toSafeUser(session.user),
    };
  } catch {
    return null;
  }
}

export async function deleteSession(token?: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const result = await prisma.session.deleteMany({
      where: { sessionToken: token },
    });
    return result.count > 0;
  } catch {
    return false;
  }
}

export async function deleteUserSessions(userId: string): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: { userId },
    });
    return result.count;
  } catch {
    return 0;
  }
}