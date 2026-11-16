import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(repo, 'data', 'builtin-lexicon.json');

function sort(v) {
  if (Array.isArray(v)) return v.map(sort);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = sort(v[k]);
    return out;
  }
  return v;
}

const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const canonical = JSON.stringify(sort(raw)) + '\n';
if (process.argv.includes('--check')) {
  const current = fs.readFileSync(file, 'utf8');
  if (current !== canonical) {
    console.error('lexicon snapshot is not canonical; run: node scripts/generate-lexicon.mjs');
    process.exitCode = 1;
  } else {
    console.log('OK: lexicon snapshot canonical');
  }
} else {
  fs.writeFileSync(file, canonical, 'utf8');
  console.log('wrote data/builtin-lexicon.json');
}
