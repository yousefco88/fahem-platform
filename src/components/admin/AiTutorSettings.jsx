/**
 * AiTutorSettings — إعدادات مساعد التدريب (الإدارة فقط).
 * القراءة والتعديل محكومان بـ RLS على ai_tutor_settings (is_admin()).
 * التعليمات الأساسية للسلامة ثابتة في الدالة ولا تُعدَّل من هنا؛ الحقل يضيف عليها فقط.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import AiTutorReview from '../ai/AiTutorReview';
import AiTutorSources from './AiTutorSources';
import '../ai/AiTutorAdmin.css';

export default function AiTutorSettings() {
  const { user } = useAuth();
  const { triggerToast } = useApp();
  const [form, setForm] = useState(null);
  const [state, setState] = useState('loading'); // loading | error | ready
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) { setState('error'); return; }
    setState('loading');
    const { data, error } = await supabase.from('ai_tutor_settings').select('*').eq('id', 1).maybeSingle();
    if (error || !data) { setState('error'); return; }
    setForm({ ...data, model: data.model || '' });
    setState('ready');
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    const limit = Number(form.daily_limit);
    if (!Number.isInteger(limit) || limit < 5 || limit > 200) { triggerToast('الحد اليومي بين 5 و200'); return; }
    if (form.model && !/^[A-Za-z0-9._/-]+$/.test(form.model.trim())) { triggerToast('اسم النموذج يحتوي رموزًا غير مسموحة'); return; }
    setSaving(true);
    const { error } = await supabase.from('ai_tutor_settings').update({
      enabled: !!form.enabled,
      daily_limit: limit,
      extra_instructions: form.extra_instructions.trim(),
      model: form.model.trim() || null,
      updated_by: user?.id || null,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setSaving(false);
    if (error) { triggerToast(`تعذر الحفظ: ${error.message}`); return; }
    triggerToast('حُفظت إعدادات المساعد ✓ (تسري على الرسالة التالية)');
    load();
  }

  return (
    <div className="atr-page" dir="rtl">
      <section className="atr-wrap">
        <h3 className="atr-title">🤖 إعدادات مساعد التدريب</h3>
        {state === 'loading' && <div className="atr-empty">جارٍ التحميل...</div>}
        {state === 'error' && <div className="atr-empty atr-err">تعذر تحميل الإعدادات (تتطلب صلاحية الإدارة). <button type="button" className="atr-link" onClick={load}>إعادة المحاولة</button></div>}
        {state === 'ready' && (
          <>
            <label className="atr-field atr-check">
              <input type="checkbox" checked={!!form.enabled} onChange={e => set('enabled', e.target.checked)} />
              <span>المساعد الذكي مفعّل للجميع <small>(إيقافه يرجع الأطفال إلى الردود المحلية فورًا، حتى لو وافق أولياء الأمور)</small></span>
            </label>

            <label className="atr-field">
              <span>الحد اليومي لكل طفل (5–200)</span>
              <input type="number" min={5} max={200} value={form.daily_limit} onChange={e => set('daily_limit', e.target.value)} />
            </label>

            <label className="atr-field">
              <span>تعليمات إضافية للمساعد <small>({form.extra_instructions.length}/1500)</small></span>
              <textarea
                rows={6} maxLength={1500} value={form.extra_instructions}
                placeholder="مثال: في الرياضيات اشرح بمثال من حياة الطفل أولًا. في الإنجليزي اكتب الكلمة ونطقها بالحروف العربية."
                onChange={e => set('extra_instructions', e.target.value)}
              />
              <small className="atr-note">
                تُضاف إلى قواعد السلامة الثابتة (منهج الابتدائي فقط، بلا بيانات شخصية، بلا مواضيع طبية/دينية/سياسية) ولا تحلّ محلها.
                لا تكتب هنا أي بيانات شخصية أو أسرار.
              </small>
            </label>

            <label className="atr-field">
              <span>اسم النموذج (اختياري)</span>
              <input dir="ltr" value={form.model} placeholder="يُترك فارغًا لاستخدام الافتراضي" onChange={e => set('model', e.target.value)} />
              <small className="atr-note">النماذج المجانية تتغير؛ جرّب أي نموذج جديد بنفسك قبل اعتماده — اسم غير صالح يجعل المساعد يعتذر عن الرد.</small>
            </label>

            <div className="atr-row">
              <button type="button" className="atr-btn good" disabled={saving} onClick={save}>{saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</button>
              {form.updated_at && <small className="atr-note">آخر تحديث: {new Date(form.updated_at).toLocaleString('ar-EG')}</small>}
            </div>
          </>
        )}
      </section>
      <AiTutorSources />
      <AiTutorReview />
    </div>
  );
}
