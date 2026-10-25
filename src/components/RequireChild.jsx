/**
 * RequireChild.jsx — حارس «لا بيانات وهمية»
 * الشاشات التي تتمحور حول ملف طفل (عالم الطفل، لوحة ولي الأمر) تُغلّف به:
 * لا يوجد ملف طفل حقيقي → حالة صريحة صادقة مع مسار الإنشاء، بدل طفل وهمي.
 */
import React from 'react';
import { useApp } from '../context/AppContext';

export default function RequireChild({ children }) {
  const { activeChild, setCurrentScreen } = useApp();

  if (activeChild) return children;

  return (
    <div dir="rtl" style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '40px 20px', fontFamily: 'Cairo, sans-serif',
    }}>
      <div style={{ fontSize: 56, marginBottom: 12 }}>👨‍👩‍👧</div>
      <h2 style={{ fontSize: 22, color: 'var(--navy, #0f172a)', margin: '0 0 8px', fontWeight: 900 }}>
        لا يوجد ملف طفل بعد
      </h2>
      <p style={{ fontSize: 14.5, color: '#64748b', maxWidth: 420, lineHeight: 1.9, margin: '0 0 20px' }}>
        هذه المساحة تُبنى من بيانات طفلك الحقيقية.
        أنشئ حساب الأسرة وأضف طفلك ليبدأ رحلته في فاهم.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => setCurrentScreen('account')}
          style={{ border: 'none', background: 'var(--blue, #2563eb)', color: '#fff', borderRadius: 12, padding: '11px 24px', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ✨ إنشاء حساب وإضافة طفل
        </button>
        <button
          onClick={() => setCurrentScreen('onboarding')}
          style={{ border: '1px solid #e2e8f0', background: '#fff', color: 'var(--navy, #0f172a)', borderRadius: 12, padding: '11px 24px', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          📋 التسجيل السريع
        </button>
      </div>
    </div>
  );
}
