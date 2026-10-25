import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveVideo, safeFileUrl } from './videoEmbed.js';

test('youtube watch/short/embed -> nocookie iframe', () => {
  for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ', 'https://youtube.com/shorts/dQw4w9WgXcQ'])
    assert.deepEqual(resolveVideo(u), { kind: 'iframe', src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' });
});
test('vimeo -> player iframe', () => {
  assert.equal(resolveVideo('https://vimeo.com/123456789').src, 'https://player.vimeo.com/video/123456789');
});
test('direct file and supabase storage -> video', () => {
  assert.equal(resolveVideo('https://x.com/a.mp4').kind, 'video');
  assert.equal(resolveVideo('https://abc.supabase.co/storage/v1/object/public/v/1').kind, 'video');
});
test('rejects http, junk, unknown hosts, javascript:', () => {
  for (const u of ['http://youtu.be/dQw4w9WgXcQ', 'javascript:alert(1)', 'https://evil.com/page', '', null, 'https://vimeo.com/abc'])
    assert.equal(resolveVideo(u), null);
});
test('safeFileUrl https only', () => {
  assert.equal(safeFileUrl('https://a.com/f.pdf'), 'https://a.com/f.pdf');
  assert.equal(safeFileUrl('http://a.com/f.pdf'), null);
  assert.equal(safeFileUrl('javascript:1'), null);
});
