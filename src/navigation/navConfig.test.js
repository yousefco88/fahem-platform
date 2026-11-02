import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adminSectionsForRole,
  adminSectionPath,
  contentHubViewsForRole,
  contentHubViewPath,
  resolveAdminLocation,
  hubViewsForRole
} from './navConfig.js';

test('sidebar shows one content hub entry instead of three separate items', () => {
  const ids = adminSectionsForRole('admin').map(s => s.id);
  assert.ok(ids.includes('content'));
  for (const old of ['curriculum', 'lessonReview', 'recordings']) assert.ok(!ids.includes(old), old);
  assert.equal(adminSectionPath({ id: 'content' }), '/admin');
});

test('hub views keep lifecycle order and hide recordings from content editors', () => {
  assert.deepEqual(contentHubViewsForRole('admin').map(v => v.id), ['curriculum', 'lessonReview', 'recordings']);
  assert.deepEqual(contentHubViewsForRole('content_editor').map(v => v.id), ['curriculum', 'lessonReview']);
  assert.deepEqual(contentHubViewsForRole('parent'), []);
});

test('legacy links open the matching hub view', () => {
  assert.deepEqual(resolveAdminLocation('admin', '/admin', null), { section: 'content', view: 'curriculum' });
  assert.deepEqual(resolveAdminLocation('admin', '/admin', 'lessonReview'), { section: 'content', view: 'lessonReview' });
  assert.deepEqual(resolveAdminLocation('admin', '/admin', 'recordings'), { section: 'content', view: 'recordings' });
  assert.deepEqual(resolveAdminLocation('admin', '/admin', 'curriculum'), { section: 'content', view: 'curriculum' });
  assert.deepEqual(resolveAdminLocation('admin', '/admin', 'content'), { section: 'content', view: 'curriculum' });
  assert.deepEqual(resolveAdminLocation('admin', '/admin/lesson/abc', 'recordings'), { section: 'content', view: 'curriculum' });
  assert.equal(contentHubViewPath({ id: 'recordings' }), '/admin?tab=recordings');
  assert.equal(contentHubViewPath({ id: 'curriculum' }), '/admin');
});

test('content editor cannot land on recordings via URL', () => {
  assert.deepEqual(resolveAdminLocation('content_editor', '/admin', 'recordings'), { section: 'content', view: 'curriculum' });
  });

test('other admin sections are unaffected', () => {
  assert.deepEqual(resolveAdminLocation('admin', '/admin', 'settings'), { section: 'settings', view: null });
  assert.deepEqual(resolveAdminLocation('admin', '/admin', 'rbac'), { section: 'rbac', view: null });
  assert.deepEqual(resolveAdminLocation('admin', '/admin', 'unknown'), { section: 'content', view: 'curriculum' });
});

test('students & families hub merges bookings, families and schedule in order', () => {
  const ids = adminSectionsForRole('admin').map(s => s.id);
  assert.ok(ids.includes('people'));
  for (const old of ['bookings', 'families', 'schedule']) assert.ok(!ids.includes(old), old);
  assert.deepEqual(hubViewsForRole('people', 'admin').map(v => v.id), ['bookings', 'families', 'schedule']);
  assert.equal(adminSectionPath({ id: 'people' }), '/admin?tab=people');
});

test('legacy people links still open the right step', () => {
  assert.deepEqual(resolveAdminLocation('admin', '/admin', 'bookings'), { section: 'people', view: 'bookings' });
  assert.deepEqual(resolveAdminLocation('admin', '/admin', 'families'), { section: 'people', view: 'families' });
  assert.deepEqual(resolveAdminLocation('admin', '/admin', 'schedule'), { section: 'people', view: 'schedule' });
  assert.deepEqual(resolveAdminLocation('admin', '/admin', 'people'), { section: 'people', view: 'bookings' });
});

test('content editor never reaches students & families', () => {
  assert.ok(!adminSectionsForRole('content_editor').some(s => s.id === 'people'));
  assert.deepEqual(hubViewsForRole('people', 'content_editor'), []);
  for (const tab of ['people', 'bookings', 'families', 'schedule']) {
    assert.deepEqual(resolveAdminLocation('content_editor', '/admin', tab), { section: 'content', view: 'curriculum' }, tab);
  }
});

test('teachers & subjects page lives inside the curriculum step', () => {
  assert.deepEqual(resolveAdminLocation('admin', '/admin/teachers', null), { section: 'content', view: 'curriculum' });
  assert.deepEqual(resolveAdminLocation('admin', '/admin/teachers/', 'families'), { section: 'content', view: 'curriculum' });
  assert.deepEqual(resolveAdminLocation('content_editor', '/admin/teachers', null), { section: 'content', view: 'curriculum' });
});
