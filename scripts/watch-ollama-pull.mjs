import { spawn } from 'node:child_process';

const ollama = 'C:/Users/30904/AppData/Local/Programs/Ollama/ollama.exe';
const model = process.env.PULL_MODEL || 'qwen2.5:7b';
const maxAttempts = Number(process.env.PULL_ATTEMPTS || 24);
const sliceMs = Number(process.env.PULL_SLICE_MS || 75000);
const env = Object.assign({}, process.env, {
  OLLAMA_MODELS: process.env.OLLAMA_MODELS || 'D:/Ollama/models',
  HTTPS_PROXY: process.env.HTTPS_PROXY || 'http://127.0.0.1:7891',
  HTTP_PROXY: process.env.HTTP_PROXY || 'http://127.0.0.1:7891'
});

let attempt = 0;

function run() {
  attempt += 1;
  if (attempt > maxAttempts) {
    console.log('STOP: too many attempts');
    process.exit(1);
  }
  console.log('ATTEMPT ' + attempt + '/' + maxAttempts + ' for ' + model);
  const child = spawn(ollama, ['pull', model], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let killed = false;
  const timer = setTimeout(() => {
    killed = true;
    console.log('RESTART: slice expired');
    try { child.kill(); } catch (e) { /* noop */ }
  }, sliceMs);
  const onData = (buf) => {
    const s = buf.toString().replace(/\x1b\[[0-9;?]*[A-Za-z]/g, ' ');
    const m = /([0-9]+(?:\.[0-9]+)?\s*(?:KB|MB|GB)\s*\/\s*[0-9]+(?:\.[0-9]+)?\s*(?:KB|MB|GB))/i.exec(s);
    if (m) process.stdout.write('\r' + m[1]);
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('exit', (code, signal) => {
    clearTimeout(timer);
    if (!killed && code === 0) {
      console.log('\nDONE: ' + model);
      process.exit(0);
    }
    console.log('\nretry after exit ' + code + ' / ' + signal);
    setTimeout(run, 1000);
  });
}

run();
