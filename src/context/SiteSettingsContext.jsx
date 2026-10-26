import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SITE_DEFAULTS, mergeSettings } from '../data/siteDefaults';

/**
 * SiteSettingsContext — محتوى الموقع القابل للتعديل من لوحة الإدارة.
 * المصدر: جدول site_settings في Supabase (key/value jsonb).
 * عند غياب Supabase أو الجدول: تُستخدم SITE_DEFAULTS كما هي (fail-safe).
 */
const SiteSettingsContext = createContext({
  settings: SITE_DEFAULTS,
  loading: false,
  tableMissing: false,
  saveSection: async () => ({ ok: false, reason: 'غير مهيأ' }),
  reload: async () => {}
});

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(SITE_DEFAULTS);
  const [loading, setLoading] = useState(!!supabase);
  const [tableMissing, setTableMissing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoaded(false);
    setLoadError(null);
    if (!supabase) {
      setLoadError('خدمة الإعدادات غير متصلة.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('site_settings').select('key, value');
      if (error) throw error;
      const overrides = {};
      (data || []).forEach(row => { overrides[row.key] = row.value; });
      setSettings(mergeSettings(SITE_DEFAULTS, overrides));
      setTableMissing(false);
      setLoaded(true);
    } catch (error) {
      setTableMissing(error?.code === '42P01' || error?.code === 'PGRST205');
      setLoadError('تعذر تحميل الإعدادات المحفوظة. أعد المحاولة قبل التعديل.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // حفظ قسم كامل (banner/hero/footer/pricing/seo/header) — upsert
  const saveSection = useCallback(async (key, value) => {
    if (!supabase) return { ok: false, reason: 'Supabase غير متصل' };
    if (loading || !loaded || loadError) return { ok: false, reason: 'يجب تحميل الإعدادات المحفوظة بنجاح قبل التعديل.' };
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key, value }, { onConflict: 'key' });
    if (error) return { ok: false, reason: error.message };
    setSettings(prev => mergeSettings(prev, { [key]: value }));
    return { ok: true };
  }, [loading, loaded, loadError]);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, loaded, loadError, tableMissing, saveSection, reload: load }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export const useSiteSettings = () => useContext(SiteSettingsContext);
