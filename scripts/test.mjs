import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const nodeRequire = createRequire(import.meta.url);
const blockCore = nodeRequire('../src/core/markdown-blocks.js');
const parserCore = nodeRequire('../src/data/parsers.js');
const spellsCore = nodeRequire('../src/core/spells.js');
const lintCore = nodeRequire('../src/core/lint.js');
const grammarCore = nodeRequire('../src/core/grammar.js');
const tokenizerCore = nodeRequire('../src/core/tokenizer.js');
const markupCore = nodeRequire('../src/core/markup.js');
const coreIndex = nodeRequire('../src/core/index.js');

const source = fs.readFileSync('src/adapter/plugin.js', 'utf8');
const obsidianStub = {
  Plugin: class {}, TFile: class {}, TFolder: class {}, MarkdownView: class {},
  Notice: class {}, Modal: class {}
};
const sandbox = {
  require: (name) => {
    if (name === 'obsidian') return obsidianStub;
    if (String(name).includes('markdown-blocks')) return blockCore;
    if (String(name).includes('data/parsers')) return parserCore;
    if (String(name).includes('core/spells')) return spellsCore;
    if (String(name).includes('core/lint')) return lintCore;
    if (String(name).includes('core/grammar')) return grammarCore;
    if (String(name).includes('core/tokenizer')) return tokenizerCore;
    if (String(name).includes('core/markup')) return markupCore;
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

const { builtinLists, tipForElement } = sandbox;
const { makeGrammar } = grammarCore;
const { tokenizeText } = tokenizerCore;
const { parseVarTypes, bracketKinds, markBracketDepth } = markupCore;
const { collectSpells } = spellsCore;
const { lintText } = lintCore;
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

// 8) 悬停路径冒烟：CLASS_ORDER / pickClass 必须存在
const fakeToken = {
  classList: { contains: (c) => c === 'word' },
  textContent: 'test',
  getAttribute: () => null,
  closest: () => null
};
const hoverTip = tipForElement(fakeToken, new Map(), new Map());
assert.ok(hoverTip && hoverTip.label, 'hover must return a tip for a known token class');

// 9) markup 纯函数
const vars = parseVarTypes('Foo(locus: a) {\n}', new Map());
assert.equal(vars.get('a').type, 'locus');
const kinds = bracketKinds('Foo(a)');
assert.equal(kinds[0], '参数表');
assert.ok(markBracketDepth('<span class="token paren">(</span>', []).includes('epx-d1'));

// 10) public core aliases
assert.equal(typeof coreIndex.extractBlocks, 'function');
assert.equal(typeof coreIndex.parseDictionary, 'function');
assert.equal(typeof coreIndex.buildGrammar, 'function');
assert.equal(typeof coreIndex.tokenize, 'function');
assert.equal(typeof coreIndex.lint, 'function');

console.log('OK: block aliases, line mapping, spell file/scope, tokenizer, bracket, parsers, hover, markup, core-api');
