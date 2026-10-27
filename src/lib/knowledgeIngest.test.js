import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanExtracted, chunkText, looksScanned, buildChunks } from './knowledgeIngest.js';

test('cleanExtracted يفكّ أشكال العرض ويصلح قلب ال+همزة', () => {
  assert.equal(cleanExtracted('ﺎﻟﻜﺴﺮ'), 'الكسر');
  assert.equal(cleanExtracted('األسرة'), 'الأسرة');
  assert.equal(cleanExtracted('  كَسْرٌ \n  جزء '), 'كسر جزء');
});

test('chunkText يقطع عند الجمل ويحترم الحد ويتجاهل القصير', () => {
  const sentence = 'هذه جملة عربية قصيرة للاختبار تكفي لتجاوز الحد الأدنى. ';
  const chunks = chunkText(sentence.repeat(40), 300, 500);
  assert.ok(chunks.length > 3);
  assert.ok(chunks.every(c => c.length <= 500 && c.length >= 20));
  assert.deepEqual(chunkText('قصير'), []);
  assert.deepEqual(chunkText(''), []);
});

test('chunkText يقصّ جملة بلا نقاط أطول من الحد', () => {
  const long = 'كلمة '.repeat(600);
  const chunks = chunkText(long, 300, 500);
  assert.ok(chunks.length >= 6);
  assert.ok(chunks.every(c => c.length <= 500));
});

test('looksScanned يميّز الملف الممسوح', () => {
  assert.equal(looksScanned(0, 154), true);
  assert.equal(looksScanned(51993, 90), false);
  assert.equal(looksScanned(0, 0), false);
});

test('buildChunks يحمل رقم الصفحة', () => {
  const rows = buildChunks(['', 'الكسر جزء من الكل ويكتب برقمين فوق وتحت خط.']);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].page, 2);
});
