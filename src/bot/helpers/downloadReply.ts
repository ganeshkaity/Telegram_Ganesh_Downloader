import { InlineKeyboard } from 'grammy';

export function isPublicTelegramUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local')
    ) {
      return false;
    }
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface DownloadReplyOptions {
  title: string;
  qualityLabel: string;
  downloadUrl: string;
  directUrl?: string;
  isAudio?: boolean;
  fallbackNote?: string;
  itemNumber?: number;
  backCallback?: string;
}

export function buildDownloadReply(options: DownloadReplyOptions): { text: string; keyboard: InlineKeyboard } {
  const { title, qualityLabel, downloadUrl, directUrl, isAudio, fallbackNote, itemNumber, backCallback } = options;

  const typeLabel = isAudio ? 'Audio' : 'Video';
  const prefix = itemNumber ? `Item #${itemNumber} ` : '';

  let text = `✅ *${prefix}${typeLabel} ready!*\n\n*Title:* ${title}\n*Quality:* ${qualityLabel}`;

  if (fallbackNote) {
    text += `\n\n${fallbackNote}`;
  }

  const isPublicDownload = isPublicTelegramUrl(downloadUrl);
  const isPublicDirect = directUrl ? isPublicTelegramUrl(directUrl) : false;

  // If download URL is local (e.g. http://localhost:3000), Telegram rejects inline button URLs.
  // So we include the URL directly in message text for local testing, while maintaining buttons for public URLs.
  if (!isPublicDownload) {
    text += `\n\n🔗 *Download Link:*\n${downloadUrl}`;
  }

  const keyboard = new InlineKeyboard();

  if (isPublicDownload) {
    keyboard.url(`⬇️ Download ${typeLabel}`, downloadUrl).row();
  }

  if (isPublicDirect && directUrl) {
    keyboard.url('🔗 Direct Stream Link', directUrl).row();
  }

  if (backCallback) {
    keyboard.text('⬅️ Back', backCallback);
  }

  keyboard.text('🏠 Main Menu', 'back_main');

  return { text, keyboard };
}
