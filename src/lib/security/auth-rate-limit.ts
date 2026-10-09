import { NextRequest } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

const loginRateStore = new Map<string, RateLimitRecord>();
const registerRateStore = new Map<string, RateLimitRecord>();
const adminAuthRateStore = new Map<string, RateLimitRecord>();

const WINDOW_MS = 60 * 1000; // 1 minute sliding window
const MAX_LOGIN_PER_IP = 10;
const MAX_LOGIN_PER_EMAIL = 5;
const MAX_REGISTER_PER_IP = 5;
const MAX_ADMIN_PER_IP = 5;

/**
 * Extracts the client IP address from standard proxy headers.
 */
export function getClientIp(req?: NextRequest | Request): string {
  if (!req) return '127.0.0.1';

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) {
    return cfIp.trim();
  }

  return '127.0.0.1';
}

function checkWindow(
  store: Map<string, RateLimitRecord>,
  key: string,
  limit: number
): RateLimitResult {
  const now = Date.now();
  const record = store.get(key) || { timestamps: [] };
  const valid = record.timestamps.filter((ts) => now - ts < WINDOW_MS);

  if (valid.length >= limit) {
    const oldest = valid[0];
    const resetInSeconds = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  valid.push(now);
  store.set(key, { timestamps: valid });

  return {
    allowed: true,
    remaining: limit - valid.length,
    resetInSeconds: Math.ceil(WINDOW_MS / 1000),
  };
}

/**
 * Enforces rate limiting on user login attempts.
 * Limits both per-IP requests and per-targeted-account attempts to protect against brute force and credential stuffing.
 */
export function checkLoginRateLimit(ip: string, email?: string): RateLimitResult {
  // 1. IP-level rate limit
  const ipCheck = checkWindow(loginRateStore, `ip:${ip}`, MAX_LOGIN_PER_IP);
  if (!ipCheck.allowed) {
    return ipCheck;
  }

  // 2. Account-level rate limit (if target email supplied)
  if (email && email.trim()) {
    const normalized = email.toLowerCase().trim();
    const emailCheck = checkWindow(loginRateStore, `email:${normalized}`, MAX_LOGIN_PER_EMAIL);
    if (!emailCheck.allowed) {
      return emailCheck;
    }
  }

  return ipCheck;
}

/**
 * Enforces rate limiting on user registration endpoint.
 * Throttles rapid account creation from a single IP address.
 */
export function checkRegisterRateLimit(ip: string): RateLimitResult {
  return checkWindow(registerRateStore, `ip:${ip}`, MAX_REGISTER_PER_IP);
}

/**
 * Enforces rate limiting on internal administrator authentication endpoint.
 */
export function checkAdminAuthRateLimit(ip: string): RateLimitResult {
  return checkWindow(adminAuthRateStore, `ip:${ip}`, MAX_ADMIN_PER_IP);
}

/**
 * Resets rate limit records for testing or administrative unblocking.
 */
export function resetAuthRateLimits(key?: string): void {
  if (key) {
    loginRateStore.delete(key);
    registerRateStore.delete(key);
    adminAuthRateStore.delete(key);
  } else {
    loginRateStore.clear();
    registerRateStore.clear();
    adminAuthRateStore.clear();
  }
}

