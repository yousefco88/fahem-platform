import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for managing child streaks and XP
 * @param {string} childId - The child's UUID
 * @returns {Object} streak data and update function
 */
export function useStreak(childId) {
  const [streak, setStreak] = useState({
    currentStreak: 0,
    bestStreak: 0,
    xpTotal: 0,
    level: 1,
    lastActivityDate: null,
    isActiveToday: false,
    loading: true,
    error: null
  });

  // Fetch current streak data
  const fetchStreak = useCallback(async () => {
    if (!childId) return;

    try {
      const { data, error } = await supabase
        .from('child_streaks')
        .select('*')
        .eq('child_id', childId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw error;
      }

      const today = new Date().toISOString().split('T')[0];
      const isActiveToday = data?.last_activity_date === today;

      setStreak({
        currentStreak: data?.current_streak || 0,
        bestStreak: data?.best_streak || 0,
        xpTotal: data?.xp_total || 0,
        level: data?.level || 1,
        lastActivityDate: data?.last_activity_date,
        isActiveToday,
        loading: false,
        error: null
      });
    } catch (err) {
      console.error('Error fetching streak:', err);
      setStreak(prev => ({ ...prev, loading: false, error: err.message }));
    }
  }, [childId]);

  // Update streak when completing a lesson
  const recordActivity = useCallback(async (xpEarned = 10) => {
    if (!childId) return null;

    try {
      const { data, error } = await supabase
        .rpc('update_child_streak', { 
          p_child_id: childId, 
          p_xp_earned: xpEarned 
        });

      if (error) throw error;

      // Update local state
      setStreak(prev => ({
        ...prev,
        currentStreak: data.streak,
        bestStreak: data.best_streak,
        xpTotal: data.xp_total,
        level: data.level,
        isActiveToday: true,
        lastActivityDate: new Date().toISOString().split('T')[0]
      }));

      return data;
    } catch (err) {
      console.error('Error recording activity:', err);
      return null;
    }
  }, [childId]);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  return {
    ...streak,
    recordActivity,
    refresh: fetchStreak
  };
}

/**
 * Calculate XP needed for next level
 * @param {number} level - Current level
 * @returns {number} XP needed
 */
export function xpForLevel(level) {
  return level * 100;
}

/**
 * Get streak status message in Arabic
 * @param {number} streak - Current streak
 * @returns {string} Status message
 */
export function getStreakMessage(streak) {
  if (streak === 0) return 'ابدأ سلسلتك اليوم! 🚀';
  if (streak === 1) return 'يوم واحد! استمر 💪';
  if (streak < 7) return `${streak} أيام متتالية! 🔥`;
  if (streak < 30) return `${streak} يوم! أنت بطل 🏆`;
  if (streak < 100) return `${streak} يوم! مذهل 🌟`;
  return `${streak} يوم! أسطورة! 👑`;
}

/**
 * Get level title in Arabic
 * @param {number} level - Current level
 * @returns {string} Level title
 */
export function getLevelTitle(level) {
  const titles = [
    'مبتدئ 🌱',      // 1
    'متعلم 📚',      // 2
    'مجتهد ⭐',      // 3
    'نجم 🌟',        // 4
    'بطل 🏆',        // 5
    'خبير 🎓',       // 6
    'عبقري 🧠',      // 7
    'أسطورة 👑',     // 8
    'فاهم ماستر 🦊', // 9
    'حكيم 🔮'        // 10+
  ];
  return titles[Math.min(level - 1, titles.length - 1)];
}

export default useStreak;
