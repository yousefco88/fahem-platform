import React from 'react';
import { useApp } from '../../context/AppContext';
import { getChildStats } from '../../utils/childProgress';

const pill = (border, color) => ({
  background: 'var(--card-bg)', border: `2px solid ${border}`, padding: '6px 14px',
  borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '15px', color,
  display: 'flex', alignItems: 'center', gap: '6px'
});

// الشريط العلوي — النقاط والشارات وأيام التتابع مشتقة من سجل التعلم الفعلي
export default function ChildTopBar() {
  const { activeChild, curriculumData, learningRecords, setShowGateModal } = useApp();
  const stats = getChildStats(curriculumData, learningRecords, activeChild.masteredLessons || []);

  return (
    <nav style={{
      maxWidth: '1200px', margin: '0 auto 28px', background: 'color-mix(in srgb, var(--card-bg) 95%, transparent)',
      backdropFilter: 'blur(10px)', border: '2px solid #e0e7ff', borderRadius: 'var(--radius-full)',
      padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      boxShadow: '0 10px 25px rgba(99, 102, 241, 0.08)', flexWrap: 'wrap', gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '50px', height: '50px', borderRadius: '50%', background: '#fef08a',
          border: '3px solid #f59e0b', display: 'grid', placeItems: 'center', fontSize: '24px',
          boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)'
        }}>
          {activeChild.avatar}
        </div>
        <div>
          <h3 style={{ fontSize: '18px', color: 'var(--navy)' }}>البطل {activeChild.name}</h3>
          <span style={{ fontSize: '12px', color: '#4338ca', fontWeight: 700 }}>{activeChild.grade} 🚀</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={pill('#fde047', '#ca8a04')} title={`${stats.done} درس متقن × 30 نقطة`}>
          <span>⭐</span><span>{stats.points}</span><span style={{ fontSize: '12px', fontWeight: 600 }}>نقطة</span>
        </div>
        <div style={pill('#fed7aa', '#ea580c')} title="شارة لكل درس متقن">
          <span>🏆</span><span>{stats.badges}</span><span style={{ fontSize: '12px', fontWeight: 600 }}>شارات</span>
        </div>
        <div style={pill('#fca5a5', '#dc2626')} title="أيام تعلّم متتالية من سجلك">
          <span>🔥</span>
          <span>{stats.streak > 0 ? `${stats.streak} ${stats.streak === 1 ? 'يوم' : 'أيام'}` : 'ابدأ اليوم'}</span>
        </div>
      </div>

      <button
        style={{
          background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--line)',
          padding: '8px 16px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '6px'
        }}
        onClick={() => setShowGateModal(true)}
      >
        <span>🔒 مساحة ولي الأمر</span>
      </button>
    </nav>
  );
}
