import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(repo, 'bin', 'epxsc.mjs');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'epxsc-cli-'));
const good = path.join(dir, 'good.md');
const bad = path.join(dir, 'bad.md');
fs.writeFileSync(good, ['# sample','','```EpXsC','Foo(locus: a) {','\tluss 1 MU;','}','```',''].join('\n'));
fs.writeFileSync(bad, ['```EpXsC','Foo() {','\tbar(1;','}','```',''].join('\n'));

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: repo, encoding: 'utf8' });
}

try {
  const help = run(['--help']);
  assert.equal(help.status, 0);
  assert.ok(help.stdout.includes('EpXsC CLI'));

  const tok = run(['tokenize', good, '--json']);
  assert.equal(tok.status, 0, tok.stderr);
  const tokenized = JSON.parse(tok.stdout);
  assert.equal(tokenized.blocks.length, 1);
  assert.ok(tokenized.blocks[0].html.includes('token declaration'));

  const lint = run(['lint', good, '--json']);
  assert.equal(lint.status, 0, lint.stderr);
  const result = JSON.parse(lint.stdout);
  assert.equal(result.issues.filter((i) => i.level === 'error').length, 0);

  const badLint = run(['lint', bad]);
  assert.equal(badLint.status, 1, 'bracket error must exit 1');
  assert.ok(badLint.stdout.includes('error'));
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log('OK: CLI help / tokenize / lint');
