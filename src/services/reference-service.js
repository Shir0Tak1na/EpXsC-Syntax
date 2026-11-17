'use strict';

const { REFERENCE_PROMPT_VERSION, buildReferenceMessages, parseReferenceResponse } = require('../core/translation/reference.js');

function createReferenceService(options) {
  const opts = options || {};
  const provider = opts.provider || null;

  async function generate(input) {
    const o = input || {};
    if (!provider || typeof provider.chat !== 'function') {
      return { ok: false, error: { code: 'NO_PROVIDER', message: '未配置翻译模型' } };
    }
    const chinese = String(o.chinese || '').trim();
    if (!chinese) return { ok: false, error: { code: 'EMPTY_SOURCE', message: '中文源句为空' } };
    const messages = buildReferenceMessages({
      chinese: chinese,
      grammarContext: o.grammarContext || '',
      dictionaryContext: o.dictionaryContext || ''
    });
    const raw = await provider.chat(messages, { signal: o.signal });
    if (!raw || !raw.ok) return { ok: false, error: (raw && raw.error) || { code: 'PROVIDER_ERROR', message: '模型请求失败' } };
    const parsed = parseReferenceResponse(raw.text);
    if (!parsed.ok) return parsed;
    let analysis = { wordBreakdown: [], unknownWords: [], lint: [] };
    if (typeof o.analyze === 'function') {
      try { analysis = await o.analyze(parsed.data.reference); } catch (e) { /* analysis is best-effort */ }
    }
    const unknownWords = analysis.unknownWords || [];
    const lint = analysis.lint || [];
    const valid = unknownWords.length === 0 && !lint.some(function (x) { return x && x.level === 'error'; });
    return {
      ok: true,
      valid: valid,
      reference: parsed.data.reference,
      backTranslation: parsed.data.backTranslation,
      notes: parsed.data.notes,
      wordBreakdown: analysis.wordBreakdown || [],
      unknownWords: unknownWords,
      lint: lint,
      promptVersion: REFERENCE_PROMPT_VERSION
    };
  }

  return { generate: generate, provider: provider };
}

module.exports = { createReferenceService };
