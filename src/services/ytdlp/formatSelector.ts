import { YtDlpFormat, YtDlpMediaInfo } from './parser';

export interface SelectedFormatResult {
  url: string;
  qualityLabel: string;
  isFallback: boolean;
  fallbackNote?: string;
  ext: string;
}

export class FormatSelector {
  /**
   * Filters formats that are directly accessible via standard HTTP/HTTPS URLs.
   * Prefers formats with valid audio + video (acodec != 'none' && vcodec != 'none') or single direct stream URLs.
   */
  private static filterDirectFormats(formats: YtDlpFormat[]): YtDlpFormat[] {
    return formats.filter((f) => {
      if (!f.url) return false;
      // Exclude manifest formats like m3u8/hls or dash unless no choice
      const isHttp = f.url.startsWith('http://') || f.url.startsWith('https://');
      const isManifest = f.protocol?.includes('m3u8') || f.protocol?.includes('dash') || f.url.includes('.m3u8');
      return isHttp && !isManifest;
    });
  }

  /**
   * Selects the best direct video format matching the target quality preference.
   */
  static selectVideoFormat(mediaInfo: YtDlpMediaInfo, targetQuality: string): SelectedFormatResult {
    // If mediaInfo has a top-level direct URL (common for simple sites or Instagram)
    if (mediaInfo.url && (!mediaInfo.formats || mediaInfo.formats.length === 0)) {
      return {
        url: mediaInfo.url,
        qualityLabel: 'Best Available',
        isFallback: false,
        ext: mediaInfo.ext || 'mp4',
      };
    }

    const availableFormats = this.filterDirectFormats(mediaInfo.formats || []);

    if (availableFormats.length === 0) {
      // Fallback to top-level URL or first format
      const fallback = mediaInfo.url || (mediaInfo.formats && mediaInfo.formats[0]?.url);
      if (!fallback) {
        throw new Error('No direct downloadable format found for this URL.');
      }
      return {
        url: fallback,
        qualityLabel: 'Default',
        isFallback: false,
        ext: mediaInfo.ext || 'mp4',
      };
    }

    // Filter combined video+audio formats first (progressive MP4/WebM) to avoid silent video
    const combinedFormats = availableFormats.filter((f) => f.vcodec !== 'none' && f.acodec !== 'none');
    const pool = combinedFormats.length > 0 ? combinedFormats : availableFormats;

    // Parse target resolution height (e.g., '720p' -> 720)
    const targetHeight = targetQuality === 'Best' ? 9999 : parseInt(targetQuality.replace('p', ''), 10) || 720;

    // Sort pool by closeness to targetHeight
    const sorted = [...pool].sort((a, b) => {
      const hA = a.height || 0;
      const hB = b.height || 0;
      return Math.abs(hA - targetHeight) - Math.abs(hB - targetHeight);
    });

    const bestMatch = sorted[0];
    const actualHeight = bestMatch.height || (bestMatch.format_note ? parseInt(bestMatch.format_note, 10) : 0);
    const actualLabel = actualHeight ? `${actualHeight}p` : 'Best';

    const isExact = targetQuality === 'Best' || (actualHeight > 0 && `${actualHeight}p` === targetQuality);
    const isFallback = !isExact && targetQuality !== 'Best';

    let fallbackNote: string | undefined = undefined;
    if (isFallback) {
      fallbackNote = `ℹ️ ${targetQuality} was not available.\nUsing the closest available quality: ${actualLabel}.`;
    }

    return {
      url: bestMatch.url,
      qualityLabel: actualLabel,
      isFallback,
      fallbackNote,
      ext: bestMatch.ext || 'mp4',
    };
  }

  /**
   * Selects the best direct audio format matching the target audio bitrate preference.
   */
  static selectAudioFormat(mediaInfo: YtDlpMediaInfo, targetBitrate: string): SelectedFormatResult {
    // If top-level URL
    if (mediaInfo.url && (!mediaInfo.formats || mediaInfo.formats.length === 0)) {
      return {
        url: mediaInfo.url,
        qualityLabel: 'Best Available',
        isFallback: false,
        ext: mediaInfo.ext || 'm4a',
      };
    }

    const availableFormats = this.filterDirectFormats(mediaInfo.formats || []);

    // Filter audio formats (acodec != 'none')
    const audioFormats = availableFormats.filter((f) => f.acodec !== 'none');
    const pool = audioFormats.length > 0 ? audioFormats : availableFormats;

    if (pool.length === 0) {
      const fallback = mediaInfo.url || (mediaInfo.formats && mediaInfo.formats[0]?.url);
      if (!fallback) {
        throw new Error('No direct audio format found for this media.');
      }
      return {
        url: fallback,
        qualityLabel: 'Default',
        isFallback: false,
        ext: mediaInfo.ext || 'm4a',
      };
    }

    const targetKbps = targetBitrate === 'Best' ? 999 : parseInt(targetBitrate.replace(/[^0-9]/g, ''), 10) || 128;

    // Sort by closeness to target bitrate (abr or tbr)
    const sorted = [...pool].sort((a, b) => {
      const abrA = a.abr || a.tbr || 0;
      const abrB = b.abr || b.tbr || 0;
      return Math.abs(abrA - targetKbps) - Math.abs(abrB - targetKbps);
    });

    const bestMatch = sorted[0];
    const actualAbr = Math.round(bestMatch.abr || bestMatch.tbr || 128);
    const actualLabel = `${actualAbr} kbps`;

    const isExact = targetBitrate === 'Best' || `${actualAbr} kbps` === targetBitrate || Math.abs(actualAbr - targetKbps) < 16;
    const isFallback = !isExact && targetBitrate !== 'Best';

    let fallbackNote: string | undefined = undefined;
    if (isFallback) {
      fallbackNote = `ℹ️ ${targetBitrate} was not available.\nUsing the closest available audio quality: ${actualLabel}.`;
    }

    return {
      url: bestMatch.url,
      qualityLabel: actualLabel,
      isFallback,
      fallbackNote,
      ext: bestMatch.ext || 'm4a',
    };
  }
}
