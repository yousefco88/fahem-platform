import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { cairoDateKey, validateTeacherAttendance } from '../../lib/teacherLiveAttendanceRules';

const fieldStyle = {
  minWidth: 0,
  padding: '9px 10px',
  border: '1px solid var(--line)',
  borderRadius: 10,
  font: 'inherit',
  background: 'var(--card-bg)',
  color: 'var(--navy)',
};

const buttonStyle = {
  padding: '9px 14px',
  border: 0,
  borderRadius: 10,
  background: 'var(--g-primary)',
  color: 'white',
  boxShadow: 'var(--press)',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 800,
};

function validationMessage(reason) {
  if (reason === 'slot_required') return 'تعذر تحديد الحصة.';
  if (reason === 'invalid_date') return 'أدخل تاريخاً صحيحاً للحصة.';
  if (reason === 'future_date') return 'لا يمكن تسجيل حضور بتاريخ مستقبلي.';
  if (reason === 'invalid_minutes') return 'أدخل مدة فعلية بين دقيقة و24 ساعة.';
  if (reason === 'absence_minutes_must_be_zero') return 'مدة الغياب يجب أن تكون صفراً.';
  return 'اختر حالة حضور أو غياب صحيحة.';
}

export default function TeacherLiveAttendance({ slot, childName }) {
  const [sessionDate, setSessionDate] = useState(() => cairoDateKey());
  const [status, setStatus] = useState('');
  const [minutes, setMinutes] = useState('');
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const today = cairoDateKey();
  const attended = status === 'present' ? true : status === 'absent' ? false : null;
  const actualMinutes = attended ? Number(minutes) : 0;
  const validation = validateTeacherAttendance({
    slotId: slot?.id,
    sessionDate,
    attended,
    actualMinutes,
    today,
  });
  const unchanged = existing
    && existing.attended === attended
    && existing.actual_minutes === actualMinutes;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setExisting(null);
    setStatus('');
    setMinutes('');
    setMessage('');

    const load = async () => {
      if (!supabase || !slot?.id || !sessionDate) {
        if (active) {
          setLoading(false);
          setMessage('خدمة تسجيل الحضور غير متاحة حالياً.');
        }
        return;
      }
      try {
        const { data, error } = await supabase
          .from('teacher_live_attendance')
          .select('attended, actual_minutes, updated_at')
          .eq('slot_id', slot.id)
          .eq('session_date', sessionDate)
          .maybeSingle();
        if (!active) return;
        if (error) {
          setMessage('تعذر تحميل سجل الحضور. قد لا تكون خدمة الحضور مفعّلة على قاعدة البيانات بعد.');
          return;
        }
        setExisting(data || null);
        if (data) {
          setStatus(data.attended ? 'present' : 'absent');
          setMinutes(data.attended ? String(data.actual_minutes) : '');
        }
      } catch {
        if (active) setMessage('تعذر تحميل سجل الحضور. حاول تحديث الصفحة.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [slot?.id, sessionDate]);

  const save = async () => {
    if (!validation.ok) {
      setMessage(validationMessage(validation.reason));
      return;
    }
    if (!supabase) {
      setMessage('خدمة تسجيل الحضور غير متاحة حالياً. لم يُحفظ السجل.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const { data, error } = await supabase.rpc('record_teacher_live_attendance', {
        p_slot_id: validation.payload.slotId,
        p_session_date: validation.payload.sessionDate,
        p_attended: validation.payload.attended,
        p_actual_minutes: validation.payload.actualMinutes,
      });
      if (error) {
        setMessage('تعذر الحفظ. تأكد من أنك المعلم المسند لهذه الحصة وأن خدمة الحضور مفعّلة.');
        return;
      }
      setExisting({
        attended: data?.attended ?? validation.payload.attended,
        actual_minutes: data?.actual_minutes ?? validation.payload.actualMinutes,
        updated_at: data?.updated_at || new Date().toISOString(),
      });
      setMessage(validation.payload.attended
        ? 'تم حفظ حضور الطفل ومدته الفعلية. هذا السجل لا يخصم ساعات الاشتراك.'
        : 'تم حفظ غياب الطفل بمدة صفر دقيقة. هذا السجل لا يخصم ساعات الاشتراك.');
    } catch {
      setMessage('تعذر الحفظ بسبب خطأ اتصال. لم يُؤكد تسجيل الحضور.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <details style={{ marginTop: 10, border: '1px solid var(--line)', borderRadius: 12, padding: '10px 12px', background: 'var(--bg)' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 800, color: 'var(--navy)' }}>
        ✅ تأكيد حضور {childName || 'الطفل'} وتسجيل المدة الفعلية
      </summary>
      <div style={{ display: 'grid', gap: 9, marginTop: 10 }}>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.5 }}>
          سجّل مدة حضور هذا الطفل بالدقائق، لا مدة الحصة المجدولة. يمكن تعديل السجل، ويُحفظ كل تعديل في سجل تدقيق.
        </p>
        <label style={{ display: 'grid', gap: 5, color: 'var(--navy)', fontSize: 13, fontWeight: 700 }}>
          تاريخ الاجتماع (توقيت القاهرة)
          <input
            type="date"
            value={sessionDate}
            max={today}
            onChange={event => setSessionDate(event.target.value)}
            style={fieldStyle}
          />
        </label>
        <label style={{ display: 'grid', gap: 5, color: 'var(--navy)', fontSize: 13, fontWeight: 700 }}>
          حالة حضور الطفل
          <select
            value={status}
            onChange={event => {
              setStatus(event.target.value);
              setMessage('');
            }}
            style={fieldStyle}
          >
            <option value="">اختر حالة الحضور</option>
            <option value="present">حضر</option>
            <option value="absent">لم يحضر</option>
          </select>
        </label>
        {status === 'present' && (
          <label style={{ display: 'grid', gap: 5, color: 'var(--navy)', fontSize: 13, fontWeight: 700 }}>
            مدة حضور الطفل الفعلية بالدقائق
            <input
              type="number"
              min="1"
              max="1440"
              step="1"
              inputMode="numeric"
              value={minutes}
              onChange={event => {
                setMinutes(event.target.value);
                setMessage('');
              }}
              style={fieldStyle}
            />
          </label>
        )}
        {status === 'absent' && <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.5 }}>سيُسجَّل الغياب بمدة صفر دقيقة.</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            style={{ ...buttonStyle, opacity: loading || busy || !validation.ok || unchanged ? 0.65 : 1 }}
            disabled={loading || busy || !validation.ok || unchanged}
            onClick={save}
          >
            {busy ? 'جارٍ الحفظ…' : existing ? 'حفظ تصحيح الحضور' : 'حفظ تأكيد الحضور'}
          </button>
          {loading && <span role="status" style={{ color: 'var(--muted)', fontSize: 12.5 }}>جارٍ تحميل سجل هذا التاريخ…</span>}
        </div>
        {existing && !loading && <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12.5 }}>يوجد سجل محفوظ لهذا التاريخ؛ أي تصحيح جديد سيُضاف إلى سجل التدقيق.</p>}
        {message && <p role="status" style={{ margin: 0, color: message.startsWith('تعذر') || message.includes('لا يمكن') || message.includes('أدخل') || message.includes('اختر') ? 'var(--red-text)' : 'var(--blue-text)', fontSize: 12.5 }}>{message}</p>}
      </div>
    </details>
  );
}
