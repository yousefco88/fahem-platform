import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecordingFile, recordingPath, MAX_RECORDING_BYTES } from './recordingRules.js';

test('accepts mp4/webm within limit', () => {
  assert.equal(validateRecordingFile({ type: 'video/mp4', size: 10 }), null);
  assert.equal(validateRecordingFile({ type: 'video/webm', size: MAX_RECORDING_BYTES }), null);
});
test('rejects missing, wrong type, empty, oversize', () => {
  assert.ok(validateRecordingFile(null));
  assert.ok(validateRecordingFile({ type: 'application/pdf', size: 10 }));
  assert.ok(validateRecordingFile({ type: 'video/mp4', size: 0 }));
  assert.ok(validateRecordingFile({ type: 'video/mp4', size: MAX_RECORDING_BYTES + 1 }));
});
test('path starts with user id folder and never uses file name', () => {
  assert.equal(recordingPath('u1', 'abc', { type: 'video/webm', name: 'طفل-احمد.webm' }), 'u1/abc.webm');
});
