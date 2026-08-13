import { Context, InlineKeyboard } from 'grammy';

export async function handleHelp(ctx: Context) {
  await ctx.answerCallbackQuery().catch(() => {});

  const helpText = 
    'ℹ️ *Help & Architecture Information*\n\n' +
    '⚡ *Direct Download Architecture*:\n' +
    'This bot resolves direct media streams and generates secure temporary links. Media files are **never** stored or proxied through our server.\n\n' +
    '📌 *Supported Modes*:\n' +
    '• 🎬 *YouTube*: Direct video, audio, and thumbnail extraction.\n' +
    '• 📸 *Instagram*: Reels, Posts, and IGTV videos & audio.\n' +
    '• 📑 *YouTube Playlist*: Interactive item browser & pagination.\n' +
    '• 🌐 *Any Website*: Universal metadata extraction via yt-dlp.\n\n' +
    'Click *Main Menu* to start downloading!';

  const keyboard = new InlineKeyboard().text('🏠 Main Menu', 'back_main');

  await ctx.editMessageText(helpText, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  }).catch(async () => {
    await ctx.reply(helpText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });
}
