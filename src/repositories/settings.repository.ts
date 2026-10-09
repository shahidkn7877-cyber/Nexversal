import { prisma } from '@/lib/db';

export interface UserSettingsData {
  userId: string;
  editorDialect: string;
  targetWordCount: string;
  defaultDevice: string;
  autoSlug: boolean;
}

export const DEFAULT_USER_SETTINGS: Omit<UserSettingsData, 'userId'> = {
  editorDialect: 'en-US',
  targetWordCount: '1,500',
  defaultDevice: 'desktop',
  autoSlug: true,
};

export class SettingsRepository {
  public async findByUserId(userId: string): Promise<UserSettingsData> {
    if (!userId) {
      return { userId: 'anonymous', ...DEFAULT_USER_SETTINGS };
    }

    try {
      const record = await prisma.userSettings.findUnique({
        where: { userId },
      });

      if (!record) {
        return { userId, ...DEFAULT_USER_SETTINGS };
      }

      return {
        userId: record.userId,
        editorDialect: record.editorDialect,
        targetWordCount: record.targetWordCount,
        defaultDevice: record.defaultDevice,
        autoSlug: record.autoSlug,
      };
    } catch {
      return { userId, ...DEFAULT_USER_SETTINGS };
    }
  }

  public async upsert(
    userId: string,
    data: Partial<Omit<UserSettingsData, 'userId'>>
  ): Promise<UserSettingsData> {
    const dialect = data.editorDialect || DEFAULT_USER_SETTINGS.editorDialect;
    const targetWords = data.targetWordCount || DEFAULT_USER_SETTINGS.targetWordCount;
    const device = data.defaultDevice || DEFAULT_USER_SETTINGS.defaultDevice;
    const autoSlug = data.autoSlug !== undefined ? data.autoSlug : DEFAULT_USER_SETTINGS.autoSlug;

    try {
      const record = await prisma.userSettings.upsert({
        where: { userId },
        update: {
          editorDialect: dialect,
          targetWordCount: targetWords,
          defaultDevice: device,
          autoSlug,
        },
        create: {
          userId,
          editorDialect: dialect,
          targetWordCount: targetWords,
          defaultDevice: device,
          autoSlug,
        },
      });

      return {
        userId: record.userId,
        editorDialect: record.editorDialect,
        targetWordCount: record.targetWordCount,
        defaultDevice: record.defaultDevice,
        autoSlug: record.autoSlug,
      };
    } catch {
      return {
        userId,
        editorDialect: dialect,
        targetWordCount: targetWords,
        defaultDevice: device,
        autoSlug,
      };
    }
  }
}

export const settingsRepository = new SettingsRepository();