import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

const STATUS_OPTIONS = [
  { value: 'new', label: '🆕 جديد', color: '#2563eb', bg: '#eff6ff' },
  { value: 'contacted', label: '📞 تم التواصل', color: '#ca8a04', bg: '#fefce8' },
  { value: 'scheduled', label: '🗓️ حصة مجدولة', color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'completed', label: '✅ مكتمل', color: '#16a34a', bg: '#f0fdf4' },
  { value: 'cancelled', label: '❌ ملغي', color: '#dc2626', bg: '#fef2f2' }
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
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
            بيانات حقيقية من قاعدة البيانات — إجمالي: {bookings.length} حجز
          </p>
        </div>
        <button
          onClick={fetchBookings}
          style={{ border: '1px solid var(--line)', background: 'white', borderRadius: '10px', padding: '8px 14px', fontWeight: 800, fontSize: '12.5px', cursor: 'pointer' }}
        >
          🔄 تحديث
        </button>
      </div>

      {/* فلاتر الحالة */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={{
          padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--line)', cursor: 'pointer',
          fontWeight: 800, fontSize: '12px', background: filter === 'all' ? 'var(--blue)' : 'white', color: filter === 'all' ? 'white' : '#334155'
        }}>الكل ({bookings.length})</button>
        {STATUS_OPTIONS.map(s => (
          <button key={s.value} onClick={() => setFilter(s.value)} style={{
            padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--line)', cursor: 'pointer',
            fontWeight: 800, fontSize: '12px', background: filter === s.value ? s.color : 'white', color: filter === s.value ? 'white' : s.color
          }}>{s.label} ({counts[s.value] || 0})</button>
        ))}
      </div>

      {loading && <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>جارٍ تحميل الحجوزات…</div>}

      {!loading && loadError && (
        <div style={{ padding: '20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '14px', color: '#b91c1c', fontWeight: 700, fontSize: '13px' }}>
          تعذر جلب الحجوزات: {loadError}
          <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '6px', color: '#991b1b' }}>
            تأكد أنك مسجل دخول بحساب admin/staff — سياسات RLS تمنع غير الموظفين من قراءة الحجوزات.
          </div>
        </div>
      )}

      {!loading && !loadError && shown.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '14px', border: '1px dashed var(--line)' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
          <div style={{ fontWeight: 800, color: '#334155' }}>لا توجد حجوزات {filter !== 'all' ? 'بهذه الحالة' : 'بعد'}</div>
          <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>كل حجز جديد من صفحة الهبوط سيظهر هنا فوراً.</div>
        </div>
      )}

      {!loading && !loadError && shown.length > 0 && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {shown.map(b => {
            const st = statusOf(b.status);
            return (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
                background: 'white', border: '1px solid var(--line)', borderRadius: '14px', padding: '14px 16px'
              }}>
                <div style={{ flex: '1 1 220px', minWidth: '200px' }}>
                  <div style={{ fontWeight: 900, fontSize: '14px' }}>
                    👨‍👩‍👧 {b.parent_name} <span style={{ color: '#94a3b8', fontWeight: 600 }}>→</span> 🧒 {b.child_name}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px', fontWeight: 700 }}>
                    📱 <span dir="ltr">{b.whatsapp}</span> · 🌍 {b.country_code || '—'} · 🎓 {b.grade || '—'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                    {b.created_at ? new Date(b.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                  </div>
                </div>
                <span style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 800, color: st.color, background: st.bg }}>
                  {st.label}
                </span>
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
