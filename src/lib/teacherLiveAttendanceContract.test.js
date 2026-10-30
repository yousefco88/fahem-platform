import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const migrationPath = new URL('../../supabase/migrations/20261030224921_teacher_live_attendance.sql', import.meta.url);
const migration = existsSync(migrationPath) ? readFileSync(migrationPath, 'utf8') : '';
const rules = await import('./teacherLiveAttendanceRules.js').catch(() => null);

test('teacher attendance validator accepts actual attended minutes and explicit absence', () => {
  assert.equal(typeof rules?.validateTeacherAttendance, 'function', 'attendance validation rules are missing');
  assert.deepEqual(
    rules.validateTeacherAttendance({ slotId: 'slot-1', sessionDate: '2026-10-30', attended: true, actualMinutes: 37, today: '2026-10-30' }),
    { ok: true, payload: { slotId: 'slot-1', sessionDate: '2026-10-30', attended: true, actualMinutes: 37 } },
  );
  assert.equal(rules.validateTeacherAttendance({ slotId: 'slot-1', sessionDate: '2026-10-30', attended: false, actualMinutes: 0, today: '2026-10-30' }).ok, true);
});

test('teacher attendance validator rejects invalid dates, future dates, and inconsistent minutes', () => {
  assert.equal(typeof rules?.validateTeacherAttendance, 'function', 'attendance validation rules are missing');
  const check = input => rules.validateTeacherAttendance({ slotId: 'slot-1', today: '2026-10-30', ...input }).ok;
  assert.equal(check({ sessionDate: '2026-10-31', attended: true, actualMinutes: 30 }), false);
  assert.equal(check({ sessionDate: '2026-02-30', attended: true, actualMinutes: 30 }), false);
  assert.equal(check({ sessionDate: '2026-10-30', attended: true, actualMinutes: 0 }), false);
  assert.equal(check({ sessionDate: '2026-10-30', attended: false, actualMinutes: 5 }), false);
  assert.equal(check({ sessionDate: '2026-10-30', attended: true, actualMinutes: 1441 }), false);
});

test('attendance migration stores per-child records and an append-only audit trail', () => {
  for (const pattern of [
    /create table public\.teacher_live_attendance/i,
    /slot_id text not null references public\.schedule_slots\(id\) on delete restrict/i,
    /child_id uuid not null references public\.children\(id\) on delete restrict/i,
    /unique\s*\(slot_id,\s*session_date\)/i,
    /create table public\.teacher_live_attendance_audit/i,
    /old_actual_minutes integer/i,
    /new_actual_minutes integer not null/i,
    /alter table public\.teacher_live_attendance enable row level security/i,
    /alter table public\.teacher_live_attendance_audit enable row level security/i,
  ]) assert.match(migration, pattern);
});

test('attendance RPC requires the assigned teacher and a live slot, and does not debit subscription hours', () => {
  for (const pattern of [
    /create or replace function public\.record_teacher_live_attendance\s*\(/i,
    /security definer\s+set search_path\s*=\s*public,\s*pg_temp/i,
    /auth\.uid\(\)/i,
    /schedule_slots[\s\S]*?slot_type/i,
    /v_teacher_id\s+is distinct from\s+v_actor/i,
    /p_attended[\s\S]*?p_actual_minutes/i,
    /insert into public\.teacher_live_attendance_audit/i,
    /revoke all on table public\.teacher_live_attendance,\s*public\.teacher_live_attendance_audit/i,
    /grant select on public\.teacher_live_attendance,\s*public\.teacher_live_attendance_audit to authenticated/i,
  ]) assert.match(migration, pattern);
  assert.doesNotMatch(migration, /consume_subscription_hours|subscription_usage_ledger/i);
});
