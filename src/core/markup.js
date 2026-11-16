'use strict';

/* Pure HTML/token post-processing for EpXsC rendering. */

const { TYPES, MODIFIERS } = require('./grammar.js');
const { ELEMENTS } = require('../data/parsers.js');

function markSpellRefs(html) {
  /* 术式名有两种身份：声明（行尾收在 { 上）与引用（写在效果层，收在 ; 上）。
     引用改用 function 类着色，与声明的黄色区分开；spellRef 便于提示区分。 */
  return String(html).split('\n').map(function (line) {
    if (line.indexOf('class="token declaration"') < 0) return line;
    const plain = line.replace(/<[^>]+>/g, '');
    if (/\{[ \t]*$/.test(plain)) return line;
    return line.replace(/<span class="token declaration"/g, '<span class="token spellRef"');
  }).join('\n');
}

function markVarUse(html, vars) {
  if (!vars || !vars.size) return html;
  /* 块内已声明的变量，出现在哪儿都按变量着色 —— 包括词性与术式关键词重名的
     （metos 既是《词典》里的「对象、目标」，也常被当形参名用）。
     只改「词」类 span：type／element／number 这些有明确语法身份的不动。 */
  const CLAIMABLE = 'word|clause|judge|predicate|function|degree|axis|unit';
  vars.forEach(function (binding, name) {
    if (!name) return;
    const safe = name.replace(/[^A-Za-z0-9_]/g, '\\$&');
    html = html.replace(new RegExp('<span class="token (?:' + CLAIMABLE + ')( [^"]*)?">' + safe + '</span>', 'g'), '<span class="token varUse$1">' + name + '</span>');
  });
  return html;
}


function bracketKinds(text) {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\.[^\n]*$/gm, '');
  const out = [];
  for (let i = 0; i < src.length; i++) {
    const ch = src.charAt(i);
    if (ch === '(' || ch === '[' || ch === '{') {
      let kind = '';
      if (ch === '(') {
        const before = src.slice(Math.max(0, i - 60), i);
        const head = /(^|[;{}\n])\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(before);
        const prev = src.charAt(i - 1);
        if (head && /^[A-Z]/.test(head[2]) && prev !== ' ') kind = '参数表';
        else if (/[A-Za-z0-9_]/.test(prev)) kind = '实参表';
        else kind = '分组';
      } else if (ch === '[') {
        const close = src.indexOf(']', i);
        const inner = close > 0 ? src.slice(i + 1, close) : '';
        let back = i - 1;
        while (back >= 0 && /[ \t]/.test(src.charAt(back))) back -= 1;
        kind = src.charAt(back) === '=' ? '筛选值' : classifySquare(inner);
      } else {
        kind = '语块';
      }
      out.push(kind);
    } else if (ch === ')' || ch === ']' || ch === '}') {
      out.push('');
    }
  }
  return out;
}

/* 符号释义（取自术式语法 三、逻辑与运算 / 四、指针与寻址） */
;

/* 方括号里装的是什么（提示与语法检查共用这一套判定） */
function classifySquare(inner) {
  if (/=/.test(inner)) return '筛选键表';
  if (/^\s*:/.test(inner)) return '列表类型';
  if (/^\s*\d+\s*:/.test(inner)) return '位数声明';
  if (/&/.test(inner)) return '点名列表';
  if (/siro|\*/.test(inner)) return '目标集';
  if (/\.\./.test(inner) || /^\s*\d+\s*$/.test(inner)) return '下标 · 秩';
  return '列表';
}



function inferKind(expr, known) {
  const e = (expr || '').trim();
  if (!e) return { kind: '未定' };
  if (/^\*&/.test(e)) return { kind: '实体' };
  if (/^&/.test(e)) return { kind: '地址' };
  if (/^@/.test(e) || /^METOS\s*\[/.test(e)) return { kind: '对象集' };
  if (/^\[/.test(e)) return { kind: '列表' };
  if (/^\(/.test(e)) return { kind: '元组' };
  if (/^\{/.test(e)) return { kind: '字典' };
  if (/^\d/.test(e)) return { kind: '数值' };
  const word = /^([A-Za-z_][A-Za-z0-9_]*)\s*([(=]?)/.exec(e);
  if (word) {
    const w = word[1];
    if (ELEMENTS.indexOf(w) >= 0 || TYPES.indexOf(w) >= 0) return { kind: '元素或类型', ref: w };
    if (word[2] === '(') return { kind: '调用' };
    if (known && known.has(w)) return { kind: '同前', ref: w };
  }
  return { kind: '未定' };
}

/* 变量表：① 形参「类型: 变量名」（两种语序都认）；② 赋值 name = 表达式 按右侧推断 */
function parseVarTypes(text, info) {
  const out = new Map();
  const isType = function (w) { return TYPES.indexOf(w) >= 0 || ELEMENTS.indexOf(w) >= 0; };
  const scopes = text.match(/\([^()]*\)/g) || [];
  for (let i = 0; i < scopes.length; i++) {
    const parts = scopes[i].slice(1, -1).split(',');
    for (let j = 0; j < parts.length; j++) {
      const p = parts[j].trim();
      /* 形参：类型 : [限定词…] 变量名 —— 限定词既可写在类型之前，也可写在变量名之前（等价） */
      let m = /^((?:(?:priv|tut|publ|consta)[ \t]+)*)([A-Za-z_][A-Za-z0-9_]*)\s*:\s*((?:(?:priv|tut|publ|consta)[ \t]+)*)([A-Za-z_][A-Za-z0-9_]*)$/.exec(p);
      if (m) {
        const ty = m[2];
        const name = m[4];
        const mods = ((m[1] || '') + ' ' + (m[3] || '')).trim().toLowerCase().split(/[ \t]+/).filter(Boolean);
        let binding;
        if (isType(ty) && !isType(name)) binding = { type: ty };
        else if (!isType(ty) && isType(name)) binding = { type: name };
        else if (ty.length === 1) binding = { type: name };
        else binding = { type: ty };
        if (mods.length) { binding.modifiers = mods; binding.modifier = mods[mods.length - 1]; }
        out.set(name, binding);
        continue;
      }
      m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\[[^\]]*?(\d+)?\s*:?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\]$/.exec(p);
      if (m) { out.set(m[3], { type: m[1], container: '列表', length: m[2] || '' }); continue; }
      m = /^\[[^\]]*?([A-Za-z_][A-Za-z0-9_]*)\s*\]\s*:\s*([A-Za-z_][A-Za-z0-9_]*)$/.exec(p);
      if (m) { out.set(m[2], { type: m[1], container: '列表', length: '' }); continue; }
    }
  }
  const assign = new RegExp('(^|[;\\n])[ \\t]*((?:(?:' + MODIFIERS.join('|') + ')[ \\t]+)*)([A-Za-z_][A-Za-z0-9_]*)[ \\t]*=(?!=)[ \\t]*([^\\n;]*)', 'g');
  let a;
  while ((a = assign.exec(text))) {
    const name = a[3];
    if (out.has(name)) continue;
    const binding = inferKind(a[4], out);
    binding.modifiers = (a[2] || '').trim().toLowerCase().split(/[ \t]+/).filter(Boolean);
    binding.modifier = binding.modifiers.length ? binding.modifiers[binding.modifiers.length - 1] : '';
    out.set(name, binding);
  }
  return out;
}



const DICT_BEFORE = 'word|type|declaration|className|clause|predicate|function|modifier|variable|declTarget|axis|element|dictKey|filterKey|filterValue|unit';
function markDictKeys(html) {
  const seg = new RegExp('(?:<span class="token (' + DICT_BEFORE + ')">[^<]*<\\/span>[ \\t]*)?<span class="token brace">\\{<\\/span>[^{}\\n]*<span class="token brace">\\}<\\/span>', 'g');
  return html.replace(seg, function (all, kind) {
    if (kind) return all;                          /* 前面是词 → 容器型形参，不动 */
    return all.replace(/<span class="token [a-zA-Z ]+">([A-Za-z_][A-Za-z0-9_]*)<\/span>(?=[ \t]*<span class="token punctuation">:<\/span>)/g,
      function (span, name) { return '<span class="token dictKey">' + name + '</span>'; });
  });
}

function markBracketDepth(html, kinds) {
  let depth = 0;
  let idx = 0;
  return html.replace(/<span class="token ([a-z]+)">([\[\](){}])<\/span>/g, function (all, cls, ch) {
    if (cls !== 'bracket' && cls !== 'paren' && cls !== 'brace') return all;
    const isOpen = ch === '[' || ch === '(' || ch === '{';
    if (isOpen) depth += 1;
    else if (depth > 0) depth -= 1;
    const level = isOpen ? depth : depth + 1;
    const kind = kinds && kinds[idx] ? String(kinds[idx]).replace(/"/g, '') : '';
    idx += 1;
    const attr = kind ? ' data-epx-kind="' + kind + '"' : '';
    return '<span class="token ' + cls + ' epx-d' + (((level - 1) % 3) + 1) + '"' + attr + '>' + ch + '</span>';
  });
}



module.exports = { markSpellRefs, markVarUse, bracketKinds, inferKind, parseVarTypes, markDictKeys, markBracketDepth };
