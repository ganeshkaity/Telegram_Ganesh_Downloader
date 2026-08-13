import { NextRequest, NextResponse } from 'next/server';
import { TokenService } from '@/services/download/tokenService';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  if (!token || typeof token !== 'string') {
    return new NextResponse('Invalid request token.', { status: 400 });
  }

  const record = TokenService.validateToken(token);

  if (!record) {
    logger.warn(`Download request failed for expired or invalid token: ${token}`);
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Download Link Expired</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 1rem; }
          .card { background: #1e293b; padding: 2rem; border-radius: 1rem; max-width: 420px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }
          h1 { color: #f43f5e; font-size: 1.5rem; margin-bottom: 0.5rem; }
          p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; }
          .badge { background: #334155; color: #cbd5e1; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="card">
          <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
          <h1>Download Link Expired</h1>
          <p>This media download link is no longer valid or has expired. Media URLs are kept temporary for security and privacy.</p>
          <div class="badge">Please generate a new link in Telegram</div>
        </div>
      </body>
      </html>
    `;
    return new NextResponse(errorHtml, {
      status: 410,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  logger.info(`Redirecting user to direct CDN media URL for token: ${token}`);
  
  // Return HTTP 302 Redirect directly to the source/CDN media URL.
  // Server acts ONLY as a redirector, NOT a media proxy!
  return NextResponse.redirect(record.mediaUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
