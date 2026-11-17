'use strict';

/* Translation orchestration: cache, in-flight dedupe, timeout and logical cancellation. */

const { translationKey, providerFingerprint } = require('../core/translation/request.js');

function cancelled() {
  return { ok: false, error: { code: 'CANCELLED', message: '翻译已取消', retryable: false } };
}

function createTranslationService(options) {
  const opts = options || {};
  const provider = opts.provider || null;
  const cacheLimit = Number(opts.cacheLimit) > 0 ? Math.floor(Number(opts.cacheLimit)) : 256;
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 30000;
  const cache = new Map();
  const inflight = new Map();
  let epoch = 0;

  function cacheGet(key) {
    if (!cache.has(key)) return null;
    const value = cache.get(key);
    cache.delete(key);
    cache.set(key, value);
    return value;
  }

  function cacheSet(key, value) {
    if (cache.has(key)) cache.delete(key);
    cache.set(key, value);
    while (cache.size > cacheLimit) {
      const first = cache.keys().next().value;
      cache.delete(first);
    }
  }

  function clear() {
    cache.clear();
    inflight.clear();
    epoch += 1;
  }

  function cancelAll() {
    epoch += 1;
    inflight.clear();
  }

  function withTimeout(promise, ms) {
    let timer = null;
    const timeout = new Promise(function (resolve) {
      timer = setTimeout(function () { resolve({ ok: false, error: { code: 'TIMEOUT', message: '翻译请求超时', retryable: true } }); }, ms);
    });
    return Promise.race([promise, timeout]).finally(function () { if (timer) clearTimeout(timer); });
  }

  async function translate(input) {
    const optsIn = input || {};
    if (!provider) return { ok: false, error: { code: 'NO_PROVIDER', message: '未配置翻译模型', retryable: false } };
    const source = String(optsIn.text || '').trim();
    if (!source) return { ok: false, error: { code: 'EMPTY_SOURCE', message: '源句为空', retryable: false } };
    const key = translationKey({
      source: source,
      sourceLang: optsIn.sourceLang || 'epxsc',
      targetLang: optsIn.targetLanguage || optsIn.targetLang || 'zh-CN',
      lexiconVersion: optsIn.lexiconVersion || '',
      providerFingerprint: optsIn.providerFingerprint || provider.fingerprint
    });
    const hit = cacheGet(key);
    if (hit) return { ok: true, text: hit.text, cached: true };
    if (inflight.has(key)) return await inflight.get(key);
    const startEpoch = epoch;
    const promise = withTimeout(provider.translate({
      text: source,
      sourceLang: optsIn.sourceLang || 'epxsc',
      targetLanguage: optsIn.targetLanguage || optsIn.targetLang || 'zh-CN',
      context: optsIn.context || '',
      signal: optsIn.signal
    }), timeoutMs).then(function (result) {
      if (startEpoch !== epoch) return cancelled();
      if (result && result.ok) cacheSet(key, { text: result.text });
      return result;
    }).catch(function (err) {
      return { ok: false, error: { code: 'PROVIDER_ERROR', message: String(err && err.message || err), retryable: true } };
    }).finally(function () {
      inflight.delete(key);
    });
    inflight.set(key, promise);
    return await promise;
  }

  return {
    translate: translate,
    clear: clear,
    cancelAll: cancelAll,
    get provider() { return provider; },
    get epoch() { return epoch; },
    get cacheSize() { return cache.size; },
    get inflightSize() { return inflight.size; }
  };
}

module.exports = { createTranslationService, cancelled };
