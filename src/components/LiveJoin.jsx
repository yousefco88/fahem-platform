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
      <a
        href={slot.meetingUrl} target="_blank" rel="noopener noreferrer"
        style={{ ...box, display: 'block', textAlign: 'center', background: '#dc2626', color: 'white', textDecoration: 'none', fontWeight: 900 }}
      >🔴 انضم للحصة الآن</a>
    ) : (
      <div style={{ ...box, background: '#fef3c7', color: '#92400e' }}>
        🔴 الحصة قريبة — لم يضف المعلم رابط الاجتماع بعد. حدّث الصفحة بعد قليل.
      </div>
    );
  }
  return (
    <div style={{ ...box, background: '#fef2f2', color: '#991b1b' }}>
      🔴 حصة مباشرة: {formatInTz(live.start, effectiveTimezone)}
      <div style={{ fontWeight: 600, fontSize: 12, marginTop: 2 }}>يظهر زر الانضمام قبل الموعد بـ {JOIN_BEFORE_MIN} دقيقة</div>
    </div>
  );
}
