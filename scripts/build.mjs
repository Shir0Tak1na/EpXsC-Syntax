import { build } from 'esbuild';

await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2018',
  external: ['obsidian'],
  outfile: 'main.js',
  legalComments: 'none',
  logLevel: 'warning'
});
console.log('built main.js from src/');
