import test from 'node:test';
import assert from 'node:assert/strict';
import { getMySpaceQueryState } from './mySpaceQueryState.js';

test('يعرض التحميل قبل اكتمال الاستعلام', () => {
  assert.deepEqual(getMySpaceQueryState({ loading: true, data: null, error: '' }), { status: 'loading' });
});

test('يعرض الخطأ بدلاً من تحويل فشل الاستعلام إلى قائمة فارغة', () => {
  assert.deepEqual(getMySpaceQueryState({ loading: false, data: null, error: 'تعذر الاتصال' }), {
    status: 'error', message: 'تعذر الاتصال'
  });
});

test('يميز الفراغ الحقيقي عن فشل الاستعلام', () => {
  assert.deepEqual(getMySpaceQueryState({ loading: false, data: [], error: '' }), { status: 'empty' });
});

test('يعرض البيانات الفعلية بعد نجاح الاستعلام', () => {
  assert.deepEqual(getMySpaceQueryState({ loading: false, data: [{ id: 1 }], error: '' }), { status: 'data' });
});

test('يتعامل مع عدد صفوف مفقود كحالة غير معروفة لا كصفر', () => {
  assert.deepEqual(getMySpaceQueryState({ loading: false, data: { count: null }, error: '' }), {
    status: 'error', message: 'تعذر تأكيد عدد السجلات.'
  });
});
