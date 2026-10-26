import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// موافقة ولي الأمر على مساعد الذكاء الاصطناعي لكل طفل — مغلقة افتراضياً.
// الحقيقة في جدول ai_tutor_consent (RLS: ولي الأمر فقط)؛ الخادم يتحقق منها أيضاً قبل أي استدعاء.
export default function useAiTutorConsent(childCloudId) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(Boolean(childCloudId));
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setError('');
    if (!supabase || !childCloudId) {
      setEnabled(false);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    supabase
      .from('ai_tutor_consent')
      .select('enabled')
      .eq('child_id', childCloudId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!alive) return;
        setEnabled(!err && Boolean(data?.enabled));
        setLoading(false);
      });
    return () => { alive = false; };
  }, [childCloudId]);

  const save = useCallback(async (next) => {
    if (!supabase || !childCloudId) return false;
    setError('');
    const { data: sess } = await supabase.auth.getSession();
    const { error: err } = await supabase.from('ai_tutor_consent').upsert({
      child_id: childCloudId,
      enabled: next,
      updated_by: sess?.session?.user?.id || null,
      updated_at: new Date().toISOString()
    });
    if (err) {
      setError('تعذر حفظ الإعداد. حاول مرة أخرى.');
      return false;
    }
    setEnabled(next);
    return true;
  }, [childCloudId]);

  return { enabled, loading, error, save };
}
