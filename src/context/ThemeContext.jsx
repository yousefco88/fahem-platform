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
 * ThemeToggle Component
 */
export function ThemeToggle({ className = '' }) {
  const { isDark, toggle } = useTheme();
  
  return (
    <button
      onClick={toggle}
      className={`
        relative w-14 h-8 rounded-full transition-colors duration-300
        ${isDark ? 'bg-indigo-600' : 'bg-gray-300'}
        ${className}
      `}
      aria-label={isDark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
    >
      <span
        className={`
          absolute top-1 w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center
          ${isDark ? 'right-1 bg-indigo-900' : 'left-1 bg-white shadow'}
        `}
      >
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  );
}

export default ThemeContext;
