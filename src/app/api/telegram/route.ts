import { NextRequest, NextResponse } from 'next/server';
import { getBot } from '@/bot/botInstance';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();
    await getBot().handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    logger.error('Error handling Telegram webhook update', { error: err.message });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || token.includes('YOUR_TELEGRAM_BOT_TOKEN')) {
      return NextResponse.json({
        status: 'warning',
        service: 'Telegram Media Downloader Webhook API',
        message: 'TELEGRAM_BOT_TOKEN environment variable is not set or invalid on Render.',
        timestamp: new Date().toISOString(),
      });
    }

    const info = await getBot().api.getWebhookInfo();
    return NextResponse.json({
      status: 'online',
      service: 'Telegram Media Downloader Webhook API',
      timestamp: new Date().toISOString(),
      webhook_configured: Boolean(info.url),
      current_webhook_url: info.url || 'None (Webhook is NOT set!)',
      pending_update_count: info.pending_update_count,
      last_error_message: info.last_error_message || null,
      setup_link: '/api/telegram/setup',
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'online',
      service: 'Telegram Media Downloader Webhook API',
      timestamp: new Date().toISOString(),
      error: err.message,
    });
  }
}
