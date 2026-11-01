// Read-only release gate for answer-bearing lessons bundled into the client.
// Run: node scripts/audit-lesson-answer-exposure.mjs [--assert-clean]
// This does not inspect the hosted database or print lesson contents.
import { CURRICULUM_DATA } from '../src/data/curriculumData.js';

const lessons = Object.values(CURRICULUM_DATA)
  .filter(subject => Array.isArray(subject?.lessons))
  .flatMap(subject => subject.lessons);

const hasOwn = (value, key) => value != null && typeof value === 'object'
  && Object.hasOwn(value, key);
const counts = {
  lessons: lessons.length,
  legacyAnswer: lessons.filter(lesson => hasOwn(lesson, 'answer')).length,
  correctOption: lessons.filter(lesson => Array.isArray(lesson.options)
    && lesson.options.some(option => hasOwn(option, 'correct'))).length,
  builderCorrectOrder: lessons.filter(lesson => hasOwn(lesson.interactiveBuilder, 'correctOrder')
    || hasOwn(lesson.wordBuilder, 'correctOrder')).length,
  builderTargetWord: lessons.filter(lesson => hasOwn(lesson.interactiveBuilder, 'targetWord')
    || hasOwn(lesson.wordBuilder, 'targetWord')).length,
};
console.log(JSON.stringify(counts));

if (process.argv.includes('--assert-clean')
  && (counts.legacyAnswer || counts.correctOption || counts.builderCorrectOrder || counts.builderTargetWord)) {
  console.error('BLOCKED: client curriculum bundle contains answer-bearing fields.');
  process.exitCode = 1;
}
