import { InlineKeyboard } from 'grammy';

export function getMainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('▶️ YouTube Downloader', 'menu_youtube')
    .row()
    .text('📸 Instagram Downloader', 'menu_instagram')
    .row()
    .text('📑 YouTube Playlist', 'menu_playlist')
    .row()
    .text('🌐 Any Website Media', 'menu_website')
    .row()
    .text('ℹ️ Help', 'menu_help');
}
