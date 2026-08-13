import { Bot, Context } from 'grammy';
import { StateManager } from './state/stateManager';
import { checkRateLimit } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';
import { handleStartCommand } from './handlers/start';
import { handleHelp } from './handlers/help';
import {
  handleYoutubeMenu,
  handleYoutubeTypeSelection,
  handleYoutubeUrlInput,
  handleYoutubeQualitySelection,
} from './handlers/youtube';
import {
  handleInstagramMenu,
  handleInstagramTypeSelection,
  handleInstagramUrlInput,
} from './handlers/instagram';
import {
  handlePlaylistMenu,
  handlePlaylistUrlInput,
  handlePlaylistFormatSelection,
  handlePlaylistQualitySelection,
  handlePlaylistPageChange,
  handlePlaylistItemClick,
} from './handlers/playlist';
import {
  handleWebsiteMenu,
  handleWebsiteUrlInput,
  handleWebsiteTypeSelection,
  handleWebsiteQualitySelection,
} from './handlers/website';

export function createBot(): Bot {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';

  if (!token) {
    logger.warn('TELEGRAM_BOT_TOKEN is not set in environment variables.');
  }

  const bot = new Bot(token);

  // Rate Limiter & Global Logger Middleware
  bot.use(async (ctx: Context, next) => {
    const userId = ctx.from?.id.toString();
    if (userId) {
      const limit = checkRateLimit(userId);
      if (!limit.allowed) {
        const retry = limit.retryAfterSeconds || 30;
        await ctx.reply(`⚠️ *Rate limit exceeded.*\n\nPlease wait ${retry} seconds before trying again.`, {
          parse_mode: 'Markdown',
        });
        return;
      }
    }
    await next();
  });

  // Commands
  bot.command('start', handleStartCommand);
  bot.command('help', handleHelp);

  // Main Menu Navigation Callbacks
  bot.callbackQuery('menu_youtube', handleYoutubeMenu);
  bot.callbackQuery('menu_instagram', handleInstagramMenu);
  bot.callbackQuery('menu_playlist', handlePlaylistMenu);
  bot.callbackQuery('menu_website', handleWebsiteMenu);
  bot.callbackQuery('menu_help', handleHelp);
  bot.callbackQuery('back_main', handleStartCommand);
  bot.callbackQuery('noop', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
  });

  // YouTube Callbacks
  bot.callbackQuery('yt_type_video', (ctx) => handleYoutubeTypeSelection(ctx, 'video'));
  bot.callbackQuery('yt_type_audio', (ctx) => handleYoutubeTypeSelection(ctx, 'audio'));
  bot.callbackQuery('yt_type_thumbnail', (ctx) => handleYoutubeTypeSelection(ctx, 'thumbnail'));

  bot.callbackQuery(/^yt_qv_(.+)$/, (ctx) => {
    const quality = ctx.match[1];
    return handleYoutubeQualitySelection(ctx, quality);
  });

  bot.callbackQuery(/^yt_qa_(.+)$/, (ctx) => {
    const rawQuality = ctx.match[1].replace('k', ' kbps');
    return handleYoutubeQualitySelection(ctx, rawQuality);
  });

  // Instagram Callbacks
  bot.callbackQuery('ig_type_video', (ctx) => handleInstagramTypeSelection(ctx, 'video'));
  bot.callbackQuery('ig_type_audio', (ctx) => handleInstagramTypeSelection(ctx, 'audio'));

  // Playlist Callbacks
  bot.callbackQuery('pl_fmt_video', (ctx) => handlePlaylistFormatSelection(ctx, 'video'));
  bot.callbackQuery('pl_fmt_audio', (ctx) => handlePlaylistFormatSelection(ctx, 'audio'));

  bot.callbackQuery(/^pl_qv_(.+)$/, (ctx) => {
    const quality = ctx.match[1];
    return handlePlaylistQualitySelection(ctx, quality);
  });

  bot.callbackQuery(/^pl_qa_(.+)$/, (ctx) => {
    const rawQuality = ctx.match[1].replace('k', ' kbps');
    return handlePlaylistQualitySelection(ctx, rawQuality);
  });

  bot.callbackQuery(/^pl_page_(\d+)$/, (ctx) => {
    const pageNum = parseInt(ctx.match[1], 10);
    return handlePlaylistPageChange(ctx, pageNum);
  });

  bot.callbackQuery(/^pl_item_(\d+)$/, (ctx) => {
    const itemIndex = parseInt(ctx.match[1], 10);
    return handlePlaylistItemClick(ctx, itemIndex);
  });

  // Website Callbacks
  bot.callbackQuery('web_type_video', (ctx) => handleWebsiteTypeSelection(ctx, 'video'));
  bot.callbackQuery('web_type_audio', (ctx) => handleWebsiteTypeSelection(ctx, 'audio'));

  bot.callbackQuery(/^web_qv_(.+)$/, (ctx) => {
    const quality = ctx.match[1];
    return handleWebsiteQualitySelection(ctx, quality);
  });

  bot.callbackQuery(/^web_qa_(.+)$/, (ctx) => {
    const rawQuality = ctx.match[1].replace('k', ' kbps');
    return handleWebsiteQualitySelection(ctx, rawQuality);
  });

  // Text Messages Middleware (State-based input handling)
  bot.on('message:text', async (ctx: Context) => {
    const userId = ctx.from?.id.toString();
    const messageText = ctx.message?.text?.trim();

    if (!userId || !messageText) return;

    // Ignore commands (starting with '/') handled above
    if (messageText.startsWith('/')) return;

    const state = StateManager.getState(userId);

    switch (state.status) {
      case 'YOUTUBE_WAITING_URL':
        await handleYoutubeUrlInput(ctx, messageText);
        break;

      case 'INSTAGRAM_WAITING_URL':
        await handleInstagramUrlInput(ctx, messageText);
        break;

      case 'PLAYLIST_WAITING_URL':
        await handlePlaylistUrlInput(ctx, messageText);
        break;

      case 'WEBSITE_WAITING_URL':
        await handleWebsiteUrlInput(ctx, messageText);
        break;

      case 'IDLE':
      default:
        // If user sends a direct link while IDLE, default to website/generic media detection flow
        if (/^https?:\/\//i.test(messageText)) {
          await handleWebsiteUrlInput(ctx, messageText);
        } else {
          await handleStartCommand(ctx);
        }
        break;
    }
  });

  bot.catch((err) => {
    logger.error('Unhandled bot error', { error: err.error, ctx: err.ctx.update });
  });

  return bot;
}

let _cachedBot: Bot | null = null;
let _initPromise: Promise<void> | null = null;

export function getBot(): Bot {
  if (!_cachedBot) {
    _cachedBot = createBot();
  }
  return _cachedBot;
}

export async function getInitializedBot(): Promise<Bot> {
  const bot = getBot();
  if (!bot.isInited()) {
    if (!_initPromise) {
      _initPromise = bot.init().then(() => {
        logger.info(`Bot initialized successfully as @${bot.botInfo.username}`);
      }).catch((err) => {
        _initPromise = null;
        throw err;
      });
    }
    await _initPromise;
  }
  return bot;
}
