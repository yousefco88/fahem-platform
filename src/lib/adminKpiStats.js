export async function loadAdminKpiStats(supabase) {
  if (!supabase) return { status: 'error', message: 'الخدمة غير متاحة حالياً.' };

  try {
    const results = await Promise.all([
      supabase.from('parent_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('children').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    ]);
    const failed = results.find(result => result.error);
    if (failed) return { status: 'error', message: failed.error.message || 'تعذر تحميل مؤشرات الإدارة.' };
    if (results.some(result => !Number.isInteger(result.count) || result.count < 0)) {
      return { status: 'error', message: 'تعذر تحميل مؤشرات الإدارة.' };
    }

    return {
      status: 'data',
      counts: {
        families: results[0].count,
        children: results[1].count,
        bookings: results[2].count,
        newBookings: results[3].count,
      },
    };
  } catch (error) {
    return { status: 'error', message: error?.message || 'تعذر تحميل مؤشرات الإدارة.' };
  }
}
