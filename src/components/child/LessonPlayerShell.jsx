import React, { useEffect, useRef } from 'react';
import Emoji from '../../ui/Emoji';
import './ChildLessonPlayer.css';

const TABS = [
  { id: 'video', icon: '🎥', label: 'الدرس' },
  { id: 'quiz', icon: '🎯', label: 'التحدي' },
  { id: 'pdf', icon: '📄', label: 'ورقة العمل' },
  { id: 'guide', icon: '💡', label: 'دليل الأهل' },
];

export default function LessonPlayerShell({
  lesson,
  subject,
  tab,
  onTabChange,
  mode,
  onModeChange,
  recordedAvailable,
  liveAvailable,
  onClose,
  children,
}) {
  const dialogRef = useRef(null);
  const tablistRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const getFocusable = () => Array.from(dialog?.querySelectorAll(
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), iframe:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
    ) || []);

    getFocusable()[0]?.focus();
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog?.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog?.removeEventListener('keydown', handleKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const handleTabKeyDown = event => {
    const currentIndex = TABS.findIndex(item => item.id === tab);
    const isRtl = window.getComputedStyle(tablistRef.current).direction === 'rtl';
    let nextIndex = null;
    if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = TABS.length - 1;
    else if (event.key === 'ArrowRight') nextIndex = (currentIndex + (isRtl ? -1 : 1) + TABS.length) % TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex + (isRtl ? 1 : -1) + TABS.length) % TABS.length;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = TABS[nextIndex];
    onTabChange(nextTab.id);
    tablistRef.current?.querySelector(`#lesson-tab-${nextTab.id}`)?.focus();
  };

  return (
    <div className="modal-overlay lesson-player-overlay" onClick={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        ref={dialogRef}
        className="lesson-player"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-player-title"
        tabIndex={-1}
      >
        <header className="lesson-player-header">
          <div className="lesson-player-heading">
            <div className="lesson-player-subject">
              {subject?.icon && <span aria-hidden="true"><Emoji>{subject.icon}</Emoji></span>}
              <span>{subject?.title || 'درس تعليمي'}</span>
            </div>
            <h2 id="lesson-player-title">{lesson.title}</h2>
            {lesson.letter && <span className="lesson-player-letter">{lesson.letter}</span>}
          </div>
          <button className="lesson-player-close" type="button" aria-label="إغلاق الدرس" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <nav ref={tablistRef} className="lesson-player-tabs" role="tablist" aria-label="أقسام الدرس" aria-orientation="horizontal" onKeyDown={handleTabKeyDown}>
          {TABS.map(item => (
            <button
              key={item.id}
              id={`lesson-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              aria-controls="lesson-panel"
              tabIndex={tab === item.id ? 0 : -1}
              className={`lesson-player-tab${tab === item.id ? ' is-active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <span className="lesson-player-tab-icon" aria-hidden="true"><Emoji>{item.icon}</Emoji></span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <main
          id="lesson-panel"
          className="lesson-player-content"
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`lesson-tab-${tab}`}
        >
          {tab === 'video' && recordedAvailable && liveAvailable && (
            <div className="lesson-player-modes" aria-label="نوع الحصة">
              <button
                type="button"
                aria-pressed={mode === 'recorded'}
                className={`lesson-player-mode${mode === 'recorded' ? ' is-active' : ''}`}
                onClick={() => onModeChange('recorded')}
              >
                <span aria-hidden="true"><Emoji>⏯️</Emoji></span> التسجيلات
              </button>
              <button
                type="button"
                aria-pressed={mode === 'live'}
                className={`lesson-player-mode${mode === 'live' ? ' is-active' : ''}`}
                onClick={() => onModeChange('live')}
              >
                <span aria-hidden="true"><Emoji>🔴</Emoji></span> الحصة المباشرة
              </button>
            </div>
          )}
          {children}
        </main>
        <button
          type="button"
          className="lesson-player-focus-sentinel"
          aria-label="العودة إلى بداية مشغل الدرس"
          onClick={() => dialogRef.current?.querySelector('button:not(:disabled)')?.focus()}
        />
      </section>
    </div>
  );
}
