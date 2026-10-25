import React, { createContext, useContext, useState, useRef, useCallback, useMemo } from 'react';

// سياقان منفصلان: الحالة (تتغير كثيراً) والأفعال (ثابتة المرجع أبداً).
// الفائدة: تغيّر toast أو فتح نافذة لا يعيد تصيير مستهلكي الأفعال أو AppContext.
const UIStateContext = createContext(null);
const UIActionsContext = createContext(null);

export function UIProvider({ children }) {
  const [showGateModal, setShowGateModal] = useState(false);
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [studioActiveTab, setStudioActiveTab] = useState('video');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimer = useRef(null);

  const triggerToast = useCallback((msg) => {
    setToastMessage(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(''), 3200);
  }, []);

  // مرجع ثابت — لا يتغير طوال عمر التطبيق
  const actions = useMemo(() => ({
    setShowGateModal,
    setShowStudioModal,
    setStudioActiveTab,
    setShowScheduleModal,
    triggerToast
  }), [triggerToast]);

  const state = {
    showGateModal,
    showStudioModal,
    studioActiveTab,
    showScheduleModal,
    toastMessage
  };

  return (
    <UIActionsContext.Provider value={actions}>
      <UIStateContext.Provider value={state}>
        {children}
      </UIStateContext.Provider>
    </UIActionsContext.Provider>
  );
}

export function useUIState() {
  const ctx = useContext(UIStateContext);
  if (!ctx) throw new Error('useUIState must be used within UIProvider');
  return ctx;
}

export function useUIActions() {
  const ctx = useContext(UIActionsContext);
  if (!ctx) throw new Error('useUIActions must be used within UIProvider');
  return ctx;
}
