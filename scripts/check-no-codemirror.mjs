import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metaPath = path.join(repo, 'build-meta.json');
if (fs.existsSync(metaPath)) {
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const inputs = Object.keys(meta.inputs || {});
  const bundled = inputs.filter((p) => p.indexOf('@codemirror/') >= 0 || p.indexOf('@lezer/') >= 0);
  if (bundled.length) {
    console.error('ERROR: bundled CM6/Lezer inputs: ' + bundled.slice(0, 5).join(', '));
    process.exit(1);
  }
  console.log('OK: no bundled CodeMirror/Lezer inputs');
  process.exit(0);
}
const main = fs.readFileSync(path.join(repo, 'main.js'), 'utf8');
if (main.indexOf('@codemirror/') >= 0 || main.indexOf('@lezer/') >= 0) {
  console.error('ERROR: main.js contains CodeMirror/Lezer and build-meta.json is missing; run npm run build first.');
  process.exit(1);
}
console.log('OK: no bundled CodeMirror/Lezer runtime');
