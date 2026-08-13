import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

const dbPath = process.env.DATABASE_URL || './data/bot.db';
const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);

// Ensure target directory exists
const dir = path.dirname(resolvedPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    logger.info(`Initializing SQLite database at: ${resolvedPath}`);
    dbInstance = new Database(resolvedPath);
    dbInstance.pragma('journal_mode = WAL');
    
    // Initialize Schema
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS user_states (
        user_id TEXT PRIMARY KEY,
        mode TEXT,
        url TEXT,
        media_type TEXT,
        format TEXT,
        quality TEXT,
        status TEXT,
        page INTEGER DEFAULT 1,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS download_tokens (
        token TEXT PRIMARY KEY,
        media_url TEXT NOT NULL,
        filename TEXT,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rate_limits (
        user_id TEXT PRIMARY KEY,
        request_count INTEGER NOT NULL DEFAULT 1,
        window_start INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tokens_expires ON download_tokens(expires_at);
    `);
  }

  return dbInstance;
}
