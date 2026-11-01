-- Correct the earlier policy-name mismatch; permissive RLS policies combine with OR.
-- The earlier rollout created "published lessons readable" but left the broad
-- pre-existing "lessons readable" policy in place. This removes both and
-- installs a single canonical SELECT policy.
drop policy if exists "lessons readable" on public.curriculum_lessons;
drop policy if exists "published lessons readable" on public.curriculum_lessons;
create policy "lessons readable" on public.curriculum_lessons
  for select using (
    (
      published = true
      and review_status = 'approved'
      and exists (
        select 1 from public.curriculum_subjects s
        where s.key = curriculum_lessons.subject_key and s.published = true
      )
    )
    or public.is_content_editor()
    or (auth.uid() is not null and created_by = auth.uid())
  );
