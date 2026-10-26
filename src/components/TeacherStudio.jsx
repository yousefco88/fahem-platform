import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { DAY_NAMES, SLOT_TYPES } from '../data/scheduleData';
import { getTeacherSlots } from '../lib/teacherWorkspace';
import { getTeacherSlotState } from '../lib/teacherSlotState';

function cairoDay() {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', weekday: 'short' }).format(new Date());
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
}

export default function TeacherStudio() {
  const { allSlots = [], slotsLoaded, slotsError, curriculumData } = useApp();
  const { user } = useAuth();
  const { assigned, today } = getTeacherSlots(allSlots, user?.id, cairoDay());
  const scheduleState = getTeacherSlotState(slotsLoaded ? assigned : null, slotsError);

  return (
    <div className="teacher-studio-content">
      <section className="teacher-overview" aria-labelledby="teacher-today-title">
        <div className="teacher-overview-heading">
          <div>
            <h2 id="teacher-today-title">حصص اليوم — {DAY_NAMES[cairoDay()]}</h2>
            <p>المواعيد بتوقيت القاهرة. الجدول والإسناد تديرهما الإدارة.</p>
          </div>
          <span className="teacher-count" aria-label="عدد الحصص المسندة أسبوعياً">
            {scheduleState.status === 'loading' ? 'جارٍ تحميل الجدول…' : scheduleState.status === 'error' ? 'تعذر تحميل الجدول' : `${assigned.length} حصة أسبوعياً`}
          </span>
        </div>
        {scheduleState.status === 'loading' ? (
          <p className="teacher-empty">جارٍ تحميل حصصك…</p>
        ) : scheduleState.status === 'error' ? (
          <p className="teacher-empty" role="alert">{scheduleState.message}</p>
        ) : today.length === 0 ? (
          <p className="teacher-empty">لا توجد حصص مسندة إليك اليوم.</p>
        ) : (
          <div className="teacher-today-list">
            {today.map(slot => (
              <article className="teacher-today-item" key={slot.id}>
                <time dir="ltr">{slot.time}</time>
                <div className="teacher-today-detail">
                  <strong>{SLOT_TYPES?.[slot.type]?.icon || '📖'} {curriculumData?.[slot.subjectId]?.title || slot.subjectId}</strong>
                  <span>{slot.type === 'live' ? 'حصة مباشرة' : SLOT_TYPES?.[slot.type]?.label || 'درس'}</span>
                </div>
                {slot.meetingUrl
                  ? <a href={slot.meetingUrl} target="_blank" rel="noreferrer">فتح رابط الحصة ↗</a>
                  : <span className="teacher-muted">{slot.type === 'live' ? 'لم يُضف رابط الاجتماع بعد' : 'لا يتطلب رابط اجتماع'}</span>}
              </article>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
