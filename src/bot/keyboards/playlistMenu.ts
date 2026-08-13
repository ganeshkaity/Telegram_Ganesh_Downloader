import { InlineKeyboard } from 'grammy';

export function getPlaylistFormatKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🎥 Video', 'pl_fmt_video')
    .text('🎵 Audio', 'pl_fmt_audio')
    .row()
    .text('⬅️ Back', 'back_main');
}
