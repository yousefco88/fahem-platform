import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../../supabase/migrations/20261031000354_secure_lesson_questions_and_assessments.sql', import.meta.url), 'utf8');
const editor = readFileSync(new URL('../components/admin/curriculum/LessonEditor.jsx', import.meta.url), 'utf8');
const assessmentUi = readFileSync(new URL('../components/account/AssessmentSection.jsx', import.meta.url), 'utf8');
const modalUi = readFileSync(new URL('../components/Modals.jsx', import.meta.url), 'utf8');
const questionSecurityMigration = readFileSync(new URL('../../supabase/migrations/20261031000430_secure_lesson_question_attempts.sql', import.meta.url), 'utf8');

test('question table grants exclude answer and editor uses guarded RPCs', () => {
  assert.match(migration, /revoke select, insert, update, delete on public\.lesson_questions from anon, authenticated/i);
  assert.match(migration, /grant select \(id, lesson_id, quiz_type, question, choices, skill, difficulty, celebration, sort_order, is_published\)/i);
  assert.doesNotMatch(migration.match(/grant select \([^)]*\)\s*on public\.lesson_questions/i)?.[0] || '', /\banswer\b/i);
  assert.match(editor, /rpc\('editor_list_lesson_questions'/);
  assert.match(editor, /rpc\('editor_save_lesson_question'/);
  assert.match(editor, /rpc\('editor_delete_lesson_question'/);
  assert.doesNotMatch(editor, /from\('lesson_questions'\)/);
});

test('question deletion confirmation does not promise permanent erasure of historical attempts', () => {
  assert.match(editor, /يُخفى إذا كانت له محاولات سابقة/);
  assert.doesNotMatch(editor, /حذف السؤال نهائياً/);
});

test('assessment submissions are bound to an owned, expiring, single-use server session', () => {
  assert.match(migration, /insert into public\.assessment_sessions \(parent_id, child_id, subject_key, question_ids, expires_at\)/i);
  assert.match(migration, /s\.id = p_assessment_id and s\.parent_id = auth\.uid\(\)\s+and s\.child_id = p_child and s\.subject_key = p_subject/i);
  assert.match(migration, /v_session\.expires_at <= now\(\)/i);
  assert.match(migration, /v_session\.submitted_at is not null/i);
  assert.match(migration, /invalid question set/i);
  assert.match(migration, /revoke all on function public\.submit_assessment\(uuid, text, jsonb\) from public, anon, authenticated/i);
  assert.match(assessmentUi, /p_assessment_id: assessmentId/);
  assert.match(assessmentUi, /assessment_id\)/);
});

test('assessment subject cannot change while a start request is pending', () => {
  assert.match(assessmentUi, /<select value=\{subject\}[^\r\n]*disabled=\{busy\}/);
});

test('editor RPC validates question payloads server-side by quiz type', () => {
  const editorSaveFn = migration.match(/create or replace function public\.editor_save_lesson_question\([\s\S]*?\$\$;/i)?.[0] || '';
  assert.match(editorSaveFn, /jsonb_typeof\(v_choices\) <> 'array'/i);
  assert.match(editorSaveFn, /v_type = 'choice'[\s\S]*?jsonb_typeof\(v_answer\) <> 'number'[\s\S]*?jsonb_array_length\(v_choices\)/i);
  assert.match(editorSaveFn, /v_type = 'truefalse'[\s\S]*?jsonb_typeof\(v_answer\) <> 'boolean'/i);
  assert.match(editorSaveFn, /v_type = 'arrange'[\s\S]*?jsonb_typeof\(v_answer\) <> 'array'[\s\S]*?jsonb_array_length\(v_choices\)/i);
});

test('assessment start and grading exclude archived lessons', () => {
  const startFn = migration.match(/create or replace function public\.start_assessment[\s\S]*?\$\$;/i)?.[0] || '';
  const submitFn = migration.match(/create or replace function public\.submit_assessment\([\s\S]*?\$\$;/i)?.[0] || '';
  assert.match(startFn, /not coalesce\(l\.archived, false\)/i);
  assert.match(submitFn, /not coalesce\(l\.archived, false\)/i);
});

test('assessment results cannot be inserted directly by authenticated clients', () => {
  assert.match(migration, /revoke insert on public\.exam_attempts from anon, authenticated/i);
  assert.match(migration, /drop policy if exists "parents insert own exam attempts" on public\.exam_attempts/i);
});

test('lesson-question grading is authenticated, child-bound, single-use, and records attempts server-side', () => {
  assert.match(questionSecurityMigration, /create or replace function public\.submit_lesson_question_answer\(\s*p_question_id uuid,\s*p_child_id uuid,\s*p_selected jsonb\s*\)/i);
  assert.match(questionSecurityMigration, /c\.id = p_child_id and c\.parent_id = auth\.uid\(\)/i);
  assert.match(questionSecurityMigration, /pg_advisory_xact_lock/i);
  assert.match(questionSecurityMigration, /already_answered/i);
  assert.match(questionSecurityMigration, /insert into public\.lesson_question_attempts/i);
  assert.match(questionSecurityMigration, /revoke all on function public\.check_lesson_question_answer\(uuid, jsonb\)\s+from public, anon, authenticated/i);
  assert.match(questionSecurityMigration, /revoke insert on public\.lesson_question_attempts from anon, authenticated/i);
  assert.match(modalUi, /rpc\('submit_lesson_question_answer'/);
  assert.doesNotMatch(modalUi, /from\('lesson_question_attempts'\)\.insert/);
});
