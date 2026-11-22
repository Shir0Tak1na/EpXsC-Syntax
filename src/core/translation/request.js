'use strict';

/* Pure translation request helpers. No Obsidian, DOM or network. */

const DEFAULT_PROVIDER = {
  type: 'openai-compatible',
  baseUrl: '',
  endpoint: '/chat/completions',
  model: '',
  headers: {},
  apiKey: '',
  secretId: '',
  timeoutMs: 30000,
  maxTokens: 2048,
  temperature: 0.3
};

function normalizeHeaders(headers) {
  const out = {};
  if (!headers || typeof headers !== 'object') return out;
  for (const key in headers) {
    if (!Object.prototype.hasOwnProperty.call(headers, key)) continue;
    const value = headers[key];
    if (value === undefined || value === null) continue;
    out[String(key)] = String(value);
  }
  return out;
}

function normalizeProviderConfig(input) {
  const v = input && typeof input === 'object' ? input : {};
  return {
    type: String(v.type || DEFAULT_PROVIDER.type),
    baseUrl: String(v.baseUrl || '').trim(),
    endpoint: String(v.endpoint || DEFAULT_PROVIDER.endpoint).trim(),
    model: String(v.model || '').trim(),
    headers: normalizeHeaders(v.headers),
    apiKey: String(v.apiKey || ''),
    secretId: String(v.secretId || ''),
    timeoutMs: Number(v.timeoutMs) > 0 ? Number(v.timeoutMs) : DEFAULT_PROVIDER.timeoutMs,
    maxTokens: Number(v.maxTokens) > 0 ? Math.floor(Number(v.maxTokens)) : DEFAULT_PROVIDER.maxTokens,
    temperature: Number.isFinite(Number(v.temperature)) ? Number(v.temperature) : DEFAULT_PROVIDER.temperature
  };
}

function isLoopback(host) {
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
}

function validateProviderConfig(input) {
  const cfg = normalizeProviderConfig(input);
  if (cfg.type !== 'openai-compatible') return { ok: false, code: 'UNSUPPORTED_PROVIDER', message: '不支持的 Provider 类型' };
  if (!cfg.baseUrl) return { ok: false, code: 'MISSING_BASE_URL', message: '缺少 Base URL' };
  if (!cfg.model) return { ok: false, code: 'MISSING_MODEL', message: '缺少模型名称' };
  let url;
  try { url = new URL(cfg.baseUrl); } catch (e) { return { ok: false, code: 'INVALID_BASE_URL', message: 'Base URL 不是合法 URL' }; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, code: 'INVALID_PROTOCOL', message: '只允许 http 或 https' };
  if (url.protocol === 'http:' && !isLoopback(url.hostname)) return { ok: false, code: 'HTTPS_REQUIRED', message: '非回环地址必须使用 HTTPS' };
  try { resolveEndpoint(cfg.baseUrl, cfg.endpoint); } catch (e) { return { ok: false, code: 'INVALID_ENDPOINT', message: e.message }; }
  return { ok: true, config: cfg };
}

function resolveEndpoint(baseUrl, endpoint) {
  const base = String(baseUrl || '').trim().replace(/\/+$/, '');
  const ep = String(endpoint || '').trim();
  if (!ep) throw new Error('endpoint 不能为空');
  if (/^https?:\/\//i.test(ep)) {
    try { new URL(ep); } catch (e) { throw new Error('endpoint 不是合法 URL'); }
    return ep;
  }
  if (!base) throw new Error('baseUrl 不能为空');
  try { new URL(base); } catch (e) { throw new Error('baseUrl 不是合法 URL'); }
  const joined = base + '/' + ep.replace(/^\/+/, '');
  if (/\/v1\/v1\//.test(joined)) throw new Error('endpoint 与 baseUrl 重复了 /v1 段');
  return joined;
}

function translationKey(parts) {
  const p = parts || {};
  const source = String(p.source || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
  let h = 2166136261;
  for (let i = 0; i < source.length; i++) { h ^= source.charCodeAt(i); h = Math.imul(h, 16777619); }
  const sourceHash = ('00000000' + (h >>> 0).toString(16)).slice(-8);
  const fp = p.providerFingerprint || {};
  return JSON.stringify({
    sourceHash,
    sourceLang: p.sourceLang || '',
    targetLang: p.targetLang || '',
    lexiconVersion: p.lexiconVersion || '',
    providerType: fp.type || '',
    baseUrlOrigin: fp.baseUrlOrigin || '',
    endpoint: fp.endpoint || '',
    model: fp.model || '',
    promptVersion: fp.promptVersion || ''
  });
}

function providerFingerprint(config, promptVersion) {
  const cfg = normalizeProviderConfig(config);
  let origin = '';
  try { origin = new URL(cfg.baseUrl).origin; } catch (e) { origin = cfg.baseUrl; }
  return {
    type: cfg.type,
    baseUrlOrigin: origin,
    endpoint: cfg.endpoint,
    model: cfg.model,
    promptVersion: promptVersion || 'v1'
  };
}

module.exports = { DEFAULT_PROVIDER, normalizeProviderConfig, validateProviderConfig, resolveEndpoint, translationKey, providerFingerprint, isLoopback };
