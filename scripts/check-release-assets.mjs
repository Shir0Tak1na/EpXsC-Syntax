import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repo, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
const BUILD = /const BUILD = ['"]([^'"]+)['"]/.exec(fs.readFileSync(path.join(repo, 'src', 'adapter', 'plugin.js'), 'utf8'));

assert.equal(manifest.version, pkg.version, 'manifest/package version mismatch');
assert.ok(BUILD && BUILD[1] === manifest.version, 'BUILD/manifest version mismatch');
for (const name of ['main.js', 'manifest.json', 'styles.css']) {
  assert.ok(fs.existsSync(path.join(repo, name)), name + ' missing');
}
const main = fs.readFileSync(path.join(repo, 'main.js'), 'utf8');
assert.ok(main.includes(manifest.version), 'main.js does not contain manifest version');
const css = fs.readFileSync(path.join(repo, 'styles.css'), 'utf8');
assert.ok(css.includes('pre.epx-pre'), 'styles.css missing pre.epx-pre');
assert.ok(css.includes('.epx-tip'), 'styles.css missing tooltip styles');
console.log('OK: release assets complete (main.js / manifest.json / styles.css, version ' + manifest.version + ')');
