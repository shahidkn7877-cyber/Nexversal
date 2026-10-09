import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import {
  verifyAdminAuth,
  requireAdmin,
  getAdminSecret,
} from '../src/lib/auth/admin-guard';

describe('Admin Authorization Guard', () => {
  it('retrieves the admin secret key correctly', () => {
    const secret = getAdminSecret();
    expect(secret).toBeDefined();
    expect(typeof secret).toBe('string');
    expect(secret.length).toBeGreaterThan(0);
  });

  it('rejects unauthenticated requests lacking headers or cookies', () => {
    const req = new NextRequest('http://localhost:3000/api/v1/admin/ai/providers');
    const result = verifyAdminAuth(req);
    expect(result.authorized).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('authorizes requests with valid x-admin-key header', () => {
    const secret = getAdminSecret();
    const req = new NextRequest('http://localhost:3000/api/v1/admin/ai/providers', {
      headers: {
        'x-admin-key': secret,
      },
    });
    const result = verifyAdminAuth(req);
    expect(result.authorized).toBe(true);
    expect(result.user?.role).toBe('admin');
  });

  it('authorizes requests with valid Bearer authorization header', () => {
    const secret = getAdminSecret();
    const req = new NextRequest('http://localhost:3000/api/v1/admin/ai/providers', {
      headers: {
        authorization: 'Bearer ' + secret,
      },
    });
    const result = verifyAdminAuth(req);
    expect(result.authorized).toBe(true);
  });

  it('rejects requests with invalid credentials', () => {
    const req = new NextRequest('http://localhost:3000/api/v1/admin/ai/providers', {
      headers: {
        'x-admin-key': 'incorrect_password_or_token',
      },
    });
    const result = verifyAdminAuth(req);
    expect(result.authorized).toBe(false);
  });

  it('requireAdmin returns a 401 response for unauthorized requests', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/admin/ai/providers');
    const response = await requireAdmin(req);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);

    const json = await response?.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe('UNAUTHORIZED_ADMIN_ACCESS');
  });

  it('requireAdmin returns null (allowing execution) for authorized requests', async () => {
    const secret = getAdminSecret();
    const req = new NextRequest('http://localhost:3000/api/v1/admin/ai/providers', {
      headers: {
        'x-admin-key': secret,
      },
    });
    const response = await requireAdmin(req);
    expect(response).toBeNull();
  });
});
