interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 15; // 15 requests per minute

/**
 * Lightweight sliding window rate-limiter for keyword research API.
 * Prevents rapid abuse and excessive provider load.
 */
export function checkKeywordRateLimit(userId: string): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const record = rateLimitStore.get(userId) || { timestamps: [] };

  // Filter timestamps within the active sliding window
  const validTimestamps = record.timestamps.filter((ts) => now - ts < WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS) {
    const oldest = validTimestamps[0];
    const resetInSeconds = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  validTimestamps.push(now);
  rateLimitStore.set(userId, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: MAX_REQUESTS - validTimestamps.length,
    resetInSeconds: Math.ceil(WINDOW_MS / 1000),
  };
}

export function resetKeywordRateLimit(userId: string): void {
  rateLimitStore.delete(userId);
}
