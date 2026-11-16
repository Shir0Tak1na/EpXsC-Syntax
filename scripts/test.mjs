import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const nodeRequire = createRequire(import.meta.url);
const blockCore = nodeRequire('../src/core/markdown-blocks.js');
const parserCore = nodeRequire('../src/data/parsers.js');

const source = fs.readFileSync('src/legacy/plugin.js', 'utf8');
const obsidianStub = {
  Plugin: class {}, TFile: class {}, TFolder: class {}, MarkdownView: class {},
  Notice: class {}, Modal: class {}
};
const sandbox = {
  require: (name) => {
    if (name === 'obsidian') return obsidianStub;
    if (String(name).includes('markdown-blocks')) return blockCore;
    if (String(name).includes('data/parsers')) return parserCore;
    return {};
  },
  module: { exports: {} },
  exports: {},
  console,
  window: { setTimeout, clearTimeout, setInterval, clearInterval },
  document: { hidden: false },
  setTimeout, clearTimeout, setInterval, clearInterval
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'main.js' });

const { collectSpells, lintText, builtinLists, makeGrammar, tokenizeText } = sandbox;
const { parseEntries, parseRoots, parseFilterKeys } = parserCore;
const { extractEpXsCBlocks } = blockCore;

// 1) 代码围栏别名 + CRLF + 前导空格
const blocks = extractEpXsCBlocks('x\n```epxsc\r\nA()\r\n```\r\n\n```EPXSC\nB()\n```\n');
assert.equal(blocks.length, 2, 'should find both alias blocks');
assert.equal(blocks[0].line, 2, 'fence line should be 2');
assert.equal(blocks[0].source.trim(), 'A()');

// 2) 术式声明记录文件/范围
const spells = new Map();
collectSpells('priv PrivA(locus: zone) {\n\tluss 1 MU;\n}\n', spells, 'a.md');
const rec = spells.get('PrivA');
assert.ok(rec, 'spell should be collected');
assert.equal(rec.file, 'a.md');
assert.equal(rec.visibility, 'priv');
assert.equal(rec.line, 1);
assert.equal(rec.endLine, 3);

// 3) 同一文件、同一范围：不报越权
const ctxA = { info: new Map(), units: new Set(), keys: new Set(), spells, path: 'a.md' };
const issuesA = lintText('PrivA();', ctxA);
assert.ok(!issuesA.some(x => String(x.message).includes('priv')), 'same-file call must not warn');

// 4) 不同文件、相同行号：必须报越权
const ctxB = { info: new Map(), units: new Set(), keys: new Set(), spells, path: 'b.md' };
const issuesB = lintText('PrivA();', ctxB);
assert.ok(issuesB.some(x => String(x.message).includes('私') || String(x.message).includes('priv')), 'cross-file call must warn');

// 5) Tokenizer golden：关键词 / 单位
const grammar = makeGrammar(builtinLists([]), []);
const html = tokenizeText('1 MU', grammar);
assert.ok(html.includes('token number'), '1 should tokenize as number');
assert.ok(html.includes('token unit'), 'MU should tokenize as unit');

// 6) Linter 括号错误
const bracketIssues = lintText('Foo() {', { info: new Map(), units: new Set(), keys: new Set(), spells: new Map() });
assert.ok(bracketIssues.some(x => x.level === 'error'), 'unclosed brace must be an error');

// 7) 数据 parser 冒烟
const entries = parseEntries('## 介词\n| de | 在……之内 | dex |\n');
assert.equal(entries.get('de').meaning, '在……之内');
const roots = parseRoots('| agr | 田地 | agr | 物 | 物 |\n');
assert.equal(roots.get('agr').kind, '物');
const keys = parseFilterKeys('## 筛选键\n| genus | 类别 |\n');
assert.ok(keys.has('genus'));

console.log('OK: block aliases, line mapping, spell file/scope, tokenizer, bracket, parsers');
