/**
 * WeeklySummaryCard.jsx — الملخص الدوري لولي الأمر (م5 — داخلي)
 * يعرض ملخص آخر 7 أيام للطفل النشط من بيانات حقيقية فقط، مع زر نسخ للمشاركة اليدوية.
 * ⛔ الإرسال التلقائي (واتساب/إيميل) غير مفعّل — بانتظار قرار يوسف باختيار المزود.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getChildStats } from '../../utils/childProgress';
import { buildWeeklySummary, attemptsForWeeklySummaryChild } from '../../lib/weeklySummary';

const card = {
  background: 'var(--card-bg)', border: '1px solid var(--line)',
  borderRadius: 16, padding: '18px 20px', marginTop: 16,
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
};

export default function WeeklySummaryCard() {
  const { activeChild, activeChildCloudId, childrenList = [], curriculumData, learningRecords, grade } = useApp();
  const { user } = useAuth();
  const [cloud, setCloud] = useState({ bank: [], loading: true, error: '' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase || !user?.id) { setCloud(c => ({ ...c, loading: false })); return; }
      const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [bankRes] = await Promise.all([
        supabase.from('lesson_question_attempts')
          .select('child_id, child_key, child_name, is_correct, skill, created_at')
          .gte('created_at', sinceIso),
      ]);
      if (cancelled) return;
      setCloud({
        bank: bankRes.data || [],
        loading: false,
        error: bankRes.error?.message || '',
      });
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const summary = useMemo(() => {
    if (!activeChild) return null;
    const sameNameCount = childrenList.filter(child => child.name === activeChild.name).length;
    return buildWeeklySummary({
      childName: activeChild.name,
      grade: activeChild.grade || grade || '',
      learningRecords,
      stats: getChildStats(curriculumData, learningRecords, activeChild.masteredLessons || []),
      bankAttempts: attemptsForWeeklySummaryChild(cloud.bank, activeChild, activeChildCloudId, sameNameCount),
    });
  }, [activeChild, activeChildCloudId, childrenList, curriculumData, learningRecords, grade, cloud]);

  const copyText = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // متصفح بلا صلاحية حافظة — النص معروض للنسخ اليدوي
    }
  };

  if (!activeChild) return null;

  return (
    <section style={card} dir="rtl">
      <h2 style={{ fontSize: 17, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        📬 الملخص الدوري
        <span style={{ fontSize: 11, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--muted)', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>
          آخر 7 أيام — {activeChild.name}
        </span>
      </h2>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 12px' }}>
        يُبنى من نشاط طفلك الفعلي — انسخه وشاركه حيث تريد.
        الإرسال التلقائي غير مفعّل بعد.
      </p>

      {cloud.loading && <div style={{ color: 'var(--muted)', fontSize: 13 }}>جارٍ تجهيز الملخص...</div>}

      {!cloud.loading && summary && (
        <>
          {cloud.error && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
              ⚠️ تعذر جلب بيانات السحابة ({cloud.error}) — الملخص يعتمد على السجل المحلي فقط
            </div>
          )}
          <pre style={{
            background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12,
            padding: '14px 16px', fontSize: 13.5, lineHeight: 1.9, whiteSpace: 'pre-wrap',
            fontFamily: 'inherit', color: 'var(--navy)', margin: '0 0 12px',
          }}>{summary.text}</pre>
          <button
            type="button"
            onClick={copyText}
            style={{
              border: 'none', background: copied ? '#16a34a' : 'var(--blue)', color: 'white',
              borderRadius: 10, padding: '9px 20px', cursor: 'pointer', fontWeight: 800,
              fontSize: 13.5, fontFamily: 'inherit',
            }}
          >
            {copied ? '✓ تم النسخ' : '📋 نسخ الملخص'}
          </button>
        </>
      )}
    </section>
  );
}
