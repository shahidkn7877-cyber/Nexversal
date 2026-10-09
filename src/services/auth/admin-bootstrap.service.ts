import { userRepository } from '@/repositories/user.repository';
import { hashPassword } from '@/lib/auth/password';
import { activityService } from '@/services/activity/activity.service';

export interface AdminBootstrapResult {
  status: 'CREATED' | 'ALREADY_EXISTS' | 'SKIPPED_NO_CREDENTIALS' | 'ERROR';
  email?: string;
  role?: 'ADMIN';
  message: string;
}

export class AdminBootstrapService {
  /**
   * Safely bootstraps the primary administrative account from environment variables.
   * - Never exposes or logs the raw password.
   * - Only creates the account if it does NOT already exist.
   * - If account exists, preserves the existing password and verifies ADMIN role.
   * - Never downgrades or overwrites existing accounts automatically.
   */
  public async bootstrapAdmin(): Promise<AdminBootstrapResult> {
    const rawEmail = process.env.ADMIN_EMAIL;
    const rawPassword = process.env.ADMIN_PASSWORD;

    if (!rawEmail || !rawEmail.trim() || !rawPassword || !rawPassword.trim()) {
      return {
        status: 'SKIPPED_NO_CREDENTIALS',
        message: 'ADMIN_EMAIL or ADMIN_PASSWORD is not configured in server environment.',
      };
    }

    const email = rawEmail.toLowerCase().trim();

    try {
      // 1. Check if the configured admin user already exists in the database
      const existingUser = await userRepository.findByEmail(email);

      if (existingUser) {
        // If already exists, verify role is ADMIN without touching/overwriting password
        if (existingUser.role !== 'ADMIN') {
          await userRepository.updateRole(existingUser.id, 'ADMIN');
        }

        return {
          status: 'ALREADY_EXISTS',
          email,
          role: 'ADMIN',
          message: 'Configured admin account already exists in database. Existing password preserved.',
        };
      }

      // 2. Account does not exist — create secure ADMIN account
      if (rawPassword.length < 8) {
        return {
          status: 'ERROR',
          message: 'ADMIN_PASSWORD must be at least 8 characters long.',
        };
      }

      const passwordHash = hashPassword(rawPassword);

      const created = await userRepository.create({
        email,
        passwordHash,
        name: 'System Administrator',
        role: 'ADMIN',
      });

      // Record activity event
      activityService.recordEvent({
        type: 'ADMIN_LOGIN',
        userId: created.id,
        summary: `Admin account bootstrapped: ${created.email}`,
        metadata: {
          email: created.email,
          role: created.role,
        },
      });

      return {
        status: 'CREATED',
        email,
        role: 'ADMIN',
        message: 'Secure admin account bootstrapped successfully.',
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown database error during admin bootstrap.';
      return {
        status: 'ERROR',
        message: errMsg,
      };
    }
  }
}

export const adminBootstrapService = new AdminBootstrapService();

