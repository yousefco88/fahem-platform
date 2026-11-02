-- Phase 3: enable the hourly attendance-debit sweep.
-- 20261101160000 only scheduled the job if pg_cron was already installed (it was not on hosted),
-- so this migration installs pg_cron when available and (re)schedules the job idempotently.
-- The sweep runs as the trusted scheduler session (assert_ledger_admin returns null actor) and
-- only posts attendance past live_attendance_lock_at (enforced again inside post_live_attendance_debit).
-- Harmless where pg_cron is not available (e.g. local isolated Postgres test harness).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'post-due-attendance-debits') then
      perform cron.unschedule('post-due-attendance-debits');
    end if;
    perform cron.schedule('post-due-attendance-debits', '15 * * * *',
                          $job$select public.post_due_attendance_debits(500)$job$);
  end if;
end $$;
