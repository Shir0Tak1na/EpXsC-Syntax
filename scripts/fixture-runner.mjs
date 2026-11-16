import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = require(path.join(repo, 'src/core/index.js'));
const dir = path.join(repo, 'tests', 'fixtures', 'tokenizer');

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
assert.ok(files.length > 0, 'tokenizer fixtures missing');

function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return n;
}

function context(s, i) {
  return JSON.stringify(s.slice(Math.max(0, i - 80), i + 80));
}

let count = 0;
for (const file of files) {
  const p = path.join(dir, file);
  const fixture = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.equal(typeof fixture.name, 'string', file + ': name');
  assert.equal(typeof fixture.input, 'string', file + ': input');
  assert.equal(typeof fixture.expected, 'string', file + ': expected');
  assert.ok(fixture.lists === undefined || (fixture.lists && typeof fixture.lists === 'object'), file + ': lists');
  assert.ok(fixture.keys === undefined || Array.isArray(fixture.keys), file + ': keys');
  const lists = Object.assign({}, core.BASE_LISTS, fixture.lists || {});
  const grammar = core.buildGrammar(lists, fixture.keys || []);
  const actual = core.tokenize(fixture.input, grammar);
  if (actual !== fixture.expected) {
    const i = firstDiff(actual, fixture.expected);
    throw new Error(
      'tokenizer fixture failed: ' + file + '\n' +
      'first diff at ' + i + '\n' +
      'expected ' + context(fixture.expected, i) + '\n' +
      'actual   ' + context(actual, i)
    );
  }
  count += 1;
}

console.log('OK: tokenizer fixtures (' + count + ')');
