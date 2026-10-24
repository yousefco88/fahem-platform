/**
 * AdminKPICards.jsx
 * بطاقات KPI الديناميكية للوحة الإدارة
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminKPICards({ subjectsCount }) {
  const [kpiStats, setKpiStats] = useState({ 
    families: 0, 
    children: 0, 
    bookings: 0, 
    newBookings: 0 
  });
  const [kpiLoading, setKpiLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { 
      setKpiLoading(false); 
      return; 
    }
    Promise.all([
      supabase.from('parent_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('children').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'new')
    ]).then(([parents, children, bookings, newBookings]) => {
      setKpiStats({
        families: parents.count || 0,
        children: children.count || 0,
        bookings: bookings.count || 0,
        newBookings: newBookings.count || 0
      });
      setKpiLoading(false);
    }).catch(() => setKpiLoading(false));
  }, []);

  const kpiCards = [
    { 
      label: 'الأسر', 
      value: kpiLoading ? '...' : kpiStats.families, 
      icon: '👨‍👩‍👧‍👦', 
      color: '#3b82f6',
      bg: '#dbeafe'
    },
    { 
      label: 'الأطفال', 
      value: kpiLoading ? '...' : kpiStats.children, 
      icon: '👧', 
      color: '#10b981',
      bg: '#d1fae5'
    },
    { 
      label: 'الحجوزات', 
      value: kpiLoading ? '...' : kpiStats.bookings, 
      icon: '📅', 
      color: '#8b5cf6',
      bg: '#ede9fe'
    },
    { 
      label: 'حجوزات جديدة', 
      value: kpiLoading ? '...' : kpiStats.newBookings, 
      icon: '🆕', 
      color: '#f59e0b',
      bg: 'var(--yellow-light)'
    },
    { 
      label: 'المواد', 
      value: subjectsCount, 
      icon: '📚', 
      color: '#ec4899',
      bg: '#fce7f3'
    },
    { 
      label: 'الفريق', 
      value: 0, 
      icon: '👥', 
      color: '#6366f1',
      bg: '#e0e7ff'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '12px',
      marginBottom: '24px'
    }}>
      {kpiCards.map((card, idx) => (
        <div
          key={idx}
          style={{
            background: card.bg,
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            border: `1px solid ${card.color}20`
          }}
        >
          <span style={{ fontSize: '28px' }}>{card.icon}</span>
          <span style={{
            fontSize: '24px',
            fontWeight: 800,
            color: card.color
          }}>
            {card.value}
          </span>
          <span style={{
            fontSize: '12px',
            color: 'var(--muted)',
            fontWeight: 600
          }}>
            {card.label}
          </span>
        </div>
      ))}
    </div>
  );
}
