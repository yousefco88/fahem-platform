/**
 * ThemeContext.jsx
 * إدارة الوضع الليلي
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('fahem-theme');
    if (saved) return saved === 'dark';
    // Then check system preference
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    // Apply to document
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('fahem-theme', isDark ? 'dark' : 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#0f172a' : '#2563eb');
  }, [isDark]);

  // Listen for system changes
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    
    const handler = (e) => {
      if (!localStorage.getItem('fahem-theme')) {
        setIsDark(e.matches);
      }
    };
    
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  const toggle = () => setIsDark(d => !d);

  return (
    <ThemeContext.Provider value={{ isDark, toggle, setIsDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/**
 * ThemeToggle — زر عائم واضح (نهاري/ليلي) يظهر في كل الصفحات.
 * التنسيق في index.css (.theme-fab)
 */
export function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  const label = isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي';
  return (
    <button type="button" className="theme-fab" onClick={toggle} aria-label={label} title={label} aria-pressed={isDark}>
      <span className="theme-fab-icon" aria-hidden="true">{isDark ? '☀️' : '🌙'}</span>
      <span className="theme-fab-text">{isDark ? 'نهاري' : 'ليلي'}</span>
    </button>
  );
}

export default ThemeContext;
