import { Context, InlineKeyboard } from 'grammy';
import { StateManager } from '../state/stateManager';
import { getPlaylistFormatKeyboard } from '../keyboards/playlistMenu';
import { getVideoQualityKeyboard, getAudioQualityKeyboard } from '../keyboards/qualityMenu';
import { getPlaylistPaginationKeyboard } from '../keyboards/paginationMenu';
import { validateUrlForMode } from '@/lib/validation';
import { YtDlpService } from '@/services/ytdlp/YtDlpService';
import { YtDlpPlaylistInfo } from '@/services/ytdlp/parser';
import { TokenService } from '@/services/download/tokenService';
import { buildDownloadReply } from '../helpers/downloadReply';
import { logger } from '@/lib/logger';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// In-memory cache for loaded playlist entries to avoid re-fetching yt-dlp on pagination
const playlistCache = new Map<string, { info: YtDlpPlaylistInfo; timestamp: number }>();

function getCachedPlaylist(url: string): YtDlpPlaylistInfo | null {
  const cached = playlistCache.get(url);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.info;
  }
  return null;
}

function setCachedPlaylist(url: string, info: YtDlpPlaylistInfo) {
  playlistCache.set(url, { info, timestamp: Date.now() });
}

export async function handlePlaylistMenu(ctx: Context) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  await ctx.answerCallbackQuery().catch(() => {});
  StateManager.setState(userId, { mode: 'playlist', status: 'PLAYLIST_WAITING_URL' });

  const text = '🔗 *Send me the YouTube playlist link.*';
  const backKeyboard = new InlineKeyboard().text('⬅️ Back', 'back_main');

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    reply_markup: backKeyboard,
  }).catch(async () => {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: backKeyboard,
    });
  });
}

export async function handlePlaylistUrlInput(ctx: Context, textUrl: string) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const validation = validateUrlForMode(textUrl, 'playlist');

  if (!validation.valid) {
    await ctx.reply('❌ *Invalid YouTube playlist link.*\n\nPlease send a valid YouTube playlist URL.', {
      parse_mode: 'Markdown',
    });
    return;
  }

  StateManager.setState(userId, { url: textUrl, status: 'PLAYLIST_SELECT_FORMAT' });

  await ctx.reply('📑 *Playlist received.*\n\nChoose format:', {
    parse_mode: 'Markdown',
    reply_markup: getPlaylistFormatKeyboard(),
  });
}

export async function handlePlaylistFormatSelection(ctx: Context, format: 'video' | 'audio') {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  await ctx.answerCallbackQuery().catch(() => {});
  StateManager.setState(userId, { format, status: 'PLAYLIST_SELECT_QUALITY' });

  if (format === 'audio') {
    await ctx.editMessageText('🎵 *Choose audio quality:*', {
      parse_mode: 'Markdown',
      reply_markup: getAudioQualityKeyboard('pl_qa'),
    });
  } else {
    await ctx.editMessageText('🎥 *Choose video quality:*', {
      parse_mode: 'Markdown',
      reply_markup: getVideoQualityKeyboard('pl_qv'),
    });
  }
}

export async function handlePlaylistQualitySelection(ctx: Context, rawQuality: string) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  await ctx.answerCallbackQuery().catch(() => {});
  const state = StateManager.getState(userId);

  if (!state.url) {
    await ctx.reply('⚠️ *Session expired. Please send playlist link again.*', { parse_mode: 'Markdown' });
    StateManager.clearState(userId);
    return;
  }

  StateManager.setState(userId, { quality: rawQuality, page: 1 });

  await ctx.editMessageText('⏳ *Grabbing playlist links...*', { parse_mode: 'Markdown' }).catch(async () => {
    await ctx.reply('⏳ *Grabbing playlist links...*', { parse_mode: 'Markdown' });
  });

  try {
    let playlistInfo = getCachedPlaylist(state.url);
    if (!playlistInfo) {
      playlistInfo = await YtDlpService.getPlaylistInfo(state.url);
      setCachedPlaylist(state.url, playlistInfo);
    }

    if (!playlistInfo.entries || playlistInfo.entries.length === 0) {
      const keyboard = new InlineKeyboard().text('🏠 Main Menu', 'back_main');
      await ctx.editMessageText('❌ *No videos found in this playlist.*', {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
      StateManager.clearState(userId);
      return;
    }

    const text = 
      `✅ *Playlist ready!*\n\n` +
      `*Playlist:* ${playlistInfo.title}\n` +
      `*Videos found:* ${playlistInfo.entries.length}\n\n` +
      `Select a video to download:`;

    const keyboard = getPlaylistPaginationKeyboard(playlistInfo.entries, 1, 5);

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (err: any) {
    logger.error('Playlist processing error', { userId, err });
    const errMsg = err.message || '❌ Unable to extract playlist information right now.';
    const keyboard = new InlineKeyboard().text('🏠 Main Menu', 'back_main');
    await ctx.editMessageText(errMsg, { reply_markup: keyboard });
    StateManager.clearState(userId);
  }
}

export async function handlePlaylistPageChange(ctx: Context, pageNum: number) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  await ctx.answerCallbackQuery().catch(() => {});
  const state = StateManager.getState(userId);

  if (!state.url) {
    await ctx.reply('⚠️ *Session expired.*', { parse_mode: 'Markdown' });
    return;
  }

  StateManager.setState(userId, { page: pageNum });
  const playlistInfo = getCachedPlaylist(state.url);

  if (!playlistInfo) {
    await ctx.reply('⚠️ *Playlist cache expired. Please restart selection.*', { parse_mode: 'Markdown' });
    return;
  }

  const text = 
    `✅ *Playlist ready!*\n\n` +
    `*Playlist:* ${playlistInfo.title}\n` +
    `*Videos found:* ${playlistInfo.entries.length}\n\n` +
    `Select a video to download:`;

  const keyboard = getPlaylistPaginationKeyboard(playlistInfo.entries, pageNum, 5);

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  }).catch(() => {});
}

export async function handlePlaylistItemClick(ctx: Context, index: number) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  await ctx.answerCallbackQuery().catch(() => {});
  const state = StateManager.getState(userId);

  if (!state.url) {
    await ctx.reply('⚠️ *Session expired.*', { parse_mode: 'Markdown' });
    return;
  }

  const playlistInfo = getCachedPlaylist(state.url);
  if (!playlistInfo || !playlistInfo.entries[index]) {
    await ctx.reply('❌ *Video item not found.*', { parse_mode: 'Markdown' });
    return;
  }

  const targetEntry = playlistInfo.entries[index];
  const isAudio = state.format === 'audio';

  const statusMsg = await ctx.reply(`⏳ *Resolving direct link for Item #${index + 1}: ${targetEntry.title}...*`, {
    parse_mode: 'Markdown',
  });

  try {
    const quality = state.quality || 'Best';
    const { formatResult } = await YtDlpService.getDirectUrl(targetEntry.url, {
      mediaType: isAudio ? 'audio' : 'video',
      quality,
    });

    const filename = `${targetEntry.title}.${formatResult.ext}`;
    const token = TokenService.createToken(formatResult.url, filename);
    const downloadUrl = `${baseUrl}/api/download/${token}`;

    const { text, keyboard } = buildDownloadReply({
      title: targetEntry.title,
      qualityLabel: formatResult.qualityLabel,
      downloadUrl,
      directUrl: formatResult.url,
      isAudio,
      fallbackNote: formatResult.fallbackNote,
      itemNumber: index + 1,
      backCallback: `pl_page_${state.page || 1}`,
    });

    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (err: any) {
    logger.error('Playlist item resolution error', { userId, index, err });
    const errMsg = err.message || '❌ Failed to resolve link for this video item.';
    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, errMsg);
  }
}
