'use strict';

/* Pure EpXsC grammar construction. */

const { FALLBACK, ELEMENTS } = require('../data/parsers.js');

const AXES = ['vis', 'diu', 'celer', 'latus', 'altus', 'acutus', 'densus', 'gravis', 'levis'];

/* 类型名（元素码另算，见 ELEMENTS）：域类型登记表，新类型加在这里 */
/* 类型词：见《术式语法》第九章定义 9.5。兼作术式关键词或筛选键的词不列在此（免得被它们先吃掉） */
const TYPES = ['METOS', 'locus', 'siro', 'intervallum', 'verb', 'littera', 'forma', 'sonus'];
/* 作用域／可见性限定词：写在变量名前，解析赋值时要跳过它们 */
const MODIFIERS = ['priv', 'tut', 'publ', 'consta', 'om', 'tot'];

/* 代码版本：诊断报告里会写出来，用来分辨「文件换了但插件没重载」 */


function escapeWord(w) {
  return w.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
}

/* 词表一律大小写不敏感：术式里 Plur / plur 混用，元素码除外 */
function wordPattern(words) {
  /* 容错：词表缺失时退化成空表，绝不让加载期抛错 */
  const sorted = (Array.isArray(words) ? words.slice() : []).sort(function (a, b) { return b.length - a.length; });
  return new RegExp('\\b(?:' + sorted.map(escapeWord).join('|') + ')\\b', 'i');
}

/* 按标题切分 markdown，取每个小节表格第一列的词 */
/* 维度模型「九个秩与维度的对应」表 → 秩区间提示 */
/* ---------- 内置快照（别人下载后库里没有那几份文件时的兜底） ---------- */

function makeGrammar(lists, keys) {
  const keyList = Array.isArray(keys) ? keys.slice() : [];
  return {
    comment: /\/\*[\s\S]*?\*\//,
    annotation: /^[ \t]*\.[A-Za-z_][\w-]*(?:[ \t]+[^\n]*)?$/m,
    /* 导入：块首声明要引用的他处术式（第十二章规则 12.6） */
    importDecl: {
      pattern: /^[ \t]*impo[ \t]+[^\n;]*/m,
      inside: {
        keyword: /\bimpo\b/,
        spellRef: /[A-Z][A-Za-z0-9_]*/,
        punctuation: /[,;]/
      }
    },
    /* 频段标签：协议里 frequent: #… 的 # 之后，直到条目结束（, ; } 或换行） */
    freqTag: /#[^\n,;}]*/,
    /* 变量名：紧跟「类型:」的那个词（含 [2:变量] 这类位数写法）。
       必须排在 type / number 之前——否则冒号左边先被它们吃掉，右边这个词就轮不到这里了。 */
    variable: {
      pattern: /([([,][ \t]*(?:(?:priv|tut|publ|consta)[ \t]+)*[A-Za-z0-9_]+:[ \t]*(?:(?:priv|tut|publ|consta)[ \t]+)*)([A-Za-z_][A-Za-z0-9_]*)/,
      lookbehind: true
    },
    /* 位数声明组：[2:名] —— 冒号前是位数、冒号后是变量名（列表容器的声明） */
    indexDecl: {
      pattern: /\[[ \t]*\d+[ \t]*:[^\]\n]*\]/,
      inside: {
        variable: /[A-Za-z_][A-Za-z0-9_]*/,
        number: /\d+/,
        punctuation: /:/,
        bracket: /[\[\]]/
      }
    },
    /* 下标组：[1] / [1..3] —— 里面的数字按「第 n 位／第 n 秩」解释 */
    indexGroup: {
      pattern: /\[[ \t]*\d+[ \t]*(?:\.\.[ \t]*\d*)?[ \t]*\]/,
      inside: {
        rankRange: /(?:\d+\.\.\d*|\d*\.\.\d+)(?!\.)/,
        number: /\d+/,
        operator: /\.\./,
        bracket: /[\[\]]/
      }
    },
    pretium: /\bpretium\b/i,
    /* 秩区间：1..3、..10、2..（要求至少一边有数字，且后面不再跟点，避免吃掉省略号 ...） */
    rankRange: /(?:\d+\.\.\d*|\d*\.\.\d+)(?!\.)/,
    number: /\b\d+(?:\.\d+)?\b/,
    /* 筛选键：genus= / intervall( 这类。放在 declTarget 之前 —— 否则行首的 genus= 会被当成赋值目标 */
    filterKey: { pattern: new RegExp('\\b(?:' + keyList.map(escapeWord).join('|') + ')\\b(?=[ \\t]*[=(])', 'i'), },
    /* 筛选值：ordin= 的三个取值（见第五章筛选键表：proxim 近／procul 远／temer 随机） */
    filterValue: /\b(?:proxim|procul|temer)\b/i,
    /* 限定词：作用域与可见性（与 C 的 private／protected／public／const 相当）。
       放在 unit／predicate 之前 —— tut 这类词兼作动词，靠「后面跟着一个名字」区分 */
    modifier: /\b(?:priv|tut|publ|consta)\b(?=[ \t]+[A-Za-z_])/,
    unit: wordPattern(lists.unit),
    element: new RegExp('\\b(?:' + ELEMENTS.join('|') + ')\\b'),
    type: new RegExp('\\b(?:' + TYPES.join('|') + ')\\b'),
    /* 参数表里的类型位：紧跟在 ( 或 , 之后、后面是冒号的词（单个小写字母按变量名处理）。
       用 Prism 的 lookbehind 写法，避免原生 (?<=) 在旧 iOS Safari 上解析即报错。 */
    typeParam: {
      pattern: /([(,]\s*)(?![a-z]\s*:)[A-Za-z_][A-Za-z0-9_]*(?=\s*:(?!:))/,
      lookbehind: true,
      alias: 'type'
    },
    axis: wordPattern(AXES),
    degree: wordPattern(lists.degree),
    /* 前置否定：ne 紧跟一个词时，等同 !（逻辑非），否定后面那个成分 */
    negPrefix: /\bne(?=[ \t]+[A-Za-z_&*@?(\[])/i,
    /* 声明目标：赋值语句左边的那个名字（前面可带限定词） */
    declTarget: {
      pattern: /((?:^|[;\n])[ \t]*(?:(?:priv|tut|publ|consta|om|tot)[ \t]+)*)([A-Za-z_][A-Za-z0-9_]*)(?=[ \t]*=(?!=))/,
      lookbehind: true
    },
    /* 判断词（if／elif／else 一族）与术式关键词（块内条款）各自一色 */
    judge: wordPattern(lists.judge),
    clause: wordPattern(lists.clause),
    keyword: wordPattern(lists.keyword),
    /* 术式名：大写开头且后面紧跟 ( { [ ，或下划线复合名（Gramakipo_Aepaus） */
    /* 类名：Class::member 里 :: 前那个名字（排在 declaration 之前，否则被当成术式名） */
    classUse: { pattern: /[A-Z][A-Za-z0-9_]*(?=[ \t]*::)/, alias: 'className' },
    className: { pattern: /(\bclass[ \t]+)([A-Z][A-Za-z0-9_]*)/, lookbehind: true, alias: 'className' },
    declaration: /\b(?:[A-Z][A-Za-z0-9_]*(?=\s*[({\[])|[A-Z][A-Za-z0-9]*_[A-Za-z0-9_]+)/,
    predicate: wordPattern(lists.predicate),
    function: /\b[a-z][A-Za-z0-9_]*(?=\s*\()/,
    pointer: /\*&|&|@[A-Za-z][A-Za-z0-9_]*|@/,
    /* 坐标串：同一符号连写两个以上才算坐标（~ 世界轴 / ^ 朝向前三轴） */
    coordRun: {
      pattern: /(?:~(?:[ \t]*[-+]?\d+(?:\.\d+)?)?)(?:[ \t]+~(?:[ \t]*[-+]?\d+(?:\.\d+)?)?)+|(?:\^(?:[ \t]*[-+]?\d+(?:\.\d+)?)?)(?:[ \t]+\^(?:[ \t]*[-+]?\d+(?:\.\d+)?)?)+/,
      greedy: true
    },
    classOp: { pattern: /::/, alias: 'operator' },
    operator: /(?:\+=|-=|\*=|\/=|<=|>=|==|!=|\.{2,3})|\+|-|\*|%|\/|=|<|>|\^|~|\?|!/,
    /* 括号分三类：() 分组 · [] 方括号（列表 / 下标 / 秩）· {} 花括号（语块）；其余标点归 punctuation */
    paren: /[()]/,
    bracket: /[\[\]]/,
    brace: /[{}]/,
    punctuation: /[;:,]/,
    /* 兜底：其余标识符也切成 token，只为挂悬停释义；CSS 不给它上色 */
    word: /\b[A-Za-z_][A-Za-z0-9_]*\b/
  };
}

const BASE_LISTS = {
  keyword: FALLBACK.keyword.slice(),
  judge: FALLBACK.judge.slice(),
  clause: FALLBACK.clause.slice(),
  degree: FALLBACK.degree.slice(),
  predicate: FALLBACK.predicate.slice(),
  unit: FALLBACK.unit.slice()
};

/* ---------- 自带词法着色：不依赖 Obsidian 内部的 window.Prism ----------
   与 Prism 同构的取用规则：在所有规则里取「最早出现」的那个；同一位置先列出的优先；
   lookbehind 规则的内容从第 1 组之后算起；inside 规则的内容再递归切一遍；alias 追加附加类名。
   整条规则天然贪婪（匹配到就整体吃掉，内部不再切）—— coordRun 这类正是要这个行为。 */


module.exports = { AXES, TYPES, MODIFIERS, escapeWord, wordPattern, makeGrammar, BASE_LISTS };
