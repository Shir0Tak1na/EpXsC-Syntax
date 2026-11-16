import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../src/core/index.js');

function time(label, fn, n) {
  const start = process.hrtime.bigint();
  let value;
  for (let i = 0; i < n; i++) value = fn();
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  console.log(label, ms.toFixed(2) + 'ms total /', (ms / n).toFixed(4) + 'ms each', value && value.length !== undefined ? '(len ' + value.length + ')' : '');
}

const grammar = core.buildGrammar(core.BASE_LISTS, []);
const sample = 'Expaste(METOS: a, METOS: b) {\n\tintervall(a, b) <= 66 miteas;\n\tluss (15 + 35 * intervall(a, b)) MU;\n}';
time('tokenize sample x1000', () => core.tokenize(sample, grammar), 1000);

const dict = '## 介词\n' + Array.from({ length: 1000 }, (_, i) => '| word' + i + ' | 词 | w |').join('\n');
time('parse synthetic dictionary x100', () => core.parseDictionary(dict), 100);

const block = Array.from({ length: 50 }, (_, i) => 'nec manis ' + i).join(' ');
time('tokenize 150-token block x200', () => core.tokenize(block, grammar), 200);
