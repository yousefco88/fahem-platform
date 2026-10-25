import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { soundManager } from '../utils/audio';
import { launchConfetti } from '../utils/confetti';
import { CURRICULUM_DATA } from '../data/curriculumData';
import { deviceTimezone, isValidTimezone } from '../utils/liveWindow';
import { normalizeCurriculum } from '../utils/todayPlan';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useUIActions } from './UIContext';
import { SCREEN_PATHS, screenFromPath } from '../routes';

const AppContext = createContext();

// لا أطفال افتراضيين — سياسة «لا بيانات وهمية»: ملف الطفل يُنشأ من
// التسجيل/الحساب فقط، وغياب الملف يُعرض كحالة صريحة (RequireChild)
const DEFAULT_CHILDREN = [];

export function AppProvider({ children }) {
  // الشاشة الحالية مشتقة من الـ URL (React Router) — والـ setter يتنقل فعلياً،
  // فيبقى كل الكود القديم المستخدم لـ setCurrentScreen يعمل كما هو.
  const navigate = useNavigate();
  const location = useLocation();
  const currentScreen = screenFromPath(location.pathname) || 'landing';
  const setCurrentScreen = useCallback((screenId) => {
    navigate(SCREEN_PATHS[screenId] || '/');
  }, [navigate]);

  // أفعال الواجهة (toast/نوافذ) من UIContext — مرجع ثابت لا يسبب إعادة تصيير
  const {
    triggerToast,
    setShowGateModal,
    setShowStudioModal,
    setStudioActiveTab,
    setShowScheduleModal
  } = useUIActions();

  // Load parent & preferences
  const [parentName, setParentName] = useState(() => {
    return localStorage.getItem('fahem_parent_name') || '';
  });

  const [childName, setChildName] = useState(() => {
    return localStorage.getItem('fahem_child_name') || '';
  });

  const [grade, setGrade] = useState(() => {
    return localStorage.getItem('fahem_grade') || 'الصف الأول الابتدائي';
  });

  const [country, setCountry] = useState(() => {
    return localStorage.getItem('fahem_country') || 'KSA';
  });

  const [countryText, setCountryText] = useState(() => {
    return localStorage.getItem('fahem_country_text') || 'المملكة العربية السعودية (GMT+3)';
  });

  // Children Profiles
  const [childrenList, setChildrenList] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fahem_children') || 'null');
      if (!Array.isArray(saved) || !saved.length) return DEFAULT_CHILDREN;
      // تنظيف لمرة واحدة: إزالة الأرقام المزروعة القديمة من التخزين المحلي —
      // التقدم الحقيقي يُعاد بناؤه من سجل التعلم والمزامنة السحابية
      if (localStorage.getItem("fahem_children_clean_v") !== "1") {
        localStorage.setItem("fahem_children_clean_v", "1");
        return saved.map(c => ({ ...c, points: 0, badges: 0, masteredSkills: 0, masteredLessons: [], baaMastered: false }));
      }
      return saved;
    } catch {
      return DEFAULT_CHILDREN;
    }
  });

  const [selectedChildId, setSelectedChildId] = useState(() => {
    return localStorage.getItem('fahem_active_child_id') || 'child_1';
  });

  const [learningRecords, setLearningRecords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fahem_learning_records') || '{}');
    } catch {
      return {};
    }
  });
  const [studentsSeeded, setStudentsSeeded] = useState(() => localStorage.getItem('fahem_students_seeded') === 'true');
  const [sampleStudents, setSampleStudents] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fahem_sample_students') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch { return []; }
  });
  useEffect(() => {
    if (studentsSeeded && sampleStudents.length === 0) {
      setStudentsSeeded(false);
      localStorage.removeItem('fahem_students_seeded');
    }
  }, [studentsSeeded, sampleStudents.length]);
  const [curriculumData, setCurriculumData] = useState(() => {
    try {
      const saved = localStorage.getItem('fahem_curriculum');
      const parsed = saved ? JSON.parse(saved) : {};
      const merged = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? { ...CURRICULUM_DATA, ...parsed }
        : { ...CURRICULUM_DATA };
      // إصلاح نسخ محفوظة تالفة: مفاتيح مصفوفية (expatExamCalendar) حُوّلت سابقاً لكائن
      Object.entries(CURRICULUM_DATA).forEach(([k, v]) => {
        if (Array.isArray(v) && !Array.isArray(merged[k])) merged[k] = v;
      });
      return normalizeCurriculum(merged);
    } catch {
      return normalizeCurriculum(CURRICULUM_DATA);
    }
  });

  const { user } = useAuth();

  // الجدول لكل ابن (سحابي فقط): كل الخانات التي تسمح لك بها سياسات RLS
  // ولي الأمر → خانات أبنائه، المعلم → خانات طلابه/حصصه، الإدارة → الكل. لا جدول افتراضي مشترك.
  const [allSlots, setAllSlots] = useState([]);
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const mapSlotRow = (r) => ({
    id: r.id, childId: r.child_id, day: r.day, time: r.time,
    subjectId: r.subject_id, lessonRef: r.lesson_ref || 'next', type: r.slot_type || 'lesson',
    teacherId: r.teacher_id || null, meetingUrl: r.meeting_url || null
  });
  const reloadSlots = async () => {
    if (!supabase || !user?.id) { setAllSlots([]); setSlotsLoaded(true); return; }
    const { data, error } = await supabase
      .from('schedule_slots')
      .select('id, child_id, day, time, subject_id, lesson_ref, slot_type, teacher_id, meeting_url')
      .order('day', { ascending: true })
      .order('time', { ascending: true });
    if (error) { console.warn('تعذر تحميل الجدول:', error.message); setSlotsLoaded(true); return; }
    setAllSlots((data || []).map(mapSlotRow));
    setSlotsLoaded(true);
  };

  // المرحلة ج: قراءة المنهج من Supabase (للدروس المنشورة فقط)
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    
    async function fetchCurriculumFromDB() {
      try {
        // جلب المواد المنشورة
        const { data: subjects, error: subjectsError } = await supabase
          .from('curriculum_subjects')
          .select('*')
          .eq('published', true)
          .order('sort_order');

        if (cancelled || subjectsError || !subjects?.length) return;

        const subjectKeys = subjects.map(s => s.key);

        // جلب الدروس المنشورة
        const { data: lessons, error: lessonsError } = await supabase
          .from('curriculum_lessons')
          .select('*')
          .in('subject_key', subjectKeys)
          .eq('published', true)
          .order('sort_order');

        if (cancelled || lessonsError) return;

        // بنك الأسئلة: جلب أسئلة الدروس المنشورة وتجميعها حسب الدرس
        const lessonIds = (lessons || []).map(l => l.id);
        const questionsByLesson = {};
        if (lessonIds.length) {
          const { data: bankQs, error: bankError } = await supabase
            .from('lesson_questions')
            .select('*')
            .in('lesson_id', lessonIds)
            .eq('is_published', true)
            .order('sort_order');
          if (!bankError && Array.isArray(bankQs)) {
            bankQs.forEach(q => {
              (questionsByLesson[q.lesson_id] = questionsByLesson[q.lesson_id] || []).push(q);
            });
          }
        }
        if (cancelled) return;

        // دمج مع البيانات الثابتة
        const dbCurriculum = {};
        subjects.forEach(subject => {
          const subjectLessons = (lessons || [])
            .filter(l => l.subject_key === subject.key)
            .map(l => {
              const content = l.content || {};
              return {
                id: l.id,
                title: content.title || l.title,
                objective: content.objective || '',
                order: l.sort_order,
                videoUrl: l.video_url,
                videoType: l.video_type,
                videoChapters: content.videoChapters || [],
                pdfUrl: l.pdf_url,
                pdfType: l.pdf_type,
                pdfTitle: content.pdfTitle || '',
                quizType: content.quizType || 'choice',
                question: content.question || '',
                options: (content.choices || []).map((text, i) => ({
                  text, correct: i === content.answer, icon: ''
                })),
                // بنك الأسئلة (يتقدم على السؤال القديم المفرد في المشغل عند وجوده)
                // نوع arrange مخزن لكنه غير مدعوم في المشغل بعد — يُستبعد هنا
                questions: (questionsByLesson[l.id] || [])
                  .filter(q => q.quiz_type !== 'arrange')
                  .map(q => ({
                    id: q.id,
                    quizType: q.quiz_type,
                    question: q.question,
                    skill: q.skill || null,
                    celebration: q.celebration || '',
                    options: q.quiz_type === 'truefalse'
                      ? [
                          { text: '✓ صح', correct: q.answer === true, icon: '' },
                          { text: '✕ خطأ', correct: q.answer === false, icon: '' },
                        ]
                      : (q.choices || []).map((text, i) => ({ text, correct: i === q.answer, icon: '' })),
                  })),
                parentGuide: content.parentGuide || null,
                interactiveBuilder: content.wordBuilder || null,
                celebration: content.celebration || '',
              };
            })
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

          // استخدام metadata من CURRICULUM_DATA إن وُجدت
          const staticSubject = CURRICULUM_DATA[subject.key] || {};
          dbCurriculum[subject.key] = {
            id: subject.key,
            title: subject.name,
            icon: staticSubject.icon || '📚',
            badge: staticSubject.badge || '',
            color: staticSubject.color || '#6b7280',
            grade: subject.grade_id,
            lessons: subjectLessons,
          };
        });

        // دمج: البيانات من قاعدة البيانات تأخذ الأولوية
        setCurriculumData(prev => {
          const merged = { ...prev };
          Object.entries(dbCurriculum).forEach(([key, value]) => {
            if (value.lessons.length > 0) {
              merged[key] = { ...merged[key], ...value };
            }
          });
          return merged;
        });
      } catch (err) {
        console.error('Error fetching curriculum from DB:', err);
      }
    }

    fetchCurriculumFromDB();
    return () => { cancelled = true; };
  }, []);

  // حفظ جدول طفل واحد (إدارة فقط بحكم RLS). لا نلمس meeting_url: هو للمعلم.
  const saveScheduleToCloud = async (childId, slots) => {
    if (!supabase) return { ok: false, reason: 'Supabase غير مهيأ على هذا الجهاز' };
    if (!childId) return { ok: false, reason: 'اختر الطفل أولاً' };
    const dbId = (id) => (String(id).startsWith(`${childId}:`) ? String(id) : `${childId}:${id}`);
    const rows = slots.map(s => ({
      id: dbId(s.id), child_id: childId, day: s.day, time: s.time,
      subject_id: s.subjectId, lesson_ref: s.lessonRef || 'next', slot_type: s.type || 'lesson',
      teacher_id: s.teacherId || null
    }));
    if (rows.length) {
      const { error: upError } = await supabase.from('schedule_slots').upsert(rows, { onConflict: 'id' });
      if (upError) return { ok: false, reason: upError.message };
    }
    const { data: existing, error: selError } = await supabase.from('schedule_slots').select('id').eq('child_id', childId);
    if (selError) return { ok: false, reason: selError.message };
    const keep = new Set(rows.map(r => r.id));
    const stale = (existing || []).map(r => r.id).filter(id => !keep.has(id));
    if (stale.length) {
      const { error: delError } = await supabase.from('schedule_slots').delete().in('id', stale);
      if (delError) return { ok: false, reason: delError.message };
    }
    await reloadSlots();
    return { ok: true };
  };

  // المعلم يضع رابط الاجتماع لحصته (دالة SECURITY DEFINER تتحقق من الملكية)
  const setSlotMeetingUrl = async (slotId, url) => {
    if (!supabase) return { ok: false, reason: 'Supabase غير مهيأ' };
    const { error } = await supabase.rpc('set_slot_meeting_url', { p_slot_id: slotId, p_url: url || null });
    if (error) return { ok: false, reason: error.code === '22023' ? 'الرابط يجب أن يبدأ بـ https://' : error.code === '42501' ? 'هذه الحصة غير مسندة إليك' : error.message };
    await reloadSlots();
    return { ok: true };
  };

  const [activeSubject, setActiveSubject] = useState('arabic');
  const [selectedLessonId, setSelectedLessonId] = useState('baa');
  useEffect(() => {
    if (!curriculumData[activeSubject]?.lessons?.some(lesson => lesson.id === selectedLessonId)) {
      const firstLesson = curriculumData[activeSubject]?.lessons?.[0];
      if (firstLesson) setSelectedLessonId(firstLesson.id);
    }
  }, [activeSubject, curriculumData, selectedLessonId]);
  const activeChild = childrenList.find(c => c.id === selectedChildId) || childrenList[0];

  // ========== المزامنة السحابية (المرحلة 3) ==========

  // المنهج من قاعدة البيانات (المواد + الدروس المنشورة بترتيبها) — fallback للمحلي عند الفشل
  const [curriculumSource, setCurriculumSource] = useState('local');
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const [subsRes, lesRes] = await Promise.all([
        supabase.from('curriculum_subjects').select('key, title, icon, color, badge, grade, sort_order').eq('published', true).order('sort_order'),
        supabase.from('curriculum_lessons').select('id, subject_key, sort_order, content').eq('published', true).order('sort_order')
      ]);
      if (cancelled || subsRes.error || lesRes.error || !subsRes.data?.length || !lesRes.data?.length) return;
      const db = {};
      subsRes.data.forEach(s => {
        db[s.key] = { id: s.key, title: s.title, icon: s.icon, badge: s.badge, color: s.color, grade: s.grade, lessons: [] };
      });
      lesRes.data.forEach(l => {
        if (db[l.subject_key]) db[l.subject_key].lessons.push({ ...(l.content || {}), id: l.id });
      });
      // نُبقي المفاتيح غير المادية (مثل expatExamCalendar) من النسخة المحلية
      setCurriculumData(prev => normalizeCurriculum({ ...prev, ...db }));
      setCurriculumSource('db');
    })();
    return () => { cancelled = true; };
  }, []);

  // ربط أطفال الحساب محلياً بسجلات children السحابية (uuid) وتحميل تقدمهم المحفوظ
  const [childCloudIds, setChildCloudIds] = useState({}); // localChildId -> uuid
  useEffect(() => {
    if (!supabase || !user?.id) { setChildCloudIds({}); return; }
    let cancelled = false;
    (async () => {
      // parent_profiles row لازم لوجود children (fk)
      await supabase.from('parent_profiles').upsert(
        { id: user.id, full_name: parentName || user.email || 'ولي أمر' },
        { onConflict: 'id' }
      );
      const { data: cloudChildren, error } = await supabase
        .from('children')
        .upsert(
          childrenList.map(c => ({ parent_id: user.id, name: c.name, grade: c.grade, avatar: c.avatar || null })),
          { onConflict: 'parent_id,name' }
        )
        .select('id, name');
      if (cancelled || error || !cloudChildren) {
        if (error) console.warn('تعذر مزامنة ملفات الأطفال:', error.message);
        return;
      }
      const map = {};
      childrenList.forEach(c => {
        const remote = cloudChildren.find(r => r.name === c.name);
        if (remote) map[c.id] = remote.id;
      });
      setChildCloudIds(map);

      // تحميل التقدم المحفوظ سحابياً ودمجه (السحابة لا تمسح تقدماً محلياً)
      const uuids = Object.values(map);
      if (!uuids.length) return;
      const { data: records } = await supabase
        .from('learning_records')
        .select('child_id, lesson_id, status, score')
        .in('child_id', uuids);
      if (cancelled || !records?.length) return;
      const uuidToLocal = Object.fromEntries(Object.entries(map).map(([l, u]) => [u, l]));
      setLearningRecords(prev => {
        const next = { ...prev };
        records.forEach(r => {
          const localId = uuidToLocal[r.child_id];
          if (!localId) return;
          const rec = next[localId]?.[r.lesson_id] || {};
          next[localId] = {
            ...(next[localId] || {}),
            [r.lesson_id]: { ...rec, completed: rec.completed || r.status === 'completed' }
          };
        });
        return next;
      });
      setChildrenList(prev => prev.map(c => {
        const uuid = map[c.id];
        if (!uuid) return c;
        const completedIds = records.filter(r => r.child_id === uuid && r.status === 'completed').map(r => r.lesson_id);
        const merged = Array.from(new Set([...(c.masteredLessons || []), ...completedIds]));
        return { ...c, masteredLessons: merged, baaMastered: c.baaMastered || merged.includes('baa') };
      }));
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // تحميل الجدول عند تغيّر المستخدم
  useEffect(() => { setSlotsLoaded(false); reloadSlots(); }, [user?.id]);

  // منطقة ولي الأمر الزمنية (تُضبط من «مساحتي»؛ بدونها نستعمل منطقة الجهاز)
  const [parentTimezone, setParentTimezoneState] = useState(null);
  useEffect(() => {
    if (!supabase || !user?.id) { setParentTimezoneState(null); return; }
    supabase.from('parent_profiles').select('timezone').eq('id', user.id).maybeSingle()
      .then(({ data }) => setParentTimezoneState(isValidTimezone(data?.timezone) ? data.timezone : null));
  }, [user?.id]);
  const setParentTimezone = async (tz) => {
    if (!isValidTimezone(tz)) return { ok: false, reason: 'منطقة زمنية غير صالحة' };
    if (!supabase || !user?.id) return { ok: false, reason: 'سجّل الدخول أولاً' };
    const { error } = await supabase.from('parent_profiles').update({ timezone: tz }).eq('id', user.id);
    if (error) return { ok: false, reason: error.message };
    setParentTimezoneState(tz);
    return { ok: true };
  };
  const effectiveTimezone = parentTimezone || deviceTimezone();

  // جدول الطفل النشط فقط (لكل ابن على حدة)
  const activeChildCloudIdValue = childCloudIds[activeChild?.id] || null;
  const scheduleData = React.useMemo(
    () => allSlots.filter(s => s.childId && s.childId === activeChildCloudIdValue),
    [allSlots, activeChildCloudIdValue]
  );

  const persistLearningRecord = (childId, lessonId, status = 'started', score = null) => {
    const cloudChildId = childCloudIds[childId];
    if (!supabase || !cloudChildId || !lessonId) return; // بدون تسجيل دخول: التقدم محلي فقط
    supabase.from('learning_records').upsert({ child_id: cloudChildId, lesson_id: lessonId, status, score, updated_at: new Date().toISOString() }, { onConflict: 'child_id,lesson_id' }).then(({ error }) => {
      if (error) console.warn('تعذر مزامنة سجل التعلم:', error.message);
    });
  };

  // حفظ محاولة محاكي الامتحان (يتطلب تسجيل دخول ولي الأمر)
  const saveExamAttempt = async (attempt) => {
    if (!supabase || !user?.id) return { saved: false, reason: 'no-session' };
    const { error } = await supabase.from('exam_attempts').insert({
      parent_id: user.id,
      child_key: attempt.childKey || null,
      child_name: attempt.childName || null,
      total_questions: attempt.totalQuestions,
      attempted_count: attempt.attemptedCount,
      correct_count: attempt.correctCount,
      percentage: attempt.percentage,
      band: attempt.band || null,
      answers: attempt.answers || null
    });
    if (error) {
      console.warn('تعذر حفظ محاولة الامتحان:', error.message);
      return { saved: false, reason: error.message };
    }
    return { saved: true };
  };
  // ========== نهاية المزامنة السحابية ==========

  // Subject and Lesson Selection
  // Compute Active Lesson
  const currentLessonsList = curriculumData[activeSubject]?.lessons || curriculumData.arabic.lessons;
  const activeLesson = currentLessonsList.find(l => l.id === selectedLessonId) || currentLessonsList[0];

  // Modals state moved to UIContext (actions consumed above; state read via useUIState)

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('fahem_parent_name', parentName);
  }, [parentName]);

  useEffect(() => {
    localStorage.setItem('fahem_child_name', childName);
    localStorage.setItem('fahem_grade', grade);
  }, [childName, grade]);

  useEffect(() => {
    localStorage.setItem('fahem_country', country);
    localStorage.setItem('fahem_country_text', countryText);
  }, [country, countryText]);

  useEffect(() => {
    localStorage.setItem('fahem_children', JSON.stringify(childrenList));
  }, [childrenList]);

  useEffect(() => {
    localStorage.setItem('fahem_active_child_id', selectedChildId);
  }, [selectedChildId]);

  useEffect(() => {
    localStorage.setItem('fahem_learning_records', JSON.stringify(learningRecords));
  }, [learningRecords]);

  useEffect(() => {
    try {
      localStorage.setItem('fahem_curriculum', JSON.stringify(curriculumData));
    } catch {
      triggerToast('تعذر حفظ المحتوى محليًا؛ قد تكون مساحة المتصفح ممتلئة.');
    }
  }, [curriculumData]);

  // تنظيف مخزن المحرر المحلي القديم (لم يعد مستخدماً؛ المحتوى من Supabase)
  useEffect(() => {
    ['fahem_curriculum_drafts', 'fahem_lesson_files', 'fahem_lesson_videos'].forEach(k => localStorage.removeItem(k));
  }, []);

  useEffect(() => {
    localStorage.setItem('fahem_sample_students', JSON.stringify(sampleStudents));
  }, [sampleStudents]);

  useEffect(() => {
    if (activeChild) {
      setChildName(activeChild.name);
      setGrade(activeChild.grade);
    }
  }, [activeChild?.id]);

  const switchChild = (childId) => {
    setSelectedChildId(childId);
    const target = childrenList.find(c => c.id === childId);
    if (target) {
      setChildName(target.name);
      setGrade(target.grade);
      triggerToast(`تم تحويل المتابعة إلى ملف: ${target.name} (${target.grade}) 🌟`);
    }
  };

  const addChild = (name, gradeVal) => {
    const cleanName = name.trim();
    if (!cleanName) {
      triggerToast('يرجى إدخال اسم الطفل.');
      return null;
    }
    const newChild = {
      id: `child_${Date.now()}`,
      name: cleanName,
      grade: gradeVal || 'الصف الأول الابتدائي',
      avatar: '⭐',
      points: 0,
      badges: 0,
      baaMastered: false,
      masteredLessons: [],
      masteredSkills: 0
    };
    setChildrenList(prev => [...prev, newChild]);
    setSelectedChildId(newChild.id);
    setChildName(newChild.name);
    setGrade(newChild.grade);
    triggerToast(`تمت إضافة ${newChild.name} بنجاح إلى حسابك!`);
    return newChild;
  };

  // Open any lesson dynamically in Studio Modal
  const openLesson = (subjectKey, lessonId, defaultTab = 'video') => {
    if (subjectKey) setActiveSubject(subjectKey);
    if (lessonId) setSelectedLessonId(lessonId);
    if (lessonId) recordLessonOpened(lessonId, subjectKey || activeSubject);
    setStudioActiveTab(defaultTab);
    setShowStudioModal(true);
  };

  // Dynamic Mastery Completion
  const completeLessonMastery = (lessonId) => {
    const childId = activeChild?.id;
    if (!childId) return;
    const childRecords = learningRecords[childId] || {};
    const wasCompleted = Boolean(childRecords[lessonId]?.completed || activeChild.masteredLessons?.includes(lessonId) || (lessonId === 'baa' && activeChild.baaMastered));
    if (wasCompleted) {
      if (!childRecords[lessonId]?.completed) {
        setLearningRecords(prev => ({
          ...prev,
          [childId]: {
            ...(prev[childId] || {}),
            [lessonId]: { ...(prev[childId]?.[lessonId] || {}), completed: true, completedAt: new Date().toISOString() }
          }
        }));
      }
      setShowStudioModal(false);
      triggerToast(`هذا الدرس مكتمل بالفعل يا ${activeChild.name}؛ لم نضف نقاطًا مكررة.`);
      return;
    }

    setLearningRecords(prev => ({
      ...prev,
      [childId]: {
        ...(prev[childId] || {}),
        [lessonId]: {
          ...(prev[childId]?.[lessonId] || {}),
          completed: true,
          completedAt: prev[childId]?.[lessonId]?.completedAt || new Date().toISOString()
        }
      }
    }));
    persistLearningRecord(childId, lessonId, 'completed');

    // 🔥 Update streak & XP in Supabase (fire-and-forget, don't block UI)
    const cloudChildId = childCloudIds[childId];
    if (supabase && cloudChildId) supabase.rpc('update_child_streak', { p_child_id: cloudChildId, p_xp_earned: 10 })
      .then(({ data, error }) => {
        if (error) console.warn('Streak update failed:', error.message);
        else if (data) {
          console.log('🔥 Streak updated:', data);
          soundManager.playXP(); // 🔊 Play XP sound
        }
      });

    soundManager.playSuccess();
    if (!wasCompleted) launchConfetti();

    setChildrenList(prev => prev.map(child => {
      if (child.id === childId) {
        const alreadyMastered = child.masteredLessons?.includes(lessonId);
        const updatedList = alreadyMastered ? child.masteredLessons : [...(child.masteredLessons || []), lessonId];
        return {
          ...child,
          baaMastered: lessonId === 'baa' ? true : child.baaMastered,
          masteredLessons: updatedList,
          points: (child.points || 0) + (wasCompleted ? 0 : 30),
          badges: wasCompleted || alreadyMastered ? child.badges : child.badges + 1,
          masteredSkills: Math.min(10, child.masteredSkills + (wasCompleted || alreadyMastered ? 0 : 1))
        };
      }
      return child;
    }));
    setShowStudioModal(false);
    triggerToast(`مبارك يا ${activeChild.name}! أتقنت المهارة وربحت 30 نقطة + 10 XP 🔥⭐🎉`);
  };

  const recordQuizAttempt = (lessonId, isCorrect) => {
    const childId = activeChild?.id;
    if (!childId) return;
    setLearningRecords(prev => {
      const record = prev[childId]?.[lessonId] || {};
      const attempts = record.attempts || [];
      return {
        ...prev,
        [childId]: {
          ...(prev[childId] || {}),
          [lessonId]: {
            ...record,
            attempts: [...attempts, { isCorrect, attemptedAt: new Date().toISOString() }],
            lastAttemptCorrect: isCorrect
          }
        }
      };
    });
    persistLearningRecord(childId, lessonId, 'started', isCorrect ? 100 : 0);
  };

  const recordLessonOpened = (lessonId, subjectKey = activeSubject) => {
    const childId = activeChild?.id;
    if (!childId) return;
    const now = new Date().toISOString();
    setLearningRecords(prev => {
      const record = prev[childId]?.[lessonId] || {};
      return {
        ...prev,
        [childId]: {
          ...(prev[childId] || {}),
          [lessonId]: {
            ...record,
            subject: subjectKey,
            openedCount: (record.openedCount || 0) + 1,
            lastOpenedAt: now
          }
        }
      };
    });
    persistLearningRecord(childId, lessonId, 'started');
  };

  const recordVideoProgress = (lessonId, currentTime, duration, subjectKey = activeSubject) => {
    const childId = activeChild?.id;
    if (!childId || !Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return;
    const progress = Math.min(100, Math.round((currentTime / duration) * 100));
    setLearningRecords(prev => {
      const record = prev[childId]?.[lessonId] || {};
      if (Math.abs((record.videoProgress || 0) - progress) < 2) return prev;
      return {
        ...prev,
        [childId]: {
          ...(prev[childId] || {}),
          [lessonId]: {
            ...record,
            subject: subjectKey,
            videoProgress: Math.max(record.videoProgress || 0, progress),
            lastOpenedAt: new Date().toISOString()
          }
        }
      };
    });
  };

  const value = {
    currentScreen, setCurrentScreen,
    parentName, setParentName,
    childName, setChildName,
    grade, setGrade,
    country, setCountry,
    countryText, setCountryText,
    childrenList,
    activeChild,
    activeChildCloudId: childCloudIds[activeChild?.id] || null,
    learningRecords: learningRecords[activeChild?.id] || {},
    scheduleData, allSlots, slotsLoaded, reloadSlots, saveScheduleToCloud, setSlotMeetingUrl,
    parentTimezone, effectiveTimezone, setParentTimezone,
    curriculumSource,
    saveExamAttempt,
    studentsSeeded,
    sampleStudents,
    switchChild,
    addChild,
    // Curriculum & Active Lesson
    curriculumData,
    setCurriculumData,
    activeSubject, setActiveSubject,
    selectedLessonId, setSelectedLessonId,
    activeLesson,
    openLesson,
    completeLessonMastery,
    recordQuizAttempt,
    recordLessonOpened,
    recordVideoProgress,
    // Modals — أفعال فقط (مراجع ثابتة من UIContext)؛ الحالة تُقرأ عبر useUIState
    setShowGateModal,
    setShowStudioModal,
    setStudioActiveTab,
    setShowScheduleModal,
    triggerToast,
    soundManager
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
