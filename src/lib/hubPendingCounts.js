// عدّادات "بانتظار الإجراء" لخطوات مراكز الإدارة.
// تعريف كل عدّاد في navConfig (views[].pending)، وهنا الجلب فقط بـ count مع head:true (بلا صفوف).
// الصلاحيات يفرضها الخادم (RLS): ما لا يسمح به الدور يرجع خطأ أو صفراً ولا يُعرض.

export async function fetchPendingCount(client, spec) {
  if (!client || !spec) return null;
  let q = client.from(spec.table).select('id', { count: 'exact', head: true });
  q = spec.nullCounts
    ? q.or(`${spec.column}.is.null,${spec.column}.eq.${spec.equals}`)
    : q.eq(spec.column, spec.equals);
  const { count, error } = await q;
  return error || typeof count !== 'number' ? null : count;
}

// يرجع { viewId: count } للخطوات التي لها عدّاد فقط؛ الفشل لا يُظهر رقماً بدل إظهار صفر مضلل.
export async function fetchHubPendingCounts(client, views) {
  const withSpec = (views || []).filter(v => v.pending);
  const counts = await Promise.all(withSpec.map(v => fetchPendingCount(client, v.pending).catch(() => null)));
  return Object.fromEntries(withSpec.map((v, i) => [v.id, counts[i]]).filter(([, c]) => c !== null));
}
