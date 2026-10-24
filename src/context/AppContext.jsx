import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { soundManager } from '../utils/audio';
import { launchConfetti } from '../utils/confetti';
import { CURRICULUM_DATA } from '../data/curriculumData';
import { DEFAULT_WEEKLY_SCHEDULE } from '../data/scheduleData';
import { normalizeCurriculum } from '../utils/todayPlan';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useUIActions } from './UIContext';
import { SCREEN_PATHS, screenFromPath } from '../routes';

const AppContext = createContext();

const DEFAULT_CHILDREN = [
  {
    id: 'child_1',
    name: 'أحمد',
    grade: 'الصف الأول الابتدائي',
    avatar: '🦁',
    points: 0,
    badges: 0,
    baaMastered: false,
    masteredLessons: [],
    masteredSkills: 0
  },
  {
    id: 'child_2',
    name: 'مريم',
    grade: 'الصف الثالث الابتدائي',
    avatar: '🌸',
    points: 0,
    badges: 0,
    baaMastered: false,
    masteredLessons: [],
    masteredSkills: 0
  }
];

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
    setShowLiveModal,
    setShowGateModal,
    setShowStudioModal,
    setStudioActiveTab,
    setShowScheduleModal
  } = useUIActions();

  // Load parent & preferences
  const [parentName, setParentName] = useState(() => {
    return localStorage.getItem('fahem_parent_name') || 'أحمد محمد';
  });

  const [childName, setChildName] = useState(() => {
    return localStorage.getItem('fahem_child_name') || 'أحمد';
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

  const [liveClassTimeText, setLiveClassTimeText] = useState(() => {
    return localStorage.getItem('fahem_live_time') || 'اليوم 7:00 م (بتوقيتك المحلي)';
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

  // الجدول الأسبوعي — محلي أولاً (fahem_schedule) مع fallback للجدول الافتراضي
  const [scheduleData, setScheduleData] = useState(() => {
    try {
      const saved = localStorage.getItem('fahem_schedule');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_WEEKLY_SCHEDULE;
    } catch {
      return DEFAULT_WEEKLY_SCHEDULE;
    }
  });

  useEffect(() => {
    try { localStorage.setItem('fahem_schedule', JSON.stringify(scheduleData)); } catch { /* تجاهل امتلاء التخزين */ }
  }, [scheduleData]);

  // المرحلة ب: قراءة الجدول من Supabase إن وُجدت صفوف (وإلا يبقى المحلي)
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from('schedule_slots')
      .select('id, day, time, subject_id, lesson_ref, slot_type')
      .order('day', { ascending: true })
      .order('time', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled || error || !Array.isArray(data) || data.length === 0) return;
        setScheduleData(data.map(r => ({
          id: r.id, day: r.day, time: r.time,
          subjectId: r.subject_id, lessonRef: r.lesson_ref || 'next', type: r.slot_type || 'lesson'
        })));
      });
    return () => { cancelled = true; };
  }, []);

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

  // حفظ الجدول إلى Supabase (يتطلب جلسة staff بحكم سياسات RLS)
  const saveScheduleToCloud = async (slots) => {
    if (!supabase) return { ok: false, reason: 'Supabase غير مهيأ على هذا الجهاز' };
    const rows = slots.map(s => ({
      id: s.id, day: s.day, time: s.time,
      subject_id: s.subjectId, lesson_ref: s.lessonRef || 'next', slot_type: s.type || 'lesson'
    }));
    const { error: delError } = await supabase.from('schedule_slots').delete().gte('day', 0);
    if (delError) return { ok: false, reason: delError.message };
    if (rows.length) {
      const { error: insError } = await supabase.from('schedule_slots').insert(rows);
      if (insError) return { ok: false, reason: insError.message };
    }
    return { ok: true };
  };
  const [curriculumDrafts, setCurriculumDrafts] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fahem_curriculum_drafts') || '{}');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch {
      return {};
    }
  });
  const [lessonFiles, setLessonFiles] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fahem_lesson_files') || '{}');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch {
      return {};
    }
  });
  const [lessonVideos, setLessonVideos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fahem_lesson_videos') || '{}');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch {
      return {};
    }
  });
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
  const { user } = useAuth();

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
    localStorage.setItem('fahem_live_time', liveClassTimeText);
  }, [country, countryText, liveClassTimeText]);

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

  useEffect(() => {
    localStorage.setItem('fahem_curriculum_drafts', JSON.stringify(curriculumDrafts));
  }, [curriculumDrafts]);

  useEffect(() => {
    try {
      localStorage.setItem('fahem_lesson_files', JSON.stringify(lessonFiles));
    } catch {
      triggerToast('الملف كبير على التخزين المحلي. استخدم ملفًا أصغر أو نحتاج إلى تخزين خادم.');
    }
  }, [lessonFiles]);

  useEffect(() => {
    try {
      localStorage.setItem('fahem_lesson_videos', JSON.stringify(lessonVideos));
    } catch {
      triggerToast('تعذر حفظ الفيديو محليًا. جرّب ملفًا أصغر أو استخدم تخزين الخادم لاحقًا.');
    }
  }, [lessonVideos]);

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

  const seedSampleStudents = () => {
    if (studentsSeeded && sampleStudents.length > 0) return false;
    const examples = [
      { name: 'ليلى', country: 'الإمارات', subject: 'اللغة العربية', attempts: 3 },
      { name: 'عمر', country: 'الكويت', subject: 'الرياضيات', attempts: 2 },
      { name: 'نور', country: 'المملكة المتحدة', subject: 'اللغة العربية', attempts: 4 }
    ];
    setSampleStudents(examples);
    setStudentsSeeded(true);
    localStorage.setItem('fahem_students_seeded', 'true');
    localStorage.setItem('fahem_sample_students', JSON.stringify(examples));
    triggerToast('أضيفت بيانات طلاب تجريبية محلية؛ لا تمثل أسرًا أو طلابًا حقيقيين.');
    return true;
  };

  const value = {
    currentScreen, setCurrentScreen,
    parentName, setParentName,
    childName, setChildName,
    grade, setGrade,
    country, setCountry,
    countryText, setCountryText,
    liveClassTimeText, setLiveClassTimeText,
    childrenList,
    activeChild,
    activeChildCloudId: childCloudIds[activeChild?.id] || null,
    learningRecords: learningRecords[activeChild?.id] || {},
    scheduleData, setScheduleData, saveScheduleToCloud,
    curriculumSource,
    saveExamAttempt,
    studentsSeeded,
    sampleStudents,
    switchChild,
    addChild,
    // Curriculum & Active Lesson
    curriculumData,
    setCurriculumData,
    curriculumDrafts,
    setCurriculumDrafts,
    lessonFiles,
    setLessonFiles,
    lessonVideos,
    setLessonVideos,
    activeSubject, setActiveSubject,
    selectedLessonId, setSelectedLessonId,
    activeLesson,
    openLesson,
    completeLessonMastery,
    recordQuizAttempt,
    recordLessonOpened,
    recordVideoProgress,
    seedSampleStudents,
    // Modals — أفعال فقط (مراجع ثابتة من UIContext)؛ الحالة تُقرأ عبر useUIState
    setShowLiveModal,
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
