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

const { Plugin, TFile, TFolder, Notice, MarkdownView } = require('obsidian');
const { extractEpXsCBlocks } = require('../core/markdown-blocks.js');
const { loadBuiltinLexicon } = require('../data/lexicon.js');
const { RefreshScheduler } = require('../services/refresh-scheduler.js');
const { buildLexiconSnapshot } = require('../services/lexicon-service.js');
const { markSpellRefs, markVarUse, bracketKinds, parseVarTypes, markDictKeys, markBracketDepth } = require('../core/markup.js');
const { TYPES, MODIFIERS, makeGrammar, BASE_LISTS } = require('../core/grammar.js');
const { tokenizeText } = require('../core/tokenizer.js');
const { collectSpells } = require('../core/spells.js');
const { lintSource } = require('../services/lint-service.js');
const { renderEpXsC } = require('../renderers/epxsc-renderer.js');
const { parseOrdBlocks } = require('../renderers/ord-renderer.js');
const { LintModal } = require('../ui/lint-modal.js');
const { FALLBACK, SECTIONS, ELEMENTS, splitSections, parseEntries, parseRanks, parseFilterKeys, parseUnits, parseRoots, wordsFrom } = require('../data/parsers.js');

const LANG_KEYS = ['EpXsC', 'epxsc', 'EPXSC'];
const CODE_SELECTOR = 'code[class*="language-EpXsC" i]';
const { DICT_PATH, RANK_PATH, SYNTAX_PATH, ROOTS_DIR, SPELL_DIR, MAX_HIGHLIGHT_LINES } = require('./config.js');

const BUILD = '1.31.0';

/* 一个 token 可能带多个类（如 typeParam + type），按语义优先级取第一个 */
const CLASS_ORDER = ['rankRange', 'bracket', 'paren', 'brace', 'pointer', 'coordRun', 'negPrefix', 'modifier', 'declTarget', 'varUse', 'judge', 'clause', 'declaration', 'variable', 'type', 'element', 'unit', 'predicate', 'spellRef', 'function', 'keyword', 'pretium', 'degree', 'axis', 'number', 'comment', 'annotation', 'operator', 'punctuation', 'word'];

const CLASS_LABEL = {
  judge: '判断词',
  clause: '条款',
  modifier: '限定词',
  declTarget: '声明目标',
  negPrefix: '前置否定',
  declaration: '术式名',
  className: '类名',
  filterKey: '筛选键',
  filterValue: '筛选值',
  dictKey: '字典键',
  freqTag: '频段标签',
  spellRef: '术式引用',
  predicate: '谓词',
  function: '谓词调用',
  keyword: '',
  type: '类型名',
  element: '元素码',
  unit: '单位',
  number: '数值',
  degree: '程度词',
  axis: '缩放轴',
  pretium: '代价'
};

/* 词典暂未收、但术式里在用的词（补一条即可） */




const EXTRA_WORDS = {
  in: { word: 'in', pos: '介词', meaning: '在……里（词典暂未收录，按术式用法补）', abbr: '' },
  /* 第五章筛选键表：ordin= 的三个取值（词典未收，按表补） */
  proxim: { word: 'proxim', pos: '筛选值', meaning: '近（ordin= 的取值）', abbr: '' },
  procul: { word: 'procul', pos: '筛选值', meaning: '远（ordin= 的取值）', abbr: '' },
  temer: { word: 'temer', pos: '筛选值', meaning: '随机（ordin= 的取值）', abbr: '' }
};

const SECTION_POS = {
  '名词': '名词', '动词': '动词', '数词': '数词', '形容词': '形容词', '副词': '副词',
  '介词': '介词', '助动词': '助动词', '判断词': '判断词', '限定词': '限定词',
  '时间限定': '限定词', '数量与范围限定': '限定词', '指称限定': '限定词',
  '顺序限定': '限定词', '程度限定': '副词',
  '代词（人称）': '代词', '疑问词': '疑问词', '量词': '量词', '连接词与从句标记': '连接词',
  '族名': '名词', '动物名': '名词', '族、血统与分类': '名词',
  '地名与势力名': '专名', '地理 · 神宫 · 货币专名': '专名',
  '根词': '词根', '后缀': '后缀', '复合词': '复合词', '高频补充词': '补充词',
  '元素固定缩写': '元素', '术式关键词': '术式关键词', '单位': '单位'
};


function pickClass(classList) {
  for (let i = 0; i < CLASS_ORDER.length; i++) {
    if (classList.contains(CLASS_ORDER[i])) return CLASS_ORDER[i];
  }
  return null;
}

/* 已声明的变量，用在哪儿都按变量着色（C 风格：同名同色） */
const SYMBOL_INFO = {
  '!': { label: '运算符 !', body: '逻辑非（同 C；亦可用 ne）' },
  '&&': { label: '运算符 &&', body: '合取（常写作 kon）' },
  '||': { label: '运算符 ||', body: '包含或（常写作 aut）' },
  '^': { label: '运算符 ^', body: '局部坐标：受术者三轴，须写全' },
  '~': { label: '运算符 ~', body: '相对坐标：世界轴偏移，至少 X、Z' },
  '==': { label: '运算符 ==', body: '相等（亦有判断词 aude）' },
  '!=': { label: '运算符 !=', body: '不等' },
  '<=': { label: '运算符 <=', body: '不超过' },
  '>=': { label: '运算符 >=', body: '不少于' },
  '<': { label: '运算符 <', body: '小于' },
  '>': { label: '运算符 >', body: '大于' },
  '=': { label: '赋值 =', body: '写入变量（系词 es 表判断）' },
  '+=': { label: '复合算子 +=', body: '数值参数递增' },
  '-=': { label: '复合算子 -=', body: '数值参数递减' },
  '*=': { label: '复合算子 *=', body: '数值参数按倍率缩放' },
  '/=': { label: '复合算子 /=', body: '数值参数按比例缩小' },
  '+': { label: '运算符 +', body: '加' },
  '-': { label: '运算符 -', body: '减' },
  '*': { label: '运算符 *', body: '解引用（取地址用 &）' },
  '/': { label: '运算符 /', body: '除法；亦为相变' },
  '?': { label: '占位符 ?', body: '值在发动时定；作类型表待定' },
  '..': { label: '区间 ..', body: '两端为闭区间；亦可只写上界或下界' },
  '...': { label: '省略 ...', body: '列举未尽' },
  ';': { label: '分号 ;', body: '子句分隔（同换行）' },
  ',': { label: '逗号 ,', body: '并列；亦分隔形参' },
  ':': { label: '冒号 :', body: '下一层开始；亦分「类型: 变量」' },
  '&': { label: '取地址 &', body: '取得引用（地址即位置）' },
  '*&': { label: '取地址后解引用', body: '仍指该物本身' },
  '@': { label: '目标简写 @', body: '全形为 METOS[…]' }
}

const KIND_INFO = {
  '参数表': { label: '圆括号 · 参数表', body: '术式的形参表。写法为「类型: 变量名」，逗号分隔；类型可省，省了由术式自判。' },
  '实参表': { label: '圆括号 · 实参表', body: '调用谓词时给出的实参。谓词与实参平时靠并置，圆括号只在需要消歧时出现。' },
  '分组': { label: '圆括号 · 分组／元组', body: '括号内以逗号分隔即成元组；也用来显式指定求值顺序。' },
  '筛选值': { label: '方括号 · 筛选值', body: '筛选键的取值：列表或区间，按该键的规则解释。' },
  '筛选键表': { label: '方括号 · 筛选键表', body: '内为「键=值」，按条件筛出对象集；键名与含义见《述无空语术式语法》筛选键一节。' },
  '列表类型': { label: '方括号 · 列表类型', body: '方括号以冒号开头时表示列表容器，冒号后是元素类型。' },
  '位数声明': { label: '方括号 · 位数：变量', body: '括号内的冒号交代「哪一位：叫什么」——冒号前是位数，冒号后是变量名。' },
  '下标 · 秩': { label: '方括号 · 下标（秩）', body: '取该对象的第 n 秩；写成区间时指一段秩。' },
  '点名列表': { label: '方括号 · 点名列表', body: '把已取地址的对象逐个列出，只作用于这些目标。' },
  '目标集': { label: '方括号 · 目标集', body: 'siro 表示无目标（作用于环境），* 表示任意目标。' },
  '列表': { label: '方括号 · 列表', body: '容器类型由括号自己声明：圆括号是元组、方括号是列表、花括号是字典。' },
  '语块': { label: '花括号 · 语块', body: '划范围：触发、效果、能量、代价都写在里面。同一形状也兼作字典／映射。' }
};

function bracketTip(kind) {
  return KIND_INFO[kind] || { label: '括号', body: kind || '' };
}

/* 参数表里的「类型: 变量名」→ 变量 → 类型（两种语序都认） */
/* 从右侧写法推断这个变量是什么 */
/* 赋值绑定的类别说明（不举例子） */
const BIND_KIND = {
  '地址': '是个地址 —— & 取得的引用；设定里地址本身就是位置（第 1–3 秩）。',
  '实体': '是顺着引用取回的那物本身。',
  '对象集': '是目标对象集。',
  '列表': '是列表容器。',
  '元组': '是元组。',
  '字典': '是字典／映射。',
  '数值': '是数值。',
  '调用': '取的是谓词调用的结果，类别由该谓词决定。',
  '同前': '与右侧那个变量指同一物。',
  '未定': '由 = 绑定，右侧写法未给出可判定的类别。'
};

/* 限定词在提示里的说法（与 C 相当） */
const MOD_INFO = {
  priv: '私有：仅当前语块可见',
  tut: '受护：本语块及子块可见',
  publ: '公开：整个术式内可见',
  consta: '常数：不可再赋值'
};

function variableTip(name, binding, info) {
  if (!binding) return null;
  const mods = binding.modifiers || (binding.modifier ? [binding.modifier] : []);
  const modParts = [];
  for (let mi = 0; mi < mods.length; mi++) if (MOD_INFO[mods[mi]]) modParts.push(MOD_INFO[mods[mi]]);
  const mod = modParts.length ? modParts.join('；') + '；' : '';
  if (binding.type) {
    const entry = info && info.get(String(binding.type).toLowerCase());
    const detail = entry ? '（' + (entry.pos ? entry.pos + ' ' : '') + entry.meaning + '）' : '';
    const shape = binding.container ? '，' + binding.container + '容器，' + (binding.length ? '长度 ' + binding.length : '长度未定') : '';
    return { label: '变量 ' + name, body: mod + '类型 ' + binding.type + shape + detail };
  }
  if (binding.kind === '元素或类型') {
    const entry = info && info.get(String(binding.ref || '').toLowerCase());
    const detail = entry ? '（' + (entry.pos ? entry.pos + ' ' : '') + entry.meaning + '）' : '';
    return { label: '变量 ' + name, body: mod + '取 ' + binding.ref + detail + ' 本身' };
  }
  return { label: '变量 ' + name, body: mod + (BIND_KIND[binding.kind] || BIND_KIND['未定']) };
}

/* ne 之后被否定的那段文字：顺着 DOM 兄弟节点走到子句边界 */
function negScopeText(el) {
  let out = '';
  let node = el && el.nextSibling;
  let guard = 0;
  while (node && guard < 40) {
    guard += 1;
    const t = node.textContent || '';
    const cut = /[;,\n]/.exec(t);
    if (cut) { out += t.slice(0, cut.index); break; }
    out += t;
    node = node.nextSibling;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/* 坐标串：拆出每一轴的取值 */
const WORLD_AXES = ['X（东西）', 'Y（上下）', 'Z（南北）'];
const LOCAL_AXES = ['左（X）', '上（Y）', '前（Z）'];

function parseCoord(text) {
  const sign = text.charAt(0) === '~' ? '~' : '^';
  const parts = text.split(/[ \t]+(?=[~^])/);
  const values = [];
  for (let i = 0; i < parts.length; i++) {
    const m = /^[~^][ \t]*([-+]?\d+(?:\.\d+)?)?/.exec(parts[i]);
    values.push(m && m[1] ? m[1] : '0');
  }
  return { sign: sign, values: values };
}

/* 相对坐标 ~：世界轴，最多省到 (X, Z)；局部坐标 ^：朝向三轴，必须写全 */
function coordTip(text) {
  const c = parseCoord(text);
  const n = c.values.length;
  if (c.sign === '~') {
    if (n < 2) return { label: '相对坐标 ~（' + n + ' 轴）', body: '至少给 X 与 Z' };
    const names = n === 3 ? WORLD_AXES : (n === 2 ? [WORLD_AXES[0], WORLD_AXES[2]] : []);
    const shown = [];
    for (let i = 0; i < n; i++) shown.push((names[i] || ('第 ' + (i + 1) + ' 轴')) + ' ' + c.values[i]);
    return {
      label: '相对坐标 ~（' + n + ' 轴）',
      body: '世界轴：' + shown.join(' · ') + '（不随朝向变）'
    };
  }
  if (n !== 3) return { label: '局部坐标 ^（' + n + ' 轴）', body: '须写全三轴（左／上／前）' };
  const shown = [];
  for (let i = 0; i < 3; i++) shown.push(LOCAL_AXES[i] + ' ' + c.values[i]);
  return { label: '局部坐标 ^（3 轴）', body: '受术者三轴：' + shown.join(' · ') + '（随朝向变）' };
}

/* 单个秩的定义：先找同名行，再找覆盖它的区间行（1–3 这类） */
function rankDef(n, ranks) {
  if (!ranks) return '';
  const key = String(n);
  if (ranks.has(key)) return ranks.get(key);
  const num = parseInt(key, 10);
  if (!num) return '';
  let found = '';
  ranks.forEach(function (value, k) {
    if (found) return;
    const m = /^(\d+)[–-](\d+)$/.exec(k);
    if (m && num >= parseInt(m[1], 10) && num <= parseInt(m[2], 10)) found = value;
  });
  return found;
}

function rankSpan(a, b, ranks) {
  const lo = parseInt(a, 10);
  const hi = parseInt(b, 10);
  if (!lo || !hi || hi < lo || hi - lo > 8) return '';
  const parts = [];
  for (let n = lo; n <= hi; n++) {
    const r = ranks.get(String(n));
    if (!r) return '';
    const bits = String(r).split(' · ');
    parts.push(bits.length > 1 ? bits[bits.length - 1] : String(r));
  }
  return parts.join('，');
}

/* 纯函数：给定 token 类别与文本，返回 { label, body } 或 null（不给提示） */
/* 这些词虽登记在《词典》的「术式关键词」节，却不是条款 —— 悬停标签要分开 */
const WORD_KIND = {
  class: '语法词', hered: '语法词', campus: '结界类',
  protocol: '协议条款', clav: '协议条目', frequent: '协议条目', erk: '相位', impo: '语法词'
};
/* 个别类型词要补一句（词典释义只说词义，说不清它在类型里的职务） */
const TYPE_NOTES = {
  siro: 'void：无目标／无载体，可声明变量或直接占位'
};

function buildTip(cls, text, info, ranks) {
  /* 术式引用：登记表里有就说明可见性与形参，没有就点明未登记 */
  if (cls === 'spellRef' || cls === 'declaration') {
    const rec = spellRegistry.get(String(text));
    if (rec) {
      const vis = rec.visibility ? rec.visibility : '默认（块内可见）';
      const ps = (rec.params || []).map(function (p) {
        return ((p.modifiers || []).join(' ') ? (p.modifiers || []).join(' ') + ' ' : '') + (p.type ? p.type + ':' : '') + p.name;
      });
      return { label: (cls === 'spellRef' ? '术式引用' : '术式声明') + '：' + text,
        body: (rec.visibility ? rec.visibility : '默认') + (ps.length ? ' · 形参 ' + ps.length + '：' + ps.join('、') : ' · 无形参') };
    }
    if (cls === 'spellRef') return { label: '术式引用：' + text, body: '未登记' };
  }  if (cls === 'element') {
    const e = info.get(String(text)) || info.get(String(text).toLowerCase());
    const mean = e && e.meaning ? e.meaning : '';
    return { label: '元素码：' + text, body: (mean ? mean + ' · ' : '') + '类变量（单例）' };
  }
  if (cls === 'rankRange') {
    const m = /^(\d*)\.\.(\d*)$/.exec(text);
    const a = m ? m[1] : '';
    const b = m ? m[2] : '';
    if (a && b) {
      const span = ranks.get(a + '–' + b) || rankSpan(a, b, ranks);
      if (span) return { label: '秩 ' + a + '–' + b, body: span };
      return { label: '区间 ' + a + '–' + b, body: '距离／角度／量值' };
    }
    if (b) return { label: '至 ' + b, body: '不超过该数（含）' };
    if (a) return { label: '自 ' + a + ' 起', body: '自该处起（含）' };
    return { label: '区间', body: '术式里的 .. 区间写法' };
  }
  if (cls === 'bracket') return { label: '方括号', body: '列表 ／ 下标 ／ 秩' };
  if (cls === 'paren') return { label: '圆括号', body: '元组 · 分组 · 实参表' };
  if (cls === 'brace') return { label: '花括号', body: '语块（兼作字典／映射）' };
  if (cls === 'pointer') return { label: '指针', body: '& 取地址 · * 解引用 · @ 目标简写' };
  if (cls === 'declaration') return { label: '术式名', body: '本术式的声明名，后面跟参数表与语块' };
  if (!info) return null;
  const entry = info.get(String(text).toLowerCase());
  if (!entry) return null;
  const head = WORD_KIND[String(text).toLowerCase()] || (entry.kind
    ? '词根·' + entry.kind
    : (CLASS_LABEL[cls] || SECTION_POS[entry.pos] || entry.pos || '词条'));
  const raw = entry.abbr || '';
  const showAbbr = raw && raw !== '—' && raw !== '-' && raw.toLowerCase() !== String(text).toLowerCase();
  const note = TYPE_NOTES[String(text).toLowerCase()];
  return { label: head, body: entry.meaning + (note ? '；' + note : '') };
}

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
  s.maxWidth = '340px';
  s.padding = '7px 11px';
  s.border = '1px solid var(--background-modifier-border)';
  s.borderRadius = 'var(--radius-s, 6px)';
  s.background = 'var(--background-secondary)';
  s.color = 'var(--text-normal)';
  s.fontFamily = 'var(--font-interface)';
  s.fontSize = '12px';
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
  const tip = buildTip(cls, text, info, ranks);
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
function renderOrdBlockInner(el, source, mode, grammar, info) {
  const records = parseOrdBlocks(source, mode, grammar, info, SECTION_POS);
  const wrap = document.createElement('div');
  wrap.className = 'epx-ord-wrap';
  const code = document.createElement('div');
  code.className = 'epx-ord epx-ord-' + mode;
  wrap.appendChild(code);
  const appendHTML = function (parent, html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    parent.appendChild(tpl.content);
  };
  const lineEl = function () {
    const d = document.createElement('div');
    d.className = 'epx-oline';
    return d;
  };
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.kind === 'gap') {
      const gap = document.createElement('div');
      gap.className = 'epx-gap';
      code.appendChild(gap);
      continue;
    }
    const line = lineEl();
    if (mode === 'G') {
      const gs = document.createElement('div');
      gs.className = 'epx-gs';
      const toks = record.tokens || [];
      for (let j = 0; j < toks.length; j++) {
        const tok = toks[j];
        const gw = document.createElement('span');
        gw.className = 'epx-gw';
        const srcEl = document.createElement('span');
        srcEl.className = 'epx-gsrc token ' + tok.cls;
        srcEl.textContent = tok.text;
        gw.appendChild(srcEl);
        if (tok.gloss) {
          const gg = document.createElement('span');
          gg.className = 'epx-ggl';
          gg.textContent = tok.gloss;
          gw.appendChild(gg);
        }
        gs.appendChild(gw);
      }
      line.appendChild(gs);
    } else if (record.src) {
      const srcEl = document.createElement('div');
      srcEl.className = 'epx-tsrc';
      appendHTML(srcEl, record.html || '');
      line.appendChild(srcEl);
    }
    if (record.zh) {
      const zh = document.createElement('div');
      zh.className = 'epx-tzh';
      zh.textContent = record.zh;
      line.appendChild(zh);
    }
    code.appendChild(line);
  }
  el.textContent = '';
  el.appendChild(wrap);
}
/* 包一层：普通句渲染出错时退化成普通代码块，不要变成 Obsidian 的「代码块渲染错误」。 */
function renderOrdBlock(el, source, mode, grammar, info) {
  try {
    renderOrdBlockInner(el, source, mode, grammar, info);
  } catch (err) {
    console.warn('[EpXsC Syntax] 普通句渲染失败：', err);
    try {
      if (el && el.empty) el.empty();
      if (el && el.createEl) el.createEl('pre', { text: String(source || '') });
    } catch (e) { /* 兜底也失败就算了 */ }
  }
}

/* 实时预览里，被「代码块处理器」渲染出来的块是一个部件：点它不会自动回到源码。
   这里把光标送进块首，于是点一下（含双击的第一下）就能编辑；阅读视图不动。 */
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

class EpXsCSyntaxPlugin extends Plugin {
  onload() {
    const self = this;
    this.grammar = makeGrammar(BASE_LISTS);
    this.info = new Map();
    this.ranks = new Map();
    for (const w in EXTRA_WORDS) this.info.set(w, EXTRA_WORDS[w]);
    this.install();
    this.registerDomEvent(document, 'mouseover', function (ev) {
      hideTip();
      const el = ev.target;
      if (!el || !el.closest) return;
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
      renderOrdBlock(el, source, mode, self.grammar, self.info);
      bindClickToSource(el, self.app, el, ctx);
    };
    const ordG = (source, el, ctx) => ord(source, el, ctx, 'G');
    const ordT = (source, el, ctx) => ord(source, el, ctx, 'T');
    for (const lang of ['EpXsG', 'epxsg', 'EPXSG']) this.registerMarkdownCodeBlockProcessor(lang, ordG);
    for (const lang of ['EpXsT', 'epxst', 'EPXST']) this.registerMarkdownCodeBlockProcessor(lang, ordT);
    const isDataFile = function (file) {
      if (!file || !file.path) return false;
      return file.path === DICT_PATH || file.path === SYNTAX_PATH || file.path === RANK_PATH ||
        file.path.indexOf(ROOTS_DIR) === 0 || file.path.indexOf(SPELL_DIR) === 0;
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
        return file instanceof TFile ? await this.app.vault.cachedRead(file) : null;
      },
      listMarkdown: (dir) => this.mdFilesUnder(dir).map(function (file) { return file.path; }),
      warn: function (err) { console.warn('[EpXsC Syntax] 读取库内词库失败，改用内置快照：', err); }
    }, { DICT_PATH, RANK_PATH, SYNTAX_PATH, ROOTS_DIR, SPELL_DIR }, BUILTIN_LEXICON, EXTRA_WORDS);
    if (gen !== this._refreshGen) return;

    this.spells = snapshot.spells;
    spellRegistry = snapshot.spells;
    this.info = snapshot.info;
    this.ranks = snapshot.ranks;
    this.roots = snapshot.roots;
    this.units = snapshot.units;
    this.keys = snapshot.keys;
    this.grammar = makeGrammar(snapshot.lists, Array.from(snapshot.keyWords));
    this.install();
    if (window.__epxscDebug) console.log('[EpXsC Syntax] 词条 ' + this.info.size + ' · 词根 ' + this.roots.size + ' · 秩 ' + this.ranks.size + '（' + snapshot.lists.predicate.length + ' 个谓词）');
    await Promise.race([
      this.ensureStyles(),
      new Promise(function (resolve) { window.setTimeout(function () { resolve('样式步骤超时，跳过'); }, 2000); })
    ]);
    this.rehighlight();
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
  async diagnose() {
    const L = [];
    const add = function (s) { L.push(s); };
    add('# EpXsC 诊断报告');
    add('');
    add('- 代码版本（BUILD）：' + BUILD);
    add('- manifest 版本：' + ((this.manifest && this.manifest.version) || '?'));
    add('- 插件目录：' + ((this.manifest && this.manifest.dir) || '?'));
    add('- 生成时间：' + new Date().toLocaleString());
    let mode = '非笔记视图';
    try {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view) mode = view.getMode() === 'preview' ? '阅读视图' : '实时预览／源码';
    } catch (e) { /* 忽略 */ }
    add('- 当前视图：**' + mode + '**');
    add('- 词表：词条 ' + this.info.size + ' · 词根 ' + (this.roots ? this.roots.size : '-') + ' · 秩 ' + this.ranks.size + ' · 谓词 ' + this.grammar.predicate.source.length + ' 字符');
    add('- 自带切词器：已装（不依赖 window.Prism）');
    add('- Prism：' + (window.Prism ? '有' : '**没有**') + ' · 语法 EpXsC：' + (window.Prism && window.Prism.languages && window.Prism.languages.EpXsC ? '已装' : '**缺失**'));
    add('');
    const codes = document.querySelectorAll(':is(code[class*="language-EpXsC" i], .epx-ord)');
    add('## 代码块（' + codes.length + ' 个）');
    for (let i = 0; i < codes.length && i < 6; i++) {
      const el = codes[i];
      let tokens = 0;
      let color = '-';
      try {
        tokens = el.querySelectorAll('span.token').length;
        const first = el.querySelector('span.token');
        if (first && window.getComputedStyle) color = window.getComputedStyle(first).color;
      } catch (e) { color = '(测不到)'; }
      add('- 第 ' + (i + 1) + ' 个：class="' + (el.className || '') + '" · token ' + tokens + ' 个 · 首个 token 颜色 ' + color);
    }
    add('');
    add('## 样式表');
    let ourRules = 0;
    try {
      const sheets = document.styleSheets || [];
      add('- 共 ' + sheets.length + ' 张');
      for (let i = 0; i < sheets.length; i++) {
        let n = 0;
        let ours = 0;
        let rules = null;
        try { rules = sheets[i].cssRules; } catch (e) { add('- 第 ' + (i + 1) + ' 张：读不到（跨源）' + (sheets[i].href ? ' href=' + sheets[i].href : '')); continue; }
        if (rules) {
          n = rules.length;
          for (let j = 0; j < rules.length; j++) {
            const sel = rules[j].selectorText || '';
            if (sel.indexOf('.epx-') >= 0 || sel.indexOf('.token.') >= 0) ours += 1;
          }
        }
        ourRules += ours;
        add('- 第 ' + (i + 1) + ' 张：' + n + ' 条规则，其中我们的 ' + ours + ' 条' + (sheets[i].href ? ' · href=' + sheets[i].href : ''));
      }
    } catch (e) { add('- 读样式表出错：' + (e && e.message)); }
    add('- 命中我们选择器的规则合计：' + ourRules);
    add('- 兜底状态：' + (this._styleState || '(还没跑)'));
    add('');
    add('## 插件目录里的 styles.css');
    try {
      const dir = (this.manifest && this.manifest.dir) || '.obsidian/plugins/epxsc-syntax';
      const css = await this.app.vault.adapter.read(dir + '/styles.css');
      const lines = String(css).split('\n');
      add('- 读到 ' + css.length + ' 字符 · 含 .epx-tip：' + (css.indexOf('.epx-tip') >= 0 ? '是' : '**否**') + ' · 含 --epx-modifier：' + (css.indexOf('--epx-modifier') >= 0 ? '是' : '否'));
      add('- 前 3 行：');
      for (let i = 0; i < 3 && i < lines.length; i++) add('    ' + (i + 1) + '. ' + lines[i]);
    } catch (e) { add('- **读不到**：' + (e && e.message)); }
    add('');
    add('## 样例代码块（下面这块在阅读视图里应当有颜色）');
    add('');
    add('\x60\x60\x60EpXsC');
    add('Purificatio(priv locus: zone) {');
    add('\tconsta lit = 3 MU;');
    add('\tpriv x = &zone;');
    add('\tpubl consta total = lit;');
    add('\tne navis *&zone');
    add('\tluss lit;');
    add('}');
    add('\x60\x60\x60');
    const text = L.join('\n');
    try {
      await this.app.vault.adapter.write('EpXsC 诊断报告.md', text);
      new Notice('诊断报告已写入库根目录：EpXsC 诊断报告.md（代码版本 ' + BUILD + '）', 12000);
    } catch (e) {
      new Notice('写报告失败：' + (e && e.message));
    }
    return text;
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

  /* 词典里查不到的词加一层点线，提示未入典 */
  markUnknown(code) {
    const spans = code.querySelectorAll('span.token.word');
    for (let i = 0; i < spans.length; i++) {
      const w = (spans[i].textContent || '').toLowerCase();
      if (w.length < 4 || /[0-9]/.test(w)) continue;
      if (this.info.has(w)) continue;
      spans[i].classList.add('epx-unknown');
    }
  }

  /* 自检：当前视图里到底有没有 token、词表读进来没有 */
  selfCheck() {
    let mode = '非笔记视图';
    try {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view) mode = view.getMode() === 'preview' ? '阅读视图' : '实时预览／源码';
    } catch (err) { /* 忽略 */ }
    const codes = document.querySelectorAll(':is(code[class*="language-EpXsC" i], .epx-ord)');
    let tokened = 0;
    let ordBlocks = 0;
    for (let i = 0; i < codes.length; i++) {
      if (codes[i].classList && codes[i].classList.contains('epx-ord')) ordBlocks += 1;
      if (codes[i].querySelector('span.token')) tokened += 1;
    }
    const lines = document.querySelectorAll('.HyperMD-codeblock').length;
    /* 决定性三问：token 有没有、算出来的颜色是什么、样式表载入没有 */
    let firstClass = '(没有代码块)';
    let tokenCount = 0;
    let color = '(未测)';
    if (codes[0]) {
      firstClass = codes[0].className || '(空)';
      tokenCount = codes[0].querySelectorAll('span.token').length;
      const first = codes[0].querySelector('span.token');
      try { if (first && window.getComputedStyle) color = window.getComputedStyle(first).color; } catch (e) { color = '(读不到)'; }
    }
    let styleState = '未知';
    try {
      let n = 0;
      const sheets = document.styleSheets || [];
      for (let i = 0; i < sheets.length; i++) {
        let rules = null;
        try { rules = sheets[i].cssRules; } catch (e) { continue; }
        if (!rules) continue;
        for (let j = 0; j < rules.length; j++) {
          const sel = rules[j].selectorText || '';
          if (sel.indexOf('.token.') >= 0 || sel.indexOf('.epx-tip') >= 0) n += 1;
        }
      }
      styleState = n ? '已载入 ' + n + ' 条着色规则' : '未载入 ✗（styles.css 没生效）';
    } catch (e) { styleState = '读不到'; }
    new Notice([
      'EpXsC 自检 · 代码版本 ' + BUILD,
      '词条 ' + this.info.size + ' · 秩 ' + this.ranks.size + ' · 语法' + (this.grammar ? '已装' : '缺失') + ' · 切词器：自带（Prism ' + (window.Prism ? '有' : '没有') + '）',
      '当前视图：' + mode,
      'EpXsC 代码块 ' + (codes.length - ordBlocks) + ' 个 · 普通句块（G／T）' + ordBlocks + ' 个 · 带 token 的 ' + tokened + ' 个 · 实时预览代码行 ' + lines + ' 行',
      (codes.length > 0 && tokened === 0 && mode === '阅读视图' ? '⚠ 阅读视图里这些块没有 token —— 渲染没跑起来，请把这几行发我' : '渲染：' + (tokened > 0 ? '正常' : '无代码块')),
      '首个块 class：' + firstClass,
      '首个块 token 数：' + tokenCount + ' · 首个 token 颜色：' + color,
      '样式表：' + styleState + (this._styleState ? ' · 兜底：' + this._styleState : '')
    ].join('\n'), 15000);
  }

  rehighlight() {
    this.highlightIn(document);
    const wraps = document.querySelectorAll('.epx-ord-wrap');
    for (let i = 0; i < wraps.length; i++) {
      const wrap = wraps[i];
      const el = wrap.parentElement;
      const rec = el && el.__epxOrd;
      if (!rec) continue;
      try {
        renderOrdBlockInner(el, rec.source, rec.mode, this.grammar, this.info);
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
      this.markUnknown(code);
      this.markNegation(code);
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
