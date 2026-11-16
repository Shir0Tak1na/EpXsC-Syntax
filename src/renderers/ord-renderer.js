'use strict';

/* Pure EpXsT / EpXsG block parsing: source -> ordered line records. */

const { tokenizeText } = require('../core/tokenizer.js');

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

function parseOrdBlocks(source, mode, grammar, info, posMap) {
  const lines = String(source || '').replace(/\r/g, '').split('\n');
  const out = [];
  let pending = null;
  const flush = function (pair) {
    if (!pair) return;
    if (mode === 'G') {
      const toks = ordTokens(pair.src, grammar);
      const tokens = toks.map(function (tok) { return { cls: tok.cls, text: tok.text, gloss: ordGlossOf(tok, info, posMap) }; });
      out.push({ kind: 'line', src: pair.src, zh: pair.zh, tokens: tokens });
    } else {
      out.push({ kind: 'line', src: pair.src, zh: pair.zh, html: tokenizeText(pair.src, grammar) });
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();
    if (!t) {
      flush(pending); pending = null;
      out.push({ kind: 'gap' });
      continue;
    }
    if (t.charAt(0) === '>') {
      if (pending) pending.zh = t.slice(1).trim();
      else out.push({ kind: 'line', src: '', zh: t.slice(1).trim() });
      continue;
    }
    if (pending && !pending.zh && /[\u3400-\u9fff]/.test(t)) { pending.zh = t; continue; }
    flush(pending);
    pending = { src: t, zh: '' };
  }
  flush(pending);
  return out;
}

module.exports = { ordTokens, ordGlossOf, parseOrdBlocks };
