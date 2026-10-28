export function buildGradeManagementRows(grades = [], subjectCounts = null) {
  return grades.map(grade => ({
    ...grade,
    subjectCount: subjectCounts === null ? null : (subjectCounts[grade.id] ?? 0),
  }));
}

export function filterGradeManagementRows(rows, { query = '', stage = 'all', publication = 'all' } = {}) {
  const normalizedQuery = query.trim().toLocaleLowerCase('ar');

  return rows.filter(grade => {
    const matchesQuery = !normalizedQuery
      || grade.title.toLocaleLowerCase('ar').includes(normalizedQuery)
      || grade.id.toLocaleLowerCase('ar').includes(normalizedQuery);
    const matchesStage = stage === 'all' || grade.stage === stage;
    const matchesPublication = publication === 'all'
      || (publication === 'published' && grade.published)
      || (publication === 'draft' && !grade.published);

    return matchesQuery && matchesStage && matchesPublication;
  });
}

export function summarizeGradeManagement(rows) {
  return {
    gradeCount: rows.length,
    stageCount: new Set(rows.map(grade => grade.stage).filter(Boolean)).size,
    publishedCount: rows.filter(grade => grade.published).length,
    subjectCount: rows.every(grade => grade.subjectCount !== null)
      ? rows.reduce((total, grade) => total + grade.subjectCount, 0)
      : null,
  };
}
