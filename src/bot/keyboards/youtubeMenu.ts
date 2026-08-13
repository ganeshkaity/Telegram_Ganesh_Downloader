import { InlineKeyboard } from 'grammy';

export function getYoutubeMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🎥 Video', 'yt_type_video')
    .text('🎵 Audio', 'yt_type_audio')
    .row()
    .text('🖼 Thumbnail', 'yt_type_thumbnail')
    .row()
    .text('⬅️ Back', 'back_main');
}
