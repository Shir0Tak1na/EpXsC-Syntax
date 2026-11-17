import http from 'node:http';

const PORT = Number(process.env.MOCK_PORT || 11435);
const HOST = process.env.MOCK_HOST || '127.0.0.1';

function json(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Access-Control-Allow-Origin': '*'
  });
  res.end(text);
}

function sourceFrom(body) {
  const messages = body && Array.isArray(body.messages) ? body.messages : [];
  const user = messages.filter((m) => m && m.role === 'user').pop();
  const text = user && typeof user.content === 'string' ? user.content : '';
  const lines = String(text || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  return lines.length ? lines[lines.length - 1] : String(text || '').trim();
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    });
    res.end();
    return;
  }
  if (req.url === '/v1/models' && req.method === 'GET') {
    json(res, 200, { object: 'list', data: [{ id: 'mock-epxsc', object: 'model' }] });
    return;
  }
  if (req.url !== '/v1/chat/completions' || req.method !== 'POST') {
    json(res, 404, { error: { message: 'not found' } });
    return;
  }
  let raw = '';
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', () => {
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch (e) { /* ignore */ }
    const messages = body && Array.isArray(body.messages) ? body.messages : [];
    const system = (messages.filter((m) => m && m.role === 'system')[0] || {}).content || '';
    const src = sourceFrom(body);
    const out = /translation assistant/i.test(system)
      ? JSON.stringify({ reference: 'Plur Aqua', backTranslation: '净水（mock 回译）', notes: ['mock reference'] })
      : (src === 'Plur Aqua' ? '净水（mock）' : ('[mock] ' + src));
    setTimeout(() => {
      json(res, 200, {
        id: 'mock-' + Date.now(),
        object: 'chat.completion',
        choices: [{ index: 0, message: { role: 'assistant', content: out }, finish_reason: 'stop' }]
      });
    }, 150);
  });
});

server.listen(PORT, HOST, () => {
  console.log('mock translation server: http://' + HOST + ':' + PORT + '/v1');
});
