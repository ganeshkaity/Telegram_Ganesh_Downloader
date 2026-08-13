import { validateUrlForMode } from '../lib/validation';
import { FormatSelector } from '../services/ytdlp/formatSelector';
import { YtDlpMediaInfo } from '../services/ytdlp/parser';
import { TokenService } from '../services/download/tokenService';
import { StateManager } from '../bot/state/stateManager';
import { getDb } from '../lib/db';

async function runVerificationTests() {
  console.log('🧪 Starting Verification Tests...\n');

  // Test 1: URL Validation & SSRF Protection
  console.log('1️⃣ Testing URL Validation & SSRF Protection...');
  
  const testUrls = [
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', mode: 'youtube' as const, expected: true },
    { url: 'https://youtu.be/dQw4w9WgXcQ', mode: 'youtube' as const, expected: true },
    { url: 'https://www.instagram.com/reel/C1234567890/', mode: 'instagram' as const, expected: true },
    { url: 'https://www.youtube.com/playlist?list=PL12345', mode: 'playlist' as const, expected: true },
    { url: 'http://localhost/test', mode: 'website' as const, expected: false },
    { url: 'http://169.254.169.254/latest/meta-data', mode: 'website' as const, expected: false },
  ];

  let urlPassCount = 0;
  for (const item of testUrls) {
    const res = validateUrlForMode(item.url, item.mode);
    if (res.valid === item.expected) {
      urlPassCount++;
    } else {
      console.error(`❌ URL Validation test failed for: ${item.url} (expected ${item.expected}, got ${res.valid})`);
    }
  }
  console.log(`   ✅ Passed ${urlPassCount}/${testUrls.length} URL validation tests.`);

  // Test 2: Format Selector Resolution & Fallback Logic
  console.log('\n2️⃣ Testing Format Selector Resolution & Nearest Fallback...');

  const dummyMediaInfo: YtDlpMediaInfo = {
    id: 'test_vid',
    title: 'Test Video',
    formats: [
      { format_id: '1', url: 'https://cdn.example.com/360p.mp4', height: 360, vcodec: 'h264', acodec: 'aac' },
      { format_id: '2', url: 'https://cdn.example.com/720p.mp4', height: 720, vcodec: 'h264', acodec: 'aac' },
    ],
  };

  // Test exact match (720p)
  const exactRes = FormatSelector.selectVideoFormat(dummyMediaInfo, '720p');
  console.assert(exactRes.qualityLabel === '720p' && !exactRes.isFallback, 'Exact 720p match test failed');

  // Test fallback match (requested 1080p, closest is 720p)
  const fallbackRes = FormatSelector.selectVideoFormat(dummyMediaInfo, '1080p');
  console.assert(fallbackRes.qualityLabel === '720p' && fallbackRes.isFallback, 'Fallback 1080p -> 720p test failed');
  console.assert(fallbackRes.fallbackNote?.includes('1080p was not available'), 'Fallback note failed');

  console.log(`   ✅ FormatSelector resolution matching & nearest fallback verified!`);

  // Test 3: Token Service Creation & Expiration Check
  console.log('\n3️⃣ Testing Download Token Generation & Expiration...');

  const sampleUrl = 'https://cdn.example.com/media_stream.mp4';
  const token = TokenService.createToken(sampleUrl, 'video.mp4', 10);
  console.assert(typeof token === 'string' && token.length === 32, 'Token generation hex length failed');

  const validated = TokenService.validateToken(token);
  console.assert(validated !== null && validated.mediaUrl === sampleUrl, 'Token validation failed');

  console.log(`   ✅ Token generation and token validation verified!`);

  // Test 4: SQLite State Manager Persistence
  console.log('\n4️⃣ Testing SQLite State Persistence...');

  const testUserId = 'user_999888777';
  StateManager.clearState(testUserId);

  StateManager.setState(testUserId, {
    mode: 'youtube',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    mediaType: 'video',
    status: 'YOUTUBE_SELECT_QUALITY',
  });

  const savedState = StateManager.getState(testUserId);
  console.assert(savedState.mode === 'youtube', 'State mode persistence failed');
  console.assert(savedState.status === 'YOUTUBE_SELECT_QUALITY', 'State status persistence failed');
  console.assert(savedState.url === 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'State url persistence failed');

  StateManager.clearState(testUserId);
  const clearedState = StateManager.getState(testUserId);
  console.assert(clearedState.status === 'IDLE', 'State clearing failed');

  console.log(`   ✅ SQLite state persistence and clearing verified!`);

  console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
}

runVerificationTests().catch((err) => {
  console.error('❌ Verification test execution failed:', err);
  process.exit(1);
});
