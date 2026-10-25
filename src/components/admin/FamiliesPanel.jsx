import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

// إدارة حسابات الأسر — بيانات حقيقية من parent_profiles + children (سياسة admin reads)
export default function FamiliesPanel() {
  const [families, setFamilies] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  const [query, setQuery] = useState('');

  const fetchFamilies = useCallback(async () => {
    if (!supabase) { setState('error'); setErrorMsg('Supabase غير مهيأ'); return; }
    setState('loading');
    const [parentsRes, childrenRes] = await Promise.all([
      supabase.from('parent_profiles').select('id, full_name, whatsapp, country_code, created_at').order('created_at', { ascending: false }),
      supabase.from('children').select('id, parent_id, name, grade, created_at')
    ]);
    if (parentsRes.error || childrenRes.error) {
      setState('error');
      setErrorMsg((parentsRes.error || childrenRes.error).message);
      return;
    }
    const byParent = {};
    (childrenRes.data || []).forEach(c => {
      (byParent[c.parent_id] = byParent[c.parent_id] || []).push(c);
    });
    setFamilies((parentsRes.data || []).map(p => ({ ...p, children: byParent[p.id] || [] })));
    setState('ready');
  }, []);

  useEffect(() => { fetchFamilies(); }, [fetchFamilies]);

  const shown = families.filter(f =>
    !query.trim() ||
    f.full_name?.includes(query.trim()) ||
    f.whatsapp?.includes(query.trim()) ||
    f.children.some(c => c.name?.includes(query.trim()))
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900 }}>👨‍👩‍👧‍👦 حسابات الأسر</h3>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>
            {families.length} أسرة مسجلة · {families.reduce((n, f) => n + f.children.length, 0)} طفل
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="🔍 ابحث باسم ولي الأمر أو الطفل أو الرقم"
            style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--line)', fontSize: '12.5px', fontFamily: 'inherit', minWidth: '240px' }}
          />
          <button onClick={fetchFamilies} style={{ border: '1px solid var(--line)', background: 'var(--card-bg)', borderRadius: '10px', padding: '8px 14px', fontWeight: 800, fontSize: '12.5px', cursor: 'pointer' }}>🔄</button>
        </div>
      </div>

      {state === 'loading' && <div className="u-6">جارٍ تحميل الأسر…</div>}

      {state === 'error' && (
        <div style={{ padding: '20px', background: 'var(--red-light)', border: '1px solid var(--line)', borderRadius: '14px', color: 'var(--red-text)', fontWeight: 700, fontSize: '13px' }}>
          تعذر الجلب: {errorMsg}
        </div>
      )}

      {state === 'ready' && shown.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg)', borderRadius: '14px', border: '1px dashed var(--line)' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
          <div style={{ fontWeight: 800, color: 'var(--navy)' }}>{query ? 'لا نتائج لبحثك' : 'لا توجد أسر مسجلة بعد'}</div>
          <div className="u-4">كل أسرة تسجّل حساباً وتزامن أطفالها ستظهر هنا.</div>
        </div>
      )}

      {state === 'ready' && shown.length > 0 && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {shown.map(f => (
            <div key={f.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '14px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontWeight: 900, fontSize: '14px' }}>
                  👤 {f.full_name}
                  {f.country_code && <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 700, marginRight: '8px' }}>🌍 {f.country_code}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {f.whatsapp && (
                    <a
                      href={`https://wa.me/${f.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank" rel="noreferrer"
                      style={{ background: '#16a34a', color: 'white', padding: '5px 13px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 800, textDecoration: 'none' }}
                    >
                      💬 واتساب
                    </a>
                  )}
                  <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                    {f.created_at ? new Date(f.created_at).toLocaleDateString('ar-EG', { dateStyle: 'medium' }) : ''}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                {f.children.length === 0 && <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 700 }}>لا أطفال مزامَنون بعد</span>}
                {f.children.map(c => (
                  <span key={c.id} style={{ background: 'var(--blue-light)', color: 'var(--blue-text)', padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 800 }}>
                    🧒 {c.name} · {c.grade || 'بدون صف'}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
