'use strict';

const PROMPT_VERSION = 'epxsc-translation-v1';

function buildTranslationMessages(input) {
  const o = input || {};
  const target = o.targetLanguage || 'zh-CN';
  const source = String(o.text || '');
  const system = [
    'You are a careful translator for the constructed language EpXsC (Expaulxsirian Construct).',
    'Translate the supplied EpXsC sentence into the requested target language.',
    'Output only the translation. Do not add explanations, labels, Markdown fences or multiple variants.',
    'If the source is ambiguous, choose the most literal reading and keep names unchanged.',
    'Target language: ' + target + '.'
  ].join(' ');
  const user = 'Translate this EpXsC sentence:\n' + source;
  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
}

function cleanModelText(text) {
  let s = String(text || '').trim();
  s = s.replace(/^\x60{3}[^\n]*\n?/, '').replace(/\n?\x60{3}$/, '').trim();
  s = s.replace(/^["'\u201c\u201d]+|["'\u201c\u201d]+$/g, '').trim();
  return s;
}

module.exports = { PROMPT_VERSION, buildTranslationMessages, cleanModelText };
