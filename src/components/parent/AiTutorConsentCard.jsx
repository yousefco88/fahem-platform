import React from 'react';
import { useApp } from '../../context/AppContext';
import useAiTutorConsent from '../../hooks/useAiTutorConsent';

// بطاقة موافقة ولي الأمر على مساعد الذكاء الاصطناعي (مغلقة افتراضياً)
export default function AiTutorConsentCard() {
  const { activeChild, activeChildCloudId } = useApp();
  const { enabled, loading, error, save } = useAiTutorConsent(activeChildCloudId);
  if (!activeChildCloudId) return null;

  return (
    <div className="aic-card" dir="rtl">
      <div className="aic-head">
        <strong>🤖 مساعد الذكاء الاصطناعي لـ {activeChild?.name}</strong>
        <label className="aic-toggle">
          <input
            type="checkbox"
            checked={enabled}
            disabled={loading}
            onChange={(e) => save(e.target.checked)}
            aria-label="تفعيل مساعد الذكاء الاصطناعي"
          />
          <span>{enabled ? 'مفعّل' : 'مغلق'}</span>
        </label>
      </div>
      <p className="aic-note">
        عند التفعيل تُرسل أسئلة طفلك إلى نموذج ذكاء اصطناعي خارجي (NVIDIA) ليجيب عنها.
        الحد 50 رسالة يوميًا، ويحفظ النظام المحادثات لتراجعها أنت. قد يخطئ المساعد، ولا يغني عن المعلم.
        يمكنك الإيقاف في أي وقت.
      </p>
      {error && <p className="aic-error" role="alert">{error}</p>}
    </div>
  );
}
