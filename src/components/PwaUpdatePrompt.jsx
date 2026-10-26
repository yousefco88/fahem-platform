import { useRegisterSW } from 'virtual:pwa-register/react';

// شريط «يتوفر تحديث» — يظهر عندما ينتظر Service Worker جديد.
// سبب وجوده: كان المستخدم يبقى على نسخة قديمة بعد النشر حتى يُغلق التطبيق كلياً.
const CHECK_EVERY_MS = 15 * 60 * 1000;

export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(swUrl, reg) {
      if (!reg) return;
      // فحص دوري للتحديثات ما دام التطبيق مفتوحاً
      setInterval(() => reg.update().catch(() => {}), CHECK_EVERY_MS);
    }
  });

  if (!needRefresh) return null;

  return (
    <div
      role="alert" dir="rtl"
      style={{
        position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
        insetInlineStart: '50%', transform: 'translateX(50%)',
        zIndex: 1000, display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--card-bg)', color: 'inherit',
        border: '1px solid var(--line)', borderRadius: 12,
        padding: '10px 14px', boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
        maxWidth: 'min(92vw, 420px)'
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 14 }}>✨ يتوفر تحديث جديد للتطبيق</span>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          background: 'var(--blue, #2563eb)', color: 'white', border: 'none',
          borderRadius: 8, padding: '8px 14px', fontWeight: 800, cursor: 'pointer', font: 'inherit', fontSize: 13
        }}
      >تحديث الآن</button>
      <button
        onClick={() => setNeedRefresh(false)}
        aria-label="لاحقاً"
        style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.6, cursor: 'pointer', fontSize: 16 }}
      >✕</button>
    </div>
  );
}
