import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface DownloadTokenRecord {
  token: string;
  mediaUrl: string;
  filename?: string;
  expiresAt: number;
  createdAt: number;
}

const DEFAULT_EXPIRY_SECONDS = parseInt(process.env.TOKEN_EXPIRY_SECONDS || '900', 10); // 15 minutes default

export class TokenService {
  /**
   * Generates a unique 16-byte random token mapping to the direct media URL.
   */
  static createToken(mediaUrl: string, filename?: string, customExpirySeconds?: number): string {
    const token = crypto.randomBytes(16).toString('hex');
    const now = Date.now();
    const expiryMs = (customExpirySeconds || DEFAULT_EXPIRY_SECONDS) * 1000;
    const expiresAt = now + expiryMs;

    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO download_tokens (token, media_url, filename, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(token, mediaUrl, filename || null, expiresAt, now);

      logger.info('Created download token', { token, expiresAt });
      return token;
    } catch (err) {
      logger.error('Failed to store download token', { err, token });
      throw new Error('Could not create download link token');
    }
  }

  /**
   * Validates a token and returns the direct media URL if valid and not expired.
   */
  static validateToken(token: string): DownloadTokenRecord | null {
    try {
      const db = getDb();
      const row = db.prepare('SELECT * FROM download_tokens WHERE token = ?').get(token) as any;

      if (!row) {
        return null;
      }

      const now = Date.now();
      if (row.expires_at < now) {
        logger.warn('Token expired access attempt', { token });
        return null;
      }

      return {
        token: row.token,
        mediaUrl: row.media_url,
        filename: row.filename || undefined,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      };
    } catch (err) {
      logger.error('Failed to validate download token', { token, err });
      return null;
    }
  }

  /**
   * Cleans up expired tokens from SQLite.
   */
  static cleanupExpiredTokens(): number {
    try {
      const db = getDb();
      const now = Date.now();
      const result = db.prepare('DELETE FROM download_tokens WHERE expires_at < ?').run(now);
      return result.changes;
    } catch (err) {
      logger.error('Token cleanup error', { err });
      return 0;
    }
  }
}
