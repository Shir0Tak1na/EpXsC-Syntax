'use strict';

/* A deliberately small, syntax-only summary for translation assistants.
   It deliberately excludes example sentences: the 7B model tends to copy them. */
const DEFAULT_GRAMMAR_CONTEXT = [
  'EpXsC syntax constraints:',
  '- Basic clause order: predicate (verb) - subject - object (VSO). The predicate is first.',
  '- Noun phrase order: determiner - adjective - noun - prepositional complement.',
  '- Nouns do not inflect for case or plural; number and reference come from determiners and context.',
  '- Modifiers precede the noun; prepositional phrases follow it.',
  '- Use only words explicitly listed in the dictionary context.',
  '- Be minimal: do not add adjectives, synonyms, or words that are not required by the Chinese source.',
  '- Examples: 水 -> aqua; 净化水 -> plur aqua; 保存水 -> expual aqua.'
].join('\n');

function extractGrammarContext(text) {
  const src = String(text || '').trim();
  if (!src) return DEFAULT_GRAMMAR_CONTEXT;
  return src.slice(0, 6000);
}

module.exports = { DEFAULT_GRAMMAR_CONTEXT, extractGrammarContext };
