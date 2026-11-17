'use strict';

/*
 * EpXsC Syntax —— 为「述无空语构造记号」（EpXsC）代码块注册 Prism 语法。
 *
 * 分工：插件把代码切成 token（<span class="token keyword">…</span>），
 *       配色交给 CSS 片段 EpXsC-Highlight.css。
 *
 * 词表来源：载入时读《述无空语词典》的「动词 / 判断词 / 术式关键词 / 程度限定 / 单位」小节，
 *           词典一改、颜色跟着改；读不到就退回下面的内置词表（两者取并集，内置的不会被顶掉）。
 */

const { Plugin, TFile, TFolder, Notice, MarkdownView, requestUrl } = require('obsidian');
const { extractEpXsCBlocks } = require('../core/markdown-blocks.js');
const { loadBuiltinLexicon } = require('../data/lexicon.js');
const { RefreshScheduler } = require('../services/refresh-scheduler.js');
const { buildLexiconSnapshot } = require('../services/lexicon-service.js');
const { normalizeSettings } = require('../core/settings.js');
const { EpXsSettingsTab } = require('../ui/settings-tab.js');
const { createOpenAICompatibleProvider } = require('../providers/openai-compatible.js');
const { createTranslationService } = require('../services/translation-service.js');
const { createReferenceService } = require('../services/reference-service.js');
const { ReferenceModal } = require('../ui/reference-modal.js');
const { normalizeProviderConfig, validateProviderConfig } = require('../core/translation/request.js');
const { DEFAULT_GRAMMAR_CONTEXT, extractGrammarContext } = require('../core/translation/grammar.js');
const { markSpellRefs, markVarUse, bracketKinds, parseVarTypes, markDictKeys, markBracketDepth } = require('../core/markup.js');
const { TYPES, MODIFIERS, makeGrammar, BASE_LISTS } = require('../core/grammar.js');
const { tokenizeText } = require('../core/tokenizer.js');
const { collectSpells } = require('../core/spells.js');
const { lintSource } = require('../services/lint-service.js');
const { renderEpXsC } = require('../renderers/epxsc-renderer.js');
const { parseOrdBlocks } = require('../renderers/ord-renderer.js');
const { LintModal } = require('../ui/lint-modal.js');
const { diagnose, selfCheck } = require('../ui/diagnostics.js');
const { FALLBACK, SECTIONS, ELEMENTS, splitSections, parseEntries, parseRanks, parseFilterKeys, parseUnits, parseRoots, wordsFrom } = require('../data/parsers.js');

const LANG_KEYS = ['EpXsC', 'epxsc', 'EPXSC'];
const CODE_SELECTOR = 'code[class*="language-EpXsC" i]';
const { DICT_PATH, RANK_PATH, SYNTAX_PATH, GRAMMAR_PATH, ROOTS_DIR, SPELL_DIR, MAX_HIGHLIGHT_LINES } = require('./config.js');

const BUILD = '2.2.0';

/* 一个 token 可能带多个类（如 typeParam + type），按语义优先级取第一个 */
const { SECTION_POS, EXTRA_WORDS, SYMBOL_INFO, pickClass, bracketTip, variableTip, negScopeText, coordTip, rankDef, rankSpan, buildTip } = require('../ui/tooltip.js');

const FALLBACK_CSS = "/* EpXsC Syntax 内置兜底样式（与 styles.css 第 1／2／3／5／6 节一致） */\nbody{--epx-comment:var(--text-faint);--epx-pretium:var(--color-red);--epx-keyword:var(--color-purple);--epx-judge:var(--color-purple);--epx-clause:var(--color-red);--epx-verb:var(--color-blue);--epx-decl:var(--color-yellow);--epx-element:var(--color-cyan);--epx-type:var(--color-cyan);--epx-unit:var(--color-orange);--epx-number:var(--color-orange);--epx-degree:var(--color-pink);--epx-axis:var(--color-green);--epx-pointer:var(--text-accent);--epx-operator:var(--text-muted);--epx-punct:var(--text-muted);--epx-paren:var(--text-muted);--epx-bracket:var(--text-muted);--epx-brace:var(--text-muted);--epx-rank:var(--color-orange);--epx-b2:var(--text-muted);--epx-b3:var(--text-muted);--epx-variable:var(--color-pink);--epx-modifier:var(--color-red)}\npre.epx-pre{position:relative;padding:1.1em 1.15em 1.15em;background:var(--code-background);border:1px solid var(--background-modifier-border);border-left:3px solid var(--text-accent);border-radius:var(--radius-m)}\npre.epx-pre::before{content:\"EpXsC\";position:absolute;inset:0 0 auto auto;padding:0 .7em;font-family:var(--font-interface);font-size:.62em;font-weight:600;letter-spacing:.09em;line-height:1.8;color:var(--text-on-accent);background:var(--text-accent);border-radius:0 var(--radius-m) 0 var(--radius-s);opacity:.85;pointer-events:none;user-select:none}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord){font-family:var(--font-monospace);font-size:.9em;line-height:1.65;tab-size:4;color:var(--code-normal,var(--text-normal));background:none;padding:0;text-shadow:none}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.comment{color:var(--epx-comment);font-style:italic}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.pretium{color:var(--epx-pretium);font-weight:700}:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.clause{color:var(--epx-clause);font-weight:700}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.keyword{color:var(--epx-keyword);font-weight:600}:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.judge{color:var(--epx-judge);font-weight:700}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.negPrefix{color:var(--epx-keyword);font-weight:700}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.function{color:var(--epx-verb)}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.spellRef{color:var(--epx-verb);font-weight:700}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.predicate{color:var(--epx-verb)}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.declaration{color:var(--epx-decl);font-weight:700}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.element{color:var(--epx-element);font-weight:600}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.type{color:var(--epx-type)}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.variable{color:var(--epx-variable);font-weight:600}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.unit{color:var(--epx-unit);font-style:italic}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.number{color:var(--epx-number)}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.rankRange{color:var(--epx-rank);font-weight:700}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.degree{color:var(--epx-degree);font-style:italic}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.axis{color:var(--epx-axis)}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.pointer{color:var(--epx-pointer);font-weight:700}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.coordRun{color:var(--text-muted);font-weight:600}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.modifier{color:var(--epx-modifier);font-style:italic;font-weight:600}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.declTarget{color:var(--epx-variable);font-weight:600}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.varUse{color:var(--epx-variable)}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.operator{color:var(--epx-operator)}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.bracket{color:var(--epx-bracket);color:color-mix(in srgb,var(--color-cyan) 40%,var(--text-muted));font-weight:600}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.paren{color:var(--epx-paren)}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.brace{color:var(--epx-brace)}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.punctuation{color:var(--epx-punct)}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.epx-d2{color:var(--epx-b2);color:color-mix(in srgb,var(--color-pink) 35%,var(--text-muted))}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.epx-d3{color:var(--epx-b3);color:color-mix(in srgb,var(--color-green) 35%,var(--text-muted))}\nbody.theme-light :is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.declaration{color:#7e691f;color:color-mix(in srgb,var(--color-yellow) 45%,var(--text-normal))}\nbody.theme-light :is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.element,body.theme-light :is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.type{color:#17797a;color:color-mix(in srgb,var(--color-cyan) 50%,var(--text-normal))}\nbody.theme-light :is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.unit,body.theme-light :is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.number,body.theme-light :is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.rankRange{color:#a05b16;color:color-mix(in srgb,var(--color-orange) 60%,var(--text-normal))}\nbody.theme-light :is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.axis{color:#197d44;color:color-mix(in srgb,var(--color-green) 55%,var(--text-normal))}\nbody.theme-light :is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.degree,body.theme-light :is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.variable,body.theme-light :is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.declTarget,body.theme-light :is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.varUse{color:#c4387c;color:color-mix(in srgb,var(--color-pink) 90%,var(--text-normal))}\nbody.theme-light :is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.pretium,body.theme-light :is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.clause,body.theme-light :is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.modifier{color:#cd3145;color:color-mix(in srgb,var(--color-red) 85%,var(--text-normal))}\n:is(code[class*=\"language-EpXsC\" i], .epx-ord) .token.epx-unknown{text-decoration:underline dotted var(--color-orange);text-underline-offset:.2em}\n.epx-tip{position:fixed;z-index:9999;max-width:340px;padding:7px 11px;border:1px solid var(--background-modifier-border);border-radius:var(--radius-s);background:var(--background-secondary);color:var(--text-normal);font-family:var(--font-interface);font-size:12px;line-height:1.5;box-shadow:var(--shadow-s);pointer-events:none;opacity:0}\n.epx-tip.is-visible{opacity:1}\n.epx-tip .epx-tip-head{font-weight:600;color:var(--text-accent)}\n.epx-tip .epx-tip-body{color:var(--text-muted)}\n/* 普通句块：外框 + 右上角语言签，跟术式块同形，只按模式换色（G 青 · T 橙）\n   外层是 code.language-EpXsC：token 配色与悬停沿用术式那套选择器，这里只管版面。 */\n.epx-ord {\n  --epx-ord-tint: var(--color-cyan);\n  display: block;\n  position: relative;\n  line-height: 1.9;\n  padding: 1.1em 1.15em 1.15em;\n  background: var(--code-background);\n  border: 1px solid var(--background-modifier-border);\n  border-left: 3px solid var(--epx-ord-tint);\n  border-radius: var(--radius-m);\n  box-shadow: 0 1px 2px rgb(0 0 0 / 6%);\n}\n.epx-ord-T { --epx-ord-tint: var(--color-orange); }\n.epx-ord::before {\n  content: \"EpXsG\";\n  position: absolute;\n  inset: 0 0 auto auto;\n  padding: 0 0.7em;\n  font-family: var(--font-interface);\n  font-size: 0.62em;\n  font-weight: 600;\n  letter-spacing: 0.09em;\n  line-height: 1.8;\n  color: var(--epx-ord-tint);\n  background: var(--background-secondary);\n  background: color-mix(in srgb, var(--epx-ord-tint) 22%, var(--background-primary));\n  border-radius: 0 var(--radius-m) 0 var(--radius-s);\n  opacity: 0.95;\n  pointer-events: none;\n  user-select: none;\n}\n.epx-ord-T::before { content: \"EpXsT\"; }\n/* 词与词注都是 inline-block：必须 top 对齐，否则有词注的词被顶高、整行字上下跳。 */\n.epx-oline { display: block; margin: .18em 0; }\n.epx-gs { display: block; }\n.epx-gw { display: inline-block; text-align: center; margin: 0 .16em; vertical-align: top; }\n.epx-gsrc { display: block; line-height: 1.3; }\n.epx-ggl { display: block; font-size: .74em; line-height: 1.2; opacity: .7; font-family: var(--font-text); }\n.epx-tsrc { display: block; }\n.epx-tzh { display: block; font-family: var(--font-text); opacity: .78; font-size: .92em; }\n.epx-gap { display: block; height: .45em; }\n.epx-ord-wrap { display: block; }\n/* 有些主题会给块级元素继承首行缩进；T/G 是代码块，首行必须贴左 */\n.epx-ord, .epx-ord .epx-oline, .epx-ord .epx-tsrc, .epx-ord .epx-tzh { text-indent: 0; }\n.epx-ord { padding: 1.1em 1.15em 1.15em !important; }\n@media (max-width: 640px) { .epx-ord { padding: 0 0.9em 0.9em !important; } }\n.epx-ord > .epx-oline:first-child { margin-top: 0; }\n.epx-ord { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }\n@media (max-width:640px){.epx-ord,pre.epx-pre{white-space:pre-wrap;overflow-wrap:break-word;padding:0 .9em .9em}.epx-ord{line-height:1.8}.epx-ord::before,pre.epx-pre::before{position:static;display:block;margin:0 -.9em .75em;padding:.22em .9em;text-align:right;line-height:1.7;border-radius:var(--radius-m) var(--radius-m) 0 0;opacity:1}.epx-ggl{line-height:1.25}.epx-tzh{margin-top:.15em}}";

const varTypesOf = new WeakMap();
/* 术式登记表（refresh 时填充）：提示与检查都用它 */
let spellRegistry = new Map();

let tipNode = null;

function ensureTipNode() {
  if (tipNode && tipNode.parentNode) return tipNode;
  tipNode = document.createElement('div');
  tipNode.className = 'epx-tip';
  const s = tipNode.style;
  s.position = 'fixed';
  s.zIndex = '9999';
  s.pointerEvents = 'none';
  s.opacity = '0';
  /* 浮层的观感也自己带一份：外部样式表万一没生效，它就不会变成裸文本留在页面上 */
  s.maxWidth = 'min(480px, 80vw)';
  s.padding = '10px 14px';
  s.border = '1px solid var(--background-modifier-border)';
  s.borderRadius = 'var(--radius-s, 6px)';
  s.background = 'var(--background-secondary)';
  s.color = 'var(--text-normal)';
  s.fontFamily = 'var(--font-interface)';
  s.fontSize = '13px';
  s.lineHeight = '1.5';
  s.boxShadow = 'var(--shadow-s, 0 2px 8px rgba(0,0,0,.25))';
  s.transition = 'opacity 90ms ease';
  document.body.appendChild(tipNode);
  return tipNode;
}

/* 跟随光标摆位：默认右下，贴边就翻到另一侧 */
function showTipAt(x, y, tip) {
  const node = ensureTipNode();
  node.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'epx-tip-head';
  head.textContent = tip.label;
  node.appendChild(head);
  if (tip.body) {
    const bodyEl = document.createElement('div');
    bodyEl.className = 'epx-tip-body';
    bodyEl.textContent = tip.body;
    node.appendChild(bodyEl);
  }
  node.style.opacity = '1';
  node.classList.add('is-visible');
  const nr = node.getBoundingClientRect();
  const vw = window.innerWidth || 900;
  const vh = window.innerHeight || 600;
  let left = x + 14;
  if (left + nr.width > vw - 8) left = x - nr.width - 14;
  if (left < 8) left = 8;
  let top = y + 18;
  if (top + nr.height > vh - 8) top = y - nr.height - 12;
  if (top < 8) top = 8;
  node.style.left = Math.round(left) + 'px';
  node.style.top = Math.round(top) + 'px';
}

function hideTip() {
  if (tipNode) tipNode.style.opacity = '0';
  if (tipNode) tipNode.classList.remove('is-visible');
}

/* 阅读视图：命中 token 就按它的类别给提示；括号看语境，变量看本块声明 */
/* 相邻的 token 兄弟节点（跳过空白文本） */
function prevToken(el) {
  let n = el ? el.previousSibling : null;
  while (n && !(n.nodeType === 1 && n.classList && n.classList.contains('token'))) n = n.previousSibling;
  return n;
}
function nextToken(el) {
  let n = el ? el.nextSibling : null;
  while (n && !(n.nodeType === 1 && n.classList && n.classList.contains('token'))) n = n.nextSibling;
  return n;
}
/* 形如 元素^n 的阶位：返回 { elem, n }，否则 null */
function phaseOf(el) {
  const caret = prevToken(el);
  if (!caret || !caret.classList || !caret.classList.contains('operator') || String(caret.textContent).trim() !== '^') return null;
  const elem = prevToken(caret);
  if (!elem || !elem.classList || !elem.classList.contains('element')) return null;
  const nx = nextToken(caret);
  return { elem: String(elem.textContent || '').trim(), n: nx && nx.classList && nx.classList.contains('number') ? String(nx.textContent || '').trim() : '' };
}

function tipForElement(el, info, ranks) {
  let cls = pickClass(el.classList);
  if (cls === 'declTarget' || cls === 'varUse') cls = 'variable';
  if (!cls) return null;
  const text = el.textContent || '';
  const kind = el.getAttribute ? el.getAttribute('data-epx-kind') : '';
  if (kind && (cls === 'bracket' || cls === 'paren' || cls === 'brace')) return bracketTip(kind);
  const code = el.closest ? el.closest(':is(code[class*="language-EpXsC" i], .epx-ord)') : null;
  const vars = code ? varTypesOf.get(code) : null;
  if (vars && vars.has(text)) { const vt = variableTip(text, vars.get(text), info); if (vt) return vt; }
  if (cls === 'negPrefix') {
    const scope = negScopeText(el);
    const shown = scope.length > 24 ? scope.slice(0, 24) + '…' : scope;
    return {
      label: '前置否定 ne',
      body: '否定其后成分（同 !）' + (shown ? '：' + shown : '')
    };
  }
  if (cls === 'coordRun') return coordTip(text);
  /* ^ 有两种含义：跟在元素码之后是相位阶位，其余是局部坐标 */
  if (cls === 'operator' && text === '^') {
    /* ^ 本身：前面是元素码、后面跟数字，即为相位阶位 */
    const prev = prevToken(el);
    if (prev && prev.classList && prev.classList.contains('element')) {
      const nx = nextToken(el);
      const n = nx && nx.classList && nx.classList.contains('number') ? String(nx.textContent).trim() : '';
      return { label: '相位 eRk', body: '第 ' + (n || 'n') + ' 阶（' + String(prev.textContent || '').trim() + '）' };
    }
  }
  if (cls === 'number') {
    const ph = phaseOf(el);
    if (ph) return { label: '相位 eRk', body: '第 ' + String(text).trim() + ' 阶（' + ph.elem + '）' };
  }
  const sym = SYMBOL_INFO[text];
  if (sym && (cls === 'operator' || cls === 'punctuation' || cls === 'pointer')) return sym;
  if (cls === 'comment') return { label: '注释', body: '/* … */；// 不用（/ 是相变）' };
  if (cls === 'annotation') return { label: '注解行', body: '. 开头，不参与解析' };
  const group = el.closest ? el.closest('.token.indexGroup, .token.indexDecl') : null;
  if (group && cls === 'number') {
    const n = String(text).trim();
    if (group.classList.contains('indexDecl')) {
      return { label: '位数 ' + n, body: '列表容器的位数（长度）；冒号后是变量名。' };
    }
    const def = rankDef(n, ranks);
    return { label: '下标 ' + n, body: def ? '第 ' + n + ' 位；作用于实体时即它的第 ' + n + ' 秩 —— ' + def + '。' : '第 ' + n + ' 位（秩只有 1–9）。' };
  }
  if (cls === 'number') return { label: '数值', body: '有实数的量可以直接写算式。' };
  const tip = buildTip(cls, text, info, ranks, { spells: spellRegistry, sectionPos: SECTION_POS });
  if (tip) return tip;
  if (cls === 'word' && text.length >= 4 && !/[0-9]/.test(text)) {
    return { label: '未入典', body: '词典里没有这个词条' };
  }
  return null;
}

/* 光标下的那个词：实时预览里没有 token，只能按词查 */
function wordAtPoint(x, y) {
  let node = null;
  let offset = 0;
  if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    if (r) { node = r.startContainer; offset = r.startOffset; }
  } else if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    if (p) { node = p.offsetNode; offset = p.offset; }
  }
  if (!node || node.nodeType !== 3) return null;
  const text = node.nodeValue || '';
  const isWordChar = function (c) { return /[A-Za-z0-9_]/.test(c); };
  let i = offset;
  if (i >= text.length || !isWordChar(text.charAt(i))) {
    if (i > 0 && isWordChar(text.charAt(i - 1))) i -= 1;
    else return null;
  }
  let a = i;
  let b = i;
  while (a > 0 && isWordChar(text.charAt(a - 1))) a -= 1;
  while (b < text.length && isWordChar(text.charAt(b))) b += 1;
  return text.slice(a, b) || null;
}

/* 悬停位置是不是落在「EpXsC 家族」的代码块里：
   阅读视图看 language-EpXsC；实时预览沿代码行往回找围栏，只认 EpXsC/EpXsT/EpXsG。
   其它语言的代码块、没有语言标注的代码块，一律不给词条提示。 */
function epxFenceLang(text) {
  const s = String(text || '').replace(/\u200b/g, '');
  let i = 0;
  while (i < s.length && (s.charAt(i) === ' ' || s.charAt(i) === '\t')) i++;
  const ch = s.charAt(i);
  if (ch !== String.fromCharCode(96) && ch !== '~') return '';
  let j = i;
  while (j < s.length && s.charAt(j) === ch) j++;
  if (j - i < 3) return '';
  while (j < s.length && (s.charAt(j) === ' ' || s.charAt(j) === '\t')) j++;
  let k = j;
  while (k < s.length && /[A-Za-z0-9_+-]/.test(s.charAt(k))) k++;
  return s.slice(j, k).toLowerCase();
}
function liveCodeLang(el) {
  let line = el.closest('.HyperMD-codeblock');
  if (!line) return '';
  let cur = line;
  for (let n = 0; cur && n < 500; n++) {
    if (cur.classList && cur.classList.contains('HyperMD-codeblock-begin')) {
      return epxFenceLang(cur.textContent || '');
    }
    cur = cur.previousElementSibling;
    if (!cur || !cur.classList || !cur.classList.contains('HyperMD-codeblock')) return '';
  }
  return '';
}
function inCodeContext(el) {
  if (!el || !el.closest) return false;
  if (el.closest(':is(code[class*="language-EpXsC" i], .epx-ord)')) return true;
  const lang = liveCodeLang(el);
  return lang === 'epxsc' || lang === 'epxst' || lang === 'epxsg';
}
/* ── 普通句：EpXsG（语法标记）与 EpXsT（句子对译）──────────────────────
   两种都用同一套着色与悬停，但不做术式检查（不是术式）。
   写法：原文一行一句；译文紧接它所译的那句，两种写法都认——
     ① 以 > 开头的一行；② 紧跟原文行、含汉字的一行（「原文一行、译文一行」）。
   EpXsG：每个词下方自动标出词类（取《词典》），再列出译文。
   EpXsT：只做对译——原文一行、译文一行。
   ─────────────────────────────────────────────────────────────── */
const ORD_CLASS = 'language-EpXsC';          /* 沿用同一套 token 类，悬停与配色自动生效 */
const { renderOrdBlock, renderOrdBlockInner } = require('../renderers/ord-dom.js');

function bindClickToSource(target, app, el, ctx) {
  if (!target || !target.style || !target.addEventListener) return;
  target.style.cursor = 'text';
  target.addEventListener('click', function () {
    try {
      const view = app.workspace.getActiveViewOfType(MarkdownView);
      if (!view || !view.getMode || view.getMode() !== 'source' || !view.editor) return;
      const info = ctx && ctx.getSectionInfo ? ctx.getSectionInfo(el) : null;
      if (!info || typeof info.lineStart !== 'number') return;
      const last = (typeof info.lineEnd === 'number') ? info.lineEnd : info.lineStart + 1;
      view.editor.setCursor({ line: Math.min(info.lineStart + 1, last), ch: 0 });
      view.editor.focus();
    } catch (e) { /* 光标送不进去就算了，不影响渲染 */ }
  });
}

function detectLanguage(app) {
  try {
    if (app && typeof app.getLocale === 'function') {
      const loc = app.getLocale();
      if (loc) return loc;
    }
  } catch (e) { /* fall through */ }
  try {
    if (window.moment && typeof window.moment.locale === 'function') {
      const loc = window.moment.locale();
      if (loc) return loc;
    }
  } catch (e) { /* fall through */ }
  try {
    const loc = window.localStorage && window.localStorage.getItem('language');
    if (loc) return loc;
  } catch (e) { /* fall through */ }
  return (typeof navigator !== 'undefined' && navigator.language) || 'zh-CN';
}

class EpXsCSyntaxPlugin extends Plugin {
  onload() {
    const self = this;
    this.grammar = makeGrammar(BASE_LISTS);
    this.info = new Map();
    this.translationLanguage = detectLanguage(this.app);
    this.translationGrammarContext = DEFAULT_GRAMMAR_CONTEXT;
    this.settings = normalizeSettings(null);
    this.lexiconConflicts = [];
    this.customDictionaryErrors = [];
    this.ranks = new Map();
    for (const w in EXTRA_WORDS) this.info.set(w, EXTRA_WORDS[w]);
    this.install();
    this.addSettingTab(new EpXsSettingsTab(this.app, this));
    this.addRibbonIcon('languages', 'EpXsC 设置', function () { self.openSettings(); });
    this.addCommand({
      id: 'open-settings',
      name: '打开 EpXsC 设置',
      callback: function () { self.openSettings(); }
    });
    this.addCommand({
      id: 'reference-from-chinese',
      name: '从中文生成 EpXs 参考',
      callback: function () { new ReferenceModal(self.app, self).open(); }
    });
    this.loadData().then(function (data) {
      self.settings = normalizeSettings(data);
      self.translationLanguage = (self.settings.display.language !== 'auto') ? self.settings.display.language : detectLanguage(self.app);
      self.configureTranslation();
      self.getGrammarContext().then(function (g) { self.translationGrammarContext = g; });
      self.refresh();
    }).catch(function (err) { console.warn('[EpXsC Syntax] 设置读取失败，使用默认值：', err); });
    this.registerDomEvent(document, 'mouseover', function (ev) {
      hideTip();
      const el = ev.target;
      if (!el || !el.closest) return;
      const diag = el.closest('[data-epx-lint]');
      if (diag) {
        const msg = diag.getAttribute('data-epx-lint');
        if (msg) { showTipAt(ev.clientX, ev.clientY, { label: 'EpXsC 诊断', body: msg }); return; }
      }
      const token = el.closest('span.token');
      if (token && el.closest(':is(code[class*="language-EpXsC" i], .epx-ord)')) {
        const tip = tipForElement(token, self.info, self.ranks);
        if (tip) { showTipAt(ev.clientX, ev.clientY, tip); return; }
      }
      if (!inCodeContext(el)) return;
      const word = wordAtPoint(ev.clientX, ev.clientY);
      if (!word) return;
      const tip = buildTip('word', word, self.info, self.ranks);
      if (tip) showTipAt(ev.clientX, ev.clientY, tip);
    });
    this.registerDomEvent(document, 'click', function (ev) {
      const el = ev.target;
      if (!el || !el.closest) return;
      const diag = el.closest('[data-epx-lint]');
      if (!diag) return;
      const msg = diag.getAttribute('data-epx-lint');
      if (msg) showTipAt(ev.clientX, ev.clientY, { label: 'EpXsC 诊断', body: msg });
    });
    this.registerDomEvent(document, 'mouseout', hideTip);
    this.registerDomEvent(document, 'scroll', hideTip, true);
    this.addCommand({
      id: 'reload-self',
      name: '重载 EpXsC 插件（提示手动重载）',
      callback: function () {
        new Notice('请在 设置 → 社区插件 中关闭再启用 EpXsC Syntax。');
      }
    });
    this.addCommand({
      id: 'diagnose',
      name: 'EpXsC 诊断报告（写进库根目录，便于整段复制）',
      callback: function () { self.diagnose(); }
    });
    this.addCommand({
      id: 'lint-note',
      name: '检查当前笔记的 EpXsC 代码块',
      callback: function () { self.lintActiveNote(); }
    });
    this.addCommand({
      id: 'self-check',
      name: 'EpXsC 自检（视图／token／颜色／样式表）',
      callback: function () { self.selfCheck(); }
    });
    this.register(function () {
      const Prism = window.Prism;
      if (!Prism || !Prism.languages) return;
      for (let i = 0; i < LANG_KEYS.length; i++) delete Prism.languages[LANG_KEYS[i]];
    });
    this.registerMarkdownPostProcessor(function (el) { self.highlightIn(el); });
    const status = this.addStatusBarItem();
    status.addClass('epx-status');
    status.style.display = 'none';
    this._statusBar = status;
    status.addEventListener('click', function () { self.lintActiveNote(); });
    const scheduleStatus = function () {
      if (self._statusTimer) window.clearTimeout(self._statusTimer);
      self._statusTimer = window.setTimeout(function () { self.updateDiagnosticsStatus(); }, 350);
    };
    this.registerEvent(this.app.workspace.on('active-leaf-change', scheduleStatus));
    this.registerEvent(this.app.vault.on('modify', function (file) {
      if (file && file === self.app.workspace.getActiveFile()) scheduleStatus();
    }));
    this.register(function () { if (self._statusTimer) window.clearTimeout(self._statusTimer); });
    /* 代码块处理器：Obsidian 的公开稳定 API（Mermaid／Dataview 同一条路），
       阅读视图与实时预览都会走它。实时预览里代码块本就「光标不在其中时渲染、进去显示源码」，
       所以这条路上色不需要碰 CodeMirror，也不受 CM6 版本变动影响。 */
    const renderBlock = function (source, el, ctx) {
      try {
        if (el && el.empty) el.empty();
        else if (el) el.textContent = '';
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.className = 'language-EpXsC';
        code.__epxLintSource = source;
        code.__epxLintPath = (ctx && ctx.sourcePath) || '';
        code.textContent = source;
        pre.appendChild(code);
        el.appendChild(pre);
        self.highlightOne(code);
        bindClickToSource(pre, self.app, el, ctx);
      } catch (err) {
        console.warn('[EpXsC Syntax] 代码块渲染失败：', err);
        if (el && el.createEl) el.createEl('pre', { text: source });
      }
    };
    this.registerMarkdownCodeBlockProcessor('EpXsC', renderBlock);
    this.registerMarkdownCodeBlockProcessor('epxsc', renderBlock);
    this.registerMarkdownCodeBlockProcessor('EPXSC', renderBlock);
    /* 普通句：语法标记 / 句子对译。
       Obsidian 的代码块处理器签名是 (source, el, ctx) —— 第一个参数是源码、第二个才是容器元素。
       这里必须按 (source, el) 接参数，否则 el 拿到的是字符串，innerHTML 赋值会在严格模式下抛
       TypeError（表现为代码块显示「渲染错误」）。 */
    const ord = function (source, el, ctx, mode) {
      el.__epxOrd = { source: source, mode: mode, ctx: ctx };
      renderOrdBlock(el, source, mode, self.grammar, self.info, self.getTranslationRenderOptions());
      try {
        if (self.settings.diagnostics.enabled) {
          self.markUnknownTokens(el);
          self.decorateOrdLint(el, self.lintForSource(source, ctx && ctx.sourcePath));
        }
      } catch (e) { /* best effort */ }
      bindClickToSource(el, self.app, el, ctx);
    };
    const ordG = (source, el, ctx) => ord(source, el, ctx, 'G');
    const ordT = (source, el, ctx) => ord(source, el, ctx, 'T');
    for (const lang of ['EpXsG', 'epxsg', 'EPXSG']) this.registerMarkdownCodeBlockProcessor(lang, ordG);
    for (const lang of ['EpXsT', 'epxst', 'EPXST']) this.registerMarkdownCodeBlockProcessor(lang, ordT);
    const isDataFile = function (file) {
      if (!file || !file.path) return false;
      const customPaths = (self.settings && self.settings.lexicon && self.settings.lexicon.customPaths) || [];
      return file.path === DICT_PATH || file.path === SYNTAX_PATH || file.path === RANK_PATH ||
        file.path.indexOf(ROOTS_DIR) === 0 || file.path.indexOf(SPELL_DIR) === 0 ||
        customPaths.indexOf(file.path) >= 0;
    };
    const refreshScheduler = new RefreshScheduler(function () { self.refresh(); }, 300);
    const scheduleRefresh = function () { refreshScheduler.request(); };
    const onDataEvent = function (file) { if (isDataFile(file)) scheduleRefresh(); };
    this.registerEvent(this.app.vault.on('modify', onDataEvent));
    this.registerEvent(this.app.vault.on('create', onDataEvent));
    this.registerEvent(this.app.vault.on('delete', onDataEvent));
    this.registerEvent(this.app.vault.on('rename', function (file, oldPath) {
      if (isDataFile(file) || (oldPath && isDataFile({ path: oldPath }))) scheduleRefresh();
    }));
    this.register(function () { refreshScheduler.cancel(); });
    this.addCommand({
      id: 'reload-lexicon',
      name: '重新载入词表与释义',
      callback: function () { self.refresh(); }
    });
    this.app.workspace.onLayoutReady(function () { self.refresh(); });
    /* 启动期多补几次，之后靠事件与看门狗兜底 */
    const early = [400, 1500];
    for (let i = 0; i < early.length; i++) {
      const t = window.setTimeout(function () { self.ensureRendered(); }, early[i]);
      this.register(function () { window.clearTimeout(t); });
    }
    this.registerEvent(this.app.workspace.on('layout-change', function () { self.ensureRendered(); }));
    this.registerEvent(this.app.workspace.on('active-leaf-change', function () { self.ensureRendered(); }));
    this.registerInterval(window.setInterval(function () { self.ensureRendered(); }, 2500));
  }

  getRequestedLanguage() {
    const set = this.settings && this.settings.display && this.settings.display.language;
    return (set && set !== 'auto') ? set : this.translationLanguage;
  }

  getFallbackLanguage() {
    return (this.settings && this.settings.display && this.settings.display.fallbackLanguage) || '';
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.configureTranslation();
    await this.refresh();
  }

  configureTranslation() {
    const tr = this.settings && this.settings.translation;
    if (!tr || tr.enabled !== true) {
      this.translationService = null;
      this.translationProvider = null;
      this.referenceService = null;
      this.translationConfigError = '';
      return false;
    }
    const cfg = normalizeProviderConfig(tr.provider);
    const check = validateProviderConfig(cfg);
    if (!check.ok) {
      this.translationService = null;
      this.translationProvider = null;
      this.referenceService = null;
      this.translationConfigError = check.message;
      return false;
    }
    const self = this;
    const provider = createOpenAICompatibleProvider({
      config: cfg,
      request: async function (req) {
        const res = await requestUrl({ url: req.url, method: req.method, headers: req.headers, body: req.body, throw: false });
        return { status: res.status, json: res.json, text: res.text };
      }
    });
    this.translationProvider = provider;
    this.translationService = createTranslationService({ provider: provider, timeoutMs: cfg.timeoutMs });
    this.referenceService = createReferenceService({ provider: provider });
    this.translationConfigError = '';
    return true;
  }

  getDictionaryContext(limit) {
    const max = Number(limit) > 0 ? Number(limit) : 120;
    const parts = [];
    let n = 0;
    this.info.forEach(function (v, k) {
      if (n >= max) return;
      parts.push(k + '=' + (v.meaning || ''));
      n += 1;
    });
    return parts.join('; ');
  }

  extractGrammarContext(text) {
    const src = String(text || '');
    const parts = src.split(/^## /m);
    const wanted = [];
    for (let i = 0; i < parts.length; i++) {
      const head = parts[i].split('\n')[0] || '';
      if (/句子|语序|名词短语|短语|修饰|从句|构词|词类|限定|数量|代词|否定|谓词|宾语/.test(head)) wanted.push(parts[i]);
    }
    const picked = wanted.length ? wanted.join('\n## ') : src;
    return picked.slice(0, 6000);
  }

  async getGrammarContext() {
    const custom = this.settings && this.settings.translation && this.settings.translation.grammarPath;
    if (!custom) return DEFAULT_GRAMMAR_CONTEXT;
    try {
      const file = this.app.vault.getAbstractFileByPath(custom);
      let text = '';
      if (file instanceof TFile) text = await this.app.vault.cachedRead(file);
      else if (this.app.vault.adapter) text = await this.app.vault.adapter.read(custom);
      return extractGrammarContext(text);
    } catch (e) {
      return DEFAULT_GRAMMAR_CONTEXT;
    }
  }
  getReferenceDictionaryContext(chinese) {
    const chars = new Set();
    const src = String(chinese || '');
    for (let i = 0; i < src.length; i++) {
      if (/[\u3400-\u9fff]/.test(src.charAt(i))) chars.add(src.charAt(i));
    }
    const out = [];
    if (chars.size) {
      this.info.forEach(function (v, k) {
        const meaning = String(v.meaning || '');
        let hit = false;
        chars.forEach(function (c) { if (meaning.indexOf(c) >= 0) hit = true; });
        if (hit && out.length < 80) out.push(k + ' = ' + meaning);
      });
    }
    if (!out.length) return this.getDictionaryContext(80);
    return out.join('; ');
  }

  async generateReference(chinese) {
    if (!this.referenceService) this.configureTranslation();
    if (!this.referenceService) {
      return { ok: false, error: { code: 'NOT_CONFIGURED', message: this.translationConfigError || '请先在设置中启用翻译模型' } };
    }
    const self = this;
    const analyze = function (reference) {
      const words = String(reference || '').match(/[A-Za-z][A-Za-z0-9_-]*|[\u3400-\u9fff]/g) || [];
      const wordBreakdown = [];
      const unknownWords = [];
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const e = self.info.get(w.toLowerCase()) || self.info.get(w);
        wordBreakdown.push({ text: w, gloss: e ? e.meaning : '', offset: i });
        if (!e) unknownWords.push({ text: w, line: 1, column: 0 });
      }
      const issues = lintSource(reference, { info: self.info, units: self.units, keys: self.keys, spells: self.spells }, 'reference');
      return { wordBreakdown: wordBreakdown, unknownWords: unknownWords, lint: issues };
    };
    const grammarContext = await this.getGrammarContext();
    return await this.referenceService.generate({
      chinese: chinese,
      grammarContext: grammarContext,
      dictionaryContext: this.getReferenceDictionaryContext(chinese),
      analyze: analyze
    });
  }

  getTranslationContext(text) {
    const words = String(text || '').match(/[A-Za-z][A-Za-z0-9_-]*/g) || [];
    const seen = new Set();
    const parts = [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i].toLowerCase();
      if (seen.has(w)) continue;
      seen.add(w);
      const e = this.info.get(w);
      if (e) parts.push(words[i] + ' = ' + (e.meaning || e.pos || ''));
    }
    return parts.join('; ');
  }

  getTranslationRenderOptions() {
    return {
      requestedLanguage: this.getRequestedLanguage(),
      fallbackLanguage: this.getFallbackLanguage(),
      autoTranslate: !!(this.settings && this.settings.translation && this.settings.translation.enabled),
      translationService: this.translationService || null,
      lexiconVersion: this.lexiconVersion || '',
      grammarContext: this.translationGrammarContext || DEFAULT_GRAMMAR_CONTEXT,
      translationContext: (text) => this.getTranslationContext(text)
    };
  }

  async testTranslation() {
    if (!this.configureTranslation() || !this.translationService) {
      return { ok: false, error: { code: 'NOT_CONFIGURED', message: this.translationConfigError || '翻译未启用或配置不完整' } };
    }
    return await this.translationService.translate({ text: 'Plur Aqua', sourceLang: 'epxsc', targetLanguage: this.getRequestedLanguage() || 'zh-CN', lexiconVersion: this.lexiconVersion || '' });
  }

  async openSettings() {
    try {
      const setting = this.app.setting;
      if (!setting) {
        new Notice('请打开 设置 → 第三方插件 → EpXsC Syntax。');
        return;
      }
      if (typeof setting.open === 'function') {
        const opening = setting.open();
        if (opening && typeof opening.then === 'function') await opening;
      }
      if (typeof setting.openTabById !== 'function') {
        new Notice('已打开设置，请在 第三方插件 中找到 EpXsC Syntax。');
        return;
      }
      const tab = setting.openTabById(this.manifest.id);
      if (!tab) {
        window.setTimeout(() => {
          try { setting.openTabById(this.manifest.id); } catch (e) { /* noop */ }
        }, 50);
      }
    } catch (err) {
      console.warn('[EpXsC Syntax] 无法直接打开设置页：', err);
      new Notice('请打开 设置 → 第三方插件 → EpXsC Syntax。');
    }
  }

  install() {
    const Prism = window.Prism;
    if (!Prism || !Prism.languages) return false;
    for (let i = 0; i < LANG_KEYS.length; i++) Prism.languages[LANG_KEYS[i]] = this.grammar;
    return true;
  }

  /* 只遍历指定目录（而不是 getFiles 全库枚举），降低插件对库的可见面 */
  mdFilesUnder(dir) {
    const folder = this.app.vault.getAbstractFileByPath(dir);
    if (!(folder instanceof TFolder)) return [];
    const out = [];
    const walk = function (node) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child instanceof TFile && child.extension === 'md') out.push(child);
        else if (child instanceof TFolder) walk(child);
      }
    };
    walk(folder);
    return out;
  }

  /* 读词典 → 重建词表 → 重新上色 */
  /* 读库内文件；哪一份读不到（别人下载的库）就用内置快照兜底。
     库内文件永远优先，所以词典一改，着色与释义就跟着改。 */
  async refresh() {
    const gen = (this._refreshGen = (this._refreshGen || 0) + 1);
    const snapshot = await buildLexiconSnapshot({
      readFile: async (path) => {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) return await this.app.vault.cachedRead(file);
        /* Imported lexicons can live under the plugin directory, outside the vault index. */
        try {
          if (this.app.vault.adapter && typeof this.app.vault.adapter.read === 'function') {
            return await this.app.vault.adapter.read(path);
          }
        } catch (e) { /* missing */ }
        return null;
      },
      listMarkdown: (dir) => this.mdFilesUnder(dir).map(function (file) { return file.path; }),
      warn: function (err) { console.warn('[EpXsC Syntax] 读取库内词库失败，改用内置快照：', err); }
    }, { DICT_PATH, RANK_PATH, SYNTAX_PATH, ROOTS_DIR, SPELL_DIR }, BUILTIN_LEXICON, EXTRA_WORDS, { customDictPaths: this.settings.lexicon.customPaths });
    if (gen !== this._refreshGen) return;

    this.spells = snapshot.spells;
    spellRegistry = snapshot.spells;
    this.lexiconVersion = snapshot.lexiconVersion || '';
    this.info = snapshot.info;
    this.ranks = snapshot.ranks;
    this.roots = snapshot.roots;
    this.units = snapshot.units;
    this.keys = snapshot.keys;
    this.lexiconConflicts = snapshot.dictionaryConflicts || [];
    this.customDictionaryErrors = snapshot.customDictionaryErrors || [];
    this.grammar = makeGrammar(snapshot.lists, Array.from(snapshot.keyWords));
    this.install();
    if (window.__epxscDebug) console.log('[EpXsC Syntax] 词条 ' + this.info.size + ' · 词根 ' + this.roots.size + ' · 秩 ' + this.ranks.size + '（' + snapshot.lists.predicate.length + ' 个谓词）');
    await Promise.race([
      this.ensureStyles(),
      new Promise(function (resolve) { window.setTimeout(function () { resolve('样式步骤超时，跳过'); }, 2000); })
    ]);
    this.rehighlight();
    this.updateDiagnosticsStatus();
  }

  /* 样式兜底：外部 styles.css 没被加载时（颜色、右上角 EpXsC 标记、未入典点线、
     悬停浮层样式会一起消失），自己把样式塞进页面。先试读插件目录里的 styles.css，读不到就用内置那份。 */
  async ensureStyles() {
    if (this._styleState) return this._styleState;
    /* 第一步：无条件把内置配色挂上去 —— 不依赖任何读取，绝不空手而归。
       这样即使读文件卡住或失败，颜色、代码块标记、浮层样式也一定在。 */
    let el = null;
    try {
      el = document.getElementById('epxsc-styles');
      if (!el) { el = document.createElement('style'); el.id = 'epxsc-styles'; document.head.appendChild(el); }
      el.textContent = FALLBACK_CSS;
      this._styleState = '已注入内置配色';
    } catch (e) {
      this._styleState = '注入失败：' + (e && e.message);
      return this._styleState;
    }
    /* 第二步：若能读到插件目录里的 styles.css（更完整，含语法检查面板等），就换成它。
       1.5 秒读不到就算了 —— 内置那份已经在生效。 */
    try {
      const dir = (this.manifest && this.manifest.dir) || '.obsidian/plugins/epxsc-syntax';
      const css = await Promise.race([
        this.app.vault.adapter.read(dir + '/styles.css'),
        new Promise(function (resolve) { window.setTimeout(function () { resolve(''); }, 1500); })
      ]);
      if (css && css.indexOf('.epx-tip') >= 0) {
        el.textContent = css;
        this._styleState = '已用插件目录里的 styles.css';
      }
    } catch (e) { /* 保持内置那份 */ }
    return this._styleState;
  }
  /* 生成诊断报告，写进库里，便于整段复制出来 */
  async diagnose() { return diagnose(this, BUILD); }

  async updateDiagnosticsStatus() {
    const status = this._statusBar;
    if (!status) return;
    if (!this.settings || !this.settings.diagnostics || !this.settings.diagnostics.enabled) {
      status.style.display = 'none';
      return;
    }
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !view.file) { status.style.display = 'none'; return; }
    try {
      const text = await this.app.vault.cachedRead(view.file);
      const snapshot = { info: this.info, units: this.units, keys: this.keys, spells: this.spells };
      const blocks = extractEpXsCBlocks(text);
      let errors = 0;
      let warnings = 0;
      for (let b = 0; b < blocks.length; b++) {
        const found = lintSource(blocks[b].source, snapshot, view.file.path);
        for (let i = 0; i < found.length; i++) {
          if (found[i].level === 'error') errors += 1; else warnings += 1;
        }
      }
      status.textContent = 'EpXsC: ' + errors + ' 错误 / ' + warnings + ' 警告';
      status.style.display = '';
      status.title = '点击打开当前笔记的 EpXsC 诊断';
    } catch (e) {
      status.style.display = 'none';
    }
  }

  /* 检查当前笔记里的 EpXsC 代码块 */
  async lintActiveNote() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !view.file) { new Notice('先打开一篇笔记再检查。'); return; }
    const file = view.file;
    const text = await this.app.vault.cachedRead(file);
    /* 带上术式登记表与当前笔记路径：越权检查要按「同一文件且同一行范围」判定 */
    const snapshot = { info: this.info, units: this.units, keys: this.keys, spells: this.spells };
    const blocksFound = extractEpXsCBlocks(text);
    const blocks = blocksFound.length;
    const issues = [];
    for (let b = 0; b < blocksFound.length; b++) {
      const found = lintSource(blocksFound[b].source, snapshot, file.path);
      for (let i = 0; i < found.length; i++) {
        issues.push({ level: found[i].level, line: blocksFound[b].line + found[i].line, message: found[i].message });
      }
    }
    if (!blocks) { new Notice('这一页没有 EpXsC 代码块。'); return; }
    new LintModal(this.app, file, issues, blocks).open();
  }

  /* 把 ne 之后、直到子句末尾的 token 标出来：被否定的范围 */
  markNegation(code) {
    const heads = code.querySelectorAll('span.token.negPrefix');
    for (let i = 0; i < heads.length; i++) {
      let node = heads[i].nextSibling;
      let guard = 0;
      while (node && guard < 40) {
        guard += 1;
        const t = node.textContent || '';
        if (/[;,\n]/.test(t)) break;
        if (node.nodeType === 1 && node.classList && node.classList.contains('token')) node.classList.add('epx-neg-scope');
        node = node.nextSibling;
      }
    }
  }

  markUnknownTokens(root) {
    const spans = root.querySelectorAll('span.token.word');
    for (let i = 0; i < spans.length; i++) {
      const w = (spans[i].textContent || '').toLowerCase();
      if (w.length < 4 || /[0-9]/.test(w)) continue;
      if (this.info.has(w)) continue;
      spans[i].classList.add('epx-unknown');
      const msg = '未入典：' + spans[i].textContent;
      spans[i].setAttribute('data-epx-lint', msg);
      spans[i].setAttribute('aria-label', msg);
    }
  }

  markUnknown(code) { this.markUnknownTokens(code); }

  lintForSource(source, path) {
    return lintSource(source, { info: this.info, units: this.units, keys: this.keys, spells: this.spells }, path || '');
  }

  decorateLint(code, issues) {
    if (!code || !issues || !issues.length) return;
    const sourceLines = (code.textContent || '').split('\n').length;
    const parts = (code.innerHTML || '').split('\n');
    if (parts.length !== sourceLines) return;
    const byLine = new Map();
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      const n = Number(issue.line);
      if (!n || n < 1) continue;
      if (!byLine.has(n)) byLine.set(n, []);
      byLine.get(n).push(issue);
    }
    code.innerHTML = parts.map(function (html, i) {
      const n = i + 1;
      const list = byLine.get(n);
      const level = list && list.length ? (list.some(function (x) { return x.level === 'error'; }) ? 'error' : 'warn') : '';
      const title = list && list.length ? list.map(function (x) { return x.message + (x.approximate ? '（此行附近）' : ''); }).join('\n') : '';
      return '<span class="epx-code-line' + (level ? ' epx-lint-' + level : '') + '" data-epx-line="' + n + '"' + (title ? ' data-epx-lint="' + title.replace(/"/g, '&quot;') + '" aria-label="' + title.replace(/"/g, '&quot;') + '"' : '') + '>' + (html || ' ') + '</span>';
    }).join('\n');
  }

  decorateOrdLint(el, issues) {
    if (!el || !issues || !issues.length) return;
    const lines = el.querySelectorAll('.epx-oline');
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      const line = lines[Number(issue.line) - 1];
      if (!line) continue;
      line.classList.add('epx-lint-' + (issue.level === 'error' ? 'error' : 'warn'));
      const msg = issue.message + (issue.approximate ? '（此行附近）' : '');
      const old = line.getAttribute('data-epx-lint') || '';
      line.setAttribute('data-epx-lint', old ? old + '\n' + msg : msg);
      line.setAttribute('aria-label', line.getAttribute('data-epx-lint'));
    }
  }

  /* 自检：当前视图里到底有没有 token、词表读进来没有 */
  selfCheck() { return selfCheck(this, BUILD); }

  rehighlight() {
    this.highlightIn(document);
    const wraps = document.querySelectorAll('.epx-ord-wrap');
    for (let i = 0; i < wraps.length; i++) {
      const wrap = wraps[i];
      const el = wrap.parentElement;
      const rec = el && el.__epxOrd;
      if (!rec) continue;
      try {
        renderOrdBlockInner(el, rec.source, rec.mode, this.grammar, this.info, this.getTranslationRenderOptions());
        bindClickToSource(el, this.app, el, rec.ctx);
      } catch (e) { /* keep previous render */ }
    }
  }

  highlightIn(root) {
    if (!root || !root.querySelectorAll) return;
    const nodes = root.querySelectorAll(CODE_SELECTOR);
    for (let i = 0; i < nodes.length; i++) this.highlightOne(nodes[i]);
  }

  /* 自愈：启动时首屏可能早于插件加载、或 window.Prism 尚未就绪，
     也可能被 Obsidian 的 Prism 初始化覆盖掉注册的语法。
     这里确认两件事：语法还在不在、该上色的块有没有 token。 */
  ensureRendered() {
    if (document.hidden) return;
    /* 自带切词器，不需要 window.Prism；若 Obsidian 恰好有 Prism，顺手把语法也注册上去 */
    if (window.Prism && window.Prism.languages && window.Prism.languages.EpXsC !== this.grammar) this.install();
    const nodes = document.querySelectorAll(CODE_SELECTOR);
    for (let i = 0; i < nodes.length; i++) {
      const code = nodes[i];
      if (code.classList && code.classList.contains('epx-ord')) continue;
      if (code.querySelector('span.token')) continue;
      if (!(code.textContent || '').trim()) continue;
      this.highlightOne(code);
    }
  }

  highlightOne(code) {
    try {
      if (code.parentElement && code.parentElement.tagName === 'PRE' && /language-EpXsC/i.test(code.className || '')) code.parentElement.classList.add('epx-pre');
    } catch (e) {}
    /* 普通句块（EpXsG／EpXsT）自己就是最终渲染结果，别当术式再过一遍切词，否则词表与对译会被冲掉 */
    if (code && code.classList && code.classList.contains('epx-ord')) return;
    try {
      const text = code.textContent || '';
      const found = /language-(\w+)/.exec(code.className || '');
      /* 样式选的是 language-EpXsC：万一 Obsidian 没给这个 class，token 会出来但不上色。
         补一个，让着色不悬在外部 class 上。 */
      if (!found && code.classList) code.classList.add('language-EpXsC');
      const rendered = renderEpXsC(text, this.grammar, this.info, MAX_HIGHLIGHT_LINES);
      if (rendered.skip) return;
      varTypesOf.set(code, rendered.vars);
      code.innerHTML = rendered.html;
      if (this.settings.diagnostics.enabled) this.markUnknown(code);
      this.markNegation(code);
      if (code.__epxLintSource && this.settings.diagnostics.enabled) {
        try { this.decorateLint(code, this.lintForSource(code.__epxLintSource, code.__epxLintPath)); } catch (e) { /* best effort */ }
      }
    } catch (err) {
      console.warn('[EpXsC Syntax]', err);
    }
  }
}

/* 逐层给括号打上 epx-d1 / d2 / d3（三层一循环，再深轮回第一层）。
   Prism 是逐位置的词法分析，数不了层数，所以在这一步扫一遍它产出的 HTML。 */
/* 字典的键：只在真正的字典字面量里改判。
   判据一：一层不跨行的 { } 段；判据二：{ 前面紧挨的那个 span 不是「词」（若前面是 clavis 这类词，
   那是容器型形参，里面的 言辞: Name 是「类型: 变量名」，不能当键）。
   段内凡「词 + 冒号」的那个词，一律改标为字典键（键原本可能被当成缩放轴／类型形参／变量）。 */
/* 内置词库快照：由 述无空语词典 / 术式语法 / 维度模型 / 词根表 生成。
   库内有对应文件时以文件为准，这份只在缺失时兜底。 */
const BUILTIN_LEXICON_RAW = require('../../data/builtin-lexicon.json');
const BUILTIN_LEXICON = (function () {
  const loaded = loadBuiltinLexicon(BUILTIN_LEXICON_RAW);
  if (!loaded.ok) console.warn('[EpXsC Syntax] 内置词库快照不可用：' + loaded.reason);
  return loaded.data;
})();

module.exports = EpXsCSyntaxPlugin;
