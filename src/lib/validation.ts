import { z } from 'zod';

// SSRF checks to prevent probing localhost or internal cloud metadata IP addresses
function isSafeUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    
    // Disallow localhost, internal IP ranges, metadata endpoints
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }

    // Check IPv4 private ranges
    if (/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.)/.test(hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export const youtubeUrlSchema = z.string().trim().refine((url) => {
  if (!isSafeUrl(url)) return false;
  return /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+$/i.test(url);
}, { message: 'Invalid YouTube link. Please send a valid YouTube URL.' });

export const instagramUrlSchema = z.string().trim().refine((url) => {
  if (!isSafeUrl(url)) return false;
  return /^(https?:\/\/)?(www\.)?(instagram\.com)\/(p|reel|tv|reels)\/[\w-]+/i.test(url);
}, { message: 'Invalid Instagram link. Please send a valid Instagram URL.' });

export const playlistUrlSchema = z.string().trim().refine((url) => {
  if (!isSafeUrl(url)) return false;
  return /^(https?:\/\/)?(www\.|m\.)?(youtube\.com)\/playlist\?list=[\w-]+/i.test(url) ||
         (/^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+/i.test(url) && url.includes('list='));
}, { message: 'Invalid YouTube playlist link. Please send a valid playlist URL.' });

export const genericUrlSchema = z.string().trim().refine((url) => {
  return isSafeUrl(url);
}, { message: 'Invalid or unsafe URL. Please send a valid web media URL.' });

export function validateUrlForMode(url: string, mode: 'youtube' | 'instagram' | 'playlist' | 'website'): { valid: boolean; error?: string } {
  let result;
  switch (mode) {
    case 'youtube':
      result = youtubeUrlSchema.safeParse(url);
      break;
    case 'instagram':
      result = instagramUrlSchema.safeParse(url);
      break;
    case 'playlist':
      result = playlistUrlSchema.safeParse(url);
      break;
    case 'website':
    default:
      result = genericUrlSchema.safeParse(url);
      break;
  }

  if (result.success) {
    return { valid: true };
  } else {
    return { valid: false, error: result.error.errors[0]?.message || 'Invalid URL' };
  }
}
