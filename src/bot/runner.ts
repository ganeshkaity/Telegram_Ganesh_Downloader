import path from 'path';
import fs from 'fs';

// Helper to load env variables from .env.local or .env without external dependencies
function loadEnvFile(envPath: string) {
  const fullPath = path.resolve(process.cwd(), envPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        const value = trimmed.substring(eqIdx + 1).trim();
        process.env[key] = value;
      }
    }
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

import { getBot } from './botInstance';
import { logger } from '@/lib/logger';

async function main() {
  logger.info('Starting Telegram Bot in Long-Polling Mode...');
  
  if (!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN.includes('YOUR_TELEGRAM_BOT_TOKEN')) {
    logger.error('CRITICAL: TELEGRAM_BOT_TOKEN is missing or set to default in .env / .env.local');
    logger.info('Please set your Telegram Bot Token in .env.local and try again.');
    process.exit(1);
  }

  const bot = getBot();

  // Clear any existing webhooks before starting long-polling
  await bot.api.deleteWebhook({ drop_pending_updates: true }).catch(() => {});

  const botInfo = await bot.api.getMe();
  logger.info(`Bot initialized successfully! Logged in as @${botInfo.username} (${botInfo.first_name})`);

  bot.start({
    botInfo,
    onStart: () => {
      logger.info('Bot is now listening for messages via long-polling...');
    },
  });
}

main().catch((err) => {
  logger.error('Fatal error starting bot runner', { err });
  process.exit(1);
});
