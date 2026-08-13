import { InlineKeyboard } from 'grammy';

export function getInstagramMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🎥 Video', 'ig_type_video')
    .text('🎵 Audio', 'ig_type_audio')
    .row()
    .text('⬅️ Back', 'back_main');
}
