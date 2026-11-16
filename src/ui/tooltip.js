'use strict';

/* Pure tooltip data builders. DOM show/hide stays in the adapter. */

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

function buildTip(cls, text, info, ranks, ctx) {
  const spellRegistry = (ctx && ctx.spells) || new Map();
  const SECTION_POS = (ctx && ctx.sectionPos) || {};
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



module.exports = {
  CLASS_ORDER,
  CLASS_LABEL,
  SECTION_POS,
  EXTRA_WORDS,
  SYMBOL_INFO,
  pickClass,
  bracketTip,
  variableTip,
  negScopeText,
  coordTip,
  rankDef,
  rankSpan,
  buildTip
};
