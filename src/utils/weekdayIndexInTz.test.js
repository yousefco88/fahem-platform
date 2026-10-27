import test from 'node:test';
import assert from 'node:assert/strict';
import { weekdayIndexInTz } from './liveWindow.js';

test('weekday label index follows the same timezone as schedule filtering', () => {
  const mondayInSydney = new Date('2026-10-25T14:00:00Z');
  assert.equal(weekdayIndexInTz(mondayInSydney, 'Australia/Sydney'), 1);
  assert.equal(weekdayIndexInTz(mondayInSydney, 'Africa/Cairo'), 0);
});

test('invalid timezone falls back to the device weekday', () => {
  const date = new Date('2026-10-26T12:00:00Z');
  assert.equal(weekdayIndexInTz(date, 'invalid/zone'), date.getDay());
});
