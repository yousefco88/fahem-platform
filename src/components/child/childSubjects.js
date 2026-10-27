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
  { id: 'all', label: 'الكل 📚' },
  { id: 'general', label: '🏫 المسار العام' },
  { id: 'languages', label: '🌍 مسار اللغات' },
  { id: 'identity', label: '🇪🇬 الهوية والمستقبل' },
  { id: 'religion', label: '🕊️ التربية والقيم' },
  { id: 'other', label: '📚 مواد أخرى' }
];

// قائمة مواد الطفل من المنهج الفعلي: كل مادة فيها دروس تظهر؛ ما كان في القائمة أعلاه يأخذ تصنيفه وأيقونته،
// وأي مادة جديدة (من قاعدة البيانات) تظهر تلقائياً تحت «مواد أخرى» بلا تعديل كود
export function listChildSubjects(curriculumData = {}) {
  const known = new Map(CHILD_SUBJECTS.map(s => [s.id, s]));
  const order = new Map(CHILD_SUBJECTS.map((s, i) => [s.id, i]));
  return Object.entries(curriculumData)
    .filter(([, v]) => v && !Array.isArray(v) && Array.isArray(v.lessons) && v.lessons.length > 0)
    .map(([id, v]) => {
      const k = known.get(id);
      return {
        id,
        label: k?.label || v.title || id,
        icon: k?.icon || v.icon || '📚',
        color: k?.color || v.color || '#6b7280',
        category: k?.category || 'other',
      };
    })
    .sort((x, y) => (order.get(x.id) ?? 999) - (order.get(y.id) ?? 999));
}

export const childPaths = {
  home: '/child',
  subject: (key) => `/child/subject/${encodeURIComponent(key)}`,
  lesson: (id, tab = 'video') => `/child/lesson/${encodeURIComponent(id)}${tab && tab !== 'video' ? `?tab=${tab}` : ''}`
};
