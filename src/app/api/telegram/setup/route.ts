import { NextRequest, NextResponse } from 'next/server';
import { getBot } from '@/bot/botInstance';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || token.includes('YOUR_TELEGRAM_BOT_TOKEN')) {
      return NextResponse.json(
        {
          success: false,
          error: 'TELEGRAM_BOT_TOKEN environment variable is missing or invalid on Render.',
        },
        { status: 400 }
      );
    }

    const host = request.headers.get('host') || '';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';

    let baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.NEXT_PUBLIC_BASE_URL;

    if (!baseUrl && host) {
      baseUrl = `${protocol}://${host}`;
    }

    if (!baseUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unable to determine public URL. Please set RENDER_EXTERNAL_URL or NEXT_PUBLIC_BASE_URL environment variable.',
        },
        { status: 400 }
      );
    }

    const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/telegram`;

    const bot = getBot();
    await bot.api.setWebhook(webhookUrl, {
      drop_pending_updates: true,
    });

    const info = await bot.api.getWebhookInfo();

    logger.info(`Telegram webhook configured successfully to: ${webhookUrl}`);

    return NextResponse.json({
      success: true,
      message: '🎉 Telegram webhook configured successfully!',
      webhook_url: webhookUrl,
      webhook_info: info,
    });
  } catch (err: any) {
    logger.error('Failed to set Telegram webhook', { error: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
