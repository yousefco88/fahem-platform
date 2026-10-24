/**
 * LanguageContext.jsx
 * سياق اللغة والترجمة
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { t as translate, LANGUAGES, DEFAULT_LANG, isRTL } from '../utils/i18n';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    // Check localStorage
    const saved = localStorage.getItem('fahem-lang');
    if (saved && LANGUAGES[saved]) return saved;
    
    // Check browser language
    const browserLang = navigator.language?.split('-')[0];
    if (LANGUAGES[browserLang]) return browserLang;
    
    return DEFAULT_LANG;
  });

  // Apply to document
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
    localStorage.setItem('fahem-lang', lang);
  }, [lang]);

  const setLang = useCallback((newLang) => {
    if (LANGUAGES[newLang]) {
      setLangState(newLang);
    }
  }, []);

  // Translation function bound to current language
  const t = useCallback((key, params) => {
    return translate(key, lang, params);
  }, [lang]);

  const value = {
    lang,
    setLang,
    t,
    isRTL: isRTL(lang),
    languages: LANGUAGES,
    currentLanguage: LANGUAGES[lang]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

/**
 * LanguageSwitcher Component
 */
export function LanguageSwitcher({ className = '' }) {
  const { lang, setLang, languages } = useLanguage();
  
  return (
    <div className={`flex gap-2 ${className}`}>
      {Object.entries(languages).map(([code, info]) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`
            px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
            ${lang === code 
              ? 'bg-blue-600 text-white shadow' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          <span>{info.flag}</span>
          <span>{info.name}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Language Dropdown (compact)
 */
export function LanguageDropdown({ className = '' }) {
  const { lang, setLang, languages, currentLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all"
      >
        <span>{currentLanguage.flag}</span>
        <span className="text-sm font-medium">{currentLanguage.name}</span>
        <span className="text-gray-400">▼</span>
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-lg border z-50 min-w-[150px]">
            {Object.entries(languages).map(([code, info]) => (
              <button
                key={code}
                onClick={() => { setLang(code); setOpen(false); }}
                className={`
                  w-full px-4 py-3 text-right flex items-center gap-3 hover:bg-gray-50 transition-all
                  ${lang === code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}
                  first:rounded-t-xl last:rounded-b-xl
                `}
              >
                <span className="text-lg">{info.flag}</span>
                <span className="text-sm font-medium">{info.name}</span>
                {lang === code && <span className="mr-auto text-blue-600">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default LanguageContext;
