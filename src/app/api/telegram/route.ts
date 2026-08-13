import { NextRequest, NextResponse } from 'next/server';
import { getBot } from '@/bot/botInstance';
import { logger } from '@/lib/logger';

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
  return NextResponse.json({
    status: 'online',
    service: 'Telegram Media Downloader Webhook API',
    timestamp: new Date().toISOString(),
  });
}
