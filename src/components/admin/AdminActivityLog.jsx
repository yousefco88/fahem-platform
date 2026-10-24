/**
 * AdminActivityLog.jsx
 * سجل النشاطات للوحة الإدارة
 */
import React from 'react';

export default function AdminActivityLog() {
  // TODO: ربط مع سجل حقيقي من Supabase
  const activityLog = [
    { 
      time: 'مثال', 
      user: 'حساب تجريبي', 
      action: 'مثال توضيحي: تعديل محتوى', 
      ip: 'غير متاح', 
      badge: 'مثال' 
    },
    { 
      time: 'مثال', 
      user: 'حساب تجريبي', 
      action: 'مثال توضيحي: جدولة حصة', 
      ip: 'غير متاح', 
      badge: 'مثال' 
    },
    { 
      time: 'مثال', 
      user: 'حساب تجريبي', 
      action: 'مثال توضيحي: إرسال إشعار', 
      ip: 'غير متاح', 
      badge: 'مثال' 
    },
    { 
      time: 'مثال', 
      user: 'نظام تجريبي', 
      action: 'لا توجد مدفوعات حقيقية؛ هذا صف تجريبي', 
      ip: 'غير متاح', 
      badge: 'مثال' 
    },
    { 
      time: 'مثال', 
      user: 'حساب تجريبي', 
      action: 'لا يوجد نظام تدقيق أو مراقبة متصل', 
      ip: 'غير متاح', 
      badge: 'مثال' 
    }
  ];

  return (
    <div style={{
      background: 'var(--card-bg)',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #e2e8f0'
    }}>
      <h3 style={{
        fontSize: '16px',
        fontWeight: 700,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        📋 سجل النشاطات
        <span style={{
          fontSize: '11px',
          background: 'var(--yellow-light)',
          color: '#b45309',
          padding: '3px 8px',
          borderRadius: '8px',
          fontWeight: 600
        }}>
          بيانات توضيحية
        </span>
      </h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {activityLog.map((log, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: 'var(--bg)',
              borderRadius: '8px',
              fontSize: '13px'
            }}
          >
            <span style={{
              background: 'var(--line)',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              color: 'var(--muted)',
              minWidth: '50px',
              textAlign: 'center'
            }}>
              {log.time}
            </span>
            <span style={{ fontWeight: 600, color: 'var(--navy)' }}>
              {log.user}
            </span>
            <span style={{ flex: 1, color: 'var(--muted)' }}>
              {log.action}
            </span>
            <span style={{
              background: 'var(--yellow-light)',
              color: '#b45309',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 600
            }}>
              {log.badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
