import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync('main.js', 'utf8');
const obsidianStub = {
  Plugin: class {}, TFile: class {}, TFolder: class {}, MarkdownView: class {},
  Notice: class {}, Modal: class {}
};
const sandbox = {
  require: (name) => (name === 'obsidian' ? obsidianStub : {}),
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

const { extractEpXsCBlocks, collectSpells, lintText } = sandbox;

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

console.log('OK: block aliases, line mapping, spell file/scope tests passed');
