import { InlineKeyboard } from 'grammy';
import { YtDlpPlaylistEntry } from '@/services/ytdlp/parser';

export function getPlaylistPaginationKeyboard(
  entries: YtDlpPlaylistEntry[],
  page: number = 1,
  pageSize: number = 5
): InlineKeyboard {
  const totalPages = Math.ceil(entries.length / pageSize) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));

  const startIndex = (currentPage - 1) * pageSize;
  const currentEntries = entries.slice(startIndex, startIndex + pageSize);

  const keyboard = new InlineKeyboard();

  // Add individual item selection buttons
  currentEntries.forEach((entry, idx) => {
    const itemNum = startIndex + idx + 1;
    const shortTitle = entry.title.length > 25 ? `${entry.title.substring(0, 22)}...` : entry.title;
    keyboard.text(`${itemNum}️⃣ ${shortTitle}`, `pl_item_${itemNum - 1}`).row();
  });

  // Pagination navigation row
  const navRow: { text: string; data: string }[] = [];

  if (currentPage > 1) {
    navRow.push({ text: '⬅️ Previous', data: `pl_page_${currentPage - 1}` });
  }

  navRow.push({ text: `Page ${currentPage}/${totalPages}`, data: 'noop' });

  if (currentPage < totalPages) {
    navRow.push({ text: 'Next ➡️', data: `pl_page_${currentPage + 1}` });
  }

  navRow.forEach((btn) => keyboard.text(btn.text, btn.data));
  keyboard.row();

  keyboard.text('🏠 Main Menu', 'back_main');

  return keyboard;
}
