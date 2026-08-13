import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { logger } from '@/lib/logger';
import { YtDlpMediaInfo, YtDlpParser, YtDlpPlaylistInfo } from './parser';
import { FormatSelector, SelectedFormatResult } from './formatSelector';

export class YtDlpService {
  private static binaryName = 'yt-dlp';

  /**
   * Resolves cookie file path if available.
   */
  private static getCookiesArg(): string[] {
    // 1. Check if raw cookie content is provided via env var (ideal for Render env variables)
    if (process.env.YOUTUBE_COOKIES_CONTENT) {
      const tempCookiePath = path.resolve(process.cwd(), 'temp_cookies.txt');
      try {
        fs.writeFileSync(tempCookiePath, process.env.YOUTUBE_COOKIES_CONTENT, 'utf8');
        return ['--cookies', tempCookiePath];
      } catch (err) {
        logger.error('Failed to write temp cookies file from env', { err });
      }
    }

    // 2. Check if custom path is set in env
    if (process.env.YOUTUBE_COOKIES_PATH) {
      const customPath = path.resolve(process.cwd(), process.env.YOUTUBE_COOKIES_PATH);
      if (fs.existsSync(customPath)) {
        return ['--cookies', customPath];
      }
    }

    // 3. Check default cookies.txt in workspace root
    const defaultCookiePath = path.resolve(process.cwd(), 'cookies.txt');
    if (fs.existsSync(defaultCookiePath)) {
      return ['--cookies', defaultCookiePath];
    }

    return [];
  }

  /**
   * Executes yt-dlp subprocess with given argument array safely.
   */
  private static runYtDlp(args: string[], timeoutMs = 30000): Promise<string> {
    return new Promise((resolve, reject) => {
      const cookieArgs = this.getCookiesArg();
      const finalArgs = [
        ...cookieArgs,
        '--extractor-args',
        'youtube:player_client=android,web',
        ...args,
      ];

      logger.debug('Executing yt-dlp command', { args: finalArgs });
      execFile(
        this.binaryName,
        finalArgs,
        { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, // 10MB buffer
        (error, stdout, stderr) => {
          if (error) {
            logger.error('yt-dlp execution error', { error: error.message, stderr, args: finalArgs });
            
            const errLower = stderr.toLowerCase();
            if (errLower.includes('sign in to confirm') || errLower.includes('bot')) {
              return reject(new Error('🔒 YouTube requires authentication. Make sure cookies.txt is valid and updated.'));
            }
            if (errLower.includes('private') || errLower.includes('login') || errLower.includes('account')) {
              return reject(new Error('🔒 This media appears to be private or requires authentication.'));
            }
            if (errLower.includes('unsupported url') || errLower.includes('not supported')) {
              return reject(new Error('❌ This website is not currently supported by yt-dlp.'));
            }
            if (errLower.includes('404') || errLower.includes('not found') || errLower.includes('does not exist')) {
              return reject(new Error('❌ Media not found or link is broken.'));
            }
            return reject(new Error('❌ Unable to grab this media right now. Please try again with another link.'));
          }

          resolve(stdout);
        }
      );
    });
  }

  /**
   * Extracts single media metadata from URL.
   */
  static async getInfo(url: string): Promise<YtDlpMediaInfo> {
    const args = ['--dump-single-json', '--no-playlist', '--no-warnings', url];
    const stdout = await this.runYtDlp(args);
    return YtDlpParser.parseSingleJson(stdout);
  }

  /**
   * Extracts playlist entries metadata.
   */
  static async getPlaylistInfo(url: string): Promise<YtDlpPlaylistInfo> {
    const args = ['--dump-single-json', '--flat-playlist', '--no-warnings', url];
    const stdout = await this.runYtDlp(args);
    return YtDlpParser.parseFlatPlaylistJson(stdout);
  }

  /**
   * Retrieves thumbnail image URL for video.
   */
  static async getThumbnail(url: string): Promise<{ thumbnailUrl: string; title: string }> {
    const info = await this.getInfo(url);
    if (!info.thumbnail) {
      throw new Error('No thumbnail available for this link.');
    }
    return {
      thumbnailUrl: info.thumbnail,
      title: info.title,
    };
  }

  /**
   * Resolves direct downloadable media URL for video/audio according to quality.
   */
  static async getDirectUrl(
    url: string,
    options: { mediaType: 'video' | 'audio'; quality: string }
  ): Promise<{ mediaInfo: YtDlpMediaInfo; formatResult: SelectedFormatResult }> {
    const info = await this.getInfo(url);

    let formatResult: SelectedFormatResult;
    if (options.mediaType === 'audio') {
      formatResult = FormatSelector.selectAudioFormat(info, options.quality);
    } else {
      formatResult = FormatSelector.selectVideoFormat(info, options.quality);
    }

    return {
      mediaInfo: info,
      formatResult,
    };
  }
}
