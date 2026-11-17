import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const main = fs.readFileSync(path.join(repo, 'main.js'), 'utf8');
if (main.indexOf('@codemirror/') >= 0 || main.indexOf('@lezer/') >= 0) {
  console.error('ERROR: main.js contains a bundled CodeMirror/Lezer runtime; keep @codemirror/* and @lezer/* external.');
  process.exit(1);
}
console.log('OK: no bundled CodeMirror/Lezer runtime');
