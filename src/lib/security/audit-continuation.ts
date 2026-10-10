import { createHmac, timingSafeEqual } from 'crypto';

const CONTINUATION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'nexversal-audit-continuation-secret-2026';

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface AuditContinuationPayload {
  auditId: string;
  exp: number;
  purpose: 'claim_audit';
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function sign(data: string): string {
  return createHmac('sha256', CONTINUATION_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Creates a cryptographically signed continuation token for guest audit reports.
 * Used to preserve guest audit context across login and registration flows.
 */
export function createAuditContinuationToken(
  auditId: string,
  ttlMs: number = DEFAULT_TTL_MS
): string {
  const payload: AuditContinuationPayload = {
    auditId,
    exp: Date.now() + ttlMs,
    purpose: 'claim_audit',
  };

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

/**
 * Verifies and decodes an audit continuation token.
 * Validates HMAC signature, expiration, purpose, and optionally matches expected audit ID.
 */
export function verifyAuditContinuationToken(
  token: string,
  expectedAuditId?: string
): { valid: boolean; auditId?: string; reason?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Missing token' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Malformed token structure' };
  }

  const [payloadEncoded, signature] = parts;
  const expectedSignature = sign(payloadEncoded);

  // Timing safe comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return { valid: false, reason: 'Invalid signature or tampered token' };
  }

  try {
    const jsonStr = base64UrlDecode(payloadEncoded);
    const payload: AuditContinuationPayload = JSON.parse(jsonStr);

    if (payload.purpose !== 'claim_audit') {
      return { valid: false, reason: 'Invalid token purpose' };
    }

    if (Date.now() > payload.exp) {
      return { valid: false, reason: 'Token has expired' };
    }

    if (expectedAuditId && payload.auditId !== expectedAuditId) {
      return { valid: false, reason: 'Audit ID mismatch' };
    }

    return { valid: true, auditId: payload.auditId };
  } catch {
    return { valid: false, reason: 'Failed to decode token payload' };
  }
}

