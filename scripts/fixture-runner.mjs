import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import util from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = require(path.join(repo, 'src/core/index.js'));
const fixtureRoot = path.join(repo, 'tests', 'fixtures');

function readFixtures(name) {
  const dir = path.join(fixtureRoot, name);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  assert.ok(files.length > 0, name + ' fixtures missing');
  return files.map((file) => {
    const fixture = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    assert.equal(typeof fixture.name, 'string', name + '/' + file + ': name');
    return { file, fixture };
  });
}

function same(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function fail(category, file, actual, expected) {
  throw new Error(
    category + ' fixture failed: ' + file + '\n' +
    'expected:\n' + util.inspect(expected, { depth: 6, colors: false }) + '\n' +
    'actual:\n' + util.inspect(actual, { depth: 6, colors: false })
  );
}

function check(category, file, actual, expected) {
  if (!same(actual, expected)) fail(category, file, actual, expected);
}

function mapToArray(map) {
  return Array.from(map.entries()).sort((a, b) => String(a[0]) < String(b[0]) ? -1 : String(a[0]) > String(b[0]) ? 1 : 0);
}

// 1) tokenizer
{
  let count = 0;
  for (const { file, fixture } of readFixtures('tokenizer')) {
    assert.equal(typeof fixture.input, 'string', file + ': input');
    assert.equal(typeof fixture.expected, 'string', file + ': expected');
    const lists = Object.assign({}, core.BASE_LISTS, fixture.lists || {});
    const grammar = core.buildGrammar(lists, fixture.keys || []);
    check('tokenizer', file, core.tokenize(fixture.input, grammar), fixture.expected);
    count += 1;
  }
  console.log('OK: tokenizer fixtures (' + count + ')');
}

// 2) parser
{
  const fns = {
    dictionary: core.parseDictionary,
    roots: core.parseRoots,
    ranks: core.parseRanks,
    units: core.parseUnits,
    filterKeys: core.parseFilterKeys
  };
  let count = 0;
  for (const { file, fixture } of readFixtures('parser')) {
    assert.ok(fns[fixture.kind], file + ': unknown parser kind ' + fixture.kind);
    assert.equal(typeof fixture.input, 'string', file + ': input');
    check('parser', file, mapToArray(fns[fixture.kind](fixture.input)), fixture.expected);
    count += 1;
  }
  console.log('OK: parser fixtures (' + count + ')');
}

// 3) lint
{
  let count = 0;
  for (const { file, fixture } of readFixtures('lint')) {
    const c = fixture.context || {};
    const spells = new Map();
    for (const spell of c.spells || []) spells.set(spell.name, spell);
    const ctx = {
      path: c.path,
      units: new Set(c.units || []),
      keys: new Set(c.keys || []),
      spells
    };
    check('lint', file, core.lint(fixture.input, ctx), fixture.expected);
    count += 1;
  }
  console.log('OK: lint fixtures (' + count + ')');
}

// 4) markup
{
  let count = 0;
  for (const { file, fixture } of readFixtures('markup')) {
    assert.equal(typeof fixture.input, 'string', file + ': input');
    let actual;
    switch (fixture.kind) {
      case 'bracketKinds':
        actual = core.bracketKinds(fixture.input);
        break;
      case 'parseVarTypes':
        actual = mapToArray(core.parseVarTypes(fixture.input, new Map()));
        break;
      case 'markBracketDepth':
        actual = core.markBracketDepth(fixture.input, fixture.kinds || []);
        break;
      case 'markVarUse': {
        const vars = new Map((fixture.vars || []).map(([name, binding]) => [name, binding]));
        actual = core.markVarUse(fixture.input, vars);
        break;
      }
      case 'markDictKeys':
        actual = core.markDictKeys(fixture.input);
        break;
      case 'markSpellRefs':
        actual = core.markSpellRefs(fixture.input);
        break;
      default:
        throw new Error(file + ': unknown markup kind ' + fixture.kind);
    }
    check('markup', file, actual, fixture.expected);
    count += 1;
  }
  console.log('OK: markup fixtures (' + count + ')');
}
