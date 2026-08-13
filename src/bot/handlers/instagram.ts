import { Context, InlineKeyboard } from 'grammy';
import { StateManager } from '../state/stateManager';
import { getInstagramMenuKeyboard } from '../keyboards/instagramMenu';
import { validateUrlForMode } from '@/lib/validation';
import { YtDlpService } from '@/services/ytdlp/YtDlpService';
import { TokenService } from '@/services/download/tokenService';
import { buildDownloadReply } from '../helpers/downloadReply';
import { logger } from '@/lib/logger';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function handleInstagramMenu(ctx: Context) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  await ctx.answerCallbackQuery().catch(() => {});
  StateManager.setState(userId, { mode: 'instagram', status: 'INSTAGRAM_SELECT_TYPE' });

  const text = '📸 *Instagram Downloader*\n\nChoose what you want:';
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    reply_markup: getInstagramMenuKeyboard(),
  }).catch(async () => {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: getInstagramMenuKeyboard(),
    });
  });
}

export async function handleInstagramTypeSelection(ctx: Context, mediaType: 'video' | 'audio') {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  await ctx.answerCallbackQuery().catch(() => {});
  StateManager.setState(userId, { mode: 'instagram', mediaType, status: 'INSTAGRAM_WAITING_URL' });

  const text = '🔗 *Send me the Instagram link.*';
  const backKeyboard = new InlineKeyboard().text('⬅️ Back', 'menu_instagram');

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

export async function handleInstagramUrlInput(ctx: Context, textUrl: string) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const state = StateManager.getState(userId);
  const validation = validateUrlForMode(textUrl, 'instagram');

  if (!validation.valid) {
    await ctx.reply('❌ *Invalid Instagram link.*\n\nPlease send a valid Instagram post or reel URL.', {
      parse_mode: 'Markdown',
    });
    return;
  }

  const isAudio = state.mediaType === 'audio';
  const statusMsgText = isAudio ? '⏳ *Grabbing audio link...*' : '⏳ *Grabbing video link...*';

  const statusMsg = await ctx.reply(statusMsgText, { parse_mode: 'Markdown' });
  StateManager.setState(userId, { status: 'PROCESSING', url: textUrl });

  try {
    const { mediaInfo, formatResult } = await YtDlpService.getDirectUrl(textUrl, {
      mediaType: isAudio ? 'audio' : 'video',
      quality: 'Best',
    });

    const filename = `instagram_${mediaInfo.id || 'media'}.${formatResult.ext}`;
    const token = TokenService.createToken(formatResult.url, filename);
    const downloadUrl = `${baseUrl}/api/download/${token}`;

    const { text, keyboard } = buildDownloadReply({
      title: mediaInfo.title || 'Instagram Media',
      qualityLabel: formatResult.qualityLabel,
      downloadUrl,
      directUrl: formatResult.url,
      isAudio,
    });

    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });

    StateManager.clearState(userId);
  } catch (err: any) {
    logger.error('Instagram link processing error', { userId, err });
    const errMsg = err.message || '❌ Unable to grab this Instagram media. It may be private or unavailable.';
    const keyboard = new InlineKeyboard().text('🏠 Main Menu', 'back_main');
    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, errMsg, { reply_markup: keyboard });
    StateManager.clearState(userId);
  }
}
