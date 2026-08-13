import { execFile } from 'child_process';
import { logger } from '@/lib/logger';
import { YtDlpMediaInfo, YtDlpParser, YtDlpPlaylistInfo } from './parser';
import { FormatSelector, SelectedFormatResult } from './formatSelector';

export class YtDlpService {
  private static binaryName = 'yt-dlp';

  /**
   * Executes yt-dlp subprocess with given argument array safely.
   */
  private static runYtDlp(args: string[], timeoutMs = 30000): Promise<string> {
    return new Promise((resolve, reject) => {
      logger.debug('Executing yt-dlp command', { args });
      execFile(
        this.binaryName,
        args,
        { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, // 10MB buffer
        (error, stdout, stderr) => {
          if (error) {
            logger.error('yt-dlp execution error', { error: error.message, stderr, args });
            
            const errLower = stderr.toLowerCase();
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
