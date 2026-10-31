import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panel = readFileSync(new URL('../components/admin/SubscriptionPlansPanel.jsx', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../../supabase/migrations/20261031000536_subscription_catalog_foundation.sql', import.meta.url), 'utf8');

test('new plans cannot appear activatable when creation always saves as draft', () => {
  assert.match(panel, /\{form\.id \? <label[^>]*>الحالة<select/);
});

test('audit identity sequence is not exposed to authenticated clients', () => {
  assert.doesNotMatch(migration, /grant\s+(?:usage|select|update|all)[^;]*subscription_plan_audit_id_seq/i);
});

test('catalog marks unpublished subjects and does not offer them for new selected plans', () => {
  assert.match(panel, /select\('key,title,published'\)/);
  assert.match(panel, /subjects\.filter\(s => s\.published \|\| Object\.hasOwn\(form\.subjects, s\.key\)\)/);
  assert.match(panel, /disabled=\{!s\.published && !Object\.hasOwn\(form\.subjects, s\.key\)\}/);
});
