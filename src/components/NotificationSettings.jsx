/**
 * NotificationSettings.jsx
 * إعدادات الإشعارات
 */
import React, { useState, useEffect } from 'react';
import { 
  isNotificationSupported, 
  getNotificationPermission, 
  requestNotificationPermission,
  NotificationTemplates 
} from '../utils/notifications';

export default function NotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('fahem-notification-settings');
    return saved ? JSON.parse(saved) : {
      streakReminder: true,
      dailyReminder: true,
      achievements: true,
      weeklyReport: true
    };
  });

  useEffect(() => {
    setSupported(isNotificationSupported());
    setPermission(getNotificationPermission());
  }, []);

  useEffect(() => {
    localStorage.setItem('fahem-notification-settings', JSON.stringify(settings));
  }, [settings]);

  const handleRequestPermission = async () => {
    const { granted, permission: newPerm } = await requestNotificationPermission();
    setPermission(granted ? 'granted' : (newPerm || 'denied'));
  };

  const handleTestNotification = () => {
    NotificationTemplates.dailyReminder();
  };

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!supported) {
    return (
      <div className="bg-yellow-50 rounded-2xl p-6 text-center">
        <span className="text-4xl mb-3 block">📵</span>
        <h3 className="font-bold text-yellow-800 mb-2">الإشعارات غير مدعومة</h3>
        <p className="text-yellow-700 text-sm">
          المتصفح لا يدعم الإشعارات. جرب متصفح آخر.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Permission Status */}
      <div className={`rounded-2xl p-6 ${
        permission === 'granted' ? 'bg-green-50' :
        permission === 'denied' ? 'bg-red-50' :
        'bg-blue-50'
      }`}>
        <div className="flex items-center gap-4">
          <span className="text-4xl">
            {permission === 'granted' ? '🔔' : 
             permission === 'denied' ? '🔕' : '🔔'}
          </span>
          <div className="flex-1">
            <h3 className={`font-bold ${
              permission === 'granted' ? 'text-green-800' :
              permission === 'denied' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              {permission === 'granted' ? 'الإشعارات مفعّلة' :
               permission === 'denied' ? 'الإشعارات محظورة' :
               'تفعيل الإشعارات'}
            </h3>
            <p className={`text-sm ${
              permission === 'granted' ? 'text-green-700' :
              permission === 'denied' ? 'text-red-700' :
              'text-blue-700'
            }`}>
              {permission === 'granted' ? 'ستصلك تذكيرات وتنبيهات التقدم' :
               permission === 'denied' ? 'يمكنك تفعيلها من إعدادات المتصفح' :
               'فعّل الإشعارات لتلقي تذكيرات الدراسة'}
            </p>
          </div>
          {permission !== 'granted' && permission !== 'denied' && (
            <button
              onClick={handleRequestPermission}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all"
            >
              تفعيل
            </button>
          )}
        </div>
      </div>

      {/* Notification Types */}
      {permission === 'granted' && (
        <>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-bold text-gray-800">أنواع الإشعارات</h3>
            </div>
            
            {[
              { key: 'streakReminder', icon: '🔥', title: 'تذكير الـ Streak', desc: 'تذكير للحفاظ على أيامك المتتالية' },
              { key: 'dailyReminder', icon: '📚', title: 'تذكير الدراسة اليومي', desc: 'تذكير يومي بوقت الدراسة' },
              { key: 'achievements', icon: '🏅', title: 'الإنجازات والشارات', desc: 'إشعار عند الحصول على شارة جديدة' },
              { key: 'weeklyReport', icon: '📊', title: 'التقرير الأسبوعي', desc: 'إشعار عند جهوزية التقرير' }
            ].map(item => (
              <div 
                key={item.key}
                className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-gray-50 transition-all"
              >
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <button
                  onClick={() => toggleSetting(item.key)}
                  className={`
                    relative w-12 h-7 rounded-full transition-colors
                    ${settings[item.key] ? 'bg-green-500' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all
                      ${settings[item.key] ? 'right-1' : 'left-1'}
                    `}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Test Button */}
          <button
            onClick={handleTestNotification}
            className="w-full py-3 bg-gray-100 rounded-xl text-gray-700 font-medium hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
          >
            <span>🧪</span>
            <span>اختبار الإشعارات</span>
          </button>
        </>
      )}
    </div>
  );
}
