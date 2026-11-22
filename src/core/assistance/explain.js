'use strict';

const EXPLAIN_PROMPT_VERSION = 'epxsc-explain-v1';

function buildExplainMessages(input) {
  const o = input || {};
  const source = String(o.text || '').trim();
  const dictionary = String(o.dictionaryContext || '').trim();
  const grammar = String(o.grammarContext || '').trim();
  const adjacent = String(o.adjacentContext || '').trim();
  const system = [
    'You are a read-only EpXsC (Expaulxsirian Construct) explanation assistant for the author.',
    'Explain the supplied EpXsC block in Simplified Chinese.',
    'Do not rewrite the block, do not propose an edited version, and do not claim authority.',
    'Describe word meanings, clause order, modifiers, and any visible ambiguity.',
    'If the source is invalid, say what is unclear instead of inventing grammar.',
    'Return plain prose only; no Markdown fences, JSON, or code blocks.'
  ].join(' ');
  let user = 'EpXsC block:\n' + source;
  if (dictionary) user += '\nDictionary context:\n' + dictionary;
  if (grammar) user += '\nGrammar context:\n' + grammar;
  if (adjacent) user += '\nAdjacent context (user enabled, not part of the block):\n' + adjacent;
  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
}

module.exports = { EXPLAIN_PROMPT_VERSION, buildExplainMessages };
