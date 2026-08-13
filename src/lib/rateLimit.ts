import { getDb } from './db';

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 15;

export function checkRateLimit(userId: string): { allowed: boolean; retryAfterSeconds?: number } {
  const db = getDb();
  const now = Date.now();

  const record = db.prepare('SELECT request_count, window_start FROM rate_limits WHERE user_id = ?').get(userId) as { request_count: number; window_start: number } | undefined;

  if (!record) {
    db.prepare('INSERT INTO rate_limits (user_id, request_count, window_start) VALUES (?, 1, ?)').run(userId, now);
    return { allowed: true };
  }

  // Check if current window has expired
  if (now - record.window_start > RATE_LIMIT_WINDOW_MS) {
    db.prepare('UPDATE rate_limits SET request_count = 1, window_start = ? WHERE user_id = ?').run(now, userId);
    return { allowed: true };
  }

  if (record.request_count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((record.window_start + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  db.prepare('UPDATE rate_limits SET request_count = request_count + 1 WHERE user_id = ?').run(userId);
  return { allowed: true };
}
