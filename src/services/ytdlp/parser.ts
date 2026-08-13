export interface YtDlpFormat {
  format_id: string;
  url: string;
  ext?: string;
  width?: number;
  height?: number;
  format_note?: string;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  filesize_approx?: number;
  tbr?: number;
  vbr?: number;
  abr?: number;
  asr?: number;
  protocol?: string;
}

export interface YtDlpMediaInfo {
  id: string;
  title: string;
  description?: string;
  uploader?: string;
  duration?: number;
  thumbnail?: string;
  webpage_url?: string;
  formats?: YtDlpFormat[];
  url?: string; // Direct url if single stream
  ext?: string;
  extractor?: string;
  is_playlist?: boolean;
}

export interface YtDlpPlaylistEntry {
  id: string;
  title: string;
  url: string;
  duration?: number;
  uploader?: string;
}

export interface YtDlpPlaylistInfo {
  id: string;
  title: string;
  description?: string;
  entries: YtDlpPlaylistEntry[];
}

export class YtDlpParser {
  /**
   * Safely parses raw JSON output from `yt-dlp --dump-single-json`.
   */
  static parseSingleJson(rawJson: string): YtDlpMediaInfo {
    try {
      const data = JSON.parse(rawJson);
      return {
        id: data.id || '',
        title: data.title || data.fulltitle || 'Media Video',
        description: data.description || '',
        uploader: data.uploader || data.channel || data.uploader_id || '',
        duration: data.duration,
        thumbnail: data.thumbnail || (data.thumbnails && data.thumbnails[0]?.url) || '',
        webpage_url: data.webpage_url || data.url || '',
        formats: Array.isArray(data.formats) ? data.formats : [],
        url: data.url || '',
        ext: data.ext || 'mp4',
        extractor: data.extractor || '',
        is_playlist: Array.isArray(data.entries) && data.entries.length > 0,
      };
    } catch (err) {
      throw new Error('Failed to parse yt-dlp metadata JSON output');
    }
  }

  /**
   * Parses flat playlist metadata output from `yt-dlp --dump-single-json --flat-playlist`.
   */
  static parseFlatPlaylistJson(rawJson: string): YtDlpPlaylistInfo {
    try {
      const data = JSON.parse(rawJson);
      const entries: YtDlpPlaylistEntry[] = [];

      if (Array.isArray(data.entries)) {
        for (const entry of data.entries) {
          if (!entry) continue;
          const entryUrl = entry.url || (entry.id ? `https://www.youtube.com/watch?v=${entry.id}` : '');
          if (entryUrl) {
            entries.push({
              id: entry.id || '',
              title: entry.title || `Video ${entries.length + 1}`,
              url: entryUrl,
              duration: entry.duration,
              uploader: entry.uploader || entry.channel || '',
            });
          }
        }
      }

      return {
        id: data.id || '',
        title: data.title || 'YouTube Playlist',
        description: data.description || '',
        entries,
      };
    } catch (err) {
      throw new Error('Failed to parse yt-dlp playlist metadata');
    }
  }
}
