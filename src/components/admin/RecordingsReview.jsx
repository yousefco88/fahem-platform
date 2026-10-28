import React, { useCallback, useEffect, useState } from 'react';
import { listPendingRecordings, reviewLessonRecording, signedRecordingUrl } from '../../hooks/useLessonRecordings';

const card = { background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, marginBottom: 12 };
const btn = (bg) => ({ padding: '8px 16px', borderRadius: 999, border: 0, cursor: 'pointer', font: 'inherit', fontWeight: 800, fontSize: 13.5, background: bg, color: 'white', boxShadow: 'var(--press)' });

// مراجعة تسجيلات الحصص قبل نشرها للطلاب (الإدارة فقط؛ الخادم يفرض ذلك).
export default function RecordingsReview() {
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState('');
  const [preview, setPreview] = useState({});
  const load = useCallback(async () => {
    const r = await listPendingRecordings();
    setMsg(r.ok ? '' : r.reason);
    setRows(r.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const show = async (row) => {
    const url = await signedRecordingUrl(row.storage_path);
    setPreview(p => ({ ...p, [row.id]: url }));
  };
  const decide = async (row, status) => {
    const r = await reviewLessonRecording(row.id, status);
    if (!r.ok) { setMsg(r.reason); return; }
    load();
  };

  return (
    <section>
      <h2 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 6 }}>🎥 مراجعة تسجيلات الحصص</h2>
      <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 14 }}>شاهد التسجيل قبل القبول، وتأكد أنه لا يظهر وجوه الأطفال ولا أصواتهم. المقبول يظهر لطلاب الدرس المنشور فقط.</p>
      {msg && <p role="alert" style={{ color: 'var(--red-text)' }}>{msg}</p>}
      {rows === null && <p>جارٍ التحميل…</p>}
      {rows?.length === 0 && !msg && <p style={{ color: 'var(--muted)' }}>لا توجد تسجيلات بانتظار المراجعة.</p>}
      {rows?.map(r => (
        <div key={r.id} style={card}>
          <strong>{r.curriculum_lessons?.title || r.lesson_id}</strong>
          <span style={{ color: 'var(--muted)', fontSize: 13, marginInlineStart: 10 }}>{new Date(r.created_at).toLocaleString('ar-EG')}</span>
          {preview[r.id]
            ? <video controls preload="metadata" src={preview[r.id]} style={{ width: '100%', maxHeight: 360, marginTop: 10, borderRadius: 12, background: '#0f172a' }} />
            : <div style={{ marginTop: 10 }}><button style={btn('#475569')} onClick={() => show(r)}>▶ معاينة</button></div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={btn('#15803d')} onClick={() => decide(r, 'accepted')}>قبول ونشر</button>
            <button style={btn('#b91c1c')} onClick={() => decide(r, 'rejected')}>رفض</button>
          </div>
        </div>
      ))}
    </section>
  );
}
