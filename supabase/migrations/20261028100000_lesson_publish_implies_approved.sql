-- نشر المدير/المحرر لدرس يعني اعتماده: يمنع بقاء درس منشور بحالة submitted (غير مرئي للأسر).
create or replace function public.guard_teacher_lesson_write()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then return new; end if;
  if public.is_content_editor() then
    if new.published and new.review_status <> 'approved' then
      new.review_status := 'approved'; new.reviewed_by := auth.uid(); new.reviewed_at := now();
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid(); new.review_status := 'draft'; new.published := false;
    new.review_note := null; new.reviewed_by := null; new.reviewed_at := null;
    return new;
  end if;
  new.published := old.published;
  new.created_by := old.created_by;
  new.review_note := old.review_note;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  if new.review_status is distinct from old.review_status
     and not (old.review_status in ('draft','rejected') and new.review_status in ('draft','submitted')) then
    raise exception 'غير مسموح بتغيير حالة المراجعة' using errcode = '42501';
  end if;
  if new.review_status = 'submitted' and old.review_status <> 'submitted' then
    new.review_note := null;
  end if;
  return new;
end $$;
