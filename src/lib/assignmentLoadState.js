export function resolveAssignmentLoad(results) {
  if (!Array.isArray(results) || results.length !== 3) {
    return { status: 'error', teachers: null, kids: null, links: null, error: new Error('Invalid assignment query result') };
  }

  const failed = results.find(result => result?.error);
  if (failed) {
    return { status: 'error', teachers: null, kids: null, links: null, error: failed.error };
  }

  const [teachers, kids, links] = results.map(result => Array.isArray(result?.data) ? result.data : []);
  const hasData = teachers.length > 0 || kids.length > 0 || links.length > 0;
  return { status: hasData ? 'data' : 'empty', teachers, kids, links, error: null };
}
