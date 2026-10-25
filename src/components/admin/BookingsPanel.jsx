import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

const STATUS_OPTIONS = [
  { value: 'new', label: '🆕 جديد', color: 'var(--blue)', bg: 'var(--blue-light)' },
  { value: 'contacted', label: '📞 تم التواصل', color: 'var(--yellow)', bg: 'var(--yellow-light)' },
  { value: 'scheduled', label: '🗓️ حصة مجدولة', color: 'var(--purple)', bg: 'var(--purple-light)' },
  { value: 'completed', label: '✅ مكتمل', color: 'var(--green)', bg: 'var(--green-light)' },
  { value: 'cancelled', label: '❌ ملغي', color: 'var(--red)', bg: 'var(--red-light)' }
];

const statusOf = (v) => STATUS_OPTIONS.find(s => s.value === v) || STATUS_OPTIONS[0];

// لوحة حجوزات الحصص التجريبية — تقرأ وتدير سجلات bookings الحقيقية من Supabase
export default function BookingsPanel() {
  const { triggerToast } = useApp();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchBookings = useCallback(async () => {
    if (!supabase) { setLoadError('Supabase غير مهيأ في هذه البيئة'); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      setLoadError(error.message);
      setBookings([]);
    } else {
      setLoadError(null);
      setBookings(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const updateStatus = async (id, status) => {
    const prev = bookings;
    setBookings(list => list.map(b => (b.id === id ? { ...b, status } : b)));
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) {
      setBookings(prev); // تراجع — لا ندّعي نجاحاً لم يحدث
      triggerToast(`تعذر تحديث الحالة: ${error.message}`);
    } else {
      triggerToast('تم تحديث حالة الحجز ✓');
    }
  };

  const shown = filter === 'all' ? bookings : bookings.filter(b => (b.status || 'new') === filter);
  const counts = STATUS_OPTIONS.reduce((acc, s) => ({ ...acc, [s.value]: bookings.filter(b => (b.status || 'new') === s.value).length }), {});

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900 }}>📋 حجوزات الحصص التجريبية</h3>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>
            بيانات حقيقية من قاعدة البيانات — إجمالي: {bookings.length} حجز
          </p>
        </div>
        <button
          onClick={fetchBookings}
          style={{ border: '1px solid var(--line)', background: 'var(--card-bg)', borderRadius: '10px', padding: '8px 14px', fontWeight: 800, fontSize: '12.5px', cursor: 'pointer' }}
        >
          🔄 تحديث
        </button>
      </div>

      {/* فلاتر الحالة */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={{
          padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--line)', cursor: 'pointer',
          fontWeight: 800, fontSize: '12px', background: filter === 'all' ? 'var(--blue)' : 'var(--card-bg)', color: filter === 'all' ? 'white' : 'var(--navy)'
        }}>الكل ({bookings.length})</button>
        {STATUS_OPTIONS.map(s => (
          <button key={s.value} onClick={() => setFilter(s.value)} style={{
            padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--line)', cursor: 'pointer',
            fontWeight: 800, fontSize: '12px', background: filter === s.value ? s.color : 'var(--card-bg)', color: filter === s.value ? 'white' : s.color
          }}>{s.label} ({counts[s.value] || 0})</button>
        ))}
      </div>

      {loading && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>جارٍ تحميل الحجوزات…</div>}

      {!loading && loadError && (
        <div style={{ padding: '20px', background: 'var(--red-light)', border: '1px solid var(--line)', borderRadius: '14px', color: 'var(--red-text)', fontWeight: 700, fontSize: '13px' }}>
          تعذر جلب الحجوزات: {loadError}
          <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '6px', color: 'var(--red-text)' }}>
            تأكد أنك مسجل دخول بحساب admin/staff — سياسات RLS تمنع غير الموظفين من قراءة الحجوزات.
          </div>
        </div>
      )}

      {!loading && !loadError && shown.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg)', borderRadius: '14px', border: '1px dashed var(--line)' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
          <div style={{ fontWeight: 800, color: 'var(--navy)' }}>لا توجد حجوزات {filter !== 'all' ? 'بهذه الحالة' : 'بعد'}</div>
          <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' }}>كل حجز جديد من صفحة الهبوط سيظهر هنا فوراً.</div>
        </div>
      )}

      {!loading && !loadError && shown.length > 0 && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {shown.map(b => {
            const st = statusOf(b.status);
            return (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
                background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '14px', padding: '14px 16px'
              }}>
                <div style={{ flex: '1 1 220px', minWidth: '200px' }}>
                  <div style={{ fontWeight: 900, fontSize: '14px' }}>
                    👨‍👩‍👧 {b.parent_name} <span style={{ color: 'var(--muted)', fontWeight: 600 }}>→</span> 🧒 {b.child_name}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px', fontWeight: 700 }}>
                    📱 <span dir="ltr">{b.whatsapp}</span> · 🌍 {b.country_code || '—'} · 🎓 {b.grade || '—'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                    {b.created_at ? new Date(b.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                  </div>
                </div>
                <span style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 800, color: st.color, background: st.bg }}>
                  {st.label}
                </span>
                <a
                  href={`https://wa.me/${(b.whatsapp || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً ${b.parent_name}، معك فريق منصة فاهم بخصوص طلب الحصة التجريبية لـ${b.child_name} 🌟`)}`}
                  target="_blank" rel="noreferrer"
                  style={{ background: '#16a34a', color: 'white', padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  💬 تواصل واتساب
                </a>
                <select
                  value={b.status || 'new'}
                  onChange={e => updateStatus(b.id, e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--line)', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
