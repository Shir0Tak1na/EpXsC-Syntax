import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const fail = (msg) => { console.error('FAIL: ' + msg); process.exitCode = 1; };

const manifest = JSON.parse(read('manifest.json'));
const versions = JSON.parse(read('versions.json'));
const main = read('main.js');
const styles = read('styles.css');
const snippet = read('snippets/EpXsC-Highlight.css');

if (!(manifest.version in versions)) fail('manifest version missing from versions.json');
if (!main.includes("BUILD = '" + manifest.version + "'") && !main.includes('BUILD = "' + manifest.version + '"')) fail('BUILD constant does not match manifest version');
try { new Function(main); } catch (e) { fail('main.js does not parse: ' + e.message); }

for (const [name, css] of [['styles.css', styles], ['snippets/EpXsC-Highlight.css', snippet]]) {
  let depth = 0;
  for (const ch of css) { if (ch === '{') depth++; else if (ch === '}') depth--; if (depth < 0) break; }
  if (depth !== 0) fail(name + ' has unbalanced braces');
}
if (styles !== snippet) fail('styles.css and snippets/EpXsC-Highlight.css differ');

for (const forbidden of ['app.plugins', 'dump-epx-dom', 'epxsc-render-', 'PLUGIN_APP']) {
  if (main.includes(forbidden)) fail('forbidden diagnostic/API string in main.js: ' + forbidden);
}
if (main.includes('pre:has(')) fail('main.js still contains pre:has() fallback selector');
if (main.includes('getFiles(')) fail('main.js still enumerates the whole vault with getFiles()');
for (const ev of ['create', 'delete', 'rename']) {
  const a = "vault.on('" + ev + "'";
  const b = 'vault.on("' + ev + '"';
  if (!main.includes(a) && !main.includes(b)) fail('data change event not registered: ' + ev);
}
if (!main.includes('_refreshGen')) fail('refresh generation guard missing');
if (!main.includes('extractEpXsCBlocks')) fail('shared EpXsC block extractor missing');

if (manifest.id !== 'epxsc-syntax') fail('unexpected plugin id');
if (!manifest.minAppVersion) fail('manifest.minAppVersion missing');
if (!manifest.description.endsWith('.') && !manifest.description.endsWith('!') && !manifest.description.endsWith('?')) fail('manifest description must end with ASCII punctuation');

if (!process.exitCode) console.log('OK: manifest ' + manifest.version + ', main.js parses, CSS balanced, selectors clean');
