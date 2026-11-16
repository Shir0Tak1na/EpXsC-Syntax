'use strict';

/* Pure EpXsC block rendering pipeline: text -> highlighted HTML + var map. */

const { tokenizeText } = require('../core/tokenizer.js');
const { markSpellRefs, markVarUse, bracketKinds, parseVarTypes, markDictKeys, markBracketDepth } = require('../core/markup.js');

function renderEpXsC(text, grammar, info, maxLines) {
  const source = String(text || '');
  const limit = typeof maxLines === 'number' ? maxLines : 50;
  if ((source.match(/\n/g) || []).length >= limit) return { skip: true, html: '', vars: new Map() };
  if (!grammar) return { skip: false, html: '', vars: new Map() };
  let html = markBracketDepth(tokenizeText(source, grammar), bracketKinds(source));
  const vars = parseVarTypes(source, info || new Map());
  html = markVarUse(html, vars);
  html = markDictKeys(html);
  html = markSpellRefs(html);
  return { skip: false, html, vars };
}

module.exports = { renderEpXsC };
