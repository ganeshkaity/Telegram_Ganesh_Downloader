import { InlineKeyboard } from 'grammy';

export function getVideoQualityKeyboard(prefix: string = 'q_v'): InlineKeyboard {
  return new InlineKeyboard()
    .text('144p', `${prefix}_144p`)
    .text('240p', `${prefix}_240p`)
    .text('360p', `${prefix}_360p`)
    .row()
    .text('480p', `${prefix}_480p`)
    .text('720p', `${prefix}_720p`)
    .text('1080p', `${prefix}_1080p`)
    .row()
    .text('⭐ Best', `${prefix}_Best`)
    .row()
    .text('⬅️ Back', 'back_main');
}

export function getAudioQualityKeyboard(prefix: string = 'q_a'): InlineKeyboard {
  return new InlineKeyboard()
    .text('64 kbps', `${prefix}_64k`)
    .text('96 kbps', `${prefix}_96k`)
    .text('128 kbps', `${prefix}_128k`)
    .row()
    .text('160 kbps', `${prefix}_160k`)
    .text('192 kbps', `${prefix}_192k`)
    .text('256 kbps', `${prefix}_256k`)
    .row()
    .text('320 kbps', `${prefix}_320k`)
    .text('⭐ Best', `${prefix}_Best`)
    .row()
    .text('⬅️ Back', 'back_main');
}
