'use strict';

const REFERENCE_PROMPT_VERSION = 'epxsc-reference-v1';

function buildReferenceMessages(input) {
  const o = input || {};
  const chinese = String(o.chinese || '').trim();
  const grammar = String(o.grammarContext || '').trim();
  const dictionary = String(o.dictionaryContext || '').trim();
  const system = [
    'You are an EpXsC (Expaulxsirian Construct) translation assistant for an author.',
    'Convert the supplied Chinese sentence into EpXsC.',
    'Return JSON only, with this shape:',
    '{"reference":"EpXsC sentence","backTranslation":"简体中文回译","notes":["optional note"]}',
    'Do not return Markdown fences, explanations outside JSON, lint results, or invented dictionary entries.',
    'The supplied dictionary context is exhaustive for this request. Use only EpXs words explicitly listed there. Never invent a word. If no listed word fits, return an empty reference and explain in notes.',
    'backTranslation must be Simplified Chinese, not English. Be minimal: do not add synonyms, extra adjectives, or words not required by the Chinese source. Each EpXs word must correspond to a part of the source. The author will review the result; never claim it is authoritative.'
  ].join(' ');
  const parts = ['Chinese sentence:', chinese];
  if (grammar) parts.push('Grammar constraints:', grammar);
  if (dictionary) parts.push('Dictionary context:', dictionary);
  return [
    { role: 'system', content: system },
    { role: 'user', content: parts.join('\n') }
  ];
}

function parseReferenceResponse(text) {
  let s = String(text || '').trim();
  s = s.replace(/^\x60{3}[^\n]*\n?/, '').replace(/\n?\x60{3}$/, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) return { ok: false, error: { code: 'INVALID_JSON', message: '模型没有返回 JSON 对象' } };
  let data;
  try { data = JSON.parse(s.slice(start, end + 1)); } catch (e) { return { ok: false, error: { code: 'INVALID_JSON', message: '模型返回的 JSON 无法解析' } }; }
  if (!data || typeof data.reference !== 'string' || !data.reference.trim()) {
    return { ok: false, error: { code: 'MISSING_REFERENCE', message: '模型返回缺少 reference 字段' } };
  }
  return {
    ok: true,
    data: {
      reference: data.reference.trim(),
      backTranslation: typeof data.backTranslation === 'string' ? data.backTranslation.trim() : '',
      notes: Array.isArray(data.notes) ? data.notes.map(String) : []
    }
  };
}

module.exports = { REFERENCE_PROMPT_VERSION, buildReferenceMessages, parseReferenceResponse };
