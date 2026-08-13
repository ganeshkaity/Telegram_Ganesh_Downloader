import { Context, InlineKeyboard } from 'grammy';
import { StateManager } from '../state/stateManager';
import { getVideoQualityKeyboard, getAudioQualityKeyboard } from '../keyboards/qualityMenu';
import { validateUrlForMode } from '@/lib/validation';
import { YtDlpService } from '@/services/ytdlp/YtDlpService';
import { TokenService } from '@/services/download/tokenService';
import { buildDownloadReply } from '../helpers/downloadReply';
import { logger } from '@/lib/logger';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function handleWebsiteMenu(ctx: Context) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  await ctx.answerCallbackQuery().catch(() => {});
  StateManager.setState(userId, { mode: 'website', status: 'WEBSITE_WAITING_URL' });

  const text = '🔗 *Send me the media URL.*\n\nI\'ll try to detect the available media automatically.';
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

export async function handleWebsiteUrlInput(ctx: Context, textUrl: string) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const validation = validateUrlForMode(textUrl, 'website');

  if (!validation.valid) {
    await ctx.reply(validation.error || '❌ *Invalid URL.* Please send a valid media URL.', {
      parse_mode: 'Markdown',
    });
    return;
  }

  const statusMsg = await ctx.reply('⏳ *Analyzing website...*', { parse_mode: 'Markdown' });
  StateManager.setState(userId, { url: textUrl, status: 'PROCESSING' });

  try {
    const info = await YtDlpService.getInfo(textUrl);

    const text = 
      `🌐 *Media found*\n\n` +
      `*Title:* ${info.title}\n` +
      `*Source:* ${info.uploader || info.extractor || 'Web'}\n\n` +
      `Choose format:`;

    const keyboard = new InlineKeyboard()
      .text('🎥 Video', 'web_type_video')
      .text('🎵 Audio', 'web_type_audio')
      .row()
      .text('⬅️ Back', 'back_main');

    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (err: any) {
    logger.error('Website URL analysis error', { userId, err });
    const errMsg = err.message || '❌ Unable to extract media from this website URL.';
    const keyboard = new InlineKeyboard().text('🏠 Main Menu', 'back_main');
    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, errMsg, { reply_markup: keyboard });
    StateManager.clearState(userId);
  }
}

export async function handleWebsiteTypeSelection(ctx: Context, mediaType: 'video' | 'audio') {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  await ctx.answerCallbackQuery().catch(() => {});
  StateManager.setState(userId, { mediaType });

  if (mediaType === 'audio') {
    await ctx.editMessageText('🎵 *Choose audio quality:*', {
      parse_mode: 'Markdown',
      reply_markup: getAudioQualityKeyboard('web_qa'),
    });
  } else {
    await ctx.editMessageText('🎥 *Choose video quality:*', {
      parse_mode: 'Markdown',
      reply_markup: getVideoQualityKeyboard('web_qv'),
    });
  }
}

export async function handleWebsiteQualitySelection(ctx: Context, rawQuality: string) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  await ctx.answerCallbackQuery().catch(() => {});
  const state = StateManager.getState(userId);

  if (!state.url) {
    await ctx.reply('⚠️ *Session expired. Please send the link again.*', { parse_mode: 'Markdown' });
    StateManager.clearState(userId);
    return;
  }

  const isAudio = state.mediaType === 'audio';
  await ctx.editMessageText('⏳ *Grabbing link...*', { parse_mode: 'Markdown' }).catch(async () => {
    await ctx.reply('⏳ *Grabbing link...*', { parse_mode: 'Markdown' });
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
    logger.error('Website quality selection processing error', { userId, err });
    const errMsg = err.message || '❌ Unable to resolve download link.';
    const keyboard = new InlineKeyboard().text('🏠 Main Menu', 'back_main');
    await ctx.editMessageText(errMsg, { reply_markup: keyboard });
    StateManager.clearState(userId);
  }
}
