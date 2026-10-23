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
    const saved = localStorage.getItem('fahem_children');
    return saved ? JSON.parse(saved) : DEFAULT_CHILDREN;
  });

  const [selectedChildId, setSelectedChildId] = useState(() => {
    return localStorage.getItem('fahem_active_child_id') || 'child_1';
  });

  const activeChild = childrenList.find(c => c.id === selectedChildId) || childrenList[0];

  // Subject and Lesson Selection
  const [activeSubject, setActiveSubject] = useState('arabic'); // 'arabic' | 'math'
  const [selectedLessonId, setSelectedLessonId] = useState('baa');

  // Compute Active Lesson
  const currentLessonsList = CURRICULUM_DATA[activeSubject]?.lessons || CURRICULUM_DATA.arabic.lessons;
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
      triggerToast(`تم تحويل المتابعة إلى ملف: ${target.name} (${target.grade}) 🌟`);
    }
  };

  const addChild = (name, gradeVal) => {
    const newChild = {
      id: `child_${Date.now()}`,
      name: name.trim() || 'طفل جديد',
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
    triggerToast(`تمت إضافة ${newChild.name} بنجاح إلى حسابك!`);
  };

  // Open any lesson dynamically in Studio Modal
  const openLesson = (subjectKey, lessonId, defaultTab = 'video') => {
    if (subjectKey) setActiveSubject(subjectKey);
    if (lessonId) setSelectedLessonId(lessonId);
    setStudioActiveTab(defaultTab);
    setShowStudioModal(true);
  };

  // Dynamic Mastery Completion
  const completeLessonMastery = (lessonId) => {
    soundManager.playSuccess();
    launchConfetti();

    setChildrenList(prev => prev.map(child => {
      if (child.id === activeChild.id) {
        const alreadyMastered = child.masteredLessons?.includes(lessonId);
        const updatedList = alreadyMastered ? child.masteredLessons : [...(child.masteredLessons || []), lessonId];
        return {
          ...child,
          baaMastered: lessonId === 'baa' ? true : child.baaMastered,
          masteredLessons: updatedList,
          points: child.points + 30,
          badges: alreadyMastered ? child.badges : child.badges + 1,
          masteredSkills: Math.min(10, child.masteredSkills + (alreadyMastered ? 0 : 1))
        };
      }
      return child;
    }));

    setShowStudioModal(false);
    triggerToast(`مبارك يا ${activeChild.name}! أتقنت المهارة وربحت الشارة الذهبية ⭐🎉`);
  };

  const value = {
    currentScreen, setCurrentScreen,
    parentName, setParentName,
    country, setCountry,
    countryText, setCountryText,
    liveClassTimeText, setLiveClassTimeText,
    childrenList,
    activeChild,
    switchChild,
    addChild,
    // Curriculum & Active Lesson
    curriculumData: CURRICULUM_DATA,
    activeSubject, setActiveSubject,
    selectedLessonId, setSelectedLessonId,
    activeLesson,
    openLesson,
    completeLessonMastery,
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
