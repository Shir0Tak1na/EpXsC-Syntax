'use strict';

/* Pure EpXsT / EpXsG block parsing: source -> ordered line records. */

const { tokenizeText } = require('../core/tokenizer.js');
const { parseOrdLines, pickTranslation } = require('../core/ord/parse.js');

function ordTokens(line, grammar) {
  const html = tokenizeText(line, grammar);
  const out = [];
  const re = /<span class="token ([a-zA-Z ]+)">([\s\S]*?)<\/span>/g;
  let m;
  while ((m = re.exec(html))) out.push({ cls: m[1], text: m[2].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') });
  return out;
}

function ordGlossOf(tok, info, posMap) {
  const t = tok.text.trim();
  if (!t || /^[\p{P}]$/u.test(t)) return '';
  const e = info && (info.get(t) || info.get(t.toLowerCase()));
  if (e) {
    const raw = String(e.pos || '').replace('·缩写', '');
    const pos = (posMap && posMap[raw]) || raw;
    const num = String(e.meaning || '').replace(/[^\u4e00-\u9fa5]/g, '');
    if (pos) return pos;
    if (num) return num.slice(0, 4);
  }
  const map = { judge: '判断词', keyword: '功能词', modifier: '限定词', degree: '程度词', unit: '单位', predicate: '谓词', element: '元素码', type: '类型名', number: '数' };
  for (const k in map) if (tok.cls.indexOf(k) >= 0) return map[k];
  return '';
}

function parseOrdBlocks(source, mode, grammar, info, posMap, options) {
  const parsed = parseOrdLines(source);
  const opts = options || {};
  const out = [];
  for (let i = 0; i < parsed.records.length; i++) {
    const record = parsed.records[i];
    if (record.kind === 'gap') { out.push({ kind: 'gap' }); continue; }
    const picked = pickTranslation({
      translations: record.translations,
      requestedLanguage: opts.requestedLanguage,
      fallbackLanguage: opts.fallbackLanguage,
      defaultTranslation: record.defaultTranslation
    });
    const zh = picked.kind === 'untranslated' ? '' : picked.text;
    const state = picked.kind === 'human' || picked.kind === 'default' ? 'human' : 'untranslated';
    if (mode === 'G') {
      const toks = ordTokens(record.src, grammar);
      const tokens = toks.map(function (tok) { return { cls: tok.cls, text: tok.text, gloss: ordGlossOf(tok, info, posMap) }; });
      out.push({ kind: 'line', src: record.src, zh: zh, translationState: state, translations: record.translations, sourceHash: record.sourceHash, tokens: tokens });
    } else {
      out.push({ kind: 'line', src: record.src, zh: zh, translationState: state, translations: record.translations, sourceHash: record.sourceHash, html: tokenizeText(record.src, grammar) });
    }
  }
  return out;
}
module.exports = { ordTokens, ordGlossOf, parseOrdBlocks };
