import { Context } from 'grammy';
import { StateManager } from '../state/stateManager';
import { getMainMenuKeyboard } from '../keyboards/mainMenu';

export async function handleStartCommand(ctx: Context) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  StateManager.clearState(userId);

  const text = '🎬 *Media Downloader*\n\nSelect an option below to begin downloading media directly:';
  
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery().catch(() => {});
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard(),
    }).catch(async () => {
      await ctx.reply(text, {
        parse_mode: 'Markdown',
        reply_markup: getMainMenuKeyboard(),
      });
    });
  } else {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard(),
    });
  }
}
