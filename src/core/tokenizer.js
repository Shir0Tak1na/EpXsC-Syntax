'use strict';

/* Pure tokenizer: grammar rules -> escaped HTML tokens. */

const GLOBAL_RE_CACHE = new WeakMap();
function asGlobalRe(re) {
  if (re.global) return re;
  let g = GLOBAL_RE_CACHE.get(re);
  if (!g) { g = new RegExp(re.source, re.flags + 'g'); GLOBAL_RE_CACHE.set(re, g); }
  return g;
}
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function tokenizeText(text, grammar) {
  let out = '';
  let pos = 0;
  while (pos < text.length) {
    let best = null;
    for (const name in grammar) {
      const rule = grammar[name];
      const pattern = (rule instanceof RegExp) ? rule : (rule && rule.pattern);
      if (!(pattern instanceof RegExp)) continue;
      const re = asGlobalRe(pattern);
      const lb = !(rule instanceof RegExp) && rule.lookbehind;
      /* lookbehind 规则要从头扫：它的「标签前缀」可能落在已扫描过的位置
         （如 (locus: zone 里的 variable 需要看见那个左括号），但只接受内容在当前位之后的匹配 */
      re.lastIndex = lb ? 0 : pos;
      let m = re.exec(text);
      let index = 0;
      let content = '';
      if (m) {
        index = m.index;
        content = m[0];
        if (lb && m[1]) { index += m[1].length; content = m[0].slice(m[1].length); }
        if (lb && index < pos) {
          /* 找到的匹配在当前位置之前 —— 继续往后找 */
          let guard = 0;
          while (m && index < pos && guard < 200) {
            re.lastIndex = index + content.length;
            m = re.exec(text);
            if (!m) break;
            index = m.index; content = m[0];
            if (m[1]) { index += m[1].length; content = m[0].slice(m[1].length); }
            guard += 1;
          }
        }
      }
      if (!m || !content) continue;
      if (index < pos) continue;
      if (!best || index < best.index) best = { index: index, content: content, name: name, rule: rule };
    }
    if (!best) { out += escHtml(text.slice(pos)); break; }
    if (best.index > pos) out += escHtml(text.slice(pos, best.index));
    const rule = best.rule;
    const cls = best.name + (!(rule instanceof RegExp) && rule.alias ? ' ' + rule.alias : '');
    const inner = (!(rule instanceof RegExp) && rule.inside) ? tokenizeText(best.content, rule.inside) : escHtml(best.content);
    out += '<span class="token ' + cls + '">' + inner + '</span>';
    pos = best.index + best.content.length;
  }
  return out;
}

/* ---------- 语法检查 ---------- */

/* ---------- 悬停提示 ---------- */

module.exports = { asGlobalRe, escHtml, tokenizeText };
