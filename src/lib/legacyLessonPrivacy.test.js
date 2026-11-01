import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CURRICULUM_DATA } from '../data/curriculumData.js';
import { sanitizeLegacyLesson, sanitizeCurriculum } from './legacyLessonPrivacy.js';

const lessons = Object.values(CURRICULUM_DATA).flatMap(s => s?.lessons || []);
const leak = value => value && typeof value === 'object' && (
  Object.hasOwn(value, 'answer') || Object.hasOwn(value, 'correctOrder') ||
  Object.hasOwn(value, 'correct') || Object.hasOwn(value, 'targetWord') || Object.values(value).some(leak)
);

test('client curriculum has no answer keys in any lesson', () => {
  assert.ok(lessons.length > 0);
  assert.equal(lessons.filter(leak).length, 0);
});

test('player never grades legacy options or builder against client keys', () => {
  const player = readFileSync(new URL('../components/Modals.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(player, /handleEvalQuiz\(!!opt\.correct\)/);
  assert.doesNotMatch(player, /interactiveBuilder\?\.correctOrder/);
  assert.match(player, /submit_legacy_lesson_answer/);
  assert.match(player, /activeLesson\.quizType === 'truefalse' \? i === 0 : i/);
  assert.doesNotMatch(player, /activeLesson\.interactiveBuilder\.targetWord/);
});

test('lesson editor cannot put answer keys back into readable content', () => {
  const editor = readFileSync(new URL('../components/admin/curriculum/LessonEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const content = sanitizeLegacyLesson\(/);
  assert.match(editor, /p_answer: legacyQ\.answer,/);
  assert.match(editor, /editor_save_legacy_lesson_answers/);
  assert.match(editor, /p_builder_target_word: form\.wordBuilder\?\.targetWord/);
});

test('local snapshot is cleaned before lesson state is exposed', () => {
  const context = readFileSync(new URL('../context/AppContext.jsx', import.meta.url), 'utf8');
  assert.match(context, /sanitizeLegacyLesson/);
  assert.doesNotMatch(context, /correct: !!o\.correct/);
  assert.match(context, /content\.quizType === 'truefalse'\s*\? \[/);
});

test('recursive snapshot scrub retains prompts and removes nested keys', () => {
  const source = { math: { lessons: [{ id: 'x', question: 'Q', options: [{ text: 'A', correct: true }],
    interactiveBuilder: { syllables: ['A'], correctOrder: ['A'], targetWord: 'A' }, nested: { answer: 0 } }] } };
  const result = sanitizeCurriculum(source);
  assert.deepEqual(result.math.lessons[0], { id: 'x', question: 'Q', options: [{ text: 'A' }],
    interactiveBuilder: { syllables: ['A'] }, nested: {} });
  assert.equal(source.math.lessons[0].options[0].correct, true);
  assert.deepEqual(sanitizeLegacyLesson([{ correctOrder: [1], text: 'keep' }]), [{ text: 'keep' }]);
});
