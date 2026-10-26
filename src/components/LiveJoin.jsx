import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getLiveState, formatInTz, JOIN_BEFORE_MIN } from '../utils/liveWindow';

// يظهر داخل الدرس المجدول فقط، وفقط للخانة type === 'live'.
// open = من 15 دقيقة قبل الموعد حتى نهاية الحصة. الرابط من المعلم (لا مزود بث خارجي).
export default function LiveJoin({ slot }) {
  const { effectiveTimezone } = useApp();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  if (!slot || slot.type !== 'live') return null;

  const live = getLiveState(slot, now);
  if (live.state === 'none') return null;
  const box = { borderRadius: 14, padding: '10px 12px', fontSize: 13, fontWeight: 700 };

  if (live.state === 'open') {
    return slot.meetingUrl ? (
      <div>
        <a
          href={slot.meetingUrl} target="_blank" rel="noopener noreferrer"
          style={{ ...box, display: 'block', textAlign: 'center', background: '#dc2626', color: 'white', textDecoration: 'none', fontWeight: 900 }}
        >🔴 انضم للحصة الآن</a>
        {slot.teacherName && <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, textAlign: 'center', color: 'var(--muted)' }}>مع المعلم {slot.teacherName}</div>}
      </div>
    ) : (
      <div style={{ ...box, background: 'var(--yellow-light)', color: 'var(--amber-text)' }}>
        🔴 الحصة قريبة — لم يضف المعلم رابط الاجتماع بعد. حدّث الصفحة بعد قليل.
      </div>
    );
  }
  return (
    <div style={{ ...box, background: 'var(--red-light)', color: 'var(--red-text)' }}>
      🔴 حصة مباشرة: {formatInTz(live.start, effectiveTimezone)}
      {slot.teacherName && <span> · مع المعلم {slot.teacherName}</span>}
      <div style={{ fontWeight: 600, fontSize: 12, marginTop: 2 }}>يظهر زر الانضمام قبل الموعد بـ {JOIN_BEFORE_MIN} دقيقة</div>
    </div>
  );
}
