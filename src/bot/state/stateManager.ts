import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

export type BotMode = 'youtube' | 'instagram' | 'playlist' | 'website';

export type BotStateName =
  | 'IDLE'
  | 'YOUTUBE_WAITING_URL'
  | 'YOUTUBE_SELECT_TYPE'
  | 'YOUTUBE_SELECT_QUALITY'
  | 'INSTAGRAM_WAITING_URL'
  | 'INSTAGRAM_SELECT_TYPE'
  | 'PLAYLIST_WAITING_URL'
  | 'PLAYLIST_SELECT_FORMAT'
  | 'PLAYLIST_SELECT_QUALITY'
  | 'WEBSITE_WAITING_URL'
  | 'PROCESSING';

export interface UserState {
  telegramUserId: string;
  mode?: BotMode;
  url?: string;
  mediaType?: 'video' | 'audio' | 'thumbnail';
  format?: 'video' | 'audio';
  quality?: string;
  status: BotStateName;
  page?: number;
}

export class StateManager {
  /**
   * Retrieves the current conversation state for a user. Returns default IDLE if none exists.
   */
  static getState(userId: string): UserState {
    try {
      const db = getDb();
      const row = db.prepare('SELECT * FROM user_states WHERE user_id = ?').get(userId) as any;

      if (!row) {
        return {
          telegramUserId: userId,
          status: 'IDLE',
          page: 1,
        };
      }

      return {
        telegramUserId: row.user_id,
        mode: row.mode || undefined,
        url: row.url || undefined,
        mediaType: row.media_type || undefined,
        format: row.format || undefined,
        quality: row.quality || undefined,
        status: (row.status as BotStateName) || 'IDLE',
        page: row.page || 1,
      };
    } catch (err) {
      logger.error('Failed to get user state from database', { userId, err });
      return { telegramUserId: userId, status: 'IDLE', page: 1 };
    }
  }

  /**
   * Updates or merges user state in the database.
   */
  static setState(userId: string, updates: Partial<UserState>): UserState {
    const currentState = this.getState(userId);
    const newState: UserState = {
      ...currentState,
      ...updates,
      telegramUserId: userId,
      status: updates.status || currentState.status,
    };

    try {
      const db = getDb();
      const now = Date.now();

      db.prepare(`
        INSERT INTO user_states (user_id, mode, url, media_type, format, quality, status, page, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          mode = excluded.mode,
          url = excluded.url,
          media_type = excluded.media_type,
          format = excluded.format,
          quality = excluded.quality,
          status = excluded.status,
          page = excluded.page,
          updated_at = excluded.updated_at
      `).run(
        userId,
        newState.mode || null,
        newState.url || null,
        newState.mediaType || null,
        newState.format || null,
        newState.quality || null,
        newState.status,
        newState.page || 1,
        now
      );

      return newState;
    } catch (err) {
      logger.error('Failed to save user state to database', { userId, err });
      return newState;
    }
  }

  /**
   * Clears state for a user and sets it back to IDLE.
   */
  static clearState(userId: string): UserState {
    try {
      const db = getDb();
      const now = Date.now();

      db.prepare(`
        INSERT INTO user_states (user_id, mode, url, media_type, format, quality, status, page, updated_at)
        VALUES (?, NULL, NULL, NULL, NULL, NULL, 'IDLE', 1, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          mode = NULL,
          url = NULL,
          media_type = NULL,
          format = NULL,
          quality = NULL,
          status = 'IDLE',
          page = 1,
          updated_at = ?
      `).run(userId, now, now);

      return { telegramUserId: userId, status: 'IDLE', page: 1 };
    } catch (err) {
      logger.error('Failed to clear user state', { userId, err });
      return { telegramUserId: userId, status: 'IDLE', page: 1 };
    }
  }
}
