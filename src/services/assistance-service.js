'use strict';

const { buildExplainMessages } = require('../core/assistance/explain.js');

function createAssistanceService(options) {
  const opts = options || {};
  const provider = opts.provider || null;

  async function explain(input) {
    const o = input || {};
    const text = String(o.text || '').trim();
    if (!text) return { ok: false, error: { code: 'EMPTY_BLOCK', message: '当前块为空' } };
    if (!provider || typeof provider.chat !== 'function') {
      return { ok: false, error: { code: 'NO_PROVIDER', message: '未配置辅助模型' } };
    }
    const messages = buildExplainMessages({
      text: text,
      dictionaryContext: o.dictionaryContext || '',
      grammarContext: o.grammarContext || '',
      adjacentContext: o.adjacentContext || ''
    });
    const result = await provider.chat(messages, { signal: o.signal });
    if (!result || !result.ok) return { ok: false, error: (result && result.error) || { code: 'PROVIDER_ERROR', message: '模型请求失败' } };
    return { ok: true, text: result.text };
  }

  return { explain: explain };
}

module.exports = { createAssistanceService };
