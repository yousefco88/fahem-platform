import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../../supabase/migrations/20261031000608_child_subscription_contracts.sql', import.meta.url),
  'utf8',
);

test('child subscription snapshots are tied to a stable child and plan without cascade deletion', () => {
  assert.match(migration, /create table public\.child_subscription_contracts/i);
  assert.match(migration, /child_id uuid not null references public\.children\(id\) on delete restrict/i);
  assert.match(migration, /plan_id uuid not null references public\.subscription_plans\(id\) on delete restrict/i);
  assert.match(migration, /plan_snapshot jsonb not null/i);
});

test('contract snapshot records term, coverage, price, hours, and cancellation timing', () => {
  for (const pattern of [
    /starts_at timestamptz/i,
    /ends_at timestamptz/i,
    /coverage_mode_snapshot text not null/i,
    /included_hours_snapshot numeric/i,
    /quoted_total_minor integer/i,
    /cancel_at_period_end boolean not null default false/i,
    /renewal_mode text not null default 'manual'/i,
  ]) assert.match(migration, pattern);
});

test('selected-subject entitlements preserve each subject price in the contract', () => {
  assert.match(migration, /create table public\.child_subscription_subjects/i);
  assert.match(migration, /subject_key text not null/i);
  assert.match(migration, /price_per_child_minor_snapshot integer not null/i);
  assert.match(migration, /references public\.child_subscription_contracts\(id\) on delete restrict/i);
});

test('parents can read only their own child contracts; admins can read all', () => {
  assert.match(migration, /c\.parent_id = auth\.uid\(\)/i);
  assert.match(migration, /public\.is_admin\(\)/i);
  assert.match(migration, /enable row level security/i);
});

test('coverage mode and selected subjects remain consistent at transaction end', () => {
  assert.match(migration, /deferrable initially deferred/i);
  assert.match(migration, /if v_coverage = 'all'.*?cannot list selected subjects/is);
  assert.match(migration, /if v_coverage = 'selected'.*?require at least one subject/is);
  assert.match(migration, /revoke all on function public\.validate_child_subscription_coverage\(\) from public, anon, authenticated/i);
});

test('client roles receive read-only contract access; no purchase or consumption RPC is introduced', () => {
  assert.match(migration, /grant select on public\.child_subscription_contracts, public\.child_subscription_subjects\s+to authenticated/i);
  assert.match(migration, /revoke insert, update, delete on public\.child_subscription_contracts, public\.child_subscription_subjects\s+from anon, authenticated/i);
  assert.doesNotMatch(migration, /create\s+(?:or replace\s+)?function\s+public\.(?:create_child_subscription|consume_subscription_hours|refund_child_subscription)/i);
});
