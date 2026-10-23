import React, { createContext, useContext, useState, useEffect } from 'react';
import { soundManager } from '../utils/audio';
import { launchConfetti } from '../utils/confetti';
import { CURRICULUM_DATA } from '../data/curriculumData';

const AppContext = createContext();

const DEFAULT_CHILDREN = [
  {
    id: 'child_1',
    name: 'أحمد',
    grade: 'الصف الأول الابتدائي',
    avatar: '🦁',
    points: 280,
    badges: 4,
    baaMastered: false,
    masteredLessons: ['alef', 'math_numbers_1_5'],
    masteredSkills: 7
  },
  {
    id: 'child_2',
    name: 'مريم',
    grade: 'الصف الثالث الابتدائي',
    avatar: '🌸',
    points: 410,
    badges: 6,
    baaMastered: true,
    masteredLessons: ['alef', 'baa', 'math_numbers_1_5', 'math_compare'],
    masteredSkills: 9
  }
];

export function AppProvider({ children }) {
  const [currentScreen, setCurrentScreen] = useState('parent');

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
      return Array.isArray(saved) && saved.length ? saved : DEFAULT_CHILDREN;
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
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? { ...CURRICULUM_DATA, ...parsed }
        : CURRICULUM_DATA;
    } catch {
      return CURRICULUM_DATA;
    }
  });
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

  // Subject and Lesson Selection
  // Compute Active Lesson
  const currentLessonsList = curriculumData[activeSubject]?.lessons || curriculumData.arabic.lessons;
  const activeLesson = currentLessonsList.find(l => l.id === selectedLessonId) || currentLessonsList[0];

  // Modals state
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [studioActiveTab, setStudioActiveTab] = useState('video');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3200);
  };

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
      points: 100,
      badges: 1,
      baaMastered: false,
      masteredLessons: [],
      masteredSkills: 1
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
    triggerToast(`مبارك يا ${activeChild.name}! أتقنت المهارة وربحت 30 نقطة ⭐🎉`);
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
    learningRecords: learningRecords[activeChild?.id] || {},
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
    // Modals
    showLiveModal, setShowLiveModal,
    showGateModal, setShowGateModal,
    showStudioModal, setShowStudioModal,
    studioActiveTab, setStudioActiveTab,
    showScheduleModal, setShowScheduleModal,
    toastMessage, triggerToast,
    soundManager
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
