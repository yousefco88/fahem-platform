import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sitemap = readFileSync(new URL('../../public/sitemap.xml', import.meta.url), 'utf8');

test('public sitemap excludes the retired embassy exam simulator route', () => {
  assert.doesNotMatch(sitemap, /<loc>[^<]*\/exam<\/loc>/i);
});
