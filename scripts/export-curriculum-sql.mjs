import { CURRICULUM_DATA } from '../src/data/curriculumData.js';

const quote = (value) => `'${String(value ?? '').replaceAll("'", "''")}'`;
const lessons = Object.values(CURRICULUM_DATA)
  .filter((subject) => subject && Array.isArray(subject.lessons))
  .flatMap((subject) => subject.lessons.map((lesson) => ({
    id: lesson.id,
    subject_key: subject.id,
    title: lesson.title,
    grade: subject.grade || 'الصف الأول الابتدائي (المنهج المصري)',
    description: lesson.objective || '',
    published: false,
  })));

const values = lessons.map((lesson) =>
  `(${quote(lesson.id)}, ${quote(lesson.subject_key)}, ${quote(lesson.title)}, ${quote(lesson.grade)}, ${quote(lesson.description)}, ${lesson.published})`,
).join(',\n');

console.log(`-- Fahem curriculum seed: ${lessons.length} unpublished lesson drafts\n`);
console.log(`insert into public.curriculum_lessons (id, subject_key, title, grade, description, published) values\n${values}\non conflict (id) do update set subject_key = excluded.subject_key, title = excluded.title, grade = excluded.grade, description = excluded.description;`);
