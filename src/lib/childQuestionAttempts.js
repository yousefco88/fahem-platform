// Query each child's attempts before paging; never cap the whole family's history.
const PAGE_SIZE = 1000;

async function fetchPages(client, applyScope) {
  const rows = [];
  let cursor = null;
  for (;;) {
    let query = applyScope(client.from('lesson_question_attempts')
      .select('id,child_id,child_name,is_correct,skill,created_at'))
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    if (cursor) {
      query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
    }
    const { data, error } = await query.limit(PAGE_SIZE);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Missing attempt page');
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
    cursor = data[data.length - 1];
  }
}

export async function fetchChildQuestionAttempts(client, child, siblingsSameName = 1, parentId = child.parent_id) {
  // Retain the positional argument for callers; name uniqueness cannot identify a child.
  void siblingsSameName;
  if (!parentId) throw new Error('Missing family scope');
  // A null child_id can mean a deleted child, not merely a pre-migration row.
  return fetchPages(client, query => query.eq('parent_id', parentId).eq('child_id', child.id));
}
