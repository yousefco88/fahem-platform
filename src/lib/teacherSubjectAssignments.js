export function buildTeacherAssignmentRows({ teachers = [], subjects = [], assigned = new Set() }) {
  return teachers.map(teacher => {
    const teacherSubjects = subjects.map(subject => ({
      ...subject,
      assigned: assigned.has(`${teacher.id}|${subject.key}`),
    }));

    return {
      id: teacher.id,
      name: teacher.full_name?.trim() || `معلم ${teacher.id.slice(0, 8)}`,
      subjects: teacherSubjects,
      assignedCount: teacherSubjects.filter(subject => subject.assigned).length,
    };
  });
}

export function filterTeacherAssignmentRows(rows, { query = '', subjectKey = '', status = 'all' } = {}) {
  const normalizedQuery = query.trim().toLocaleLowerCase('ar');

  return rows.filter(row => {
    const matchesName = !normalizedQuery || row.name.toLocaleLowerCase('ar').includes(normalizedQuery);
    const selectedSubject = subjectKey ? row.subjects.find(subject => subject.key === subjectKey) : null;
    const matchesSubject = !subjectKey || selectedSubject?.assigned;
    const matchesStatus = status === 'all'
      || (status === 'assigned' && row.assignedCount > 0)
      || (status === 'unassigned' && row.assignedCount === 0);

    return matchesName && matchesSubject && matchesStatus;
  });
}
