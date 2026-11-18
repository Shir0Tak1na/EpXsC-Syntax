import { build } from 'esbuild';
import fs from 'node:fs';

const result = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2018',
  external: ['obsidian', '@codemirror/view', '@codemirror/state', '@lezer/common', '@lezer/lr'],
  outfile: 'main.js',
  legalComments: 'none',
  logLevel: 'warning',
  metafile: true
});
fs.writeFileSync('build-meta.json', JSON.stringify(result.metafile, null, 2));
console.log('built main.js from src/');
