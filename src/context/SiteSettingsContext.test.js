import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';

// Exercise the real provider with deterministic hooks and a controllable database.
function harness() {
  const slots = [];
  let cursor = 0;
  let effect;
  let result = { data: null, error: { message: 'network unavailable' } };
  let writes = 0;
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    createElement: (_, props) => props.value,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useCallback: fn => fn,
    useContext: () => {},
    useEffect: fn => { effect = fn; },
  };
  const db = { from: () => ({
    select: async () => { if (result instanceof Error) throw result; return result; },
    upsert: async () => { writes++; return { error: null }; },
  }) };
  const module = { exports: {} };
  const code = transformSync(readFileSync(new URL('./SiteSettingsContext.jsx', import.meta.url), 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  runInNewContext(code, { module, exports: module.exports, require(name) {
    if (name === 'react') return react;
    if (name === '../lib/supabase') return { supabase: db };
    if (name === '../data/siteDefaults') return { SITE_DEFAULTS: { hero: { title: 'default' } }, mergeSettings: (a, b) => ({ ...a, ...b }) };
    throw new Error(`Unexpected module: ${name}`);
  } });
  return {
    render() { cursor = 0; return module.exports.SiteSettingsProvider({ children: null }); },
    effect: () => effect(),
    result(value) { result = value; },
    writes: () => writes,
  };
}

test('failed settings load blocks saving fallback content; successful retry enables saving', async () => {
  const h = harness();
  let value = h.render();
  assert.equal((await value.saveSection('hero', { title: 'default' })).ok, false);
  await value.reload();
  value = h.render();
  assert.equal(value.loading, false);
  assert.ok(value.loadError);
  assert.equal((await value.saveSection('hero', { title: 'default' })).ok, false);
  assert.equal(h.writes(), 0);
  h.result({ data: [{ key: 'hero', value: { title: 'stored content' } }], error: null });
  await value.reload();
  value = h.render();
  assert.equal(value.settings.hero.title, 'stored content');
  assert.equal(value.loadError, null);
  assert.equal((await value.saveSection('hero', { title: 'approved edit' })).ok, true);
  assert.equal(h.writes(), 1);
});

test('a rejected fetch exits loading and cannot enable settings saves', async () => {
  const h = harness();
  h.result(new Error('connection interrupted'));
  await h.render().reload();
  const value = h.render();
  assert.equal(value.loading, false);
  assert.ok(value.loadError);
  assert.equal((await value.saveSection('hero', {})).ok, false);
  assert.equal(h.writes(), 0);
});
