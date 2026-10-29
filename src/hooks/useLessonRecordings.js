import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { validateRecordingFile, recordingPath, recordingError, recordingLoadStatus } from '../utils/recordingRules';

const BUCKET = 'lesson-recordings';

// المنشور من تسجيلات درس معيّن (الخادم يفلتر المقبول فقط عبر RLS) مع روابط موقّعة قصيرة العمر.
export function useLessonRecordings(lessonId) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ lessonId, items: [], status: lessonId ? 'loading' : 'idle' });

  useEffect(() => {
    let off = false;
    setResult({ lessonId, items: [], status: !lessonId ? 'idle' : !supabase ? 'unavailable' : 'loading' });
    if (!supabase || !lessonId) return () => { off = true; };

    (async () => {
      try {
        const { data, error } = await supabase.from('lesson_recordings')
          .select('id, storage_path, duration_sec, created_at')
          .eq('lesson_id', lessonId).eq('status', 'accepted').order('created_at', { ascending: false });
        if (off) return;
        if (error) throw error;

        const out = [];
        let signingFailed = false;
        for (const recording of data || []) {
          const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(recording.storage_path, 3600);
          if (off) return;
          if (signedError) signingFailed = true;
          if (signed?.signedUrl) out.push({ ...recording, url: signed.signedUrl });
        }

        if (!off) setResult({
          lessonId,
          items: out,
          status: recordingLoadStatus({ signingFailed, loadedCount: out.length }),
        });
      } catch {
        if (!off) setResult({ lessonId, items: [], status: 'error' });
      }
    })();

    return () => { off = true; };
  }, [lessonId, attempt]);

  const current = result.lessonId === lessonId
    ? result
    : { lessonId, items: [], status: lessonId ? 'loading' : 'idle' };

  return { ...current, retry: () => setAttempt(value => value + 1) };
}

// المعلم: رفع الملف ثم تسجيله عبر الدالة. عند فشل التسجيل يُحذف الملف المرفوع.
export async function uploadLessonRecording({ userId, file, lessonId, slotId, confirmed }) {
  if (!supabase) return { ok: false, reason: 'Supabase غير مهيأ' };
  if (!confirmed) return { ok: false, reason: 'يجب تأكيد خلو التسجيل من وجوه الأطفال وأصواتهم' };
  const bad = validateRecordingFile(file);
  if (bad) return { ok: false, reason: bad };
  const path = recordingPath(userId, crypto.randomUUID(), file);
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) return { ok: false, reason: up.error.message };
  const { error } = await supabase.rpc('register_lesson_recording', {
    p_lesson_id: lessonId, p_slot_id: slotId, p_path: path, p_duration: null, p_confirmed: true
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, reason: recordingError(error) };
  }
  return { ok: true };
}

// الإدارة: قائمة المعلّق + قبول/رفض + معاينة بروابط موقّعة.
export async function listPendingRecordings() {
  if (!supabase) return { ok: false, reason: 'Supabase غير مهيأ', data: [] };
  const { data, error } = await supabase.from('lesson_recordings')
    .select('id, lesson_id, storage_path, created_at, curriculum_lessons(title, subject_key)').eq('status', 'review').order('created_at');
  return error ? { ok: false, reason: error.message, data: [] } : { ok: true, data };
}
export async function reviewLessonRecording(id, status) {
  const { error } = await supabase.rpc('review_lesson_recording', { p_id: id, p_status: status });
  return error ? { ok: false, reason: recordingError(error) } : { ok: true };
}
export async function signedRecordingUrl(path) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 900);
  return data?.signedUrl || null;
}
