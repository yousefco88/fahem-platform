import React, { useState, useEffect, useCallback, useRef } from 'react';
import { gradeLabel } from '../../utils/gradeLabel';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import Emoji from '../../ui/Emoji';
import FamilyDetailsModal from './FamilyDetailsModal';
import './FamiliesPanel.css';

const EMPTY_DETAILS = {
  status: 'loading', slots: [], recordings: [], learningRecords: [], bookings: [], errors: {},
};

const errorMessage = error => error?.message || String(error || 'تعذر تحميل البيانات.');

// إدارة حسابات الأسر: القراءة من سجلات الإدارة المسموح بها، والكتابة عبر RPC إداري محدود.
export default function FamiliesPanel({ onManageSchedule = () => {} }) {
  const { curriculumData } = useApp();
  const [families, setFamilies] = useState([]);
  const [state, setState] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [usersWarning, setUsersWarning] = useState('');
  const [query, setQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const detailsRequestId = useRef(0);

  const fetchFamilies = useCallback(async () => {
    if (!supabase) { setState('error'); setErrorMsg('Supabase غير مهيأ'); return; }
    setState('loading');
    setErrorMsg('');
    try {
      const [parentsRes, childrenRes, usersRes] = await Promise.all([
        supabase.from('parent_profiles').select('id, full_name, whatsapp, country_code, created_at').order('created_at', { ascending: false }),
        supabase.from('children').select('id, parent_id, name, grade, created_at'),
        supabase.rpc('admin_list_users'),
      ]);
      if (parentsRes.error || childrenRes.error) {
        setState('error');
        setErrorMsg(errorMessage(parentsRes.error || childrenRes.error));
        return;
      }
      const byParent = {};
      (childrenRes.data || []).forEach(child => {
        (byParent[child.parent_id] = byParent[child.parent_id] || []).push(child);
      });
      const usersById = new Map((usersRes.data || []).map(user => [user.id, user]));
      setFamilies((parentsRes.data || []).map(parent => {
        const account = usersById.get(parent.id);
        return {
          ...parent,
          email: account?.email || '',
          lastSignInAt: account?.last_sign_in_at || null,
          children: byParent[parent.id] || [],
        };
      }));
      setUsersWarning(usersRes.error ? `تعذر جلب البريد ووقت آخر دخول: ${errorMessage(usersRes.error)}` : '');
      setState('ready');
    } catch (error) {
      setState('error');
      setErrorMsg(errorMessage(error));
    }
  }, []);

  useEffect(() => { fetchFamilies(); }, [fetchFamilies]);

  const openFamily = async family => {
    const requestId = ++detailsRequestId.current;
    setSelectedFamily(family);
    setDetails(EMPTY_DETAILS);
    const childIds = family.children.map(child => child.id);
    try {
      const [slotsRes, recordsRes, bookingsRes] = await Promise.all([
        childIds.length
          ? supabase.from('schedule_slots')
            .select('id, child_id, day, time, subject_id, lesson_ref, slot_type, teacher_id, duration_min, profiles(full_name)')
            .in('child_id', childIds).order('day').order('time')
          : Promise.resolve({ data: [], error: null }),
        childIds.length
          ? supabase.from('learning_records')
            .select('id, child_id, lesson_id, status, score, updated_at')
            .in('child_id', childIds).order('updated_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        supabase.from('bookings')
          .select('id, child_name, grade, status, created_at')
          .eq('parent_id', family.id).order('created_at', { ascending: false }).limit(100),
      ]);
      const slotIds = (slotsRes.data || []).map(slot => slot.id);
      const recordingsRes = slotsRes.error
        ? { data: [], error: slotsRes.error }
        : slotIds.length
          ? await supabase.from('lesson_recordings')
            .select('id, lesson_id, slot_id, duration_sec, status, created_at')
            .in('slot_id', slotIds).order('created_at', { ascending: false })
          : { data: [], error: null };
      if (requestId !== detailsRequestId.current) return;
      setDetails({
        status: 'ready',
        slots: slotsRes.data || [],
        recordings: recordingsRes.data || [],
        learningRecords: recordsRes.data || [],
        bookings: bookingsRes.data || [],
        errors: {
          slots: slotsRes.error ? errorMessage(slotsRes.error) : '',
          recordings: recordingsRes.error ? errorMessage(recordingsRes.error) : '',
          learningRecords: recordsRes.error ? errorMessage(recordsRes.error) : '',
          bookings: bookingsRes.error ? errorMessage(bookingsRes.error) : '',
        },
      });
    } catch (error) {
      if (requestId !== detailsRequestId.current) return;
      setDetails({
        status: 'ready', slots: [], recordings: [], learningRecords: [], bookings: [],
        errors: { slots: errorMessage(error), recordings: errorMessage(error), learningRecords: errorMessage(error), bookings: errorMessage(error) },
      });
    }
  };

  const closeFamily = () => {
    detailsRequestId.current += 1;
    setSelectedFamily(null);
    setDetails(EMPTY_DETAILS);
  };

  const saveParent = async (parentId, form) => {
    const fullName = form.full_name.trim();
    const whatsapp = form.whatsapp.trim();
    const countryCode = form.country_code.trim();
    const { error } = await supabase.rpc('admin_update_family_profile', {
      p_parent_id: parentId,
      p_full_name: fullName,
      p_whatsapp: whatsapp || null,
      p_country_code: countryCode || null,
    });
    if (error) return { ok: false, message: `تعذر حفظ بيانات ولي الأمر: ${error.message}` };

    const { data, error: verifyError } = await supabase.from('parent_profiles')
      .select('id, full_name, whatsapp, country_code, created_at').eq('id', parentId).single();
    if (verifyError || !data) return { ok: false, message: `أُرسل التعديل لكن تعذر التحقق من القراءة: ${errorMessage(verifyError)}` };
    setFamilies(current => current.map(family => family.id === parentId ? { ...family, ...data } : family));
    setSelectedFamily(current => current?.id === parentId ? { ...current, ...data } : current);
    return { ok: true, message: 'تم حفظ بيانات ولي الأمر والتحقق منها.' };
  };

  const saveChild = async (childId, form) => {
    const name = form.name.trim();
    const grade = form.grade.trim();
    const { error } = await supabase.rpc('admin_update_child_profile', {
      p_child_id: childId, p_name: name, p_grade: grade,
    });
    if (error) return { ok: false, message: `تعذر حفظ ملف الطفل: ${error.message}` };

    const { data, error: verifyError } = await supabase.from('children')
      .select('id, parent_id, name, grade, created_at').eq('id', childId).single();
    if (verifyError || !data) return { ok: false, message: `أُرسل التعديل لكن تعذر التحقق من القراءة: ${errorMessage(verifyError)}` };
    setFamilies(current => current.map(family => family.id === data.parent_id
      ? { ...family, children: family.children.map(child => child.id === childId ? { ...child, ...data } : child) }
      : family));
    setSelectedFamily(current => current?.id === data.parent_id
      ? { ...current, children: current.children.map(child => child.id === childId ? { ...child, ...data } : child) }
      : current);
    return { ok: true, message: 'تم حفظ ملف الطفل والتحقق منه.' };
  };

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const shown = families.filter(family => {
    if (!normalizedQuery) return true;
    return [family.full_name, family.email, family.whatsapp, family.country_code, ...family.children.map(child => child.name)]
      .some(value => String(value || '').toLocaleLowerCase().includes(normalizedQuery));
  });
  const childTotal = families.reduce((total, family) => total + family.children.length, 0);

  return (
    <div>
      <div className="families-toolbar">
        <div>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900 }}><Emoji>👨‍👩‍👧‍👦</Emoji> حسابات الأسر</h3>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>
            {families.length} أسرة مسجلة · {childTotal} طفل · افتح أي أسرة لإدارة ملفها وأطفالها
          </p>
        </div>
        <div className="families-search">
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="ابحث باسم ولي الأمر أو البريد أو الطفل أو الرقم"
            aria-label="البحث في حسابات الأسر"
            style={{ padding: '9px 13px', borderRadius: '10px', border: '1px solid var(--line)', fontSize: '12.5px', fontFamily: 'inherit' }}
          />
          <button type="button" className="family-button secondary" onClick={fetchFamilies} disabled={state === 'loading'} aria-label="تحديث حسابات الأسر"><Emoji>🔄</Emoji> تحديث</button>
        </div>
      </div>

      {usersWarning && <p className="family-note" role="status">{usersWarning}</p>}
      {state === 'loading' && <div className="family-detail-state" role="status">جارٍ تحميل الأسر…</div>}
      {state === 'error' && (
        <div className="family-inline-error" role="alert">
          تعذر تحميل حسابات الأسر: {errorMsg}
          <button type="button" className="family-button secondary" onClick={fetchFamilies} style={{ marginInlineStart: 10 }}>إعادة المحاولة</button>
        </div>
      )}
      {state === 'ready' && shown.length === 0 && (
        <div className="family-detail-state">
          <div style={{ fontSize: 28, marginBottom: 8 }}><Emoji>📭</Emoji></div>
          <strong>{query ? 'لا توجد نتائج مطابقة' : 'لا توجد أسر مسجلة بعد'}</strong>
          <div style={{ marginTop: 5 }}>يمكنك البحث بالاسم أو البريد أو رقم التواصل أو اسم أحد الأطفال.</div>
        </div>
      )}
      {state === 'ready' && shown.length > 0 && (
        <div className="family-list">
          {shown.map(family => (
            <article className="family-list-card" key={family.id}>
              <div className="family-list-main">
                <h4 className="family-list-name"><Emoji>👤</Emoji> {family.full_name || 'أسرة بدون اسم'}</h4>
                <div className="family-list-meta">
                  {family.email && <span className="family-list-email">{family.email}</span>}
                  {family.whatsapp && <span dir="ltr">{family.whatsapp}</span>}
                  {family.country_code && <span>🌍 {family.country_code}</span>}
                  <span>{family.children.length} طفل</span>
                </div>
                <div className="family-child-chips">
                  {family.children.length === 0 && <span className="family-note">لا توجد ملفات أطفال مرتبطة حالياً.</span>}
                  {family.children.map(child => (
                    <span className="family-child-chip" key={child.id}><Emoji>🧒</Emoji> {child.name} · {gradeLabel(child.grade) || 'بدون صف'}</span>
                  ))}
                </div>
              </div>
              <div className="family-card-actions family-list-action">
                {family.whatsapp && <a className="family-button secondary" href={`https://wa.me/${family.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">💬 واتساب</a>}
                <button type="button" className="family-button primary" onClick={() => openFamily(family)}>فتح ملف الأسرة <span aria-hidden="true">←</span></button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedFamily && (
        <FamilyDetailsModal
          family={selectedFamily}
          details={details}
          curriculumData={curriculumData}
          onClose={closeFamily}
          onManageSchedule={child => { closeFamily(); onManageSchedule(child); }}
          onSaveParent={saveParent}
          onSaveChild={saveChild}
        />
      )}
    </div>
  );
}
