import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const componentUrl = new URL('./ParentDashboard.jsx', import.meta.url);
const cssUrl = new URL('../index.css', import.meta.url);
const [component, css] = await Promise.all([
  readFile(componentUrl, 'utf8'),
  readFile(cssUrl, 'utf8'),
]);

test('parent sidebar keeps child choices in a responsive grid', () => {
  assert.match(component, /className="parent-child-selector"/);
  assert.match(css, /\.parent-child-selector\s*\{[^}]*display:\s*grid/s);
  assert.match(css, /\.parent-child-selector\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
});

test('parent sidebar navigation is labelled and identifies the active destination', () => {
  assert.match(component, /aria-label="التنقل في لوحة ولي الأمر"/);
  assert.match(component, /aria-current="page"/);
});

test('parent dashboard no longer renders the demo lesson banner', () => {
  assert.doesNotMatch(component, /عرض درس تجريبي/);
  assert.doesNotMatch(component, /تغطية المنهج المصري المتكامل لأبنائنا بالخارج/);
});
