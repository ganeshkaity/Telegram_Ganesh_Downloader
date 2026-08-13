import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Telegram Media Downloader Bot',
  description: 'High-performance Telegram media downloader bot powered by Next.js, TypeScript, and yt-dlp with zero server media storage.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
