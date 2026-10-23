// بيانات عرض المواد والتصنيفات في مساحة الطفل (عرض فقط — المحتوى من curriculumData)
export const CHILD_SUBJECTS = [
  // المسار العام
  { id: 'arabic', label: 'اللغة العربية', icon: '📖', color: '#2563eb', category: 'general' },
  { id: 'math', label: 'الرياضيات', icon: '🔢', color: '#059669', category: 'general' },
  { id: 'english', label: 'Connect الإنجليزية', icon: '🔤', color: '#8b5cf6', category: 'general' },
  { id: 'discover', label: 'اكتشف (Discover)', icon: '🔬', color: '#0284c7', category: 'general' },
  { id: 'life_skills', label: 'المهارات الحياتية', icon: '🛠️', color: '#ea580c', category: 'general' },

  // مسار مدارس اللغات
  { id: 'connect_plus', label: 'Connect Plus (لغات)', icon: '🌟', color: '#7c3aed', category: 'languages' },
  { id: 'math_en', label: 'Math (English)', icon: '📐', color: '#0d9488', category: 'languages' },

  // الهوية والمستقبل
  { id: 'social', label: 'معالم وتاريخ مصر', icon: '🇪🇬', color: '#b91c1c', category: 'identity' },
  { id: 'ict', label: 'تكنولوجيا المعلومات (ICT)', icon: '💻', color: '#4f46e5', category: 'identity' },
  { id: 'phonics_arabic', label: 'نور البيان والخط', icon: '✍️', color: '#be185d', category: 'identity' },

  // التربية الدينية والقيم
  { id: 'values', label: 'القيم والأخلاق', icon: '🤝', color: '#d97706', category: 'religion' },
  { id: 'islamic_religion', label: 'التربية الإسلامية', icon: '🕋', color: '#16a34a', category: 'religion' },
  { id: 'christian_religion', label: 'التربية المسيحية', icon: '✝️', color: '#b45309', category: 'religion' }
];

export const CHILD_CATEGORIES = [
  { id: 'all', label: `الكل (${CHILD_SUBJECTS.length} مادة) 📚` },
  { id: 'general', label: '🏫 المسار العام' },
  { id: 'languages', label: '🌍 مسار اللغات' },
  { id: 'identity', label: '🇪🇬 الهوية والمستقبل' },
  { id: 'religion', label: '🕊️ التربية والقيم' }
];

export const childPaths = {
  home: '/child',
  subject: (key) => `/child/subject/${encodeURIComponent(key)}`,
  lesson: (id, tab = 'video') => `/child/lesson/${encodeURIComponent(id)}${tab && tab !== 'video' ? `?tab=${tab}` : ''}`
};
