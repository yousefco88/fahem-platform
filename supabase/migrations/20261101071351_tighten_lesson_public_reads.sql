-- Historical rollout 2026-11-01: the wrong policy name was targeted here.
-- This migration by itself did NOT tighten the existing permissive policy.
-- Followed immediately by 20261101090932_correct_lesson_read_policy.sql.
drop policy if exists "published lessons readable" on public.curriculum_lessons;
create policy "published lessons readable" on public.curriculum_lessons for select
using (
  public.is_content_editor()
  or created_by = auth.uid()
  or (
    published = true
    and review_status = 'approved'
    and exists (
      select 1 from public.curriculum_subjects s
      where s.key = curriculum_lessons.subject_key and s.published = true
    )
  )
);
