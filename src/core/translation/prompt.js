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
    'Target language: ' + target + '. Preserve names. Use the dictionary meanings and grammar constraints. Output only one natural sentence.'
  ].join(' ');
  const context = String(o.context || '').trim();
  const grammar = String(o.grammarContext || '').trim();
  const examples = [
    'Navis draco nos. -> 龙引导我们。',
    'Retase quinq pna kor. -> 五个人留下来驻守。',
    'Es hopas nos de silzone. -> 我们的营地在森林之区。',
    'Vid nauta mar. -> 水手望海。'
  ].join('\n');
  let user = 'Translate this EpXsC sentence:\n' + source;
  if (context) user += '\nDictionary context:\n' + context;
  if (grammar) user += '\nGrammar constraints:\n' + grammar;
  user += '\nReference translations (do not copy blindly):\n' + examples;
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
