import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonStatusTags, lessonCurriculumPath, pendingRecordingLessonIds, REVIEW_STEP_PATH, RECORDINGS_STEP_PATH } from './curriculumStatusTags.js';

const keys = (tags) => tags.map(t => t.key);

test('submitted lesson links to the review step', () => {
  const tags = lessonStatusTags({ review_status: 'submitted' });
  assert.deepEqual(keys(tags), ['review']);
  assert.equal(tags[0].icon, '🟡');
  assert.equal(tags[0].to, REVIEW_STEP_PATH);
});

test('approved and rejected lessons get a passive tag', () => {
  assert.deepEqual(lessonStatusTags({ review_status: 'approved' }).map(t => [t.key, t.icon, t.to]), [['approved', '✅', null]]);
  assert.deepEqual(keys(lessonStatusTags({ review_status: 'rejected' })), ['rejected']);
});

test('drafts and unknown statuses get no review tag', () => {
  assert.deepEqual(lessonStatusTags({ review_status: 'draft' }), []);
  assert.deepEqual(lessonStatusTags({}), []);
  assert.deepEqual(lessonStatusTags(null), []);
});

test('pending recording adds a tag that links to the recordings step', () => {
  const tags = lessonStatusTags({ review_status: 'approved' }, { hasPendingRecording: true });
  assert.deepEqual(keys(tags), ['approved', 'recording']);
  assert.equal(tags[1].icon, '🎥');
  assert.equal(tags[1].to, RECORDINGS_STEP_PATH);
});

test('curriculum path opens the lesson subject list', () => {
  assert.equal(lessonCurriculumPath({ subject_key: 'arabic' }), '/admin/lessons?subject=arabic');
  assert.equal(lessonCurriculumPath({ subject_key: 'math 1' }), '/admin/lessons?subject=math%201');
  assert.equal(lessonCurriculumPath({}), '/admin/lessons');
});

test('pending recording ids are collected and deduped', () => {
  const ids = pendingRecordingLessonIds([{ lesson_id: 'a' }, { lesson_id: 'a' }, { lesson_id: 'b' }, { lesson_id: null }]);
  assert.deepEqual([...ids].sort(), ['a', 'b']);
  assert.equal(pendingRecordingLessonIds(null).size, 0);
});
