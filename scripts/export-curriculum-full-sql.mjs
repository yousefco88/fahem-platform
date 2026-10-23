// Full curriculum export: subjects + lessons (complete content jsonb + sort order).
// Usage: node scripts/export-curriculum-full-sql.mjs > curriculum_seed.sql
import { CURRICULUM_DATA } from '../src/data/curriculumData.js';

const q = (v) => `'${String(v ?? '').replaceAll("'", "''")}'`;
const qj = (obj) => `'${JSON.stringify(obj).replaceAll("'", "''")}'::jsonb`;

const subjects = [];
const lessons = [];
let subjectOrder = 0;

for (const [key, subject] of Object.entries(CURRICULUM_DATA)) {
  if (!subject || !Array.isArray(subject.lessons)) continue; // skips expatExamCalendar etc.
  subjectOrder += 1;
  subjects.push({
    key,
    title: subject.title || key,
    icon: subject.icon || '',
    color: subject.color || '',
    badge: subject.badge || '',
    grade: subject.grade || '',
    sort_order: subjectOrder * 10
  });
  subject.lessons.forEach((lesson, i) => {
    const { id, title, objective, ...rest } = lesson;
    lessons.push({
      id,
      subject_key: key,
      title: title || id,
      grade: subject.grade || 'الصف الأول الابتدائي (المنهج المصري)',
      description: objective || '',
      sort_order: (i + 1) * 10,
      published: true,
      content: lesson // full lesson object preserved for the frontend
    });
  });
}

const subjectValues = subjects.map(s =>
  `(${q(s.key)}, ${q(s.title)}, ${q(s.icon)}, ${q(s.color)}, ${q(s.badge)}, ${q(s.grade)}, ${s.sort_order}, true)`
).join(',\n');

const lessonValues = lessons.map(l =>
  `(${q(l.id)}, ${q(l.subject_key)}, ${q(l.title)}, ${q(l.grade)}, ${q(l.description)}, ${l.sort_order}, ${l.published}, ${qj(l.content)})`
).join(',\n');

console.log(`-- Fahem curriculum full seed: ${subjects.length} subjects, ${lessons.length} lessons\n`);
console.log(`insert into public.curriculum_subjects (key, title, icon, color, badge, grade, sort_order, published) values\n${subjectValues}\non conflict (key) do update set title = excluded.title, icon = excluded.icon, color = excluded.color, badge = excluded.badge, grade = excluded.grade, sort_order = excluded.sort_order, published = excluded.published, updated_at = now();\n`);
console.log(`insert into public.curriculum_lessons (id, subject_key, title, grade, description, sort_order, published, content) values\n${lessonValues}\non conflict (id) do update set subject_key = excluded.subject_key, title = excluded.title, grade = excluded.grade, description = excluded.description, sort_order = excluded.sort_order, published = excluded.published, content = excluded.content, updated_at = now();`);
