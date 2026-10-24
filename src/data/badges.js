/**
 * badges.js
 * Achievement system data and logic
 */

// 🏅 Badge definitions
export const BADGES = {
  // 🔥 Streak badges
  streak_3: {
    id: 'streak_3',
    name: 'بداية قوية',
    description: '3 أيام متتالية',
    icon: '🌱',
    category: 'streak',
    requirement: { type: 'streak', value: 3 },
    xpReward: 25
  },
  streak_7: {
    id: 'streak_7',
    name: 'أسبوع كامل',
    description: '7 أيام متتالية',
    icon: '🔥',
    category: 'streak',
    requirement: { type: 'streak', value: 7 },
    xpReward: 50
  },
  streak_14: {
    id: 'streak_14',
    name: 'نجم الاستمرارية',
    description: '14 يوم متتالي',
    icon: '⚡',
    category: 'streak',
    requirement: { type: 'streak', value: 14 },
    xpReward: 100
  },
  streak_30: {
    id: 'streak_30',
    name: 'بطل الشهر',
    description: '30 يوم متتالي',
    icon: '👑',
    category: 'streak',
    requirement: { type: 'streak', value: 30 },
    xpReward: 250
  },

  // ⭐ XP badges
  xp_100: {
    id: 'xp_100',
    name: 'جامع النقاط',
    description: '100 نقطة XP',
    icon: '⭐',
    category: 'xp',
    requirement: { type: 'xp', value: 100 },
    xpReward: 10
  },
  xp_500: {
    id: 'xp_500',
    name: 'متعلم نشط',
    description: '500 نقطة XP',
    icon: '🌟',
    category: 'xp',
    requirement: { type: 'xp', value: 500 },
    xpReward: 50
  },
  xp_1000: {
    id: 'xp_1000',
    name: 'خبير التعلم',
    description: '1000 نقطة XP',
    icon: '💫',
    category: 'xp',
    requirement: { type: 'xp', value: 1000 },
    xpReward: 100
  },

  // 📚 Lesson badges
  lessons_5: {
    id: 'lessons_5',
    name: 'البداية',
    description: '5 دروس مكتملة',
    icon: '📖',
    category: 'lessons',
    requirement: { type: 'lessons', value: 5 },
    xpReward: 15
  },
  lessons_25: {
    id: 'lessons_25',
    name: 'طالب مجتهد',
    description: '25 درس مكتمل',
    icon: '📚',
    category: 'lessons',
    requirement: { type: 'lessons', value: 25 },
    xpReward: 50
  },
  lessons_50: {
    id: 'lessons_50',
    name: 'عالم صغير',
    description: '50 درس مكتمل',
    icon: '🎓',
    category: 'lessons',
    requirement: { type: 'lessons', value: 50 },
    xpReward: 100
  },

  // 🎯 Subject mastery badges
  subject_arabic: {
    id: 'subject_arabic',
    name: 'بطل اللغة العربية',
    description: 'إتقان 80% من دروس العربي',
    icon: '🇸🇦',
    category: 'subject',
    requirement: { type: 'subject_mastery', subject: 'arabic', percent: 80 },
    xpReward: 200
  },
  subject_math: {
    id: 'subject_math',
    name: 'عبقري الرياضيات',
    description: 'إتقان 80% من دروس الرياضيات',
    icon: '🔢',
    category: 'subject',
    requirement: { type: 'subject_mastery', subject: 'math', percent: 80 },
    xpReward: 200
  },
  subject_science: {
    id: 'subject_science',
    name: 'مستكشف العلوم',
    description: 'إتقان 80% من دروس العلوم',
    icon: '🔬',
    category: 'subject',
    requirement: { type: 'subject_mastery', subject: 'science', percent: 80 },
    xpReward: 200
  },

  // 🏆 Special badges
  first_lesson: {
    id: 'first_lesson',
    name: 'الخطوة الأولى',
    description: 'أول درس مكتمل',
    icon: '🎯',
    category: 'special',
    requirement: { type: 'lessons', value: 1 },
    xpReward: 10
  },
  perfect_quiz: {
    id: 'perfect_quiz',
    name: 'إجابة كاملة',
    description: '100% في اختبار',
    icon: '💯',
    category: 'special',
    requirement: { type: 'perfect_quiz' },
    xpReward: 25
  },
  early_bird: {
    id: 'early_bird',
    name: 'العصفور المبكر',
    description: 'درس قبل 8 صباحاً',
    icon: '🐦',
    category: 'special',
    requirement: { type: 'time', before: '08:00' },
    xpReward: 15
  },
  night_owl: {
    id: 'night_owl',
    name: 'بومة الليل',
    description: 'درس بعد 9 مساءً',
    icon: '🦉',
    category: 'special',
    requirement: { type: 'time', after: '21:00' },
    xpReward: 15
  }
};

// 🎨 Category info
export const BADGE_CATEGORIES = {
  streak: { name: 'الاستمرارية', color: '#f97316' },
  xp: { name: 'النقاط', color: '#eab308' },
  lessons: { name: 'الدروس', color: '#22c55e' },
  subject: { name: 'المواد', color: '#3b82f6' },
  special: { name: 'خاصة', color: '#8b5cf6' }
};

/**
 * Check which badges a child has earned
 */
export function checkBadges({ 
  streak = 0, 
  bestStreak = 0,
  xpTotal = 0, 
  lessonsCompleted = 0,
  subjectProgress = {},
  earnedBadges = [],
  lastLessonTime = null
}) {
  const newBadges = [];

  Object.values(BADGES).forEach(badge => {
    // Skip if already earned
    if (earnedBadges.includes(badge.id)) return;

    const req = badge.requirement;
    let earned = false;

    switch (req.type) {
      case 'streak':
        earned = Math.max(streak, bestStreak) >= req.value;
        break;
      case 'xp':
        earned = xpTotal >= req.value;
        break;
      case 'lessons':
        earned = lessonsCompleted >= req.value;
        break;
      case 'subject_mastery':
        earned = (subjectProgress[req.subject] || 0) >= req.percent;
        break;
      case 'perfect_quiz':
        // Checked separately when quiz is completed
        break;
      case 'time':
        if (lastLessonTime) {
          const hour = new Date(lastLessonTime).getHours();
          if (req.before) {
            earned = hour < parseInt(req.before);
          } else if (req.after) {
            earned = hour >= parseInt(req.after);
          }
        }
        break;
    }

    if (earned) {
      newBadges.push(badge);
    }
  });

  return newBadges;
}

/**
 * Get badge by ID
 */
export function getBadge(badgeId) {
  return BADGES[badgeId] || null;
}

/**
 * Get all badges in a category
 */
export function getBadgesByCategory(category) {
  return Object.values(BADGES).filter(b => b.category === category);
}

export default { BADGES, BADGE_CATEGORIES, checkBadges, getBadge, getBadgesByCategory };
