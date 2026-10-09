import { prisma } from '@/lib/db';
import { SafeUser, toSafeUser } from '@/lib/auth/session';
import { User } from '@prisma/client';

export class UserRepository {
  public async create(data: {
    email: string;
    passwordHash: string;
    name?: string | null;
    role?: 'USER' | 'ADMIN';
  }): Promise<SafeUser> {
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        name: data.name ? data.name.trim() : null,
        role: data.role || 'USER',
      },
    });

    return toSafeUser(user);
  }

  public async findByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  public async findById(id: string): Promise<SafeUser | null> {
    if (!id) return null;
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return user ? toSafeUser(user) : null;
  }

  public async findByIdWithPassword(id: string): Promise<User | null> {
    if (!id) return null;
    return prisma.user.findUnique({
      where: { id },
    });
  }

  public async findAll(limit = 100): Promise<SafeUser[]> {
    const users = await prisma.user.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return users.map(toSafeUser);
  }

  public async count(): Promise<number> {
    return prisma.user.count();
  }

  public async updateRole(id: string, role: 'USER' | 'ADMIN'): Promise<SafeUser | null> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { role },
      });
      return toSafeUser(user);
    } catch {
      return null;
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const userRepository = new UserRepository();