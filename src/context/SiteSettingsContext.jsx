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

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from('site_settings').select('key, value');
    if (error) {
      // الجدول غير موجود بعد (migration لم تُطبق) أو خطأ شبكة — نبقى على الافتراضي
      if (/relation .* does not exist|site_settings/i.test(error.message || '')) setTableMissing(true);
      setLoading(false);
      return;
    }
    const overrides = {};
    (data || []).forEach(row => { overrides[row.key] = row.value; });
    setSettings(mergeSettings(SITE_DEFAULTS, overrides));
    setTableMissing(false);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // حفظ قسم كامل (banner/hero/footer/pricing/seo/header) — upsert
  const saveSection = useCallback(async (key, value) => {
    if (!supabase) return { ok: false, reason: 'Supabase غير متصل' };
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key, value }, { onConflict: 'key' });
    if (error) return { ok: false, reason: error.message };
    setSettings(prev => mergeSettings(prev, { [key]: value }));
    return { ok: true };
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, tableMissing, saveSection, reload: load }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export const useSiteSettings = () => useContext(SiteSettingsContext);
