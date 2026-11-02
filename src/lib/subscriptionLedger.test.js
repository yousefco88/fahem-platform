import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { minutesToLabel, isMissingSchemaError, translateLedgerError, todayIsoDate } from './subscriptionLedger.js';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');

test('minutesToLabel renders hours and minutes with sign', () => {
  assert.equal(minutesToLabel(0), '0 د');
  assert.equal(minutesToLabel(60), '1 س');
  assert.equal(minutesToLabel(525), '8 س 45 د');
  assert.equal(minutesToLabel(-30), '−30 د');
  assert.equal(minutesToLabel(null), '0 د');
});

test('isMissingSchemaError recognises undeployed tables/functions only', () => {
  assert.equal(isMissingSchemaError({ code: '42P01', message: 'relation "x" does not exist' }), true);
  assert.equal(isMissingSchemaError({ code: 'PGRST202', message: 'Could not find the function' }), true);
  assert.equal(isMissingSchemaError({ code: '42501', message: 'permission denied' }), false);
  assert.equal(isMissingSchemaError(null), false);
});

test('translateLedgerError maps server messages to Arabic and passes unknown through', () => {
  assert.match(translateLedgerError('insufficient balance: 30 minutes left, 90 required'), /الرصيد غير كافٍ/);
  assert.match(translateLedgerError('child already has an active contract (x) overlapping this period'), /يتداخل/);
  assert.equal(translateLedgerError('something else'), 'something else');
});

test('todayIsoDate is local YYYY-MM-DD', () => {
  assert.equal(todayIsoDate(new Date(2026, 0, 5)), '2026-01-05');
});

test('UI only calls RPCs and tables defined by the ledger migrations', () => {
  const ui = read('../components/admin/SubscriptionContractsPanel.jsx') + read('../components/parent/SubscriptionBalanceCard.jsx');
  const migrations = read('../../supabase/migrations/20261101150000_subscription_hour_ledger.sql')
    + read('../../supabase/migrations/20261101160000_contract_grant_and_attendance_lock.sql')
    + read('../../supabase/migrations/20261031000608_child_subscription_contracts.sql');
  for (const rpc of [...ui.matchAll(/supabase\.rpc\('([a-z_]+)'/g)].map(m => m[1])) {
    assert.match(migrations, new RegExp(`create or replace function public\\.${rpc}\\(`), `RPC ${rpc} must exist in a migration`);
  }
  for (const table of ['subscription_hour_ledger', 'attendance_ledger_postings', 'child_subscription_contracts']) {
    assert.match(migrations, new RegExp(`create table public\\.${table}`));
  }
  // No direct writes from the client to ledger/contract tables.
  assert.doesNotMatch(ui, /from\('(subscription_hour_ledger|attendance_ledger_postings|child_subscription_contracts)'\)[\s\S]{0,80}\.(insert|update|delete|upsert)\(/);
});

test('describeLedgerEntry labels grant, debit, reversal', async () => {
  const { describeLedgerEntry } = await import('./subscriptionLedger.js');
  assert.equal(describeLedgerEntry({ entry_type: 'grant' }), 'تفعيل الاشتراك');
  assert.equal(describeLedgerEntry({ entry_type: 'debit', subject_key: 'math' }), 'حضور حصة مباشرة · math');
  assert.equal(describeLedgerEntry({ entry_type: 'debit' }), 'حضور حصة مباشرة');
  assert.equal(describeLedgerEntry({ entry_type: 'reversal', reason: 'غياب' }), 'تصحيح: غياب');
  assert.equal(describeLedgerEntry(null), '');
});
