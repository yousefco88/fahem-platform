// خريطة الشاشات ↔ المسارات — مصدر الحقيقة للتنقل
export const SCREEN_PATHS = {
  landing: '/',
  parent: '/parent',
  child: '/child',
  teacher: '/teacher',
  admin: '/admin',
  exam: '/exam',
  onboarding: '/onboarding',
  pricing: '/pricing',
  account: '/account'
};

export const PATH_TO_SCREEN = Object.fromEntries(
  Object.entries(SCREEN_PATHS).map(([screen, path]) => [path, screen])
);
