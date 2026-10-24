/**
 * notifications.js
 * نظام الإشعارات المحلية والـ Push
 */

// Check if notifications are supported
export function isNotificationSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

// Get permission status
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'granted', 'denied', 'default'
}

// Request permission
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return { granted: false, reason: 'unsupported' };
  }
  
  if (Notification.permission === 'granted') {
    return { granted: true };
  }
  
  if (Notification.permission === 'denied') {
    return { granted: false, reason: 'denied' };
  }
  
  try {
    const permission = await Notification.requestPermission();
    return { granted: permission === 'granted', permission };
  } catch (err) {
    console.error('Notification permission error:', err);
    return { granted: false, reason: 'error', error: err };
  }
}

// Show local notification
export async function showNotification(title, options = {}) {
  if (!isNotificationSupported()) return null;
  
  if (Notification.permission !== 'granted') {
    const { granted } = await requestNotificationPermission();
    if (!granted) return null;
  }
  
  const defaultOptions = {
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    tag: 'fahem-notification',
    renotify: true,
    requireInteraction: false,
    ...options
  };
  
  try {
    // Try service worker notification first (works in background)
    const registration = await navigator.serviceWorker?.ready;
    if (registration) {
      await registration.showNotification(title, defaultOptions);
      return true;
    }
    
    // Fallback to regular notification
    new Notification(title, defaultOptions);
    return true;
  } catch (err) {
    console.error('Show notification error:', err);
    return null;
  }
}

// ==============================
// Notification Templates
// ==============================

export const NotificationTemplates = {
  // 🔥 Streak reminder
  streakReminder: (days) => showNotification(
    '🔥 حافظ على streak!',
    {
      body: `لديك ${days} يوم متتالي! لا تفقد تقدمك، ادرس اليوم.`,
      tag: 'streak-reminder',
      data: { type: 'streak', action: '/child' }
    }
  ),
  
  // ⭐ XP milestone
  xpMilestone: (xp) => showNotification(
    '⭐ وصلت لإنجاز جديد!',
    {
      body: `مبروك! وصلت إلى ${xp} نقطة XP`,
      tag: 'xp-milestone',
      data: { type: 'xp', action: '/child/progress' }
    }
  ),
  
  // 🏅 Badge earned
  badgeEarned: (badgeName) => showNotification(
    '🏅 شارة جديدة!',
    {
      body: `حصلت على شارة "${badgeName}"`,
      tag: 'badge-earned',
      data: { type: 'badge', action: '/child/badges' }
    }
  ),
  
  // 📚 Daily lesson reminder
  dailyReminder: () => showNotification(
    '📚 وقت الدراسة!',
    {
      body: 'حان وقت درس اليوم. هيا نتعلم!',
      tag: 'daily-reminder',
      data: { type: 'reminder', action: '/child' }
    }
  ),
  
  // 👨‍👩‍👧 Parent report ready
  weeklyReport: (childName) => showNotification(
    '📊 التقرير الأسبوعي جاهز',
    {
      body: `تقرير ${childName} الأسبوعي متاح للمشاهدة`,
      tag: 'weekly-report',
      data: { type: 'report', action: '/parent' }
    }
  ),
  
  // 🎉 Lesson complete
  lessonComplete: (lessonName, score) => showNotification(
    '🎉 أحسنت!',
    {
      body: `أكملت "${lessonName}" بنتيجة ${score}%`,
      tag: 'lesson-complete',
      data: { type: 'lesson', action: '/child/progress' }
    }
  )
};

// ==============================
// Scheduled Notifications (using localStorage + check)
// ==============================

const SCHEDULED_KEY = 'fahem-scheduled-notifications';

export function scheduleNotification(id, timestamp, template, params = []) {
  const scheduled = JSON.parse(localStorage.getItem(SCHEDULED_KEY) || '{}');
  scheduled[id] = { timestamp, template, params };
  localStorage.setItem(SCHEDULED_KEY, JSON.stringify(scheduled));
}

export function cancelScheduledNotification(id) {
  const scheduled = JSON.parse(localStorage.getItem(SCHEDULED_KEY) || '{}');
  delete scheduled[id];
  localStorage.setItem(SCHEDULED_KEY, JSON.stringify(scheduled));
}

export function checkScheduledNotifications() {
  const scheduled = JSON.parse(localStorage.getItem(SCHEDULED_KEY) || '{}');
  const now = Date.now();
  
  Object.entries(scheduled).forEach(([id, { timestamp, template, params }]) => {
    if (timestamp <= now) {
      // Fire the notification
      const fn = NotificationTemplates[template];
      if (fn) fn(...params);
      
      // Remove from scheduled
      cancelScheduledNotification(id);
    }
  });
}

// Check on app load
if (typeof window !== 'undefined') {
  // Check immediately
  setTimeout(checkScheduledNotifications, 1000);
  
  // Check every minute
  setInterval(checkScheduledNotifications, 60000);
}

export default {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
  NotificationTemplates,
  scheduleNotification,
  cancelScheduledNotification
};
