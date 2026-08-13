import { Context, InlineKeyboard } from 'grammy';
import { StateManager } from '../state/stateManager';
import { getYoutubeMenuKeyboard } from '../keyboards/youtubeMenu';
import { getVideoQualityKeyboard, getAudioQualityKeyboard } from '../keyboards/qualityMenu';
import { validateUrlForMode } from '@/lib/validation';
import { YtDlpService } from '@/services/ytdlp/YtDlpService';
import { TokenService } from '@/services/download/tokenService';
import { buildDownloadReply, isPublicTelegramUrl } from '../helpers/downloadReply';
import { logger } from '@/lib/logger';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function handleYoutubeMenu(ctx: Context) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  await ctx.answerCallbackQuery().catch(() => {});
  StateManager.setState(userId, { mode: 'youtube', status: 'YOUTUBE_SELECT_TYPE' });

  const text = '🎬 *YouTube Downloader*\n\nChoose what you want to download:';
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    reply_markup: getYoutubeMenuKeyboard(),
  }).catch(async () => {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: getYoutubeMenuKeyboard(),
    });
  });
}

export async function handleYoutubeTypeSelection(ctx: Context, mediaType: 'video' | 'audio' | 'thumbnail') {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  await ctx.answerCallbackQuery().catch(() => {});
  StateManager.setState(userId, { mode: 'youtube', mediaType, status: 'YOUTUBE_WAITING_URL' });

  const promptText = `🔗 *Send me the YouTube video link.*`;
  const backKeyboard = new InlineKeyboard().text('⬅️ Back', 'menu_youtube');

  await ctx.editMessageText(promptText, {
    parse_mode: 'Markdown',
    reply_markup: backKeyboard,
  }).catch(async () => {
    await ctx.reply(promptText, {
      parse_mode: 'Markdown',
      reply_markup: backKeyboard,
    });
  });
}

export async function handleYoutubeUrlInput(ctx: Context, textUrl: string) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const state = StateManager.getState(userId);
  const validation = validateUrlForMode(textUrl, 'youtube');

  if (!validation.valid) {
    await ctx.reply(`❌ *Invalid YouTube link.*\n\nPlease send a valid YouTube URL.`, {
      parse_mode: 'Markdown',
    });
    return;
  }

  // Save validated URL
  StateManager.setState(userId, { url: textUrl });

  if (state.mediaType === 'thumbnail') {
    const loadingMsg = await ctx.reply('⏳ *Grabbing thumbnail...*', { parse_mode: 'Markdown' });
    try {
      const thumb = await YtDlpService.getThumbnail(textUrl);
      const token = TokenService.createToken(thumb.thumbnailUrl, 'thumbnail.jpg');
      const downloadUrl = `${baseUrl}/api/download/${token}`;

      let replyText = `✅ *Thumbnail ready!*\n\n*Title:* ${thumb.title}`;
      if (!isPublicTelegramUrl(downloadUrl)) {
        replyText += `\n\n🔗 *Download Link:*\n${downloadUrl}`;
      }

      const keyboard = new InlineKeyboard();
      if (isPublicTelegramUrl(downloadUrl)) {
        keyboard.url('⬇️ Download Thumbnail', downloadUrl);
      }
      if (isPublicTelegramUrl(thumb.thumbnailUrl)) {
        keyboard.url('👁 Open Thumbnail', thumb.thumbnailUrl);
      }
      keyboard.row().text('🏠 Main Menu', 'back_main');

      await ctx.api.editMessageText(ctx.chat!.id, loadingMsg.message_id, replyText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
      StateManager.clearState(userId);
    } catch (err: any) {
      await ctx.api.editMessageText(ctx.chat!.id, loadingMsg.message_id, err.message || '❌ Failed to extract thumbnail.');
      StateManager.clearState(userId);
    }
    return;
  }

  if (state.mediaType === 'audio') {
    StateManager.setState(userId, { status: 'YOUTUBE_SELECT_QUALITY' });
    await ctx.reply('🎬 *Link received.*\n\n🎵 *Choose audio quality:*', {
      parse_mode: 'Markdown',
      reply_markup: getAudioQualityKeyboard('yt_qa'),
    });
    return;
  }

  // Default video flow
  StateManager.setState(userId, { status: 'YOUTUBE_SELECT_QUALITY', mediaType: 'video' });
  await ctx.reply('🎬 *Link received.*\n\n🎥 *Choose video quality:*', {
    parse_mode: 'Markdown',
    reply_markup: getVideoQualityKeyboard('yt_qv'),
  });
}

export async function handleYoutubeQualitySelection(ctx: Context, rawQuality: string) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  await ctx.answerCallbackQuery().catch(() => {});
  const state = StateManager.getState(userId);

  if (!state.url) {
    await ctx.reply('⚠️ *Session expired. Please send the link again.*', { parse_mode: 'Markdown' });
    StateManager.clearState(userId);
    return;
  }

  StateManager.setState(userId, { status: 'PROCESSING', quality: rawQuality });

  const isAudio = state.mediaType === 'audio';
  const statusMsg = isAudio ? '⏳ *Grabbing audio link...*' : '⏳ *Grabbing link...*';

  await ctx.editMessageText(statusMsg, { parse_mode: 'Markdown' }).catch(async () => {
    await ctx.reply(statusMsg, { parse_mode: 'Markdown' });
  });

  try {
    const { mediaInfo, formatResult } = await YtDlpService.getDirectUrl(state.url, {
      mediaType: isAudio ? 'audio' : 'video',
      quality: rawQuality,
    });

    const filename = `${mediaInfo.title || 'media'}.${formatResult.ext}`;
    const token = TokenService.createToken(formatResult.url, filename);
    const downloadUrl = `${baseUrl}/api/download/${token}`;

    const { text, keyboard } = buildDownloadReply({
      title: mediaInfo.title,
      qualityLabel: formatResult.qualityLabel,
      downloadUrl,
      directUrl: formatResult.url,
      isAudio,
      fallbackNote: formatResult.fallbackNote,
    });

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });

    StateManager.clearState(userId);
  } catch (err: any) {
    logger.error('YouTube quality selection processing error', { userId, err });
    const errMsg = err.message || '❌ Unable to grab this media right now. Please try again with another link.';
    const keyboard = new InlineKeyboard().text('🏠 Main Menu', 'back_main');
    await ctx.editMessageText(errMsg, { reply_markup: keyboard }).catch(async () => {
      await ctx.reply(errMsg, { reply_markup: keyboard });
    });
    StateManager.clearState(userId);
  }
}
