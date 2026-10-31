import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const report = readFileSync(new URL('../components/parent/WeeklyReportPDF.jsx', import.meta.url), 'utf8');
const insights = readFileSync(new URL('../components/account/ChildInsightsPanel.jsx', import.meta.url), 'utf8');

test('cumulative progress PDF is not labeled as a weekly report', () => {
  assert.doesNotMatch(report, /التقرير الأسبوعي/);
  assert.match(report, /تقرير التقدم/);
  assert.match(insights, /تقرير التقدم PDF/);
  assert.match(insights, /حتى .*toLocaleDateString/);
});
