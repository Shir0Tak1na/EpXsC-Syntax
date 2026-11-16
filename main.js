"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/core/markdown-blocks.js
var require_markdown_blocks = __commonJS({
  "src/core/markdown-blocks.js"(exports2, module2) {
    "use strict";
    function extractEpXsCBlocks(text) {
      const re = /^[ \t]*\x60{3}[ \t]*(?:EpXsC|epxsc|EPXSC)[ \t]*\r?\n([\s\S]*?)^[ \t]*\x60{3}[ \t]*\r?$/gm;
      const out = [];
      let m;
      while (m = re.exec(text)) {
        out.push({ source: m[1].replace(/\r/g, ""), line: text.slice(0, m.index).split("\n").length });
      }
      return out;
    }
    module2.exports = { extractEpXsCBlocks };
  }
});

// src/data/parsers.js
var require_parsers = __commonJS({
  "src/data/parsers.js"(exports2, module2) {
    "use strict";
    var FALLBACK = {
      /* 词典读不到时的兜底；in / om 这类词性易漏，一并钉死 */
      keyword: ["in", "de", "pro", "om", "post", "nec"],
      judge: ["keal", "keol", "tam", "dum", "nisi", "quan", "vero", "es", "exo", "lic", "re", "ren", "rea", "kon", "aut", "dis", "ergo", "kaus", "ske", "aude", "rase", "fas", "nefas"],
      clause: ["pretium", "limit", "luss", "solum", "hauri", "vita", "memoria", "sensus", "voluntas", "anima", "vis", "diu", "celer", "metos"],
      degree: ["max", "min", "valde", "magis", "minus", "parum", "paulum", "nimis"],
      predicate: ["plur", "navis", "apolus", "expual", "aepaus", "movis", "venis", "retase"],
      unit: ["MUW", "EUW", "MU", "miteas", "kigrama", "m", "s", "kg"]
    };
    var SECTIONS = {
      /* 功能词（介词·助动词·限定词·代词·疑问词·连接词）：紫 */
      keyword: ["\u4ECB\u8BCD", "\u52A9\u52A8\u8BCD", "\u9650\u5B9A\u8BCD", "\u65F6\u95F4\u9650\u5B9A", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u6307\u79F0\u9650\u5B9A", "\u987A\u5E8F\u9650\u5B9A", "\u4EE3\u8BCD\uFF08\u4EBA\u79F0\uFF09", "\u7591\u95EE\u8BCD", "\u8FDE\u63A5\u8BCD\u4E0E\u4ECE\u53E5\u6807\u8BB0"],
      /* 判断词（if／elif／else 一族）：单独一色 */
      judge: ["\u5224\u65AD\u8BCD"],
      /* 术式关键词（块内条款与术式专用词）：单独一色 */
      clause: ["\u672F\u5F0F\u5173\u952E\u8BCD"],
      degree: ["\u7A0B\u5EA6\u9650\u5B9A"],
      predicate: ["\u52A8\u8BCD"],
      unit: ["\u5355\u4F4D"]
    };
    var ELEMENTS = ["Ert", "Aqu", "Flm", "Wnd", "Nut", "Elc", "Lum", "Duk", "Sar", "Qen"];
    function splitSections(text) {
      const map = {};
      let current = null;
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const h = /^#{1,6}\s*(.+?)\s*$/.exec(line);
        if (h) {
          current = h[1];
          if (!map[current]) map[current] = [];
          continue;
        }
        if (!current) continue;
        const m = /^\|\s*([A-Za-z][A-Za-z0-9_-]{0,30})\s*\|/.exec(line);
        if (m && !/^(word|key|root)$/i.test(m[1])) map[current].push(m[1]);
      }
      return map;
    }
    function parseEntries(text) {
      const out = /* @__PURE__ */ new Map();
      let section = "";
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const h = /^#{1,6}\s*(.+?)\s*$/.exec(lines[i]);
        if (h) {
          section = h[1];
          continue;
        }
        const m = /^\|\s*([A-Za-z][A-Za-z0-9_-]{0,30})\s*\|(.*)$/.exec(lines[i]);
        if (!m) {
          const c2 = /^\|\s*([^|]{1,14}?)\s*\|\s*([A-Za-z][A-Za-z0-9]{0,6})\s*\|/.exec(lines[i]);
          if (c2) {
            const code = c2[2];
            const cn = c2[1].trim();
            const k = code.toLowerCase();
            if (cn && !out.has(k)) out.set(k, { word: code, pos: "\u5143\u7D20\u7801", meaning: cn, abbr: code });
            if (cn) out.set(code, { word: code, pos: "\u5143\u7D20\u7801", meaning: cn, abbr: code });
          }
          continue;
        }
        const cells = m[2].split("|");
        const meaning = (cells[0] || "").trim();
        if (!meaning || meaning === "meaning" || meaning === "\u4E49" || meaning === "\u91CA\u4E49") continue;
        const key = m[1].toLowerCase();
        if (!out.has(key)) out.set(key, { word: m[1], pos: section, meaning, abbr: (cells[1] || "").trim() });
        const abbr = (cells[1] || "").trim();
        if (/^[A-Za-z][A-Za-z0-9]{1,6}$/.test(abbr) && !out.has(abbr.toLowerCase())) {
          out.set(abbr.toLowerCase(), { word: abbr, pos: ELEMENTS.indexOf(abbr) >= 0 ? "\u5143\u7D20\u7801" : section + "\xB7\u7F29\u5199", meaning, abbr });
        }
      }
      return out;
    }
    var GREEK = { theta: "\u03B8", lambda: "\u03BB", sigma: "\u03C3", Delta: "\u0394", varphi: "\u03C6", eta: "\u03B7", omega: "\u03C9", mu: "\u03BC", pi: "\u03C0", alpha: "\u03B1", beta: "\u03B2", gamma: "\u03B3", tau: "\u03C4", rho: "\u03C1" };
    function cleanMath(s) {
      let t = String(s);
      t = t.replace(/\$([^$]*)\$/g, "$1");
      t = t.replace(/\\mathrm\{([^}]*)\}/g, "$1");
      t = t.replace(/\\text\{([^}]*)\}/g, "$1");
      t = t.replace(/\\([a-zA-Z]+)/g, function(all, name) {
        return GREEK[name] || name;
      });
      t = t.replace(/\\[,;!]/g, " ");
      t = t.replace(/[{}]/g, "");
      t = t.replace(/\\/g, "");
      return t.replace(/\s+/g, " ").trim();
    }
    function parseRanks(text) {
      const out = /* @__PURE__ */ new Map();
      const lines = text.split(/\r?\n/);
      let started = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!started) {
          if (/九个秩与维度的对应/.test(line)) started = true;
          continue;
        }
        if (!/^\s*\|/.test(line)) {
          if (out.size) break;
          else continue;
        }
        const m = /^\s*\|\s*(\d{1,2}(?:[–-]\d{1,2})?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/.exec(line);
        if (!m) continue;
        const rank = m[1].replace("-", "\u2013");
        const parts = [];
        const comp = cleanMath(m[2]);
        if (comp) parts.push(comp);
        if (m[3].trim()) parts.push(m[3].trim());
        if (parts.length) out.set(rank, parts.join(" \xB7 "));
      }
      return out;
    }
    function parseFilterKeys(text) {
      const out = /* @__PURE__ */ new Map();
      const lines = text.split(/\r?\n/);
      let started = false;
      let rows = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!started) {
          if (/^#{2,6}\s*筛选键\s*$/.test(line)) started = true;
          continue;
        }
        if (!/^\s*\|/.test(line)) {
          if (rows) break;
          else continue;
        }
        const m = /^\s*\|\s*\x60?\s*([A-Za-z][A-Za-z0-9_-]{0,30})\s*\x60?\s*\|\s*([^|]*?)\s*\|/.exec(line);
        if (!m) continue;
        rows += 1;
        out.set(m[1].toLowerCase(), { word: m[1], pos: "\u7B5B\u9009\u952E", meaning: m[2].replace(/\x60/g, "").trim(), abbr: "" });
      }
      return out;
    }
    function cleanCell(s) {
      return String(s).replace(/\*\*/g, "").replace(/\x60/g, "").trim();
    }
    function parseUnits(text) {
      const out = /* @__PURE__ */ new Map();
      const lines = text.split(/\r?\n/);
      let started = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!started) {
          if (/^#{2,6}\s*六、单位/.test(line)) started = true;
          continue;
        }
        if (/^#{2,6}\s/.test(line) && !/其他单位/.test(line)) break;
        if (!/^\s*\|/.test(line)) continue;
        const cells = line.split("|").map(cleanCell);
        if (cells.length < 5) continue;
        const energy = /^[?？]?\s*([A-Z]{2,4})$/.exec(cells[1]);
        if (energy) {
          const luss = cells[4] || "";
          const note = /锁存/.test(luss) ? "\u5199\u5B83\u5373\u4E3A\u9501\u5B58\uFF08\u89E6\u53D1\u5F0F\u672F\u5F0F\uFF09" : /不得/.test(luss) ? "\u529F\u7387\u53E3\u5F84\uFF0C\u4E0D\u5F97\u914D luss\uFF08\u6301\u7EED\u53D1\u52A8\uFF09" : "";
          const ekey = energy[1].toLowerCase();
          if (!out.has(ekey)) out.set(ekey, { word: energy[1], pos: "\u80FD\u91CF\u5355\u4F4D", meaning: cells[2] + (note ? "\uFF1B" + note : ""), abbr: "" });
          continue;
        }
        const amount = cells[1];
        const names = (cells[3] || "").match(/[A-Za-z][A-Za-z0-9]*/g) || [];
        const labels = (cells[2] || "").split("\xB7").map(function(s) {
          return s.trim();
        });
        for (let j = 0; j < names.length; j++) {
          const key = names[j].toLowerCase();
          if (out.has(key)) continue;
          const label = labels.length === names.length ? labels[j] : names.length === 1 ? labels[0] : "";
          out.set(key, { word: names[j], pos: amount, meaning: label || cells[2], abbr: "" });
        }
      }
      return out;
    }
    function parseRoots(text) {
      const out = /* @__PURE__ */ new Map();
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const m = /^\|\s*([A-Za-z][A-Za-z0-9-]{0,20})\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/.exec(lines[i]);
        if (!m || /^(根|word|词根)$/.test(m[1])) continue;
        const key = m[1].toLowerCase();
        if (!out.has(key)) out.set(key, { word: m[1], pos: "\u8BCD\u6839\xB7" + m[5].trim(), meaning: m[2].trim(), kind: m[5].trim() });
      }
      return out;
    }
    function wordsFrom(map, names, fallback) {
      const out = [];
      for (let i = 0; i < names.length; i++) {
        const list = map[names[i]] || [];
        for (let j = 0; j < list.length; j++) out.push(list[j]);
      }
      for (let k = 0; k < fallback.length; k++) out.push(fallback[k]);
      return Array.from(new Set(out));
    }
    module2.exports = {
      FALLBACK,
      SECTIONS,
      ELEMENTS,
      splitSections,
      parseEntries,
      parseDictionary: parseEntries,
      parseRanks,
      parseFilterKeys,
      parseUnits,
      parseRoots,
      wordsFrom
    };
  }
});

// src/core/grammar.js
var require_grammar = __commonJS({
  "src/core/grammar.js"(exports2, module2) {
    "use strict";
    var { FALLBACK, ELEMENTS } = require_parsers();
    var AXES = ["vis", "diu", "celer", "latus", "altus", "acutus", "densus", "gravis", "levis"];
    var TYPES = ["METOS", "locus", "siro", "intervallum", "verb", "littera", "forma", "sonus"];
    var MODIFIERS = ["priv", "tut", "publ", "consta", "om", "tot"];
    function escapeWord(w) {
      return w.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
    }
    function wordPattern(words) {
      const sorted = (Array.isArray(words) ? words.slice() : []).sort(function(a, b) {
        return b.length - a.length;
      });
      return new RegExp("\\b(?:" + sorted.map(escapeWord).join("|") + ")\\b", "i");
    }
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
        filterKey: { pattern: new RegExp("\\b(?:" + keyList.map(escapeWord).join("|") + ")\\b(?=[ \\t]*[=(])", "i") },
        /* 筛选值：ordin= 的三个取值（见第五章筛选键表：proxim 近／procul 远／temer 随机） */
        filterValue: /\b(?:proxim|procul|temer)\b/i,
        /* 限定词：作用域与可见性（与 C 的 private／protected／public／const 相当）。
           放在 unit／predicate 之前 —— tut 这类词兼作动词，靠「后面跟着一个名字」区分 */
        modifier: /\b(?:priv|tut|publ|consta)\b(?=[ \t]+[A-Za-z_])/,
        unit: wordPattern(lists.unit),
        element: new RegExp("\\b(?:" + ELEMENTS.join("|") + ")\\b"),
        type: new RegExp("\\b(?:" + TYPES.join("|") + ")\\b"),
        /* 参数表里的类型位：紧跟在 ( 或 , 之后、后面是冒号的词（单个小写字母按变量名处理）。
           用 Prism 的 lookbehind 写法，避免原生 (?<=) 在旧 iOS Safari 上解析即报错。 */
        typeParam: {
          pattern: /([(,]\s*)(?![a-z]\s*:)[A-Za-z_][A-Za-z0-9_]*(?=\s*:(?!:))/,
          lookbehind: true,
          alias: "type"
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
        classUse: { pattern: /[A-Z][A-Za-z0-9_]*(?=[ \t]*::)/, alias: "className" },
        className: { pattern: /(\bclass[ \t]+)([A-Z][A-Za-z0-9_]*)/, lookbehind: true, alias: "className" },
        declaration: /\b(?:[A-Z][A-Za-z0-9_]*(?=\s*[({\[])|[A-Z][A-Za-z0-9]*_[A-Za-z0-9_]+)/,
        predicate: wordPattern(lists.predicate),
        function: /\b[a-z][A-Za-z0-9_]*(?=\s*\()/,
        pointer: /\*&|&|@[A-Za-z][A-Za-z0-9_]*|@/,
        /* 坐标串：同一符号连写两个以上才算坐标（~ 世界轴 / ^ 朝向前三轴） */
        coordRun: {
          pattern: /(?:~(?:[ \t]*[-+]?\d+(?:\.\d+)?)?)(?:[ \t]+~(?:[ \t]*[-+]?\d+(?:\.\d+)?)?)+|(?:\^(?:[ \t]*[-+]?\d+(?:\.\d+)?)?)(?:[ \t]+\^(?:[ \t]*[-+]?\d+(?:\.\d+)?)?)+/,
          greedy: true
        },
        classOp: { pattern: /::/, alias: "operator" },
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
    var BASE_LISTS = {
      keyword: FALLBACK.keyword.slice(),
      judge: FALLBACK.judge.slice(),
      clause: FALLBACK.clause.slice(),
      degree: FALLBACK.degree.slice(),
      predicate: FALLBACK.predicate.slice(),
      unit: FALLBACK.unit.slice()
    };
    module2.exports = { AXES, TYPES, MODIFIERS, escapeWord, wordPattern, makeGrammar, BASE_LISTS };
  }
});

// src/core/tokenizer.js
var require_tokenizer = __commonJS({
  "src/core/tokenizer.js"(exports2, module2) {
    "use strict";
    var GLOBAL_RE_CACHE = /* @__PURE__ */ new WeakMap();
    function asGlobalRe(re) {
      if (re.global) return re;
      let g = GLOBAL_RE_CACHE.get(re);
      if (!g) {
        g = new RegExp(re.source, re.flags + "g");
        GLOBAL_RE_CACHE.set(re, g);
      }
      return g;
    }
    function escHtml(s) {
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    function tokenizeText(text, grammar) {
      let out = "";
      let pos = 0;
      while (pos < text.length) {
        let best = null;
        for (const name in grammar) {
          const rule2 = grammar[name];
          const pattern = rule2 instanceof RegExp ? rule2 : rule2 && rule2.pattern;
          if (!(pattern instanceof RegExp)) continue;
          const re = asGlobalRe(pattern);
          const lb = !(rule2 instanceof RegExp) && rule2.lookbehind;
          re.lastIndex = lb ? 0 : pos;
          let m = re.exec(text);
          let index = 0;
          let content = "";
          if (m) {
            index = m.index;
            content = m[0];
            if (lb && m[1]) {
              index += m[1].length;
              content = m[0].slice(m[1].length);
            }
            if (lb && index < pos) {
              let guard = 0;
              while (m && index < pos && guard < 200) {
                re.lastIndex = index + content.length;
                m = re.exec(text);
                if (!m) break;
                index = m.index;
                content = m[0];
                if (m[1]) {
                  index += m[1].length;
                  content = m[0].slice(m[1].length);
                }
                guard += 1;
              }
            }
          }
          if (!m || !content) continue;
          if (index < pos) continue;
          if (!best || index < best.index) best = { index, content, name, rule: rule2 };
        }
        if (!best) {
          out += escHtml(text.slice(pos));
          break;
        }
        if (best.index > pos) out += escHtml(text.slice(pos, best.index));
        const rule = best.rule;
        const cls = best.name + (!(rule instanceof RegExp) && rule.alias ? " " + rule.alias : "");
        const inner = !(rule instanceof RegExp) && rule.inside ? tokenizeText(best.content, rule.inside) : escHtml(best.content);
        out += '<span class="token ' + cls + '">' + inner + "</span>";
        pos = best.index + best.content.length;
      }
      return out;
    }
    module2.exports = { asGlobalRe, escHtml, tokenizeText };
  }
});

// src/core/spells.js
var require_spells = __commonJS({
  "src/core/spells.js"(exports2, module2) {
    "use strict";
    var MOD_WORDS = "priv|tut|publ|consta";
    function parseParamList(text) {
      const out = [];
      const s = String(text || "");
      const parts = [];
      let depth = 0, cur = "";
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === "[" || ch === "(" || ch === "{") depth += 1;
        else if (ch === "]" || ch === ")" || ch === "}") depth -= 1;
        if (ch === "," && depth === 0) {
          parts.push(cur);
          cur = "";
          continue;
        }
        cur += ch;
      }
      if (cur.trim()) parts.push(cur);
      const mods = "(?:(?:" + MOD_WORDS + ")[ \\t]+)*";
      const simple = new RegExp("^(" + mods + ")([A-Za-z_][A-Za-z0-9_]*)[ \\t]*:[ \\t]*(" + mods + ")([A-Za-z_][A-Za-z0-9_]*)$");
      const boxed = new RegExp("^(" + mods + ")([A-Za-z_][A-Za-z0-9_]*)[ \\t]*:[ \\t]*\\[[^\\]]*?([A-Za-z_][A-Za-z0-9_]*)[ \\t]*\\]$");
      const bare = new RegExp("^(" + mods + ")([A-Za-z_][A-Za-z0-9_]*)$");
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i].trim();
        if (!p) continue;
        let m = simple.exec(p);
        if (m) {
          const list = ((m[1] || "") + " " + (m[3] || "")).trim().toLowerCase().split(/[ \t]+/).filter(Boolean);
          out.push({ type: m[2], name: m[4], modifiers: list });
          continue;
        }
        m = boxed.exec(p);
        if (m) {
          const list = (m[1] || "").trim().toLowerCase().split(/[ \t]+/).filter(Boolean);
          out.push({ type: m[2], name: m[3], container: true, modifiers: list });
          continue;
        }
        m = bare.exec(p);
        if (m) out.push({ name: m[2], modifiers: (m[1] || "").trim().toLowerCase().split(/[ \t]+/).filter(Boolean) });
        else out.push({ name: p, modifiers: [] });
      }
      return out;
    }
    function collectSpells(text, out, file) {
      const lines = String(text || "").split("\n");
      const decl = new RegExp("^(?:De\\b[^{;]*?)?\\s*((?:(?:" + MOD_WORDS + ")[ \\t]+)*)([A-Z][A-Za-z0-9_]*)\\s*\\(([^)]*)\\)[ \\t]*\\{");
      for (let i = 0; i < lines.length; i++) {
        const m = decl.exec(lines[i]);
        if (!m) continue;
        let depth = 0, end = i, opened = false;
        for (let j = i; j < lines.length; j++) {
          const t = lines[j];
          for (let k = 0; k < t.length; k++) {
            if (t[k] === "{") {
              depth += 1;
              opened = true;
            } else if (t[k] === "}") depth -= 1;
          }
          if (opened && depth <= 0) {
            end = j;
            break;
          }
        }
        const mods = (m[1] || "").trim().toLowerCase().split(/[ \t]+/).filter(Boolean);
        const name = m[2];
        const rec = { name, visibility: mods.length ? mods[mods.length - 1] : "", modifiers: mods, params: parseParamList(m[3]), file, line: i + 1, endLine: end + 1 };
        if (out.has(name)) {
          const old = out.get(name);
          if (!old.duplicates) old.duplicates = [];
          old.duplicates.push(rec);
        } else out.set(name, rec);
      }
      return out;
    }
    module2.exports = { MOD_WORDS, parseParamList, collectSpells };
  }
});

// src/core/lint.js
var require_lint = __commonJS({
  "src/core/lint.js"(exports2, module2) {
    "use strict";
    var BRANCH_WORDS = ["keal", "keol", "tam", "dum", "nisi", "quan"];
    function lintText(text, ctx) {
      const issues = [];
      const lines = text.split("\n");
      const push = function(level, line, message) {
        issues.push({ level, line, message });
      };
      const units = ctx && ctx.units || /* @__PURE__ */ new Set();
      const keys = ctx && ctx.keys || /* @__PURE__ */ new Set();
      let prose = false;
      for (let i = 0; i < lines.length; i++) {
        if (/\.\s*(\/\*.*)?$/.test(lines[i].replace(/[ \t]+$/, ""))) {
          prose = true;
          break;
        }
      }
      const stack = [];
      const pairOf = { ")": "(", "]": "[", "}": "{" };
      let inComment = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let clean = "";
        for (let c = 0; c < line.length; c++) {
          const ch = line.charAt(c);
          if (inComment) {
            if (ch === "*" && line.charAt(c + 1) === "/") {
              inComment = false;
              c += 1;
            }
            continue;
          }
          if (ch === "/" && line.charAt(c + 1) === "*") {
            inComment = true;
            c += 1;
            continue;
          }
          clean += ch;
        }
        for (let c = 0; c < clean.length; c++) {
          const ch = clean.charAt(c);
          if (ch === "(" || ch === "[" || ch === "{") stack.push({ ch, line: i + 1 });
          else if (ch === ")" || ch === "]" || ch === "}") {
            const top = stack.pop();
            if (!top) push("error", i + 1, "\u591A\u51FA\u4E00\u4E2A\u300C" + ch + "\u300D\uFF0C\u524D\u9762\u6CA1\u6709\u4E0E\u4E4B\u5BF9\u5E94\u7684\u300C" + pairOf[ch] + "\u300D");
            else if (top.ch !== pairOf[ch]) push("error", i + 1, "\u62EC\u53F7\u5BF9\u4E0D\u4E0A\uFF1A\u8FD9\u91CC\u662F\u300C" + ch + "\u300D\uFF0C\u4F46\u6700\u8FD1\u672A\u95ED\u5408\u7684\u662F\u300C" + top.ch + "\u300D\uFF08\u7B2C " + top.line + " \u884C\uFF09");
          }
        }
        if (!prose && /:$/.test(clean.replace(/[ \t]+$/, "")) && clean.trim()) {
          let j = i + 1;
          while (j < lines.length && !lines[j].trim()) j += 1;
          if (j >= lines.length) push("error", i + 1, "\u5192\u53F7\u5F00\u7684\u5757\u6CA1\u6709\u5757\u4F53");
          else {
            const base = (lines[i].match(/^[ \t]*/) || [""])[0].length;
            const next = (lines[j].match(/^[ \t]*/) || [""])[0].length;
            if (next <= base) push("error", j + 1, "\u5757\u4F53\u6CA1\u6709\u7F29\u8FDB\uFF1A\u5192\u53F7\u5F00\u7684\u5757\uFF0C\u8FD9\u4E00\u884C\u8981\u6BD4\u5757\u5934\u66F4\u6DF1");
          }
        }
      }
      for (let i = 0; i < stack.length; i++) push("error", stack[i].line, "\u300C" + stack[i].ch + "\u300D\u6CA1\u6709\u95ED\u5408");
      if (prose) return issues;
      const lead = function(s) {
        return (s.match(/^[ \t]*/) || [""])[0].length;
      };
      const clauseRank = function(line) {
        const t = line.replace(/\/\*[\s\S]*?\*\//g, "").trim();
        if (!t || t === "}" || t === "{") return 0;
        if (/^impo\b/.test(t)) return 0;
        if (/^protocol\b/.test(t)) return 8;
        if (/^(?:(?:priv|tut|publ|consta)[	 ]+)?(clav|eRk|frequent)[	 ]*:/.test(t)) return 8;
        if (/\{$/.test(t)) return 1;
        if (/^limit\s*:/.test(t)) return 2;
        if (/^pretium\s*:/.test(t)) return 3;
        if (/^(keal|keol|tam|dum|nisi|quan)\b/.test(t)) return 4;
        if (/^(luss\b|[?(]|\d)/.test(t) && /\b(MUW|EUW|MU|EU)\b/.test(t)) return 6;
        if (/^(solum|hauri)\b/.test(t)) return 7;
        return 5;
      };
      let firstLine = "";
      for (let k = 0; k < lines.length; k++) {
        if (lines[k].trim()) {
          firstLine = lines[k].trim();
          break;
        }
      }
      const isSpell = !/^\s*class\b/.test(firstLine) && (/\{$/.test(firstLine) || /^De\b/.test(firstLine));
      let lastRank = 0;
      let lastRankLine = 0;
      let li = 0;
      while (isSpell && li < lines.length) {
        const l = lines[li];
        if (!l.trim()) {
          li += 1;
          continue;
        }
        const r = clauseRank(l);
        if (r === 0) {
          li += 1;
          continue;
        }
        if (r === 1 && lastRank >= 1) {
          lastRank = 1;
          lastRankLine = li + 1;
          li += 1;
          continue;
        }
        if (r < lastRank) {
          push("warn", li + 1, "\u6761\u6B3E\u6B21\u5E8F\uFF1A\u5E94\u4E3A \u8F7D\u4F53\u5236 \u2192 \u5BF9\u8C61 \u2192 \u9650\u5236 \u2192 \u4EE3\u4EF7 \u2192 \u89E6\u53D1 \u2192 \u6548\u679C \u2192 \u80FD\u91CF \u2192 \u534F\u8BAE\uFF08\u7B2C " + lastRankLine + " \u884C\u4E4B\u540E\u518D\u51FA\u73B0\u66F4\u9760\u524D\u7684\u6761\u6B3E\uFF09");
          break;
        }
        lastRank = r;
        lastRankLine = li + 1;
        const opensBlock = /:[ \t]*$/.test(l.replace(/\/\*[\s\S]*?\*\//g, "").trim());
        const indent = lead(l);
        li += 1;
        while (opensBlock && li < lines.length) {
          const l2 = lines[li];
          if (!l2.trim()) {
            li += 1;
            continue;
          }
          if (lead(l2) > indent) {
            li += 1;
            continue;
          }
          if (/^[ \t]*[{}][ \t]*$/.test(l2)) {
            li += 1;
            continue;
          }
          break;
        }
      }
      for (let i = 0; i < lines.length; i++) {
        const lm = /^([ \t]*)limit[ \t]*:(.*)$/.exec(lines[i]);
        if (!lm) continue;
        const base = lm[1].length;
        const items = [{ text: lm[2], line: i + 1 }];
        let j = i + 1;
        while (j < lines.length) {
          const l = lines[j];
          if (!l.trim()) {
            j += 1;
            continue;
          }
          const ind = (l.match(/^[ \t]*/) || [""])[0].length;
          if (ind <= base) break;
          items.push({ text: l, line: j + 1 });
          j += 1;
        }
        for (let k = 0; k < items.length; k++) {
          const body = items[k].text.replace(/\/\*[\s\S]*?\*\//g, "").trim();
          if (!body) continue;
          const symbolCmp = /(<=|>=|==|!=|<|>)/.test(body);
          const wordCmp = /(^|[^A-Za-z_])(aude|kon|aut|dis|ne|vero|re|exo)([^A-Za-z_]|$)/.test(body);
          if (!symbolCmp && !wordCmp) {
            push("warn", items[k].line, "\u9650\u5236\u6761\u6B3E\uFF08limit\uFF09\u91CC\u7684\u6BCF\u4E00\u6761\u90FD\u5E94\u5F53\u662F\u5224\u5B9A\u5F0F \u2014\u2014 \u6BD4\u8F83\u5F0F\uFF08\u5982 <= 66 miteas\uFF09\u6216\u8BCD\u5F62\u5224\u5B9A\uFF08aude \u76F8\u7B49\uFF0Fkon \u5408\u53D6\uFF0Faut \u5305\u542B\u6216\uFF0Fdis \u4E92\u65A5\u6216\uFF0Fne \u5426\u5B9A\uFF09");
          }
        }
      }
      for (let i = 0; i < lines.length; i++) {
        if (!/(^|[^A-Za-z_])solum([^A-Za-z_]|$)/.test(lines[i])) continue;
        let top = i;
        for (let j = i; j >= 0; j--) {
          if (/\{[ \t]*$/.test(lines[j].replace(/\/\*[\s\S]*?\*\//g, "").trimEnd())) {
            top = j;
            break;
          }
        }
        let depth = 0, bottom = lines.length - 1;
        for (let j = top; j < lines.length; j++) {
          const t = lines[j];
          for (let c = 0; c < t.length; c++) {
            if (t.charAt(c) === "{") depth += 1;
            else if (t.charAt(c) === "}") depth -= 1;
          }
          if (depth <= 0 && j >= top) {
            bottom = j;
            break;
          }
        }
        for (let j = top; j <= bottom; j++) {
          if (/^[ \t]*limit[ \t]*:/.test(lines[j]) && /(^|[^A-Za-z_])voluntas([^A-Za-z_]|$)/.test(lines[j])) {
            push("warn", j + 1, "\u58F0\u660E\u4E86 solum \u7684\u672F\u5F0F\u4E0D\u5E26\u610F\u5FD7\u8C31\uFF1A\u4E0D\u80FD\u4EE5\u65BD\u672F\u8005\u610F\u5FD7\uFF08voluntas\uFF09\u4F5C\u4E3A\u8FDE\u63A5\u6761\u4EF6\uFF08\u4EE3\u4EF7\u5728\u5236\u4F5C\u65F6\u4ED8\u51FA\uFF0C\u4E0D\u53D7\u6B64\u9650\uFF09");
          }
        }
      }
      const constDecl = /(^|[;\n])[ \t]*(?:(?:priv|tut|publ)[ \t]+)?consta[ \t]+([A-Za-z_][A-Za-z0-9_]*)[ \t]*=(?!=)/g;
      const consts = [];
      let cdecl;
      while (cdecl = constDecl.exec(text)) consts.push({ name: cdecl[2], line: text.slice(0, cdecl.index + (cdecl[1] || "").length).split("\n").length });
      for (let i = 0; i < consts.length; i++) {
        const again = new RegExp("(^|[;\\n])[ \\t]*(?:(?:priv|tut|publ|consta|om|tot)[ \\t]+)?" + consts[i].name + "[ \\t]*=(?!=)", "g");
        let m2;
        while (m2 = again.exec(text)) {
          const line = text.slice(0, m2.index + (m2[1] || "").length).split("\n").length;
          if (line > consts[i].line) {
            push("error", line, "\u5E38\u91CF\u300C" + consts[i].name + "\u300D\u5728\u7B2C " + consts[i].line + " \u884C\u4EE5 consta \u58F0\u660E\uFF0C\u5199\u5165\u540E\u4E0D\u53EF\u518D\u8D4B\u503C");
            break;
          }
        }
      }
      const coordRe = /(?:~(?:[ \t]*[-+]?\d+(?:\.\d+)?)?)(?:[ \t]+~(?:[ \t]*[-+]?\d+(?:\.\d+)?)?)+|(?:\^(?:[ \t]*[-+]?\d+(?:\.\d+)?)?)(?:[ \t]+\^(?:[ \t]*[-+]?\d+(?:\.\d+)?)?)+/g;
      let cd;
      while (cd = coordRe.exec(text)) {
        const line = text.slice(0, cd.index).split("\n").length;
        const c = parseCoord(cd[0]);
        if (c.values.length > 3) push("warn", line, "\u5750\u6807\u6700\u591A\u4E09\u8F74\uFF0C\u8FD9\u91CC\u5199\u4E86 " + c.values.length + " \u4E2A");
        else if (c.sign === "^" && c.values.length !== 3) push("error", line, "\u5C40\u90E8\u5750\u6807\u5FC5\u987B\u5199\u5168\u4E09\u8F74\uFF08\u5DE6\uFF0F\u4E0A\uFF0F\u524D\uFF09\uFF0C\u8FD9\u91CC\u53EA\u6709 " + c.values.length + " \u4E2A");
      }
      for (let i = 0; i < lines.length; i++) {
        const m = /^[ \t]*([A-Za-z_][A-Za-z0-9_]*)/.exec(lines[i]);
        if (!m || BRANCH_WORDS.indexOf(m[1].toLowerCase()) < 0) continue;
        if (lines[i].indexOf(":") < 0 && lines[i].indexOf("{") < 0) {
          push("warn", i + 1, "\u5224\u65AD\u8BCD\u300C" + m[1] + "\u300D\u8981\u5E26\u5757\uFF1A\u884C\u5C3E\u5199\u5192\u53F7\u52A0\u7F29\u8FDB\uFF0C\u6216\u7528\u82B1\u62EC\u53F7");
        }
      }
      for (let i = 0; i < lines.length; i++) {
        const re = /(\d)[ \t]*([A-Za-z_][A-Za-z0-9_]*)/g;
        let m;
        while (m = re.exec(lines[i])) {
          if (units.has(m[2].toLowerCase())) continue;
          push("warn", i + 1, "\u300C" + m[1] + " " + m[2] + "\u300D\u2014\u2014" + m[2] + " \u4E0D\u662F\u767B\u8BB0\u8FC7\u7684\u5355\u4F4D");
        }
      }
      for (let i = 0; i < lines.length; i++) {
        const bare = lines[i].replace(/\/\*[\s\S]*?\*\//g, "");
        if (/\bluss\b/i.test(bare) && /\b(MUW|EUW)\b/.test(bare)) {
          push("error", i + 1, "\u5199 MUW\uFF0FEUW \u5373\u6301\u7EED\u53D1\u52A8\uFF08\u529F\u7387\u53E3\u5F84\uFF09\uFF0C\u4E0D\u5F97\u518D\u5199 luss\uFF08\u9501\u5B58\uFF09");
        }
      }
      for (let i = 0; i < lines.length; i++) {
        if (/\blic\s+(magis|minus)\b/i.test(lines[i]) && lines[i].indexOf("?") < 0) {
          push("warn", i + 1, "\u300Clic magis\uFF0Flic minus\u300D\u7528\u6765\u8BF4\u660E\u7531\u300C?\u300D\u58F0\u660E\u7684\u91CF\u53EF\u589E\uFF0F\u53EF\u51CF\uFF0C\u8FD9\u4E00\u884C\u6CA1\u6709\u300C?\u300D");
        }
      }
      const sq = /\[([^\]\n]*)\]/g;
      let b;
      while (b = sq.exec(text)) {
        const before = text.slice(0, b.index);
        const line = before.split("\n").length;
        const inner = b[1];
        let back = b.index - 1;
        while (back >= 0 && /[ \t]/.test(text.charAt(back))) back -= 1;
        if (text.charAt(back) === "=") continue;
        const kind = classifySquare(inner);
        if (kind === "\u7B5B\u9009\u952E\u8868") {
          const kr = /([A-Za-z_][A-Za-z0-9_]*)\s*=/g;
          let k;
          while (k = kr.exec(inner)) {
            if (!keys.has(k[1].toLowerCase())) push("warn", line, "\u7B5B\u9009\u952E\u300C" + k[1] + "\u300D\u4E0D\u5728\u767B\u8BB0\u8868\u91CC");
          }
        } else if (kind === "\u4E0B\u6807 \xB7 \u79E9") {
          const nums = inner.match(/\d+/g) || [];
          for (let n = 0; n < nums.length; n++) {
            const v = parseInt(nums[n], 10);
            if (v < 1 || v > 9) push("warn", line, "\u79E9\u53EA\u6709 1\u20139\uFF0C\u8FD9\u91CC\u7684\u300C" + nums[n] + "\u300D\u8D85\u51FA\u8303\u56F4");
          }
        }
      }
      const imported = [];
      for (let i = 0; i < lines.length; i++) {
        const im = /^[ \t]*impo[ \t]+([^;\n]*)/.exec(lines[i]);
        if (!im) continue;
        const names = im[1].split(",");
        for (let k = 0; k < names.length; k++) {
          const nm = names[k].trim();
          if (nm) imported.push(nm);
        }
      }
      const spells = ctx && ctx.spells || null;
      if (spells && spells.size) {
        const splitTop = function(s) {
          const out = [];
          let depth = 0, cur = "";
          for (let i = 0; i < s.length; i++) {
            const ch = s.charAt(i);
            if (ch === "(" || ch === "[" || ch === "{") depth += 1;
            else if (ch === ")" || ch === "]" || ch === "}") depth -= 1;
            if (ch === "," && depth === 0) {
              out.push(cur);
              cur = "";
              continue;
            }
            cur += ch;
          }
          if (cur.trim()) out.push(cur);
          return out.map(function(x) {
            return x.trim();
          }).filter(Boolean);
        };
        for (let i = 0; i < lines.length; i++) {
          const raw = lines[i];
          const trimmed = raw.trim();
          if (!trimmed) continue;
          if (/\{[ \t]*$/.test(trimmed)) continue;
          if (/^\|/.test(trimmed) || /^\/\//.test(trimmed)) continue;
          const callRe = /\b([A-Z][A-Za-z0-9_]*)[ \t]*\(/g;
          let m;
          while (m = callRe.exec(raw)) {
            const name = m[1];
            if (raw.slice(Math.max(0, m.index - 2), m.index) === "::") continue;
            const rec = spells.get(name);
            if (!rec) {
              if (imported.indexOf(name) >= 0) continue;
              push("warn", i + 1, "\u5F15\u7528\u4E86\u672A\u767B\u8BB0\u7684\u672F\u5F0F\u300C" + name + "\u300D\u2014\u2014 \u82E5\u5B83\u5B9A\u4E49\u5728\u4ED6\u5904\uFF0C\u8BF7\u5728\u5757\u9996\u5199 impo " + name + ";");
              continue;
            }
            if (rec.visibility === "priv" || rec.visibility === "tut") {
              const sameFile = !ctx || !ctx.path || !rec.file || ctx.path === rec.file;
              const inside = sameFile && i + 1 >= rec.line && i + 1 <= rec.endLine;
              if (!inside) push("warn", i + 1, "\u300C" + name + "\u300D\u662F " + rec.visibility + "\uFF0C\u53EA\u5141\u8BB8\u5728\u81EA\u5DF1\u6587\u4EF6\u7684\u8BED\u5757\u5185\u5F15\u7528");
            }
            const open = m.index + m[0].length - 1;
            let depth = 0, close = -1;
            for (let c = open; c < raw.length; c++) {
              const ch = raw.charAt(c);
              if (ch === "(") depth += 1;
              else if (ch === ")") {
                depth -= 1;
                if (depth === 0) {
                  close = c;
                  break;
                }
              }
            }
            if (close < 0) continue;
            const args = splitTop(raw.slice(open + 1, close));
            const params = rec.params || [];
            const required = params.filter(function(p) {
              const m2 = p.modifiers || [];
              return m2.indexOf("publ") >= 0 || m2.indexOf("consta") >= 0;
            }).length;
            if (args.length > params.length) push("warn", i + 1, "\u300C" + name + "\u300D\u5F62\u53C2 " + params.length + " \u4E2A\uFF0C\u8FD9\u91CC\u7ED9\u4E86 " + args.length + " \u4E2A");
            else if (required > 0 && args.length < required) push("warn", i + 1, "\u300C" + name + "\u300D\u6709\u5FC5\u987B\u7ED9\u51FA\u7684 publ\uFF0Fconsta \u5F62\u53C2\uFF08\u5E94 " + required + " \u4E2A\uFF0C\u8FD9\u91CC " + args.length + " \u4E2A\uFF09");
            for (let a = 0; a < args.length; a++) {
              const lbl = /^([A-Za-z_][A-Za-z0-9_]*)[ \t]*:/.exec(args[a]);
              if (!lbl) continue;
              const hit = params.filter(function(p) {
                return p.name === lbl[1] && (p.modifiers || []).indexOf("priv") >= 0;
              })[0];
              if (hit) push("warn", i + 1, "\u300C" + hit.name + "\u300D\u662F\u5185\u90E8\u5F62\u53C2\uFF08priv\uFF09\uFF0C\u4E0D\u8BE5\u7531\u8C03\u7528\u65B9\u7ED9\u51FA");
            }
          }
        }
        spells.forEach(function(rec, name) {
          if (rec.visibility === "consta" && rec.duplicates && rec.duplicates.length) {
            push("warn", rec.line, "\u300C" + name + "\u300D\u662F consta\uFF0C\u4E0D\u80FD\u91CD\u590D\u58F0\u660E\uFF08\u53E6\u89C1\u7B2C " + rec.duplicates.map(function(d) {
              return d.line;
            }).join("\u3001") + " \u884C\uFF09");
          }
        });
      }
      return issues;
    }
    module2.exports = { BRANCH_WORDS, lintText };
  }
});

// src/legacy/plugin.js
var require_plugin = __commonJS({
  "src/legacy/plugin.js"(exports2, module2) {
    "use strict";
    var { Plugin: Plugin2, TFile, TFolder, Notice, MarkdownView, Modal } = require("obsidian");
    var { extractEpXsCBlocks } = require_markdown_blocks();
    var { TYPES, MODIFIERS, makeGrammar, BASE_LISTS } = require_grammar();
    var { tokenizeText } = require_tokenizer();
    var { collectSpells } = require_spells();
    var { lintText } = require_lint();
    var { FALLBACK, SECTIONS, ELEMENTS, splitSections, parseEntries, parseRanks, parseFilterKeys, parseUnits, parseRoots, wordsFrom } = require_parsers();
    var LANG_KEYS = ["EpXsC", "epxsc", "EPXSC"];
    var CODE_SELECTOR = 'code[class*="language-EpXsC" i]';
    var DICT_PATH = "\u4E16\u754C\u8BBE\u5B9A\u96C6/\u5730\u57DF\u6587\u5316\u56FE\u9274/\u8BED\u8A00/\u8FF0\u65E0\u7A7A\u8BED/\u8FF0\u65E0\u7A7A\u8BED\u8BCD\u5178.md";
    var RANK_PATH = "\u4E16\u754C\u8BBE\u5B9A\u96C6/\u8BBE\u5B9A\u6982\u5FF5\u96C6\u5408/\u7EF4\u5EA6/\u7EF4\u5EA6\u6A21\u578B.md";
    var SYNTAX_PATH = "\u4E16\u754C\u8BBE\u5B9A\u96C6/\u5730\u57DF\u6587\u5316\u56FE\u9274/\u8BED\u8A00/\u8FF0\u65E0\u7A7A\u8BED/\u8FF0\u65E0\u7A7A\u8BED\u672F\u5F0F\u8BED\u6CD5.md";
    var ROOTS_DIR = "\u4E16\u754C\u8BBE\u5B9A\u96C6/\u5730\u57DF\u6587\u5316\u56FE\u9274/\u8BED\u8A00/\u8FF0\u65E0\u7A7A\u8BED/\u8BCD\u5E93/\u8BCD\u6839\u8868/";
    var BUILD = "1.31.0";
    function builtinMap(part) {
      const out = /* @__PURE__ */ new Map();
      const source = BUILTIN_LEXICON[part] || {};
      for (const key in source) {
        const v = source[key];
        out.set(key, { word: v[0], pos: v[1], meaning: v[2], abbr: v[3] || "" });
      }
      return out;
    }
    function builtinRanks() {
      const out = /* @__PURE__ */ new Map();
      const source = BUILTIN_LEXICON.ranks || {};
      for (const key in source) out.set(key, source[key]);
      return out;
    }
    function builtinRoots() {
      const out = /* @__PURE__ */ new Map();
      const source = BUILTIN_LEXICON.roots || {};
      for (const key in source) out.set(key, { word: source[key][2] || key, pos: "\u8BCD\u6839\xB7" + source[key][1], meaning: source[key][0], kind: source[key][1] });
      return out;
    }
    function builtinLists(verbRoots) {
      const bySection = {};
      const e = BUILTIN_LEXICON.entries || {};
      for (const key in e) {
        const pos = e[key][1];
        (bySection[pos] = bySection[pos] || []).push(e[key][0]);
      }
      const units = Object.keys(BUILTIN_LEXICON.units || {});
      return {
        keyword: wordsFrom(bySection, SECTIONS.keyword, FALLBACK.keyword),
        judge: wordsFrom(bySection, SECTIONS.judge, FALLBACK.judge),
        clause: wordsFrom(bySection, SECTIONS.clause, FALLBACK.clause),
        degree: wordsFrom(bySection, SECTIONS.degree, FALLBACK.degree),
        predicate: wordsFrom(bySection, SECTIONS.predicate, FALLBACK.predicate).concat(verbRoots || []),
        unit: wordsFrom(bySection, SECTIONS.unit, FALLBACK.unit).concat(units)
      };
    }
    var EXTRA_WORDS = {
      in: { word: "in", pos: "\u4ECB\u8BCD", meaning: "\u5728\u2026\u2026\u91CC\uFF08\u8BCD\u5178\u6682\u672A\u6536\u5F55\uFF0C\u6309\u672F\u5F0F\u7528\u6CD5\u8865\uFF09", abbr: "" },
      /* 第五章筛选键表：ordin= 的三个取值（词典未收，按表补） */
      proxim: { word: "proxim", pos: "\u7B5B\u9009\u503C", meaning: "\u8FD1\uFF08ordin= \u7684\u53D6\u503C\uFF09", abbr: "" },
      procul: { word: "procul", pos: "\u7B5B\u9009\u503C", meaning: "\u8FDC\uFF08ordin= \u7684\u53D6\u503C\uFF09", abbr: "" },
      temer: { word: "temer", pos: "\u7B5B\u9009\u503C", meaning: "\u968F\u673A\uFF08ordin= \u7684\u53D6\u503C\uFF09", abbr: "" }
    };
    var TYPE_NOTES = {
      siro: "void\uFF1A\u65E0\u76EE\u6807\uFF0F\u65E0\u8F7D\u4F53\uFF0C\u53EF\u58F0\u660E\u53D8\u91CF\u6216\u76F4\u63A5\u5360\u4F4D"
    };
    var SECTION_POS = {
      "\u540D\u8BCD": "\u540D\u8BCD",
      "\u52A8\u8BCD": "\u52A8\u8BCD",
      "\u6570\u8BCD": "\u6570\u8BCD",
      "\u5F62\u5BB9\u8BCD": "\u5F62\u5BB9\u8BCD",
      "\u526F\u8BCD": "\u526F\u8BCD",
      "\u4ECB\u8BCD": "\u4ECB\u8BCD",
      "\u52A9\u52A8\u8BCD": "\u52A9\u52A8\u8BCD",
      "\u5224\u65AD\u8BCD": "\u5224\u65AD\u8BCD",
      "\u9650\u5B9A\u8BCD": "\u9650\u5B9A\u8BCD",
      "\u65F6\u95F4\u9650\u5B9A": "\u9650\u5B9A\u8BCD",
      "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A": "\u9650\u5B9A\u8BCD",
      "\u6307\u79F0\u9650\u5B9A": "\u9650\u5B9A\u8BCD",
      "\u987A\u5E8F\u9650\u5B9A": "\u9650\u5B9A\u8BCD",
      "\u7A0B\u5EA6\u9650\u5B9A": "\u526F\u8BCD",
      "\u4EE3\u8BCD\uFF08\u4EBA\u79F0\uFF09": "\u4EE3\u8BCD",
      "\u7591\u95EE\u8BCD": "\u7591\u95EE\u8BCD",
      "\u91CF\u8BCD": "\u91CF\u8BCD",
      "\u8FDE\u63A5\u8BCD\u4E0E\u4ECE\u53E5\u6807\u8BB0": "\u8FDE\u63A5\u8BCD",
      "\u65CF\u540D": "\u540D\u8BCD",
      "\u52A8\u7269\u540D": "\u540D\u8BCD",
      "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B": "\u540D\u8BCD",
      "\u5730\u540D\u4E0E\u52BF\u529B\u540D": "\u4E13\u540D",
      "\u5730\u7406 \xB7 \u795E\u5BAB \xB7 \u8D27\u5E01\u4E13\u540D": "\u4E13\u540D",
      "\u6839\u8BCD": "\u8BCD\u6839",
      "\u540E\u7F00": "\u540E\u7F00",
      "\u590D\u5408\u8BCD": "\u590D\u5408\u8BCD",
      "\u9AD8\u9891\u8865\u5145\u8BCD": "\u8865\u5145\u8BCD",
      "\u5143\u7D20\u56FA\u5B9A\u7F29\u5199": "\u5143\u7D20",
      "\u672F\u5F0F\u5173\u952E\u8BCD": "\u672F\u5F0F\u5173\u952E\u8BCD",
      "\u5355\u4F4D": "\u5355\u4F4D"
    };
    function pickClass(classList) {
      for (let i = 0; i < CLASS_ORDER.length; i++) {
        if (classList.contains(CLASS_ORDER[i])) return CLASS_ORDER[i];
      }
      return null;
    }
    function markSpellRefs(html) {
      return String(html).split("\n").map(function(line) {
        if (line.indexOf('class="token declaration"') < 0) return line;
        const plain = line.replace(/<[^>]+>/g, "");
        if (/\{[ \t]*$/.test(plain)) return line;
        return line.replace(/<span class="token declaration"/g, '<span class="token spellRef"');
      }).join("\n");
    }
    function markVarUse(html, vars) {
      if (!vars || !vars.size) return html;
      const CLAIMABLE = "word|clause|judge|predicate|function|degree|axis|unit";
      vars.forEach(function(binding, name) {
        if (!name) return;
        const safe = name.replace(/[^A-Za-z0-9_]/g, "\\$&");
        html = html.replace(new RegExp('<span class="token (?:' + CLAIMABLE + ')( [^"]*)?">' + safe + "</span>", "g"), '<span class="token varUse$1">' + name + "</span>");
      });
      return html;
    }
    function bracketKinds(text) {
      const src = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\.[^\n]*$/gm, "");
      const out = [];
      for (let i = 0; i < src.length; i++) {
        const ch = src.charAt(i);
        if (ch === "(" || ch === "[" || ch === "{") {
          let kind = "";
          if (ch === "(") {
            const before = src.slice(Math.max(0, i - 60), i);
            const head = /(^|[;{}\n])\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(before);
            const prev = src.charAt(i - 1);
            if (head && /^[A-Z]/.test(head[2]) && prev !== " ") kind = "\u53C2\u6570\u8868";
            else if (/[A-Za-z0-9_]/.test(prev)) kind = "\u5B9E\u53C2\u8868";
            else kind = "\u5206\u7EC4";
          } else if (ch === "[") {
            const close = src.indexOf("]", i);
            const inner = close > 0 ? src.slice(i + 1, close) : "";
            let back = i - 1;
            while (back >= 0 && /[ \t]/.test(src.charAt(back))) back -= 1;
            kind = src.charAt(back) === "=" ? "\u7B5B\u9009\u503C" : classifySquare2(inner);
          } else {
            kind = "\u8BED\u5757";
          }
          out.push(kind);
        } else if (ch === ")" || ch === "]" || ch === "}") {
          out.push("");
        }
      }
      return out;
    }
    var SYMBOL_INFO = {
      "!": { label: "\u8FD0\u7B97\u7B26 !", body: "\u903B\u8F91\u975E\uFF08\u540C C\uFF1B\u4EA6\u53EF\u7528 ne\uFF09" },
      "&&": { label: "\u8FD0\u7B97\u7B26 &&", body: "\u5408\u53D6\uFF08\u5E38\u5199\u4F5C kon\uFF09" },
      "||": { label: "\u8FD0\u7B97\u7B26 ||", body: "\u5305\u542B\u6216\uFF08\u5E38\u5199\u4F5C aut\uFF09" },
      "^": { label: "\u8FD0\u7B97\u7B26 ^", body: "\u5C40\u90E8\u5750\u6807\uFF1A\u53D7\u672F\u8005\u4E09\u8F74\uFF0C\u987B\u5199\u5168" },
      "~": { label: "\u8FD0\u7B97\u7B26 ~", body: "\u76F8\u5BF9\u5750\u6807\uFF1A\u4E16\u754C\u8F74\u504F\u79FB\uFF0C\u81F3\u5C11 X\u3001Z" },
      "==": { label: "\u8FD0\u7B97\u7B26 ==", body: "\u76F8\u7B49\uFF08\u4EA6\u6709\u5224\u65AD\u8BCD aude\uFF09" },
      "!=": { label: "\u8FD0\u7B97\u7B26 !=", body: "\u4E0D\u7B49" },
      "<=": { label: "\u8FD0\u7B97\u7B26 <=", body: "\u4E0D\u8D85\u8FC7" },
      ">=": { label: "\u8FD0\u7B97\u7B26 >=", body: "\u4E0D\u5C11\u4E8E" },
      "<": { label: "\u8FD0\u7B97\u7B26 <", body: "\u5C0F\u4E8E" },
      ">": { label: "\u8FD0\u7B97\u7B26 >", body: "\u5927\u4E8E" },
      "=": { label: "\u8D4B\u503C =", body: "\u5199\u5165\u53D8\u91CF\uFF08\u7CFB\u8BCD es \u8868\u5224\u65AD\uFF09" },
      "+=": { label: "\u590D\u5408\u7B97\u5B50 +=", body: "\u6570\u503C\u53C2\u6570\u9012\u589E" },
      "-=": { label: "\u590D\u5408\u7B97\u5B50 -=", body: "\u6570\u503C\u53C2\u6570\u9012\u51CF" },
      "*=": { label: "\u590D\u5408\u7B97\u5B50 *=", body: "\u6570\u503C\u53C2\u6570\u6309\u500D\u7387\u7F29\u653E" },
      "/=": { label: "\u590D\u5408\u7B97\u5B50 /=", body: "\u6570\u503C\u53C2\u6570\u6309\u6BD4\u4F8B\u7F29\u5C0F" },
      "+": { label: "\u8FD0\u7B97\u7B26 +", body: "\u52A0" },
      "-": { label: "\u8FD0\u7B97\u7B26 -", body: "\u51CF" },
      "*": { label: "\u8FD0\u7B97\u7B26 *", body: "\u89E3\u5F15\u7528\uFF08\u53D6\u5730\u5740\u7528 &\uFF09" },
      "/": { label: "\u8FD0\u7B97\u7B26 /", body: "\u9664\u6CD5\uFF1B\u4EA6\u4E3A\u76F8\u53D8" },
      "?": { label: "\u5360\u4F4D\u7B26 ?", body: "\u503C\u5728\u53D1\u52A8\u65F6\u5B9A\uFF1B\u4F5C\u7C7B\u578B\u8868\u5F85\u5B9A" },
      "..": { label: "\u533A\u95F4 ..", body: "\u4E24\u7AEF\u4E3A\u95ED\u533A\u95F4\uFF1B\u4EA6\u53EF\u53EA\u5199\u4E0A\u754C\u6216\u4E0B\u754C" },
      "...": { label: "\u7701\u7565 ...", body: "\u5217\u4E3E\u672A\u5C3D" },
      ";": { label: "\u5206\u53F7 ;", body: "\u5B50\u53E5\u5206\u9694\uFF08\u540C\u6362\u884C\uFF09" },
      ",": { label: "\u9017\u53F7 ,", body: "\u5E76\u5217\uFF1B\u4EA6\u5206\u9694\u5F62\u53C2" },
      ":": { label: "\u5192\u53F7 :", body: "\u4E0B\u4E00\u5C42\u5F00\u59CB\uFF1B\u4EA6\u5206\u300C\u7C7B\u578B: \u53D8\u91CF\u300D" },
      "&": { label: "\u53D6\u5730\u5740 &", body: "\u53D6\u5F97\u5F15\u7528\uFF08\u5730\u5740\u5373\u4F4D\u7F6E\uFF09" },
      "*&": { label: "\u53D6\u5730\u5740\u540E\u89E3\u5F15\u7528", body: "\u4ECD\u6307\u8BE5\u7269\u672C\u8EAB" },
      "@": { label: "\u76EE\u6807\u7B80\u5199 @", body: "\u5168\u5F62\u4E3A METOS[\u2026]" }
    };
    function classifySquare2(inner) {
      if (/=/.test(inner)) return "\u7B5B\u9009\u952E\u8868";
      if (/^\s*:/.test(inner)) return "\u5217\u8868\u7C7B\u578B";
      if (/^\s*\d+\s*:/.test(inner)) return "\u4F4D\u6570\u58F0\u660E";
      if (/&/.test(inner)) return "\u70B9\u540D\u5217\u8868";
      if (/siro|\*/.test(inner)) return "\u76EE\u6807\u96C6";
      if (/\.\./.test(inner) || /^\s*\d+\s*$/.test(inner)) return "\u4E0B\u6807 \xB7 \u79E9";
      return "\u5217\u8868";
    }
    var KIND_INFO = {
      "\u53C2\u6570\u8868": { label: "\u5706\u62EC\u53F7 \xB7 \u53C2\u6570\u8868", body: "\u672F\u5F0F\u7684\u5F62\u53C2\u8868\u3002\u5199\u6CD5\u4E3A\u300C\u7C7B\u578B: \u53D8\u91CF\u540D\u300D\uFF0C\u9017\u53F7\u5206\u9694\uFF1B\u7C7B\u578B\u53EF\u7701\uFF0C\u7701\u4E86\u7531\u672F\u5F0F\u81EA\u5224\u3002" },
      "\u5B9E\u53C2\u8868": { label: "\u5706\u62EC\u53F7 \xB7 \u5B9E\u53C2\u8868", body: "\u8C03\u7528\u8C13\u8BCD\u65F6\u7ED9\u51FA\u7684\u5B9E\u53C2\u3002\u8C13\u8BCD\u4E0E\u5B9E\u53C2\u5E73\u65F6\u9760\u5E76\u7F6E\uFF0C\u5706\u62EC\u53F7\u53EA\u5728\u9700\u8981\u6D88\u6B67\u65F6\u51FA\u73B0\u3002" },
      "\u5206\u7EC4": { label: "\u5706\u62EC\u53F7 \xB7 \u5206\u7EC4\uFF0F\u5143\u7EC4", body: "\u62EC\u53F7\u5185\u4EE5\u9017\u53F7\u5206\u9694\u5373\u6210\u5143\u7EC4\uFF1B\u4E5F\u7528\u6765\u663E\u5F0F\u6307\u5B9A\u6C42\u503C\u987A\u5E8F\u3002" },
      "\u7B5B\u9009\u503C": { label: "\u65B9\u62EC\u53F7 \xB7 \u7B5B\u9009\u503C", body: "\u7B5B\u9009\u952E\u7684\u53D6\u503C\uFF1A\u5217\u8868\u6216\u533A\u95F4\uFF0C\u6309\u8BE5\u952E\u7684\u89C4\u5219\u89E3\u91CA\u3002" },
      "\u7B5B\u9009\u952E\u8868": { label: "\u65B9\u62EC\u53F7 \xB7 \u7B5B\u9009\u952E\u8868", body: "\u5185\u4E3A\u300C\u952E=\u503C\u300D\uFF0C\u6309\u6761\u4EF6\u7B5B\u51FA\u5BF9\u8C61\u96C6\uFF1B\u952E\u540D\u4E0E\u542B\u4E49\u89C1\u300A\u8FF0\u65E0\u7A7A\u8BED\u672F\u5F0F\u8BED\u6CD5\u300B\u7B5B\u9009\u952E\u4E00\u8282\u3002" },
      "\u5217\u8868\u7C7B\u578B": { label: "\u65B9\u62EC\u53F7 \xB7 \u5217\u8868\u7C7B\u578B", body: "\u65B9\u62EC\u53F7\u4EE5\u5192\u53F7\u5F00\u5934\u65F6\u8868\u793A\u5217\u8868\u5BB9\u5668\uFF0C\u5192\u53F7\u540E\u662F\u5143\u7D20\u7C7B\u578B\u3002" },
      "\u4F4D\u6570\u58F0\u660E": { label: "\u65B9\u62EC\u53F7 \xB7 \u4F4D\u6570\uFF1A\u53D8\u91CF", body: "\u62EC\u53F7\u5185\u7684\u5192\u53F7\u4EA4\u4EE3\u300C\u54EA\u4E00\u4F4D\uFF1A\u53EB\u4EC0\u4E48\u300D\u2014\u2014\u5192\u53F7\u524D\u662F\u4F4D\u6570\uFF0C\u5192\u53F7\u540E\u662F\u53D8\u91CF\u540D\u3002" },
      "\u4E0B\u6807 \xB7 \u79E9": { label: "\u65B9\u62EC\u53F7 \xB7 \u4E0B\u6807\uFF08\u79E9\uFF09", body: "\u53D6\u8BE5\u5BF9\u8C61\u7684\u7B2C n \u79E9\uFF1B\u5199\u6210\u533A\u95F4\u65F6\u6307\u4E00\u6BB5\u79E9\u3002" },
      "\u70B9\u540D\u5217\u8868": { label: "\u65B9\u62EC\u53F7 \xB7 \u70B9\u540D\u5217\u8868", body: "\u628A\u5DF2\u53D6\u5730\u5740\u7684\u5BF9\u8C61\u9010\u4E2A\u5217\u51FA\uFF0C\u53EA\u4F5C\u7528\u4E8E\u8FD9\u4E9B\u76EE\u6807\u3002" },
      "\u76EE\u6807\u96C6": { label: "\u65B9\u62EC\u53F7 \xB7 \u76EE\u6807\u96C6", body: "siro \u8868\u793A\u65E0\u76EE\u6807\uFF08\u4F5C\u7528\u4E8E\u73AF\u5883\uFF09\uFF0C* \u8868\u793A\u4EFB\u610F\u76EE\u6807\u3002" },
      "\u5217\u8868": { label: "\u65B9\u62EC\u53F7 \xB7 \u5217\u8868", body: "\u5BB9\u5668\u7C7B\u578B\u7531\u62EC\u53F7\u81EA\u5DF1\u58F0\u660E\uFF1A\u5706\u62EC\u53F7\u662F\u5143\u7EC4\u3001\u65B9\u62EC\u53F7\u662F\u5217\u8868\u3001\u82B1\u62EC\u53F7\u662F\u5B57\u5178\u3002" },
      "\u8BED\u5757": { label: "\u82B1\u62EC\u53F7 \xB7 \u8BED\u5757", body: "\u5212\u8303\u56F4\uFF1A\u89E6\u53D1\u3001\u6548\u679C\u3001\u80FD\u91CF\u3001\u4EE3\u4EF7\u90FD\u5199\u5728\u91CC\u9762\u3002\u540C\u4E00\u5F62\u72B6\u4E5F\u517C\u4F5C\u5B57\u5178\uFF0F\u6620\u5C04\u3002" }
    };
    function bracketTip(kind) {
      return KIND_INFO[kind] || { label: "\u62EC\u53F7", body: kind || "" };
    }
    function inferKind(expr, known) {
      const e = (expr || "").trim();
      if (!e) return { kind: "\u672A\u5B9A" };
      if (/^\*&/.test(e)) return { kind: "\u5B9E\u4F53" };
      if (/^&/.test(e)) return { kind: "\u5730\u5740" };
      if (/^@/.test(e) || /^METOS\s*\[/.test(e)) return { kind: "\u5BF9\u8C61\u96C6" };
      if (/^\[/.test(e)) return { kind: "\u5217\u8868" };
      if (/^\(/.test(e)) return { kind: "\u5143\u7EC4" };
      if (/^\{/.test(e)) return { kind: "\u5B57\u5178" };
      if (/^\d/.test(e)) return { kind: "\u6570\u503C" };
      const word = /^([A-Za-z_][A-Za-z0-9_]*)\s*([(=]?)/.exec(e);
      if (word) {
        const w = word[1];
        if (ELEMENTS.indexOf(w) >= 0 || TYPES.indexOf(w) >= 0) return { kind: "\u5143\u7D20\u6216\u7C7B\u578B", ref: w };
        if (word[2] === "(") return { kind: "\u8C03\u7528" };
        if (known && known.has(w)) return { kind: "\u540C\u524D", ref: w };
      }
      return { kind: "\u672A\u5B9A" };
    }
    function parseVarTypes(text, info) {
      const out = /* @__PURE__ */ new Map();
      const isType = function(w) {
        return TYPES.indexOf(w) >= 0 || ELEMENTS.indexOf(w) >= 0;
      };
      const scopes = text.match(/\([^()]*\)/g) || [];
      for (let i = 0; i < scopes.length; i++) {
        const parts = scopes[i].slice(1, -1).split(",");
        for (let j = 0; j < parts.length; j++) {
          const p = parts[j].trim();
          let m = /^((?:(?:priv|tut|publ|consta)[ \t]+)*)([A-Za-z_][A-Za-z0-9_]*)\s*:\s*((?:(?:priv|tut|publ|consta)[ \t]+)*)([A-Za-z_][A-Za-z0-9_]*)$/.exec(p);
          if (m) {
            const ty = m[2];
            const name = m[4];
            const mods = ((m[1] || "") + " " + (m[3] || "")).trim().toLowerCase().split(/[ \t]+/).filter(Boolean);
            let binding;
            if (isType(ty) && !isType(name)) binding = { type: ty };
            else if (!isType(ty) && isType(name)) binding = { type: name };
            else if (ty.length === 1) binding = { type: name };
            else binding = { type: ty };
            if (mods.length) {
              binding.modifiers = mods;
              binding.modifier = mods[mods.length - 1];
            }
            out.set(name, binding);
            continue;
          }
          m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\[[^\]]*?(\d+)?\s*:?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\]$/.exec(p);
          if (m) {
            out.set(m[3], { type: m[1], container: "\u5217\u8868", length: m[2] || "" });
            continue;
          }
          m = /^\[[^\]]*?([A-Za-z_][A-Za-z0-9_]*)\s*\]\s*:\s*([A-Za-z_][A-Za-z0-9_]*)$/.exec(p);
          if (m) {
            out.set(m[2], { type: m[1], container: "\u5217\u8868", length: "" });
            continue;
          }
        }
      }
      const assign = new RegExp("(^|[;\\n])[ \\t]*((?:(?:" + MODIFIERS.join("|") + ")[ \\t]+)*)([A-Za-z_][A-Za-z0-9_]*)[ \\t]*=(?!=)[ \\t]*([^\\n;]*)", "g");
      let a;
      while (a = assign.exec(text)) {
        const name = a[3];
        if (out.has(name)) continue;
        const binding = inferKind(a[4], out);
        binding.modifiers = (a[2] || "").trim().toLowerCase().split(/[ \t]+/).filter(Boolean);
        binding.modifier = binding.modifiers.length ? binding.modifiers[binding.modifiers.length - 1] : "";
        out.set(name, binding);
      }
      return out;
    }
    var BIND_KIND = {
      "\u5730\u5740": "\u662F\u4E2A\u5730\u5740 \u2014\u2014 & \u53D6\u5F97\u7684\u5F15\u7528\uFF1B\u8BBE\u5B9A\u91CC\u5730\u5740\u672C\u8EAB\u5C31\u662F\u4F4D\u7F6E\uFF08\u7B2C 1\u20133 \u79E9\uFF09\u3002",
      "\u5B9E\u4F53": "\u662F\u987A\u7740\u5F15\u7528\u53D6\u56DE\u7684\u90A3\u7269\u672C\u8EAB\u3002",
      "\u5BF9\u8C61\u96C6": "\u662F\u76EE\u6807\u5BF9\u8C61\u96C6\u3002",
      "\u5217\u8868": "\u662F\u5217\u8868\u5BB9\u5668\u3002",
      "\u5143\u7EC4": "\u662F\u5143\u7EC4\u3002",
      "\u5B57\u5178": "\u662F\u5B57\u5178\uFF0F\u6620\u5C04\u3002",
      "\u6570\u503C": "\u662F\u6570\u503C\u3002",
      "\u8C03\u7528": "\u53D6\u7684\u662F\u8C13\u8BCD\u8C03\u7528\u7684\u7ED3\u679C\uFF0C\u7C7B\u522B\u7531\u8BE5\u8C13\u8BCD\u51B3\u5B9A\u3002",
      "\u540C\u524D": "\u4E0E\u53F3\u4FA7\u90A3\u4E2A\u53D8\u91CF\u6307\u540C\u4E00\u7269\u3002",
      "\u672A\u5B9A": "\u7531 = \u7ED1\u5B9A\uFF0C\u53F3\u4FA7\u5199\u6CD5\u672A\u7ED9\u51FA\u53EF\u5224\u5B9A\u7684\u7C7B\u522B\u3002"
    };
    var MOD_INFO = {
      priv: "\u79C1\u6709\uFF1A\u4EC5\u5F53\u524D\u8BED\u5757\u53EF\u89C1",
      tut: "\u53D7\u62A4\uFF1A\u672C\u8BED\u5757\u53CA\u5B50\u5757\u53EF\u89C1",
      publ: "\u516C\u5F00\uFF1A\u6574\u4E2A\u672F\u5F0F\u5185\u53EF\u89C1",
      consta: "\u5E38\u6570\uFF1A\u4E0D\u53EF\u518D\u8D4B\u503C"
    };
    function variableTip(name, binding, info) {
      if (!binding) return null;
      const mods = binding.modifiers || (binding.modifier ? [binding.modifier] : []);
      const modParts = [];
      for (let mi = 0; mi < mods.length; mi++) if (MOD_INFO[mods[mi]]) modParts.push(MOD_INFO[mods[mi]]);
      const mod = modParts.length ? modParts.join("\uFF1B") + "\uFF1B" : "";
      if (binding.type) {
        const entry = info && info.get(String(binding.type).toLowerCase());
        const detail = entry ? "\uFF08" + (entry.pos ? entry.pos + " " : "") + entry.meaning + "\uFF09" : "";
        const shape = binding.container ? "\uFF0C" + binding.container + "\u5BB9\u5668\uFF0C" + (binding.length ? "\u957F\u5EA6 " + binding.length : "\u957F\u5EA6\u672A\u5B9A") : "";
        return { label: "\u53D8\u91CF " + name, body: mod + "\u7C7B\u578B " + binding.type + shape + detail };
      }
      if (binding.kind === "\u5143\u7D20\u6216\u7C7B\u578B") {
        const entry = info && info.get(String(binding.ref || "").toLowerCase());
        const detail = entry ? "\uFF08" + (entry.pos ? entry.pos + " " : "") + entry.meaning + "\uFF09" : "";
        return { label: "\u53D8\u91CF " + name, body: mod + "\u53D6 " + binding.ref + detail + " \u672C\u8EAB" };
      }
      return { label: "\u53D8\u91CF " + name, body: mod + (BIND_KIND[binding.kind] || BIND_KIND["\u672A\u5B9A"]) };
    }
    function negScopeText(el) {
      let out = "";
      let node = el && el.nextSibling;
      let guard = 0;
      while (node && guard < 40) {
        guard += 1;
        const t = node.textContent || "";
        const cut = /[;,\n]/.exec(t);
        if (cut) {
          out += t.slice(0, cut.index);
          break;
        }
        out += t;
        node = node.nextSibling;
      }
      return out.replace(/\s+/g, " ").trim();
    }
    var WORLD_AXES = ["X\uFF08\u4E1C\u897F\uFF09", "Y\uFF08\u4E0A\u4E0B\uFF09", "Z\uFF08\u5357\u5317\uFF09"];
    var LOCAL_AXES = ["\u5DE6\uFF08X\uFF09", "\u4E0A\uFF08Y\uFF09", "\u524D\uFF08Z\uFF09"];
    function parseCoord2(text) {
      const sign = text.charAt(0) === "~" ? "~" : "^";
      const parts = text.split(/[ \t]+(?=[~^])/);
      const values = [];
      for (let i = 0; i < parts.length; i++) {
        const m = /^[~^][ \t]*([-+]?\d+(?:\.\d+)?)?/.exec(parts[i]);
        values.push(m && m[1] ? m[1] : "0");
      }
      return { sign, values };
    }
    function coordTip(text) {
      const c = parseCoord2(text);
      const n = c.values.length;
      if (c.sign === "~") {
        if (n < 2) return { label: "\u76F8\u5BF9\u5750\u6807 ~\uFF08" + n + " \u8F74\uFF09", body: "\u81F3\u5C11\u7ED9 X \u4E0E Z" };
        const names = n === 3 ? WORLD_AXES : n === 2 ? [WORLD_AXES[0], WORLD_AXES[2]] : [];
        const shown2 = [];
        for (let i = 0; i < n; i++) shown2.push((names[i] || "\u7B2C " + (i + 1) + " \u8F74") + " " + c.values[i]);
        return {
          label: "\u76F8\u5BF9\u5750\u6807 ~\uFF08" + n + " \u8F74\uFF09",
          body: "\u4E16\u754C\u8F74\uFF1A" + shown2.join(" \xB7 ") + "\uFF08\u4E0D\u968F\u671D\u5411\u53D8\uFF09"
        };
      }
      if (n !== 3) return { label: "\u5C40\u90E8\u5750\u6807 ^\uFF08" + n + " \u8F74\uFF09", body: "\u987B\u5199\u5168\u4E09\u8F74\uFF08\u5DE6\uFF0F\u4E0A\uFF0F\u524D\uFF09" };
      const shown = [];
      for (let i = 0; i < 3; i++) shown.push(LOCAL_AXES[i] + " " + c.values[i]);
      return { label: "\u5C40\u90E8\u5750\u6807 ^\uFF083 \u8F74\uFF09", body: "\u53D7\u672F\u8005\u4E09\u8F74\uFF1A" + shown.join(" \xB7 ") + "\uFF08\u968F\u671D\u5411\u53D8\uFF09" };
    }
    function rankDef(n, ranks) {
      if (!ranks) return "";
      const key = String(n);
      if (ranks.has(key)) return ranks.get(key);
      const num = parseInt(key, 10);
      if (!num) return "";
      let found = "";
      ranks.forEach(function(value, k) {
        if (found) return;
        const m = /^(\d+)[–-](\d+)$/.exec(k);
        if (m && num >= parseInt(m[1], 10) && num <= parseInt(m[2], 10)) found = value;
      });
      return found;
    }
    function rankSpan(a, b, ranks) {
      const lo = parseInt(a, 10);
      const hi = parseInt(b, 10);
      if (!lo || !hi || hi < lo || hi - lo > 8) return "";
      const parts = [];
      for (let n = lo; n <= hi; n++) {
        const r = ranks.get(String(n));
        if (!r) return "";
        const bits = String(r).split(" \xB7 ");
        parts.push(bits.length > 1 ? bits[bits.length - 1] : String(r));
      }
      return parts.join("\uFF0C");
    }
    var WORD_KIND = {
      class: "\u8BED\u6CD5\u8BCD",
      hered: "\u8BED\u6CD5\u8BCD",
      campus: "\u7ED3\u754C\u7C7B",
      protocol: "\u534F\u8BAE\u6761\u6B3E",
      clav: "\u534F\u8BAE\u6761\u76EE",
      frequent: "\u534F\u8BAE\u6761\u76EE",
      erk: "\u76F8\u4F4D",
      impo: "\u8BED\u6CD5\u8BCD"
    };
    function buildTip(cls, text, info, ranks) {
      if (cls === "spellRef" || cls === "declaration") {
        const rec = spellRegistry.get(String(text));
        if (rec) {
          const vis = rec.visibility ? rec.visibility : "\u9ED8\u8BA4\uFF08\u5757\u5185\u53EF\u89C1\uFF09";
          const ps = (rec.params || []).map(function(p) {
            return ((p.modifiers || []).join(" ") ? (p.modifiers || []).join(" ") + " " : "") + (p.type ? p.type + ":" : "") + p.name;
          });
          return {
            label: (cls === "spellRef" ? "\u672F\u5F0F\u5F15\u7528" : "\u672F\u5F0F\u58F0\u660E") + "\uFF1A" + text,
            body: (rec.visibility ? rec.visibility : "\u9ED8\u8BA4") + (ps.length ? " \xB7 \u5F62\u53C2 " + ps.length + "\uFF1A" + ps.join("\u3001") : " \xB7 \u65E0\u5F62\u53C2")
          };
        }
        if (cls === "spellRef") return { label: "\u672F\u5F0F\u5F15\u7528\uFF1A" + text, body: "\u672A\u767B\u8BB0" };
      }
      if (cls === "element") {
        const e = info.get(String(text)) || info.get(String(text).toLowerCase());
        const mean = e && e.meaning ? e.meaning : "";
        return { label: "\u5143\u7D20\u7801\uFF1A" + text, body: (mean ? mean + " \xB7 " : "") + "\u7C7B\u53D8\u91CF\uFF08\u5355\u4F8B\uFF09" };
      }
      if (cls === "rankRange") {
        const m = /^(\d*)\.\.(\d*)$/.exec(text);
        const a = m ? m[1] : "";
        const b = m ? m[2] : "";
        if (a && b) {
          const span = ranks.get(a + "\u2013" + b) || rankSpan(a, b, ranks);
          if (span) return { label: "\u79E9 " + a + "\u2013" + b, body: span };
          return { label: "\u533A\u95F4 " + a + "\u2013" + b, body: "\u8DDD\u79BB\uFF0F\u89D2\u5EA6\uFF0F\u91CF\u503C" };
        }
        if (b) return { label: "\u81F3 " + b, body: "\u4E0D\u8D85\u8FC7\u8BE5\u6570\uFF08\u542B\uFF09" };
        if (a) return { label: "\u81EA " + a + " \u8D77", body: "\u81EA\u8BE5\u5904\u8D77\uFF08\u542B\uFF09" };
        return { label: "\u533A\u95F4", body: "\u672F\u5F0F\u91CC\u7684 .. \u533A\u95F4\u5199\u6CD5" };
      }
      if (cls === "bracket") return { label: "\u65B9\u62EC\u53F7", body: "\u5217\u8868 \uFF0F \u4E0B\u6807 \uFF0F \u79E9" };
      if (cls === "paren") return { label: "\u5706\u62EC\u53F7", body: "\u5143\u7EC4 \xB7 \u5206\u7EC4 \xB7 \u5B9E\u53C2\u8868" };
      if (cls === "brace") return { label: "\u82B1\u62EC\u53F7", body: "\u8BED\u5757\uFF08\u517C\u4F5C\u5B57\u5178\uFF0F\u6620\u5C04\uFF09" };
      if (cls === "pointer") return { label: "\u6307\u9488", body: "& \u53D6\u5730\u5740 \xB7 * \u89E3\u5F15\u7528 \xB7 @ \u76EE\u6807\u7B80\u5199" };
      if (cls === "declaration") return { label: "\u672F\u5F0F\u540D", body: "\u672C\u672F\u5F0F\u7684\u58F0\u660E\u540D\uFF0C\u540E\u9762\u8DDF\u53C2\u6570\u8868\u4E0E\u8BED\u5757" };
      if (!info) return null;
      const entry = info.get(String(text).toLowerCase());
      if (!entry) return null;
      const head = WORD_KIND[String(text).toLowerCase()] || (entry.kind ? "\u8BCD\u6839\xB7" + entry.kind : CLASS_LABEL[cls] || SECTION_POS[entry.pos] || entry.pos || "\u8BCD\u6761");
      const raw = entry.abbr || "";
      const showAbbr = raw && raw !== "\u2014" && raw !== "-" && raw.toLowerCase() !== String(text).toLowerCase();
      const note = TYPE_NOTES[String(text).toLowerCase()];
      return { label: head, body: entry.meaning + (note ? "\uFF1B" + note : "") };
    }
    var FALLBACK_CSS = '/* EpXsC Syntax \u5185\u7F6E\u515C\u5E95\u6837\u5F0F\uFF08\u4E0E styles.css \u7B2C 1\uFF0F2\uFF0F3\uFF0F5\uFF0F6 \u8282\u4E00\u81F4\uFF09 */\nbody{--epx-comment:var(--text-faint);--epx-pretium:var(--color-red);--epx-keyword:var(--color-purple);--epx-judge:var(--color-purple);--epx-clause:var(--color-red);--epx-verb:var(--color-blue);--epx-decl:var(--color-yellow);--epx-element:var(--color-cyan);--epx-type:var(--color-cyan);--epx-unit:var(--color-orange);--epx-number:var(--color-orange);--epx-degree:var(--color-pink);--epx-axis:var(--color-green);--epx-pointer:var(--text-accent);--epx-operator:var(--text-muted);--epx-punct:var(--text-muted);--epx-paren:var(--text-muted);--epx-bracket:var(--text-muted);--epx-brace:var(--text-muted);--epx-rank:var(--color-orange);--epx-b2:var(--text-muted);--epx-b3:var(--text-muted);--epx-variable:var(--color-pink);--epx-modifier:var(--color-red)}\n.epx-pre{position:relative;padding:1.1em 1.15em 1.15em;background:var(--code-background);border:1px solid var(--background-modifier-border);border-left:3px solid var(--text-accent);border-radius:var(--radius-m)}\n.epx-pre::before{content:"EpXsC";position:absolute;inset:0 0 auto auto;padding:0 .7em;font-family:var(--font-interface);font-size:.62em;font-weight:600;letter-spacing:.09em;line-height:1.8;color:var(--text-on-accent);background:var(--text-accent);border-radius:0 var(--radius-m) 0 var(--radius-s);opacity:.85;pointer-events:none;user-select:none}\n:is(code[class*="language-EpXsC" i], .epx-ord){font-family:var(--font-monospace);font-size:.9em;line-height:1.65;tab-size:4;color:var(--code-normal,var(--text-normal));background:none;padding:0;text-shadow:none}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.comment{color:var(--epx-comment);font-style:italic}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.pretium{color:var(--epx-pretium);font-weight:700}:is(code[class*="language-EpXsC" i], .epx-ord) .token.clause{color:var(--epx-clause);font-weight:700}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.keyword{color:var(--epx-keyword);font-weight:600}:is(code[class*="language-EpXsC" i], .epx-ord) .token.judge{color:var(--epx-judge);font-weight:700}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.negPrefix{color:var(--epx-keyword);font-weight:700}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.function{color:var(--epx-verb)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.spellRef{color:var(--epx-verb);font-weight:700}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.predicate{color:var(--epx-verb)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.declaration{color:var(--epx-decl);font-weight:700}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.element{color:var(--epx-element);font-weight:600}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.type{color:var(--epx-type)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.variable{color:var(--epx-variable);font-weight:600}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.unit{color:var(--epx-unit);font-style:italic}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.number{color:var(--epx-number)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.rankRange{color:var(--epx-rank);font-weight:700}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.degree{color:var(--epx-degree);font-style:italic}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.axis{color:var(--epx-axis)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.pointer{color:var(--epx-pointer);font-weight:700}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.coordRun{color:var(--text-muted);font-weight:600}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.modifier{color:var(--epx-modifier);font-style:italic;font-weight:600}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.declTarget{color:var(--epx-variable);font-weight:600}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.varUse{color:var(--epx-variable)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.operator{color:var(--epx-operator)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.bracket{color:var(--epx-bracket);color:color-mix(in srgb,var(--color-cyan) 40%,var(--text-muted));font-weight:600}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.paren{color:var(--epx-paren)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.brace{color:var(--epx-brace)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.punctuation{color:var(--epx-punct)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.epx-d2{color:var(--epx-b2);color:color-mix(in srgb,var(--color-pink) 35%,var(--text-muted))}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.epx-d3{color:var(--epx-b3);color:color-mix(in srgb,var(--color-green) 35%,var(--text-muted))}\nbody.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.declaration{color:#7e691f;color:color-mix(in srgb,var(--color-yellow) 45%,var(--text-normal))}\nbody.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.element,body.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.type{color:#17797a;color:color-mix(in srgb,var(--color-cyan) 50%,var(--text-normal))}\nbody.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.unit,body.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.number,body.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.rankRange{color:#a05b16;color:color-mix(in srgb,var(--color-orange) 60%,var(--text-normal))}\nbody.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.axis{color:#197d44;color:color-mix(in srgb,var(--color-green) 55%,var(--text-normal))}\nbody.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.degree,body.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.variable,body.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.declTarget,body.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.varUse{color:#c4387c;color:color-mix(in srgb,var(--color-pink) 90%,var(--text-normal))}\nbody.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.pretium,body.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.clause,body.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.modifier{color:#cd3145;color:color-mix(in srgb,var(--color-red) 85%,var(--text-normal))}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.epx-unknown{text-decoration:underline dotted var(--color-orange);text-underline-offset:.2em}\n.epx-tip{position:fixed;z-index:9999;max-width:340px;padding:7px 11px;border:1px solid var(--background-modifier-border);border-radius:var(--radius-s);background:var(--background-secondary);color:var(--text-normal);font-family:var(--font-interface);font-size:12px;line-height:1.5;box-shadow:var(--shadow-s);pointer-events:none;opacity:0}\n.epx-tip.is-visible{opacity:1}\n.epx-tip .epx-tip-head{font-weight:600;color:var(--text-accent)}\n.epx-tip .epx-tip-body{color:var(--text-muted)}\n/* \u666E\u901A\u53E5\u5757\uFF1A\u5916\u6846 + \u53F3\u4E0A\u89D2\u8BED\u8A00\u7B7E\uFF0C\u8DDF\u672F\u5F0F\u5757\u540C\u5F62\uFF0C\u53EA\u6309\u6A21\u5F0F\u6362\u8272\uFF08G \u9752 \xB7 T \u6A59\uFF09\n   \u5916\u5C42\u662F code.language-EpXsC\uFF1Atoken \u914D\u8272\u4E0E\u60AC\u505C\u6CBF\u7528\u672F\u5F0F\u90A3\u5957\u9009\u62E9\u5668\uFF0C\u8FD9\u91CC\u53EA\u7BA1\u7248\u9762\u3002 */\n.epx-ord {\n  --epx-ord-tint: var(--color-cyan);\n  display: block;\n  position: relative;\n  line-height: 1.9;\n  padding: 1.1em 1.15em 1.15em;\n  background: var(--code-background);\n  border: 1px solid var(--background-modifier-border);\n  border-left: 3px solid var(--epx-ord-tint);\n  border-radius: var(--radius-m);\n  box-shadow: 0 1px 2px rgb(0 0 0 / 6%);\n}\n.epx-ord-T { --epx-ord-tint: var(--color-orange); }\n.epx-ord::before {\n  content: "EpXsG";\n  position: absolute;\n  inset: 0 0 auto auto;\n  padding: 0 0.7em;\n  font-family: var(--font-interface);\n  font-size: 0.62em;\n  font-weight: 600;\n  letter-spacing: 0.09em;\n  line-height: 1.8;\n  color: var(--epx-ord-tint);\n  background: var(--background-secondary);\n  background: color-mix(in srgb, var(--epx-ord-tint) 22%, var(--background-primary));\n  border-radius: 0 var(--radius-m) 0 var(--radius-s);\n  opacity: 0.95;\n  pointer-events: none;\n  user-select: none;\n}\n.epx-ord-T::before { content: "EpXsT"; }\n/* \u8BCD\u4E0E\u8BCD\u6CE8\u90FD\u662F inline-block\uFF1A\u5FC5\u987B top \u5BF9\u9F50\uFF0C\u5426\u5219\u6709\u8BCD\u6CE8\u7684\u8BCD\u88AB\u9876\u9AD8\u3001\u6574\u884C\u5B57\u4E0A\u4E0B\u8DF3\u3002 */\n.epx-oline { display: block; margin: .18em 0; }\n.epx-gs { display: block; }\n.epx-gw { display: inline-block; text-align: center; margin: 0 .16em; vertical-align: top; }\n.epx-gsrc { display: block; line-height: 1.3; }\n.epx-ggl { display: block; font-size: .74em; line-height: 1.2; opacity: .7; font-family: var(--font-text); }\n.epx-tsrc { display: block; }\n.epx-tzh { display: block; font-family: var(--font-text); opacity: .78; font-size: .92em; }\n.epx-gap { display: block; height: .45em; }\n.epx-ord-wrap { display: block; }\n/* \u6709\u4E9B\u4E3B\u9898\u4F1A\u7ED9\u5757\u7EA7\u5143\u7D20\u7EE7\u627F\u9996\u884C\u7F29\u8FDB\uFF1BT/G \u662F\u4EE3\u7801\u5757\uFF0C\u9996\u884C\u5FC5\u987B\u8D34\u5DE6 */\n.epx-ord, .epx-ord .epx-oline, .epx-ord .epx-tsrc, .epx-ord .epx-tzh { text-indent: 0; }\n.epx-ord { padding: 1.1em 1.15em 1.15em !important; }\n@media (max-width: 640px) { .epx-ord { padding: 0 0.9em 0.9em !important; } }\n.epx-ord > .epx-oline:first-child { margin-top: 0; }\n.epx-ord { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }\n@media (max-width:640px){.epx-ord,.epx-pre{white-space:pre-wrap;overflow-wrap:break-word;padding:0 .9em .9em}.epx-ord{line-height:1.8}.epx-ord::before,.epx-pre::before{position:static;display:block;margin:0 -.9em .75em;padding:.22em .9em;text-align:right;line-height:1.7;border-radius:var(--radius-m) var(--radius-m) 0 0;opacity:1}.epx-ggl{line-height:1.25}.epx-tzh{margin-top:.15em}}';
    var varTypesOf = /* @__PURE__ */ new WeakMap();
    var spellRegistry = /* @__PURE__ */ new Map();
    var tipNode = null;
    function ensureTipNode() {
      if (tipNode && tipNode.parentNode) return tipNode;
      tipNode = document.createElement("div");
      tipNode.className = "epx-tip";
      const s = tipNode.style;
      s.position = "fixed";
      s.zIndex = "9999";
      s.pointerEvents = "none";
      s.opacity = "0";
      s.maxWidth = "340px";
      s.padding = "7px 11px";
      s.border = "1px solid var(--background-modifier-border)";
      s.borderRadius = "var(--radius-s, 6px)";
      s.background = "var(--background-secondary)";
      s.color = "var(--text-normal)";
      s.fontFamily = "var(--font-interface)";
      s.fontSize = "12px";
      s.lineHeight = "1.5";
      s.boxShadow = "var(--shadow-s, 0 2px 8px rgba(0,0,0,.25))";
      s.transition = "opacity 90ms ease";
      document.body.appendChild(tipNode);
      return tipNode;
    }
    function showTipAt(x, y, tip) {
      const node = ensureTipNode();
      node.innerHTML = "";
      const head = document.createElement("div");
      head.className = "epx-tip-head";
      head.textContent = tip.label;
      node.appendChild(head);
      if (tip.body) {
        const bodyEl = document.createElement("div");
        bodyEl.className = "epx-tip-body";
        bodyEl.textContent = tip.body;
        node.appendChild(bodyEl);
      }
      node.style.opacity = "1";
      node.classList.add("is-visible");
      const nr = node.getBoundingClientRect();
      const vw = window.innerWidth || 900;
      const vh = window.innerHeight || 600;
      let left = x + 14;
      if (left + nr.width > vw - 8) left = x - nr.width - 14;
      if (left < 8) left = 8;
      let top = y + 18;
      if (top + nr.height > vh - 8) top = y - nr.height - 12;
      if (top < 8) top = 8;
      node.style.left = Math.round(left) + "px";
      node.style.top = Math.round(top) + "px";
    }
    function hideTip() {
      if (tipNode) tipNode.style.opacity = "0";
      if (tipNode) tipNode.classList.remove("is-visible");
    }
    function prevToken(el) {
      let n = el ? el.previousSibling : null;
      while (n && !(n.nodeType === 1 && n.classList && n.classList.contains("token"))) n = n.previousSibling;
      return n;
    }
    function nextToken(el) {
      let n = el ? el.nextSibling : null;
      while (n && !(n.nodeType === 1 && n.classList && n.classList.contains("token"))) n = n.nextSibling;
      return n;
    }
    function phaseOf(el) {
      const caret = prevToken(el);
      if (!caret || !caret.classList || !caret.classList.contains("operator") || String(caret.textContent).trim() !== "^") return null;
      const elem = prevToken(caret);
      if (!elem || !elem.classList || !elem.classList.contains("element")) return null;
      const nx = nextToken(caret);
      return { elem: String(elem.textContent || "").trim(), n: nx && nx.classList && nx.classList.contains("number") ? String(nx.textContent || "").trim() : "" };
    }
    function tipForElement(el, info, ranks) {
      let cls = pickClass(el.classList);
      if (cls === "declTarget" || cls === "varUse") cls = "variable";
      if (!cls) return null;
      const text = el.textContent || "";
      const kind = el.getAttribute ? el.getAttribute("data-epx-kind") : "";
      if (kind && (cls === "bracket" || cls === "paren" || cls === "brace")) return bracketTip(kind);
      const code = el.closest ? el.closest(':is(code[class*="language-EpXsC" i], .epx-ord)') : null;
      const vars = code ? varTypesOf.get(code) : null;
      if (vars && vars.has(text)) {
        const vt = variableTip(text, vars.get(text), info);
        if (vt) return vt;
      }
      if (cls === "negPrefix") {
        const scope = negScopeText(el);
        const shown = scope.length > 24 ? scope.slice(0, 24) + "\u2026" : scope;
        return {
          label: "\u524D\u7F6E\u5426\u5B9A ne",
          body: "\u5426\u5B9A\u5176\u540E\u6210\u5206\uFF08\u540C !\uFF09" + (shown ? "\uFF1A" + shown : "")
        };
      }
      if (cls === "coordRun") return coordTip(text);
      if (cls === "operator" && text === "^") {
        const prev = prevToken(el);
        if (prev && prev.classList && prev.classList.contains("element")) {
          const nx = nextToken(el);
          const n = nx && nx.classList && nx.classList.contains("number") ? String(nx.textContent).trim() : "";
          return { label: "\u76F8\u4F4D eRk", body: "\u7B2C " + (n || "n") + " \u9636\uFF08" + String(prev.textContent || "").trim() + "\uFF09" };
        }
      }
      if (cls === "number") {
        const ph = phaseOf(el);
        if (ph) return { label: "\u76F8\u4F4D eRk", body: "\u7B2C " + String(text).trim() + " \u9636\uFF08" + ph.elem + "\uFF09" };
      }
      const sym = SYMBOL_INFO[text];
      if (sym && (cls === "operator" || cls === "punctuation" || cls === "pointer")) return sym;
      if (cls === "comment") return { label: "\u6CE8\u91CA", body: "/* \u2026 */\uFF1B// \u4E0D\u7528\uFF08/ \u662F\u76F8\u53D8\uFF09" };
      if (cls === "annotation") return { label: "\u6CE8\u89E3\u884C", body: ". \u5F00\u5934\uFF0C\u4E0D\u53C2\u4E0E\u89E3\u6790" };
      const group = el.closest ? el.closest(".token.indexGroup, .token.indexDecl") : null;
      if (group && cls === "number") {
        const n = String(text).trim();
        if (group.classList.contains("indexDecl")) {
          return { label: "\u4F4D\u6570 " + n, body: "\u5217\u8868\u5BB9\u5668\u7684\u4F4D\u6570\uFF08\u957F\u5EA6\uFF09\uFF1B\u5192\u53F7\u540E\u662F\u53D8\u91CF\u540D\u3002" };
        }
        const def = rankDef(n, ranks);
        return { label: "\u4E0B\u6807 " + n, body: def ? "\u7B2C " + n + " \u4F4D\uFF1B\u4F5C\u7528\u4E8E\u5B9E\u4F53\u65F6\u5373\u5B83\u7684\u7B2C " + n + " \u79E9 \u2014\u2014 " + def + "\u3002" : "\u7B2C " + n + " \u4F4D\uFF08\u79E9\u53EA\u6709 1\u20139\uFF09\u3002" };
      }
      if (cls === "number") return { label: "\u6570\u503C", body: "\u6709\u5B9E\u6570\u7684\u91CF\u53EF\u4EE5\u76F4\u63A5\u5199\u7B97\u5F0F\u3002" };
      const tip = buildTip(cls, text, info, ranks);
      if (tip) return tip;
      if (cls === "word" && text.length >= 4 && !/[0-9]/.test(text)) {
        return { label: "\u672A\u5165\u5178", body: "\u8BCD\u5178\u91CC\u6CA1\u6709\u8FD9\u4E2A\u8BCD\u6761" };
      }
      return null;
    }
    function wordAtPoint(x, y) {
      let node = null;
      let offset = 0;
      if (document.caretRangeFromPoint) {
        const r = document.caretRangeFromPoint(x, y);
        if (r) {
          node = r.startContainer;
          offset = r.startOffset;
        }
      } else if (document.caretPositionFromPoint) {
        const p = document.caretPositionFromPoint(x, y);
        if (p) {
          node = p.offsetNode;
          offset = p.offset;
        }
      }
      if (!node || node.nodeType !== 3) return null;
      const text = node.nodeValue || "";
      const isWordChar = function(c) {
        return /[A-Za-z0-9_]/.test(c);
      };
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
    function epxFenceLang(text) {
      const s = String(text || "").replace(/\u200b/g, "");
      let i = 0;
      while (i < s.length && (s.charAt(i) === " " || s.charAt(i) === "	")) i++;
      const ch = s.charAt(i);
      if (ch !== String.fromCharCode(96) && ch !== "~") return "";
      let j = i;
      while (j < s.length && s.charAt(j) === ch) j++;
      if (j - i < 3) return "";
      while (j < s.length && (s.charAt(j) === " " || s.charAt(j) === "	")) j++;
      let k = j;
      while (k < s.length && /[A-Za-z0-9_+-]/.test(s.charAt(k))) k++;
      return s.slice(j, k).toLowerCase();
    }
    function liveCodeLang(el) {
      let line = el.closest(".HyperMD-codeblock");
      if (!line) return "";
      let cur = line;
      for (let n = 0; cur && n < 500; n++) {
        if (cur.classList && cur.classList.contains("HyperMD-codeblock-begin")) {
          return epxFenceLang(cur.textContent || "");
        }
        cur = cur.previousElementSibling;
        if (!cur || !cur.classList || !cur.classList.contains("HyperMD-codeblock")) return "";
      }
      return "";
    }
    function inCodeContext(el) {
      if (!el || !el.closest) return false;
      if (el.closest(':is(code[class*="language-EpXsC" i], .epx-ord)')) return true;
      const lang = liveCodeLang(el);
      return lang === "epxsc" || lang === "epxst" || lang === "epxsg";
    }
    var LintModal = class extends Modal {
      constructor(app, file, issues, blocks) {
        super(app);
        this.file = file;
        this.issues = issues;
        this.blocks = blocks;
      }
      onOpen() {
        const el = this.contentEl;
        el.addClass("epx-lint");
        el.createEl("h4", { text: "EpXsC \u8BED\u6CD5\u68C0\u67E5 \xB7 " + this.file.basename });
        if (!this.issues.length) {
          el.createEl("div", { class: "epx-lint-summary", text: this.blocks + " \u4E2A\u4EE3\u7801\u5757 \xB7 \u6CA1\u6709\u53D1\u73B0\u95EE\u9898" });
          return;
        }
        let errs = 0;
        for (let i = 0; i < this.issues.length; i++) if (this.issues[i].level === "error") errs += 1;
        el.createEl("div", { class: "epx-lint-summary", text: this.blocks + " \u4E2A\u4EE3\u7801\u5757 \xB7 " + this.issues.length + " \u5904\uFF08" + errs + " \u9519\u8BEF / " + (this.issues.length - errs) + " \u8B66\u544A\uFF09\xB7 \u70B9\u4E00\u884C\u8DF3\u5230\u8BE5\u5904" });
        const list = el.createEl("div", { class: "epx-lint-list" });
        const self = this;
        for (let i = 0; i < this.issues.length; i++) {
          const it = this.issues[i];
          const row = list.createEl("div", { class: "epx-lint-row epx-lint-" + it.level });
          row.createEl("span", { class: "epx-lint-line", text: "\u7B2C " + it.line + " \u884C" });
          row.createEl("span", { class: "epx-lint-msg", text: it.message });
          row.addEventListener("click", function() {
            self.app.workspace.getLeaf(false).openFile(self.file, { eState: { line: Math.max(0, it.line - 1), ch: 0 } });
            self.close();
          });
        }
      }
      onClose() {
        this.contentEl.empty();
      }
    };
    function ordTokens(line, grammar) {
      const html = tokenizeText(line, grammar);
      const out = [];
      const re = /<span class="token ([a-zA-Z ]+)">([\s\S]*?)<\/span>/g;
      let m;
      while (m = re.exec(html)) out.push({ cls: m[1], text: m[2].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") });
      return out;
    }
    function ordGlossOf(tok, info) {
      const t = tok.text.trim();
      if (!t || /^[\p{P}]$/u.test(t)) return "";
      const e = info && (info.get(t) || info.get(t.toLowerCase()));
      if (e) {
        const raw = String(e.pos || "").replace("\xB7\u7F29\u5199", "");
        const pos = SECTION_POS[raw] || raw;
        const num = String(e.meaning || "").replace(/[^\u4e00-\u9fa5]/g, "");
        if (pos) return pos;
        if (num) return num.slice(0, 4);
      }
      const map = { judge: "\u5224\u65AD\u8BCD", keyword: "\u529F\u80FD\u8BCD", modifier: "\u9650\u5B9A\u8BCD", degree: "\u7A0B\u5EA6\u8BCD", unit: "\u5355\u4F4D", predicate: "\u8C13\u8BCD", element: "\u5143\u7D20\u7801", type: "\u7C7B\u578B\u540D", number: "\u6570" };
      for (const k in map) if (tok.cls.indexOf(k) >= 0) return map[k];
      return "";
    }
    function renderOrdBlockInner(el, source, mode, grammar, info) {
      const lines = String(source || "").replace(/\r/g, "").split("\n");
      const wrap = document.createElement("div");
      wrap.className = "epx-ord-wrap";
      const code = document.createElement("div");
      code.className = "epx-ord epx-ord-" + mode;
      wrap.appendChild(code);
      const appendHTML = function(parent, html) {
        const tpl = document.createElement("template");
        tpl.innerHTML = html;
        parent.appendChild(tpl.content);
      };
      const lineEl = function() {
        const d = document.createElement("div");
        d.className = "epx-oline";
        return d;
      };
      let pending = null;
      const flush = function(pair) {
        if (!pair) return;
        const line = lineEl();
        if (mode === "G") {
          const gs = document.createElement("div");
          gs.className = "epx-gs";
          const toks = ordTokens(pair.src, grammar);
          for (let i = 0; i < toks.length; i++) {
            const tok = toks[i];
            const gl = ordGlossOf(tok, info);
            const gw = document.createElement("span");
            gw.className = "epx-gw";
            const srcEl = document.createElement("span");
            srcEl.className = "epx-gsrc token " + tok.cls;
            srcEl.textContent = tok.text;
            gw.appendChild(srcEl);
            if (gl) {
              const gg = document.createElement("span");
              gg.className = "epx-ggl";
              gg.textContent = gl;
              gw.appendChild(gg);
            }
            gs.appendChild(gw);
          }
          line.appendChild(gs);
        } else {
          const srcEl = document.createElement("div");
          srcEl.className = "epx-tsrc";
          appendHTML(srcEl, tokenizeText(pair.src, grammar));
          line.appendChild(srcEl);
        }
        if (pair.zh) {
          const zh = document.createElement("div");
          zh.className = "epx-tzh";
          zh.textContent = pair.zh;
          line.appendChild(zh);
        }
        code.appendChild(line);
      };
      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const t = raw.trim();
        if (!t) {
          flush(pending);
          pending = null;
          const gap = document.createElement("div");
          gap.className = "epx-gap";
          code.appendChild(gap);
          continue;
        }
        if (t.charAt(0) === ">") {
          if (pending) pending.zh = t.slice(1).trim();
          else {
            const line = lineEl();
            const zh = document.createElement("div");
            zh.className = "epx-tzh";
            zh.textContent = t.slice(1).trim();
            line.appendChild(zh);
            code.appendChild(line);
          }
          continue;
        }
        if (pending && !pending.zh && /[\u3400-\u9fff]/.test(t)) {
          pending.zh = t;
          continue;
        }
        flush(pending);
        pending = { src: t, zh: "" };
      }
      flush(pending);
      el.textContent = "";
      el.appendChild(wrap);
    }
    function renderOrdBlock(el, source, mode, grammar, info) {
      try {
        renderOrdBlockInner(el, source, mode, grammar, info);
      } catch (err) {
        console.warn("[EpXsC Syntax] \u666E\u901A\u53E5\u6E32\u67D3\u5931\u8D25\uFF1A", err);
        try {
          if (el && el.empty) el.empty();
          if (el && el.createEl) el.createEl("pre", { text: String(source || "") });
        } catch (e) {
        }
      }
    }
    function bindClickToSource(target, app, el, ctx) {
      if (!target || !target.style || !target.addEventListener) return;
      target.style.cursor = "text";
      target.addEventListener("click", function() {
        try {
          const view = app.workspace.getActiveViewOfType(MarkdownView);
          if (!view || !view.getMode || view.getMode() !== "source" || !view.editor) return;
          const info = ctx && ctx.getSectionInfo ? ctx.getSectionInfo(el) : null;
          if (!info || typeof info.lineStart !== "number") return;
          const last = typeof info.lineEnd === "number" ? info.lineEnd : info.lineStart + 1;
          view.editor.setCursor({ line: Math.min(info.lineStart + 1, last), ch: 0 });
          view.editor.focus();
        } catch (e) {
        }
      });
    }
    var EpXsCSyntaxPlugin = class extends Plugin2 {
      onload() {
        const self = this;
        this.grammar = makeGrammar(BASE_LISTS);
        this.info = /* @__PURE__ */ new Map();
        this.ranks = /* @__PURE__ */ new Map();
        for (const w in EXTRA_WORDS) this.info.set(w, EXTRA_WORDS[w]);
        this.install();
        this.registerDomEvent(document, "mouseover", function(ev) {
          hideTip();
          const el = ev.target;
          if (!el || !el.closest) return;
          const token = el.closest("span.token");
          if (token && el.closest(':is(code[class*="language-EpXsC" i], .epx-ord)')) {
            const tip2 = tipForElement(token, self.info, self.ranks);
            if (tip2) {
              showTipAt(ev.clientX, ev.clientY, tip2);
              return;
            }
          }
          if (!inCodeContext(el)) return;
          const word = wordAtPoint(ev.clientX, ev.clientY);
          if (!word) return;
          const tip = buildTip("word", word, self.info, self.ranks);
          if (tip) showTipAt(ev.clientX, ev.clientY, tip);
        });
        this.registerDomEvent(document, "mouseout", hideTip);
        this.registerDomEvent(document, "scroll", hideTip, true);
        this.addCommand({
          id: "reload-self",
          name: "\u91CD\u8F7D EpXsC \u63D2\u4EF6\uFF08\u63D0\u793A\u624B\u52A8\u91CD\u8F7D\uFF09",
          callback: function() {
            new Notice("\u8BF7\u5728 \u8BBE\u7F6E \u2192 \u793E\u533A\u63D2\u4EF6 \u4E2D\u5173\u95ED\u518D\u542F\u7528 EpXsC Syntax\u3002");
          }
        });
        this.addCommand({
          id: "diagnose",
          name: "EpXsC \u8BCA\u65AD\u62A5\u544A\uFF08\u5199\u8FDB\u5E93\u6839\u76EE\u5F55\uFF0C\u4FBF\u4E8E\u6574\u6BB5\u590D\u5236\uFF09",
          callback: function() {
            self.diagnose();
          }
        });
        this.addCommand({
          id: "lint-note",
          name: "\u68C0\u67E5\u5F53\u524D\u7B14\u8BB0\u7684 EpXsC \u4EE3\u7801\u5757",
          callback: function() {
            self.lintActiveNote();
          }
        });
        this.addCommand({
          id: "self-check",
          name: "EpXsC \u81EA\u68C0\uFF08\u89C6\u56FE\uFF0Ftoken\uFF0F\u989C\u8272\uFF0F\u6837\u5F0F\u8868\uFF09",
          callback: function() {
            self.selfCheck();
          }
        });
        this.register(function() {
          const Prism = window.Prism;
          if (!Prism || !Prism.languages) return;
          for (let i = 0; i < LANG_KEYS.length; i++) delete Prism.languages[LANG_KEYS[i]];
        });
        this.registerMarkdownPostProcessor(function(el) {
          self.highlightIn(el);
        });
        const renderBlock = function(source, el, ctx) {
          try {
            if (el && el.empty) el.empty();
            else if (el) el.textContent = "";
            const pre = document.createElement("pre");
            const code = document.createElement("code");
            code.className = "language-EpXsC";
            code.textContent = source;
            pre.appendChild(code);
            el.appendChild(pre);
            self.highlightOne(code);
            bindClickToSource(pre, self.app, el, ctx);
          } catch (err) {
            console.warn("[EpXsC Syntax] \u4EE3\u7801\u5757\u6E32\u67D3\u5931\u8D25\uFF1A", err);
            if (el && el.createEl) el.createEl("pre", { text: source });
          }
        };
        this.registerMarkdownCodeBlockProcessor("EpXsC", renderBlock);
        this.registerMarkdownCodeBlockProcessor("epxsc", renderBlock);
        this.registerMarkdownCodeBlockProcessor("EPXSC", renderBlock);
        const ord = function(source, el, ctx, mode) {
          renderOrdBlock(el, source, mode, self.grammar, self.info);
          bindClickToSource(el, self.app, el, ctx);
        };
        const ordG = (source, el, ctx) => ord(source, el, ctx, "G");
        const ordT = (source, el, ctx) => ord(source, el, ctx, "T");
        for (const lang of ["EpXsG", "epxsg", "EPXSG"]) this.registerMarkdownCodeBlockProcessor(lang, ordG);
        for (const lang of ["EpXsT", "epxst", "EPXST"]) this.registerMarkdownCodeBlockProcessor(lang, ordT);
        const isDataFile = function(file) {
          if (!file || !file.path) return false;
          return file.path === DICT_PATH || file.path === SYNTAX_PATH || file.path === RANK_PATH || file.path.indexOf(ROOTS_DIR) === 0 || file.path.indexOf(SPELL_DIR) === 0;
        };
        let refreshTimer = null;
        const scheduleRefresh = function() {
          if (refreshTimer) window.clearTimeout(refreshTimer);
          refreshTimer = window.setTimeout(function() {
            refreshTimer = null;
            self.refresh();
          }, 300);
        };
        const onDataEvent = function(file) {
          if (isDataFile(file)) scheduleRefresh();
        };
        this.registerEvent(this.app.vault.on("modify", onDataEvent));
        this.registerEvent(this.app.vault.on("create", onDataEvent));
        this.registerEvent(this.app.vault.on("delete", onDataEvent));
        this.registerEvent(this.app.vault.on("rename", function(file, oldPath) {
          if (isDataFile(file) || oldPath && isDataFile({ path: oldPath })) scheduleRefresh();
        }));
        this.register(function() {
          if (refreshTimer) window.clearTimeout(refreshTimer);
        });
        this.addCommand({
          id: "reload-lexicon",
          name: "\u91CD\u65B0\u8F7D\u5165\u8BCD\u8868\u4E0E\u91CA\u4E49",
          callback: function() {
            self.refresh();
          }
        });
        this.app.workspace.onLayoutReady(function() {
          self.refresh();
        });
        const early = [400, 1500];
        for (let i = 0; i < early.length; i++) {
          const t = window.setTimeout(function() {
            self.ensureRendered();
          }, early[i]);
          this.register(function() {
            window.clearTimeout(t);
          });
        }
        this.registerEvent(this.app.workspace.on("layout-change", function() {
          self.ensureRendered();
        }));
        this.registerEvent(this.app.workspace.on("active-leaf-change", function() {
          self.ensureRendered();
        }));
        this.registerInterval(window.setInterval(function() {
          self.ensureRendered();
        }, 2500));
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
        const walk = function(node) {
          for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (child instanceof TFile && child.extension === "md") out.push(child);
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
        const gen = this._refreshGen = (this._refreshGen || 0) + 1;
        const info = /* @__PURE__ */ new Map();
        for (const w in EXTRA_WORDS) info.set(w, EXTRA_WORDS[w]);
        const roots = /* @__PURE__ */ new Map();
        const extraUnits = [];
        const keyWords = /* @__PURE__ */ new Set();
        let lists = null;
        let ranks = /* @__PURE__ */ new Map();
        const mergeInto = function(target, map) {
          map.forEach(function(value, key) {
            if (!target.has(key)) target.set(key, value);
          });
        };
        try {
          const dictFile = this.app.vault.getAbstractFileByPath(DICT_PATH);
          if (dictFile instanceof TFile) {
            const text = await this.app.vault.cachedRead(dictFile);
            mergeInto(info, parseEntries(text));
            const map = splitSections(text);
            lists = {
              keyword: wordsFrom(map, SECTIONS.keyword, FALLBACK.keyword),
              judge: wordsFrom(map, SECTIONS.judge, FALLBACK.judge),
              clause: wordsFrom(map, SECTIONS.clause, FALLBACK.clause),
              degree: wordsFrom(map, SECTIONS.degree, FALLBACK.degree),
              predicate: wordsFrom(map, SECTIONS.predicate, FALLBACK.predicate),
              unit: wordsFrom(map, SECTIONS.unit, FALLBACK.unit)
            };
          } else {
            mergeInto(info, builtinMap("entries"));
          }
          const syntaxFile = this.app.vault.getAbstractFileByPath(SYNTAX_PATH);
          if (syntaxFile instanceof TFile) {
            const syntaxText = await this.app.vault.cachedRead(syntaxFile);
            const keyMap = parseFilterKeys(syntaxText);
            mergeInto(info, keyMap);
            keyMap.forEach(function(v, k) {
              keyWords.add(String(k).toLowerCase());
            });
            const unitMap = parseUnits(syntaxText);
            mergeInto(info, unitMap);
            unitMap.forEach(function(v) {
              extraUnits.push(v.word);
            });
          } else {
            const keyMap = builtinMap("keys");
            mergeInto(info, keyMap);
            keyMap.forEach(function(v, k) {
              keyWords.add(String(k).toLowerCase());
            });
            mergeInto(info, builtinMap("units"));
          }
          const rankFile = this.app.vault.getAbstractFileByPath(RANK_PATH);
          ranks = rankFile instanceof TFile ? parseRanks(await this.app.vault.cachedRead(rankFile)) : builtinRanks();
          const rootFiles = this.mdFilesUnder(ROOTS_DIR);
          if (rootFiles.length) {
            for (let i = 0; i < rootFiles.length; i++) {
              mergeInto(roots, parseRoots(await this.app.vault.cachedRead(rootFiles[i])));
            }
          } else {
            mergeInto(roots, builtinRoots());
          }
          roots.forEach(function(v, k) {
            if (v.kind === "\u52A8" || !info.has(k)) info.set(k, v);
          });
        } catch (err) {
          console.warn("[EpXsC Syntax] \u8BFB\u53D6\u5E93\u5185\u8BCD\u5E93\u5931\u8D25\uFF0C\u6539\u7528\u5185\u7F6E\u5FEB\u7167\uFF1A", err);
          mergeInto(info, builtinMap("entries"));
          mergeInto(info, builtinMap("keys"));
          mergeInto(info, builtinMap("units"));
          mergeInto(roots, builtinRoots());
          roots.forEach(function(v, k) {
            if (v.kind === "\u52A8" || !info.has(k)) info.set(k, v);
          });
          if (!ranks.size) ranks = builtinRanks();
        }
        const verbRoots = [];
        roots.forEach(function(v) {
          if (v.kind === "\u52A8") verbRoots.push(v.word);
        });
        if (lists) {
          lists.predicate = lists.predicate.concat(verbRoots);
          lists.unit = lists.unit.concat(extraUnits);
        } else {
          lists = builtinLists(verbRoots);
        }
        const spells = /* @__PURE__ */ new Map();
        try {
          const spellFiles = this.mdFilesUnder(SPELL_DIR);
          const syntaxFile = this.app.vault.getAbstractFileByPath(SYNTAX_PATH);
          if (syntaxFile instanceof TFile) spellFiles.push(syntaxFile);
          for (let i = 0; i < spellFiles.length; i++) {
            collectSpells(await this.app.vault.cachedRead(spellFiles[i]), spells, spellFiles[i].path);
          }
        } catch (err) {
        }
        if (gen !== this._refreshGen) return;
        this.spells = spells;
        spellRegistry = spells;
        this.info = info;
        this.ranks = ranks;
        this.roots = roots;
        this.units = /* @__PURE__ */ new Set();
        for (let i = 0; i < lists.unit.length; i++) this.units.add(String(lists.unit[i]).toLowerCase());
        this.keys = /* @__PURE__ */ new Set();
        const keySet = this.keys;
        keyWords.forEach(function(k) {
          keySet.add(String(k).toLowerCase());
        });
        info.forEach(function(v, k) {
          if (v.pos === "\u7B5B\u9009\u952E") keySet.add(String(k).toLowerCase());
        });
        this.grammar = makeGrammar(lists, Array.from(keyWords));
        this.install();
        if (window.__epxscDebug) console.log("[EpXsC Syntax] \u8BCD\u6761 " + info.size + " \xB7 \u8BCD\u6839 " + roots.size + " \xB7 \u79E9 " + ranks.size + "\uFF08" + lists.predicate.length + " \u4E2A\u8C13\u8BCD\uFF09");
        await Promise.race([
          this.ensureStyles(),
          new Promise(function(resolve) {
            window.setTimeout(function() {
              resolve("\u6837\u5F0F\u6B65\u9AA4\u8D85\u65F6\uFF0C\u8DF3\u8FC7");
            }, 2e3);
          })
        ]);
        this.rehighlight();
      }
      /* 样式兜底：外部 styles.css 没被加载时（颜色、右上角 EpXsC 标记、未入典点线、
         悬停浮层样式会一起消失），自己把样式塞进页面。先试读插件目录里的 styles.css，读不到就用内置那份。 */
      async ensureStyles() {
        if (this._styleState) return this._styleState;
        let el = null;
        try {
          el = document.getElementById("epxsc-styles");
          if (!el) {
            el = document.createElement("style");
            el.id = "epxsc-styles";
            document.head.appendChild(el);
          }
          el.textContent = FALLBACK_CSS;
          this._styleState = "\u5DF2\u6CE8\u5165\u5185\u7F6E\u914D\u8272";
        } catch (e) {
          this._styleState = "\u6CE8\u5165\u5931\u8D25\uFF1A" + (e && e.message);
          return this._styleState;
        }
        try {
          const dir = this.manifest && this.manifest.dir || ".obsidian/plugins/epxsc-syntax";
          const css = await Promise.race([
            this.app.vault.adapter.read(dir + "/styles.css"),
            new Promise(function(resolve) {
              window.setTimeout(function() {
                resolve("");
              }, 1500);
            })
          ]);
          if (css && css.indexOf(".epx-tip") >= 0) {
            el.textContent = css;
            this._styleState = "\u5DF2\u7528\u63D2\u4EF6\u76EE\u5F55\u91CC\u7684 styles.css";
          }
        } catch (e) {
        }
        return this._styleState;
      }
      /* 生成诊断报告，写进库里，便于整段复制出来 */
      async diagnose() {
        const L = [];
        const add = function(s) {
          L.push(s);
        };
        add("# EpXsC \u8BCA\u65AD\u62A5\u544A");
        add("");
        add("- \u4EE3\u7801\u7248\u672C\uFF08BUILD\uFF09\uFF1A" + BUILD);
        add("- manifest \u7248\u672C\uFF1A" + (this.manifest && this.manifest.version || "?"));
        add("- \u63D2\u4EF6\u76EE\u5F55\uFF1A" + (this.manifest && this.manifest.dir || "?"));
        add("- \u751F\u6210\u65F6\u95F4\uFF1A" + (/* @__PURE__ */ new Date()).toLocaleString());
        let mode = "\u975E\u7B14\u8BB0\u89C6\u56FE";
        try {
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (view) mode = view.getMode() === "preview" ? "\u9605\u8BFB\u89C6\u56FE" : "\u5B9E\u65F6\u9884\u89C8\uFF0F\u6E90\u7801";
        } catch (e) {
        }
        add("- \u5F53\u524D\u89C6\u56FE\uFF1A**" + mode + "**");
        add("- \u8BCD\u8868\uFF1A\u8BCD\u6761 " + this.info.size + " \xB7 \u8BCD\u6839 " + (this.roots ? this.roots.size : "-") + " \xB7 \u79E9 " + this.ranks.size + " \xB7 \u8C13\u8BCD " + this.grammar.predicate.source.length + " \u5B57\u7B26");
        add("- \u81EA\u5E26\u5207\u8BCD\u5668\uFF1A\u5DF2\u88C5\uFF08\u4E0D\u4F9D\u8D56 window.Prism\uFF09");
        add("- Prism\uFF1A" + (window.Prism ? "\u6709" : "**\u6CA1\u6709**") + " \xB7 \u8BED\u6CD5 EpXsC\uFF1A" + (window.Prism && window.Prism.languages && window.Prism.languages.EpXsC ? "\u5DF2\u88C5" : "**\u7F3A\u5931**"));
        add("");
        const codes = document.querySelectorAll(':is(code[class*="language-EpXsC" i], .epx-ord)');
        add("## \u4EE3\u7801\u5757\uFF08" + codes.length + " \u4E2A\uFF09");
        for (let i = 0; i < codes.length && i < 6; i++) {
          const el = codes[i];
          let tokens = 0;
          let color = "-";
          try {
            tokens = el.querySelectorAll("span.token").length;
            const first = el.querySelector("span.token");
            if (first && window.getComputedStyle) color = window.getComputedStyle(first).color;
          } catch (e) {
            color = "(\u6D4B\u4E0D\u5230)";
          }
          add("- \u7B2C " + (i + 1) + ' \u4E2A\uFF1Aclass="' + (el.className || "") + '" \xB7 token ' + tokens + " \u4E2A \xB7 \u9996\u4E2A token \u989C\u8272 " + color);
        }
        add("");
        add("## \u6837\u5F0F\u8868");
        let ourRules = 0;
        try {
          const sheets = document.styleSheets || [];
          add("- \u5171 " + sheets.length + " \u5F20");
          for (let i = 0; i < sheets.length; i++) {
            let n = 0;
            let ours = 0;
            let rules = null;
            try {
              rules = sheets[i].cssRules;
            } catch (e) {
              add("- \u7B2C " + (i + 1) + " \u5F20\uFF1A\u8BFB\u4E0D\u5230\uFF08\u8DE8\u6E90\uFF09" + (sheets[i].href ? " href=" + sheets[i].href : ""));
              continue;
            }
            if (rules) {
              n = rules.length;
              for (let j = 0; j < rules.length; j++) {
                const sel = rules[j].selectorText || "";
                if (sel.indexOf(".epx-") >= 0 || sel.indexOf(".token.") >= 0) ours += 1;
              }
            }
            ourRules += ours;
            add("- \u7B2C " + (i + 1) + " \u5F20\uFF1A" + n + " \u6761\u89C4\u5219\uFF0C\u5176\u4E2D\u6211\u4EEC\u7684 " + ours + " \u6761" + (sheets[i].href ? " \xB7 href=" + sheets[i].href : ""));
          }
        } catch (e) {
          add("- \u8BFB\u6837\u5F0F\u8868\u51FA\u9519\uFF1A" + (e && e.message));
        }
        add("- \u547D\u4E2D\u6211\u4EEC\u9009\u62E9\u5668\u7684\u89C4\u5219\u5408\u8BA1\uFF1A" + ourRules);
        add("- \u515C\u5E95\u72B6\u6001\uFF1A" + (this._styleState || "(\u8FD8\u6CA1\u8DD1)"));
        add("");
        add("## \u63D2\u4EF6\u76EE\u5F55\u91CC\u7684 styles.css");
        try {
          const dir = this.manifest && this.manifest.dir || ".obsidian/plugins/epxsc-syntax";
          const css = await this.app.vault.adapter.read(dir + "/styles.css");
          const lines = String(css).split("\n");
          add("- \u8BFB\u5230 " + css.length + " \u5B57\u7B26 \xB7 \u542B .epx-tip\uFF1A" + (css.indexOf(".epx-tip") >= 0 ? "\u662F" : "**\u5426**") + " \xB7 \u542B --epx-modifier\uFF1A" + (css.indexOf("--epx-modifier") >= 0 ? "\u662F" : "\u5426"));
          add("- \u524D 3 \u884C\uFF1A");
          for (let i = 0; i < 3 && i < lines.length; i++) add("    " + (i + 1) + ". " + lines[i]);
        } catch (e) {
          add("- **\u8BFB\u4E0D\u5230**\uFF1A" + (e && e.message));
        }
        add("");
        add("## \u6837\u4F8B\u4EE3\u7801\u5757\uFF08\u4E0B\u9762\u8FD9\u5757\u5728\u9605\u8BFB\u89C6\u56FE\u91CC\u5E94\u5F53\u6709\u989C\u8272\uFF09");
        add("");
        add("```EpXsC");
        add("Purificatio(priv locus: zone) {");
        add("	consta lit = 3 MU;");
        add("	priv x = &zone;");
        add("	publ consta total = lit;");
        add("	ne navis *&zone");
        add("	luss lit;");
        add("}");
        add("```");
        const text = L.join("\n");
        try {
          await this.app.vault.adapter.write("EpXsC \u8BCA\u65AD\u62A5\u544A.md", text);
          new Notice("\u8BCA\u65AD\u62A5\u544A\u5DF2\u5199\u5165\u5E93\u6839\u76EE\u5F55\uFF1AEpXsC \u8BCA\u65AD\u62A5\u544A.md\uFF08\u4EE3\u7801\u7248\u672C " + BUILD + "\uFF09", 12e3);
        } catch (e) {
          new Notice("\u5199\u62A5\u544A\u5931\u8D25\uFF1A" + (e && e.message));
        }
        return text;
      }
      /* 检查当前笔记里的 EpXsC 代码块 */
      async lintActiveNote() {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.file) {
          new Notice("\u5148\u6253\u5F00\u4E00\u7BC7\u7B14\u8BB0\u518D\u68C0\u67E5\u3002");
          return;
        }
        const file = view.file;
        const text = await this.app.vault.cachedRead(file);
        const ctx = { info: this.info, units: this.units, keys: this.keys, spells: this.spells, path: file.path };
        const blocksFound = extractEpXsCBlocks(text);
        const blocks = blocksFound.length;
        const issues = [];
        for (let b = 0; b < blocksFound.length; b++) {
          const found = lintText(blocksFound[b].source, ctx);
          for (let i = 0; i < found.length; i++) {
            issues.push({ level: found[i].level, line: blocksFound[b].line + found[i].line, message: found[i].message });
          }
        }
        if (!blocks) {
          new Notice("\u8FD9\u4E00\u9875\u6CA1\u6709 EpXsC \u4EE3\u7801\u5757\u3002");
          return;
        }
        new LintModal(this.app, file, issues, blocks).open();
      }
      /* 把 ne 之后、直到子句末尾的 token 标出来：被否定的范围 */
      markNegation(code) {
        const heads = code.querySelectorAll("span.token.negPrefix");
        for (let i = 0; i < heads.length; i++) {
          let node = heads[i].nextSibling;
          let guard = 0;
          while (node && guard < 40) {
            guard += 1;
            const t = node.textContent || "";
            if (/[;,\n]/.test(t)) break;
            if (node.nodeType === 1 && node.classList && node.classList.contains("token")) node.classList.add("epx-neg-scope");
            node = node.nextSibling;
          }
        }
      }
      /* 词典里查不到的词加一层点线，提示未入典 */
      markUnknown(code) {
        const spans = code.querySelectorAll("span.token.word");
        for (let i = 0; i < spans.length; i++) {
          const w = (spans[i].textContent || "").toLowerCase();
          if (w.length < 4 || /[0-9]/.test(w)) continue;
          if (this.info.has(w)) continue;
          spans[i].classList.add("epx-unknown");
        }
      }
      /* 自检：当前视图里到底有没有 token、词表读进来没有 */
      selfCheck() {
        let mode = "\u975E\u7B14\u8BB0\u89C6\u56FE";
        try {
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (view) mode = view.getMode() === "preview" ? "\u9605\u8BFB\u89C6\u56FE" : "\u5B9E\u65F6\u9884\u89C8\uFF0F\u6E90\u7801";
        } catch (err) {
        }
        const codes = document.querySelectorAll(':is(code[class*="language-EpXsC" i], .epx-ord)');
        let tokened = 0;
        let ordBlocks = 0;
        for (let i = 0; i < codes.length; i++) {
          if (codes[i].classList && codes[i].classList.contains("epx-ord")) ordBlocks += 1;
          if (codes[i].querySelector("span.token")) tokened += 1;
        }
        const lines = document.querySelectorAll(".HyperMD-codeblock").length;
        let firstClass = "(\u6CA1\u6709\u4EE3\u7801\u5757)";
        let tokenCount = 0;
        let color = "(\u672A\u6D4B)";
        if (codes[0]) {
          firstClass = codes[0].className || "(\u7A7A)";
          tokenCount = codes[0].querySelectorAll("span.token").length;
          const first = codes[0].querySelector("span.token");
          try {
            if (first && window.getComputedStyle) color = window.getComputedStyle(first).color;
          } catch (e) {
            color = "(\u8BFB\u4E0D\u5230)";
          }
        }
        let styleState = "\u672A\u77E5";
        try {
          let n = 0;
          const sheets = document.styleSheets || [];
          for (let i = 0; i < sheets.length; i++) {
            let rules = null;
            try {
              rules = sheets[i].cssRules;
            } catch (e) {
              continue;
            }
            if (!rules) continue;
            for (let j = 0; j < rules.length; j++) {
              const sel = rules[j].selectorText || "";
              if (sel.indexOf(".token.") >= 0 || sel.indexOf(".epx-tip") >= 0) n += 1;
            }
          }
          styleState = n ? "\u5DF2\u8F7D\u5165 " + n + " \u6761\u7740\u8272\u89C4\u5219" : "\u672A\u8F7D\u5165 \u2717\uFF08styles.css \u6CA1\u751F\u6548\uFF09";
        } catch (e) {
          styleState = "\u8BFB\u4E0D\u5230";
        }
        new Notice([
          "EpXsC \u81EA\u68C0 \xB7 \u4EE3\u7801\u7248\u672C " + BUILD,
          "\u8BCD\u6761 " + this.info.size + " \xB7 \u79E9 " + this.ranks.size + " \xB7 \u8BED\u6CD5" + (this.grammar ? "\u5DF2\u88C5" : "\u7F3A\u5931") + " \xB7 \u5207\u8BCD\u5668\uFF1A\u81EA\u5E26\uFF08Prism " + (window.Prism ? "\u6709" : "\u6CA1\u6709") + "\uFF09",
          "\u5F53\u524D\u89C6\u56FE\uFF1A" + mode,
          "EpXsC \u4EE3\u7801\u5757 " + (codes.length - ordBlocks) + " \u4E2A \xB7 \u666E\u901A\u53E5\u5757\uFF08G\uFF0FT\uFF09" + ordBlocks + " \u4E2A \xB7 \u5E26 token \u7684 " + tokened + " \u4E2A \xB7 \u5B9E\u65F6\u9884\u89C8\u4EE3\u7801\u884C " + lines + " \u884C",
          codes.length > 0 && tokened === 0 && mode === "\u9605\u8BFB\u89C6\u56FE" ? "\u26A0 \u9605\u8BFB\u89C6\u56FE\u91CC\u8FD9\u4E9B\u5757\u6CA1\u6709 token \u2014\u2014 \u6E32\u67D3\u6CA1\u8DD1\u8D77\u6765\uFF0C\u8BF7\u628A\u8FD9\u51E0\u884C\u53D1\u6211" : "\u6E32\u67D3\uFF1A" + (tokened > 0 ? "\u6B63\u5E38" : "\u65E0\u4EE3\u7801\u5757"),
          "\u9996\u4E2A\u5757 class\uFF1A" + firstClass,
          "\u9996\u4E2A\u5757 token \u6570\uFF1A" + tokenCount + " \xB7 \u9996\u4E2A token \u989C\u8272\uFF1A" + color,
          "\u6837\u5F0F\u8868\uFF1A" + styleState + (this._styleState ? " \xB7 \u515C\u5E95\uFF1A" + this._styleState : "")
        ].join("\n"), 15e3);
      }
      rehighlight() {
        this.highlightIn(document);
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
        if (window.Prism && window.Prism.languages && window.Prism.languages.EpXsC !== this.grammar) this.install();
        const nodes = document.querySelectorAll(CODE_SELECTOR);
        for (let i = 0; i < nodes.length; i++) {
          const code = nodes[i];
          if (code.classList && code.classList.contains("epx-ord")) continue;
          if (code.querySelector("span.token")) continue;
          if (!(code.textContent || "").trim()) continue;
          this.highlightOne(code);
        }
      }
      highlightOne(code) {
        try {
          if (code.parentElement && code.parentElement.tagName === "PRE" && /language-EpXsC/i.test(code.className || "")) code.parentElement.classList.add("epx-pre");
        } catch (e) {
        }
        if (code && code.classList && code.classList.contains("epx-ord")) return;
        try {
          const text = code.textContent || "";
          if ((text.match(/\n/g) || []).length >= MAX_HIGHLIGHT_LINES) {
            if (code.classList) code.classList.add("language-EpXsC");
            return;
          }
          const found = /language-(\w+)/.exec(code.className || "");
          if (!found && code.classList) code.classList.add("language-EpXsC");
          const grammar = this.grammar;
          if (!grammar) return;
          let html = markBracketDepth(tokenizeText(text, grammar), bracketKinds(text));
          const vars = parseVarTypes(text, this.info);
          varTypesOf.set(code, vars);
          html = markVarUse(html, vars);
          html = markDictKeys(html);
          html = markSpellRefs(html);
          code.innerHTML = html;
          this.markUnknown(code);
          this.markNegation(code);
        } catch (err) {
          console.warn("[EpXsC Syntax]", err);
        }
      }
    };
    var DICT_BEFORE = "word|type|declaration|className|clause|predicate|function|modifier|variable|declTarget|axis|element|dictKey|filterKey|filterValue|unit";
    function markDictKeys(html) {
      const seg = new RegExp('(?:<span class="token (' + DICT_BEFORE + ')">[^<]*<\\/span>[ \\t]*)?<span class="token brace">\\{<\\/span>[^{}\\n]*<span class="token brace">\\}<\\/span>', "g");
      return html.replace(seg, function(all, kind) {
        if (kind) return all;
        return all.replace(
          /<span class="token [a-zA-Z ]+">([A-Za-z_][A-Za-z0-9_]*)<\/span>(?=[ \t]*<span class="token punctuation">:<\/span>)/g,
          function(span, name) {
            return '<span class="token dictKey">' + name + "</span>";
          }
        );
      });
    }
    function markBracketDepth(html, kinds) {
      let depth = 0;
      let idx = 0;
      return html.replace(/<span class="token ([a-z]+)">([\[\](){}])<\/span>/g, function(all, cls, ch) {
        if (cls !== "bracket" && cls !== "paren" && cls !== "brace") return all;
        const isOpen = ch === "[" || ch === "(" || ch === "{";
        if (isOpen) depth += 1;
        else if (depth > 0) depth -= 1;
        const level = isOpen ? depth : depth + 1;
        const kind = kinds && kinds[idx] ? String(kinds[idx]).replace(/"/g, "") : "";
        idx += 1;
        const attr = kind ? ' data-epx-kind="' + kind + '"' : "";
        return '<span class="token ' + cls + " epx-d" + ((level - 1) % 3 + 1) + '"' + attr + ">" + ch + "</span>";
      });
    }
    var BUILTIN_LEXICON = { "entries": { "aqua": ["aqua", "\u540D\u8BCD", "\u6C34\u5143\u7D20", "Aqu"], "delucke": ["Delucke", "\u540D\u8BCD", "\u6697\u5143\u7D20", "Duk"], "draco": ["draco", "\u540D\u8BCD", "\u9F99\u3001\u4E1C\u65B9\u9F99", "DRA"], "earthe": ["Earthe", "\u540D\u8BCD", "\u5730\u5143\u7D20", "Ert"], "eletribon": ["Eletribon", "\u540D\u8BCD", "\u96F7\u7535", "Elc"], "fliam": ["fliam", "\u540D\u8BCD", "\u708E\u5143\u7D20", "Flm"], "fragor": ["fragor", "\u540D\u8BCD", "\u7834\u788E\u58F0\u3001\u6545\u969C", "FRAg"], "fragus": ["fragus", "\u540D\u8BCD", "\u788E\u7247\u3001\u6B8B\u9AB8", "FRGs"], "gramakipo": ["gramakipo", "\u540D\u8BCD", "\u91CD\u529B\u52A0\u901F\u5EA6", "GRK"], "hopas": ["hopas", "\u540D\u8BCD", "\u8425\u5730\u3001\u4F11\u606F\u5904\u3001\u5E7F\u573A", "HOP"], "locor": ["locor", "\u540D\u8BCD", "\u5B9A\u4F4D\u5668\u3001\u653E\u7F6E\u8005", "LOCr"], "locus": ["locus", "\u540D\u8BCD", "\u5730\u70B9\u3001\u4F4D\u7F6E", "LOCs"], "loqor": ["loqor", "\u540D\u8BCD", "\u8BF4\u8BDD\u8005\u3001\u8BB2\u8FF0\u8005", "LOQr"], "loqus": ["loqus", "\u540D\u8BCD", "\u8BED\u8A00\u3001\u8BDD\u8BED", "LOQs"], "lumena": ["lumena", "\u540D\u8BCD", "\u5149\u5143\u7D20", "Lum"], "memor": ["memor", "\u540D\u8BCD", "\u8BB0\u5FC6\u3001\u5FC3\u667A", "MEMr"], "memus": ["memus", "\u540D\u8BCD", "\u601D\u60F3\u3001\u5FF5\u5934", "MEMs"], "miteas": ["Miteas", "\u540D\u8BCD", "\u7C73\u3001\u8BA1\u91CF\u5355\u4F4D", "MIT"], "mortor": ["mortor", "\u540D\u8BCD", "\u6B7B\u8005\u3001\u4EA1\u7075", "MORr"], "mortus": ["mortus", "\u540D\u8BCD", "\u6B7B\u4EA1", "MORs"], "movor": ["movor", "\u540D\u8BCD", "\u63A8\u52A8\u8005\u3001\u52A8\u673A", "MOVr"], "movus": ["movus", "\u540D\u8BCD", "\u8FD0\u52A8\u3001\u79FB\u52A8", "MOVs"], "nuetrue": ["Nuetrue", "\u540D\u8BCD", "\u81EA\u7136\u5143\u7D20", "Nut"], "qudend": ["qudend", "\u540D\u8BCD", "\u7ED3\u675F\u3001\u7EC8\u70B9", "QUD"], "sanor": ["sanor", "\u540D\u8BCD", "\u6CBB\u7597\u8005\u3001\u4FEE\u590D\u8005", "SANr"], "sanus": ["sanus", "\u540D\u8BCD", "\u5065\u5EB7\u3001\u6CBB\u6108", "SANs"], "sartose": ["sartose", "\u540D\u8BCD", "\u5F00\u59CB\u3001\u8D77\u70B9", "SAR"], "siro": ["siro", "\u540D\u8BCD", "\u865A\u7A7A", "SIR"], "strua": ["strua", "\u540D\u8BCD", "\u5EFA\u7B51\u3001\u7ED3\u6784", "STRa"], "struor": ["struor", "\u540D\u8BCD", "\u5EFA\u9020\u8005", "STRu"], "vidor": ["vidor", "\u540D\u8BCD", "\u89C2\u5BDF\u8005\u3001\u89C1\u8BC1\u8005", "VIDr"], "vidus": ["vidus", "\u540D\u8BCD", "\u89C6\u89C9\u3001\u666F\u8C61", "VIDs"], "vivor": ["vivor", "\u540D\u8BCD", "\u6D3B\u529B\u3001\u751F\u547D\u529B", "VIVr"], "vivus": ["vivus", "\u540D\u8BCD", "\u751F\u547D\u3001\u6D3B\u4F53", "VIVs"], "wuinde": ["wuinde", "\u540D\u8BCD", "\u98CE\u5143\u7D20", "Wnd"], "zone": ["zone", "\u540D\u8BCD", "\u533A\u57DF\u3001\u8303\u56F4", "ZON"], "venis": ["venis", "\u540D\u8BCD", "\u6765\uFF08\u52A8\uFF09", "\u2014"], "agrus": ["agrus", "\u540D\u8BCD", "\u7530\u5730", "\u2014"], "granarus": ["granarus", "\u540D\u8BCD", "\u8C37\u4ED3", "\u2014"], "sicus": ["sicus", "\u540D\u8BCD", "\u5E72\u71E5", "\u2014"], "vespus": ["vespus", "\u540D\u8BCD", "\u508D\u665A", "\u2014"], "pluvus": ["pluvus", "\u540D\u8BCD", "\u96E8", "\u2014"], "petasus": ["petasus", "\u540D\u8BCD", "\u5E3D", "\u2014"], "flagro": ["flagro", "\u540D\u8BCD", "\u71C3\u70BD\u4E4B\u4E8B", "\u2014"], "sta": ["sta", "\u540D\u8BCD", "\u7ACB\u4E4B\u4E8B", "\u2014"], "acutus": ["acutus", "\u540D\u8BCD", "\u5C16\u9510", "\u2014"], "mana": ["mana", "\u540D\u8BCD", "\u4FDD\u6301\u7684\u7ED3\u679C", "\u2014"], "arus": ["arus", "\u540D\u8BCD", "\u8015\u4E4B\u4E8B", "\u2014"], "sterus": ["sterus", "\u540D\u8BCD", "\u7CAA\u80A5", "\u2014"], "vernus": ["vernus", "\u540D\u8BCD", "\u6625", "\u2014"], "latus": ["latus", "\u540D\u8BCD", "\u4FA7", "\u2014"], "altus": ["altus", "\u540D\u8BCD", "\u9AD8", "\u2014"], "densus": ["densus", "\u540D\u8BCD", "\u5BC6", "\u2014"], "manu": ["manu", "\u540D\u8BCD", "\u624B", "\u2014"], "amphor": ["amphor", "\u540D\u8BCD", "\u74EE\u5320", "\u2014"], "cada": ["cada", "\u540D\u8BCD", "\u5760\u843D\u7684\u7ED3\u679C", "\u2014"], "lalupid": ["lalupid", "\u540D\u8BCD", "\u7565\u77F3\u6599", "\u2014"], "sanarium": ["sanarium", "\u540D\u8BCD", "\u6CBB\u6108\u4E4B\u6240", "\u2014"], "gnosarium": ["gnosarium", "\u540D\u8BCD", "\u77E5\u8BC6\u4E4B\u6240", "\u2014"], "vidorium": ["vidorium", "\u540D\u8BCD", "\u770B\u4E4B\u5668", "\u2014"], "viditrin": ["viditrin", "\u540D\u8BCD", "\u770B\u4E4B\u6240", "\u2014"], "lapidarius": ["lapidarius", "\u540D\u8BCD", "\u77F3\u6599\u8005", "\u2014"], "vidista": ["vidista", "\u540D\u8BCD", "\u770B\u5BB6", "\u2014"], "vidamen": ["vidamen", "\u540D\u8BCD", "\u770B\u4E4B\u7269", "\u2014"], "vidura": ["vidura", "\u540D\u8BCD", "\u770B\u4E4B\u672F", "\u2014"], "vidimentum": ["vidimentum", "\u540D\u8BCD", "\u770B\u4E4B\u624B\u6BB5", "\u2014"], "vidibul": ["vidibul", "\u540D\u8BCD", "\u770B\u4E4B\u5177", "\u2014"], "lapidulus": ["lapidulus", "\u540D\u8BCD", "\u5C0F\u77F3\u6599", "\u2014"], "vidaster": ["vidaster", "\u540D\u8BCD", "\u52A3\u7B49\u770B", "\u2014"], "viditrix": ["viditrix", "\u540D\u8BCD", "\u770B\u7684\u5973\u6027", "\u2014"], "vidologia": ["vidologia", "\u540D\u8BCD", "\u770B\u5B66", "\u2014"], "magism": ["magism", "\u540D\u8BCD", "\u9B54\u6CD5\u4E3B\u4E49", "\u2014"], "semi": ["semi", "\u540D\u8BCD", "\u534A", "\u2014"], "extra": ["extra", "\u540D\u8BCD", "\u5916\u4FA7", "\u2014"], "cisterna": ["cisterna", "\u540D\u8BCD", "\u84C4\u6C34\u6C60", "\u2014"], "auctio": ["auctio", "\u540D\u8BCD", "\u62CD\u5356", "\u2014"], "aluctio": ["aluctio", "\u540D\u8BCD", "\u7565\u62CD\u5356", "\u2014"], "tribelus": ["tribelus", "\u540D\u8BCD", "\u8131\u7C92\u5668", "\u2014"], "ferrfabr": ["ferrfabr", "\u540D\u8BCD", "\u94C1\u5320", "\u2014"], "lignfabr": ["lignfabr", "\u540D\u8BCD", "\u6728\u5320", "\u2014"], "ferrgnos": ["ferrgnos", "\u540D\u8BCD", "\u94C1\u5B66", "\u2014"], "silvzone": ["silvzone", "\u540D\u8BCD", "\u68EE\u6797\u533A", "\u2014"], "marvia": ["marvia", "\u540D\u8BCD", "\u6D77\u8DEF", "\u2014"], "censura": ["censura", "\u540D\u8BCD", "\u76D1\u5BDF\u4E4B\u672F", "\u2014"], "alfus": ["alfus", "\u65CF\u540D", "\u7CBE\u7075\u65CF", "ALF"], "angelus": ["angelus", "\u65CF\u540D", "\u8428\u79D1\u5854\u65CF", "ANG"], "anura": ["anura", "\u65CF\u540D", "\u5B89\u52AA\u62C9\u65CF", "ANU"], "aquor": ["aquor", "\u65CF\u540D", "\u963F\u6208\u5C14\u65CF", "AQR"], "avis": ["avis", "\u65CF\u540D", "\u9ECE\u535A\u5229\u65CF", "AVI"], "bovus": ["bovus", "\u65CF\u540D", "\u666E\u7C73\u970D\u65CF", "BOV"], "canis": ["canis", "\u65CF\u540D", "\u574E\u90A3\u65AF\u65CF", "CAN"], "centaurus": ["centaurus", "\u65CF\u540D", "\u534A\u4EBA\u9A6C\u65CF", "CEN"], "ceratus": ["ceratus", "\u65CF\u540D", "\u8D5B\u62C9\u6258\u65CF", "CER"], "chimera": ["chimera", "\u65CF\u540D", "\u5947\u7F8E\u62C9", "CHI"], "cobalus": ["cobalus", "\u65CF\u540D", "\u5730\u7CBE\u65CF", "COB"], "cuniculus": ["cuniculus", "\u65CF\u540D", "\u5361\u7279\u65AF\u65CF", "CUN"], "daemon": ["daemon", "\u65CF\u540D", "\u8428\u5361\u5179\u65CF", "DAE"], "dracon": ["dracon", "\u65CF\u540D", "\u5FB7\u62C9\u514B\u65CF", "DRAk"], "eidolon": ["eidolon", "\u65CF\u540D", "\u5E7D\u7075\u65CF", "EID"], "eksul": ["eksul", "\u65CF\u540D", "\u963F\u7EB3\u8428\u65CF", "EKS"], "elafus": ["elafus", "\u65CF\u540D", "\u57C3\u62C9\u83F2\u4E9A\u65CF", "ELA"], "elementa": ["elementa", "\u65CF\u540D", "\u7EAF\u7CB9\u5143\u7D20\u65CF", "ELEm"], "equus": ["equus", "\u65CF\u540D", "\u57C3\u594E\u4ED6\u65CF", "EQU"], "felus": ["felus", "\u65CF\u540D", "\u83F2\u6797\u65CF", "FEL"], "gigas": ["gigas", "\u65CF\u540D", "\u5DE8\u4EBA\u65CF", "GIG"], "humanus": ["humanus", "\u65CF\u540D", "\u81EA\u7136\u4EBA", "HUM"], "hyaena": ["hyaena", "\u65CF\u540D", "\u745E\u67CF\u5DF4\u65CF", "HYA"], "kapra": ["kapra", "\u65CF\u540D", "\u5361\u666E\u91CC\u5C3C\u65CF", "KAP"], "krokodilus": ["krokodilus", "\u65CF\u540D", "\u963F\u8FBE\u514B\u5229\u65AF\u65CF", "KRO"], "kylin": ["kylin", "\u65CF\u540D", "\u9E92\u9E9F\u65CF", "KYL"], "kyklops": ["kyklops", "\u65CF\u540D", "\u72EC\u773C\u5DE8\u4EBA\u65CF", "KYK"], "leon": ["leon", "\u65CF\u540D", "\u963F\u65AF\u5170\u65CF", "LEOn"], "lupus": ["lupus", "\u65CF\u540D", "\u9C81\u73C0\u65CF", "LUP"], "machina": ["machina", "\u65CF\u540D", "\u673A\u68B0\u65CF", "MAC"], "mantika": ["mantika", "\u65CF\u540D", "\u66FC\u63D0\u67EF\u65CF", "MTK"], "moskus": ["moskus", "\u65CF\u540D", "\u4F9D\u7279\u62C9\u65CF", "MSK"], "mustela": ["mustela", "\u65CF\u540D", "\u963F\u7EB3\u7F07\u65CF", "MST"], "nanus": ["nanus", "\u65CF\u540D", "\u675C\u6797\u65CF", "NAN"], "nympha": ["nympha", "\u65CF\u540D", "\u5B81\u8299\u65CF", "NYM"], "oni": ["oni", "\u65CF\u540D", "\u9B3C\u65CF", "ONI"], "pilosa": ["pilosa", "\u65CF\u540D", "\u76AE\u6D1B\u8428\u65CF", "PIL"], "pumilio": ["pumilio", "\u65CF\u540D", "\u4F8F\u5112\u65CF", "PUM"], "rattus": ["rattus", "\u65CF\u540D", "\u624E\u62C9\u514B\u65CF", "RAT"], "saura": ["saura", "\u65CF\u540D", "\u8428\u5F17\u62C9\u65CF", "SAU"], "serpens": ["serpens", "\u65CF\u540D", "\u6590\u8FEA\u4E9A\u65CF", "SER"], "sirena": ["sirena", "\u65CF\u540D", "\u4EBA\u9C7C\u65CF", "SRN"], "skeletus": ["skeletus", "\u65CF\u540D", "\u9AB8\u9AA8\u65CF", "SKEl"], "telekinus": ["telekinus", "\u65CF\u540D", "\u5FF5\u52A8\u529B\u65CF", "TEL"], "testudo": ["testudo", "\u65CF\u540D", "\u7279\u65AF\u56FE\u6258\u65CF", "TES"], "tikaz": ["tikaz", "\u65CF\u540D", "\u63D0\u5361\u5179\u65CF", "TIK"], "umbra": ["umbra", "\u65CF\u540D", "\u6CD5\u6D85\u5170\u65CF", "UMB"], "ursus": ["ursus", "\u65CF\u540D", "\u4E4C\u8428\u65AF\u65CF", "URS"], "versipellis": ["versipellis", "\u65CF\u540D", "\u72FC\u4EBA\u65CF", "VER"], "vipera": ["vipera", "\u65CF\u540D", "\u74E6\u4F0A\u51E1\u65CF", "VIP"], "vulpes": ["vulpes", "\u65CF\u540D", "\u6C83\u5C14\u73C0\u65CF", "VUL"], "alopex": ["alopex", "\u52A8\u7269\u540D", "\u72D0", "ALO"], "arktos": ["arktos", "\u52A8\u7269\u540D", "\u718A", "ARK"], "bradypus": ["bradypus", "\u52A8\u7269\u540D", "\u6811\u61D2", "BRA"], "catus": ["catus", "\u52A8\u7269\u540D", "\u732B", "CAT"], "cervus": ["cervus", "\u52A8\u7269\u540D", "\u9E7F", "CRV"], "chelys": ["chelys", "\u52A8\u7269\u540D", "\u9F9F", "CHE"], "crocuta": ["crocuta", "\u52A8\u7269\u540D", "\u9B23\u72D7", "CRO"], "gale": ["gale", "\u52A8\u7269\u540D", "\u9F2C", "GAL"], "hippos": ["hippos", "\u52A8\u7269\u540D", "\u9A6C", "HIP"], "kyon": ["kyon", "\u52A8\u7269\u540D", "\u72AC", "KYO"], "lacerta": ["lacerta", "\u52A8\u7269\u540D", "\u8725\u8734", "LAC"], "leo": ["leo", "\u52A8\u7269\u540D", "\u72EE", "LEO"], "lepus": ["lepus", "\u52A8\u7269\u540D", "\u5154", "LEP"], "lykos": ["lykos", "\u52A8\u7269\u540D", "\u72FC", "LYK"], "mantis": ["mantis", "\u52A8\u7269\u540D", "\u87B3\u8782", "MAN"], "moschiferus": ["moschiferus", "\u52A8\u7269\u540D", "\u9E9D", "MOS"], "mus": ["mus", "\u52A8\u7269\u540D", "\u9F20", "MUS"], "ophis": ["ophis", "\u52A8\u7269\u540D", "\u86C7", "OPH"], "pardalis": ["pardalis", "\u52A8\u7269\u540D", "\u8C79", "PAR"], "rana": ["rana", "\u52A8\u7269\u540D", "\u86D9", "RAN"], "rinoceros": ["rinoceros", "\u52A8\u7269\u540D", "\u7280\u725B", "RIN"], "salamandra": ["salamandra", "\u52A8\u7269\u540D", "\u877E\u8788", "SAL"], "souchos": ["souchos", "\u52A8\u7269\u540D", "\u9CC4", "SOU"], "tauros": ["tauros", "\u52A8\u7269\u540D", "\u725B", "TAU"], "tragos": ["tragos", "\u52A8\u7269\u540D", "\u5C71\u7F8A", "TRA"], "ens": ["ens", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u5B58\u5728\u8005", "ENS"], "ferus": ["ferus", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u517D\u4EBA\uFF08\u63D0\u6848\uFF09", "FER"], "gens": ["gens", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u65CF\u3001\u8840\u7EDF\u7FA4\u4F53", "GEN"], "humaniforma": ["humaniforma", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u4EBA\u5F62\u3001\u7C7B\u4EBA", "HMF"], "phyton": ["phyton", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u690D\u7269\u3001\u83CC", "PHY"], "purus": ["purus", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u7EAF\u8840\u7684", "PUR"], "sanguis": ["sanguis", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u8840\u7EDF\u3001\u8840\u7F18", "SNG"], "semihumanus": ["semihumanus", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u534A\u4EBA\uFF08\u63D0\u6848\uFF09", "SEMh"], "subumanus": ["subumanus", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u4E9A\u4EBA\uFF08\u63D0\u6848\uFF09", "SUB"], "supervita": ["supervita", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u9AD8\u7EA7\u751F\u547D", "SUP"], "zoon": ["zoon", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u52A8\u7269", "ZOO"], "aepaus": ["aepaus", "\u52A8\u8BCD", "\u589E\u52A0\u3001\u63D0\u5347\u3001\u52A0\u5267", "AEP"], "apolus": ["apolus", "\u52A8\u8BCD", "\u5C04\u51FB\u3001\u7206\u70B8", "APOl"], "expaste": ["expaste", "\u52A8\u8BCD", "\u4EA4\u6362\u3001\u514B\u9686\u3001\u590D\u5236", "EXPa"], "expual": ["expual", "\u52A8\u8BCD", "\u4FDD\u5B58\u3001\u50A8\u5B58", "EXPu"], "fragis": ["fragis", "\u52A8\u8BCD", "\u7834\u788E\u3001\u6253\u65AD", "FRAi"], "locis": ["locis", "\u52A8\u8BCD", "\u653E\u7F6E\u3001\u5B9A\u4F4D", "LOCi"], "loqis": ["loqis", "\u52A8\u8BCD", "\u8BF4\u3001\u8BB2\u8FF0", "LOQi"], "memis": ["memis", "\u52A8\u8BCD", "\u8BB0\u5FC6\u3001\u56DE\u5FC6", "MEMi"], "mortis": ["mortis", "\u52A8\u8BCD", "\u6B7B\u3001\u6D88\u4EA1", "MORi"], "movis": ["movis", "\u52A8\u8BCD", "\u79FB\u52A8\u3001\u63A8\u52A8", "MOVi"], "navis": ["navis", "\u52A8\u8BCD", "\u5F15\u5BFC\u3001\u91CA\u653E\u3001\u89E3\u9501", "NAV"], "plur": ["plur", "\u52A8\u8BCD", "\u51C0\u5316", "PLU"], "retase": ["retase", "\u52A8\u8BCD", "\u4F11\u606F\u3001 \u505C\u6B62\u3001\u91CD\u7F6E", "RET"], "sanis": ["sanis", "\u52A8\u8BCD", "\u6CBB\u6108\u3001\u4FEE\u590D", "SANi"], "struis": ["struis", "\u52A8\u8BCD", "\u5EFA\u9020\u3001\u6784\u9020", "STRi"], "vidis": ["vidis", "\u52A8\u8BCD", "\u770B\u3001\u89C2\u5BDF", "VIDi"], "vivis": ["vivis", "\u52A8\u8BCD", "\u6D3B\u3001\u751F\u5B58", "VIVi"], "hab": ["hab", "\u52A8\u8BCD", "\u6709\u3001\u62E5\u6709", "HAB"], "causa": ["causa", "\u52A8\u8BCD", "\u7F18\u6545\u3001\u7406\u7531", "CAU"], "trituris": ["trituris", "\u52A8\u8BCD", "\u8131\u7C92", "\u2014"], "ventilis": ["ventilis", "\u52A8\u8BCD", "\u626C\u8C37", "\u2014"], "manis": ["manis", "\u52A8\u8BCD", "\u4FDD\u6301", "\u2014"], "lapsis": ["lapsis", "\u52A8\u8BCD", "\u6ED1\u843D", "\u2014"], "oppes": ["oppes", "\u52A8\u8BCD", "\u7B49\u5F85", "\u2014"], "stas": ["stas", "\u52A8\u8BCD", "\u7ACB", "\u2014"], "restas": ["restas", "\u52A8\u8BCD", "\u91CD\u7ACB", "\u2014"], "visid": ["visid", "\u52A8\u8BCD", "\u6781\u770B", "\u2014"], "vilud": ["vilud", "\u52A8\u8BCD", "\u7565\u770B", "\u2014"], "transividis": ["transividis", "\u52A8\u8BCD", "\u900F\u770B", "\u2014"], "vados": ["vados", "\u52A8\u8BCD", "\u884C\u8D70", "\u2014"], "flagros": ["flagros", "\u52A8\u8BCD", "\u71C3\u70BD", "\u2014"], "secis": ["secis", "\u52A8\u8BCD", "\u5207", "\u2014"], "vitad": ["vitad", "\u52A8\u8BCD", "\u53CD\u590D\u770B", "\u2014"], "vimid": ["vimid", "\u52A8\u8BCD", "\u77AC\u770B", "\u2014"], "bilis": ["bilis", "\u52A8\u8BCD", "\u80C6", "\u2014"], "formis": ["formis", "\u52A8\u8BCD", "\u5851\u9020", "\u2014"], "videsco": ["videsco", "\u52A8\u8BCD", "\u5F00\u59CB\u770B", "\u2014"], "nevidis": ["nevidis", "\u52A8\u8BCD", "\u4E0D\u770B", "\u2014"], "revidis": ["revidis", "\u52A8\u8BCD", "\u91CD\u770B", "\u2014"], "praevidis": ["praevidis", "\u52A8\u8BCD", "\u9884\u770B", "\u2014"], "covidis": ["covidis", "\u52A8\u8BCD", "\u5171\u770B", "\u2014"], "providis": ["providis", "\u52A8\u8BCD", "\u524D\u770B", "\u2014"], "extravidis": ["extravidis", "\u52A8\u8BCD", "\u5916\u770B", "\u2014"], "retrovidis": ["retrovidis", "\u52A8\u8BCD", "\u56DE\u770B", "\u2014"], "tri": ["tri", "\u6570\u8BCD", "\u4E09", "\u2014"], "quinq": ["quinq", "\u6570\u8BCD", "\u4E94", "\u2014"], "paulum": ["paulum", "\u6570\u8BCD", "\u5C11\u8BB8", "\u2014"], "nimis": ["nimis", "\u6570\u8BCD", "\u8FC7\u5EA6", "\u2014"], "sept": ["sept", "\u6570\u8BCD", "\u4E03", "\u2014"], "parum": ["parum", "\u6570\u8BCD", "\u592A\u5C11", "\u2014"], "dec": ["dec", "\u6570\u8BCD", "\u5341", "\u2014"], "quadr": ["quadr", "\u6570\u8BCD", "\u56DB", "\u2014"], "false": ["false", "\u5F62\u5BB9\u8BCD", "\u9519\u8BEF\u7684\u3001\u5047\u7684", "\u2014"], "true": ["true", "\u5F62\u5BB9\u8BCD", "\u771F\u5B9E\u7684\u3001\u771F\u7684", "\u2014"], "magnal": ["magnal", "\u5F62\u5BB9\u8BCD", "\u5927\u7684", "\u2014"], "granar": ["granar", "\u5F62\u5BB9\u8BCD", "\u5C5E\u4E8E\u8C37\u7C92\u7684", "\u2014"], "humal": ["humal", "\u5F62\u5BB9\u8BCD", "\u5C5E\u4E8E\u6E7F\u7684", "\u2014"], "ventil": ["ventil", "\u5F62\u5BB9\u8BCD", "\u6613\u98CE\u7684", "\u2014"], "vidifer": ["vidifer", "\u5F62\u5BB9\u8BCD", "\u5E26\u770B\u7684", "\u2014"], "vadosal": ["vadosal", "\u5F62\u5BB9\u8BCD", "\u6D45\u7684", "\u2014"], "bathal": ["bathal", "\u5F62\u5BB9\u8BCD", "\u6DF1\u7684", "\u2014"], "lumenal": ["lumenal", "\u5F62\u5BB9\u8BCD", "\u5C5E\u4E8E\u5FAE\u5149\u7684", "\u2014"], "vidal": ["vidal", "\u5F62\u5BB9\u8BCD", "\u5C5E\u4E8E\u770B\u7684", "\u2014"], "vidivus": ["vidivus", "\u5F62\u5BB9\u8BCD", "\u597D\u770B\u7684", "\u2014"], "vidibilis": ["vidibilis", "\u5F62\u5BB9\u8BCD", "\u53EF\u770B\u7684", "\u2014"], "lapidiformis": ["lapidiformis", "\u5F62\u5BB9\u8BCD", "\u77F3\u6599\u5F62", "\u2014"], "vidax": ["vidax", "\u5F62\u5BB9\u8BCD", "\u55DC\u770B\u7684", "\u2014"], "vidibundus": ["vidibundus", "\u5F62\u5BB9\u8BCD", "\u6B63\u770B\u7684", "\u2014"], "vidulent": ["vidulent", "\u5F62\u5BB9\u8BCD", "\u5BCC\u4E8E\u770B\u7684", "\u2014"], "lapidat": ["lapidat", "\u5F62\u5BB9\u8BCD", "\u5177\u6709\u77F3\u6599\u7684", "\u2014"], "vidil": ["vidil", "\u5F62\u5BB9\u8BCD", "\u6613\u770B\u7684", "\u2014"], "inter": ["inter", "\u5F62\u5BB9\u8BCD", "\u5C5E\u4E8E\u6BC1\u706D\u7684", "\u2014"], "cisternal": ["cisternal", "\u5F62\u5BB9\u8BCD", "\u5C5E\u4E8E\u84C4\u6C34\u6C60\u7684", "\u2014"], "ardu": ["ardu", "\u526F\u8BCD", "\u96BE", "\u2014"], "clar": ["clar", "\u526F\u8BCD", "\u660E", "\u2014"], "facil": ["facil", "\u526F\u8BCD", "\u6613", "\u2014"], "fort": ["fort", "\u526F\u8BCD", "\u5F3A", "\u2014"], "lent": ["lent", "\u526F\u8BCD", "\u6162", "\u2014"], "sombra": ["sombra", "\u526F\u8BCD", "\u6697", "\u2014"], "tac": ["tac", "\u526F\u8BCD", "\u9759", "\u2014"], "vel": ["vel", "\u526F\u8BCD", "\u5FEB", "\u2014"], "viden": ["viden", "\u526F\u8BCD", "\u4EE5\u770B\u7684\u65B9\u5F0F", "\u2014"], "viditim": ["viditim", "\u526F\u8BCD", "\u9010\u770B\u5730", "\u2014"], "de": ["de", "\u4ECB\u8BCD", "\u5728\u2026\u2026\u4E4B\u5185", "dex"], "enn": ["enn", "\u4ECB\u8BCD", "\u5728\u2026\u2026\u91CC\u9762", "enn"], "ord": ["ord", "\u4ECB\u8BCD", "\u4ECE\u3001\u6E90\u81EA", "ord"], "pro": ["pro", "\u4ECB\u8BCD", "\u671D\u5411\u3001\u5411\u3001\u4E3A\u4E86", "pro"], "ynen": ["Ynen", "\u4ECB\u8BCD", "\u901A\u8FC7\u3001\u7531", "yne"], "intra": ["intra", "\u4ECB\u8BCD", "\u8FDB\u5165\u3001\u5728\u2026\u2026\u4E4B\u5185", "\u2014"], "di": ["di", "\u4ECB\u8BCD", "\u2026\u2026\u7684\u3001\u4E4B\uFF08\u9886\u5C5E\uFF09", "di"], "supra": ["supra", "\u4ECB\u8BCD", "\u5728\u2026\u2026\u4E4B\u4E0A", "sup"], "sub": ["sub", "\u4ECB\u8BCD", "\u5728\u2026\u2026\u4E4B\u4E0B", "sub"], "velut": ["velut", "\u4ECB\u8BCD", "\u5982\u3001\u4F3C\uFF08\u660E\u55BB\uFF09", "vel"], "deb": ["deb", "\u52A9\u52A8\u8BCD", "\u5E94\u3001\u8BE5", "deb"], "dur": ["dur", "\u52A9\u52A8\u8BCD", "\u6301\u7EED\u4F53", "dur"], "es": ["es", "\u52A9\u52A8\u8BCD", "\u662F\u3001\u5B58\u5728", "ess"], "fac": ["fac", "\u52A9\u52A8\u8BCD", "\u4F7F\u3001\u8BA9", "fac"], "inc": ["inc", "\u52A9\u52A8\u8BCD", "\u5F00\u59CB\u4F53", "inc"], "iter": ["iter", "\u52A9\u52A8\u8BCD", "\u91CD\u590D\u4F53", "iter"], "lic": ["lic", "\u52A9\u52A8\u8BCD", "\u53EF\u3001\u5141\u8BB8", "lic"], "ne": ["ne", "\u52A9\u52A8\u8BCD", "\u4E0D\u3001\u76F8\u53CD", "neg"], "nec": ["nec", "\u52A9\u52A8\u8BCD", "\u5FC5\u987B", "nec"], "per": ["per", "\u52A9\u52A8\u8BCD", "\u5B8C\u6210\u4F53", "per"], "pot": ["pot", "\u52A9\u52A8\u8BCD", "\u80FD\u3001\u53EF\u4EE5", "pot"], "se": ["se", "\u52A9\u52A8\u8BCD", "\u88AB\u3001\u53CD\u8EAB", "se"], "vet": ["vet", "\u52A9\u52A8\u8BCD", "\u7981\u6B62", "vet"], "vol": ["vol", "\u52A9\u52A8\u8BCD", "\u613F\u3001\u8981", "vol"], "aude": ["aude", "\u5224\u65AD\u8BCD", "\u524D\u540E\u540C\u4E00\u5219\u540C\u4E00", "aud"], "aut": ["aut", "\u5224\u65AD\u8BCD", "\u5305\u542B\u6216", "aut"], "dis": ["dis", "\u5224\u65AD\u8BCD", "\u4E92\u65A5\u6216", "dis"], "dum": ["dum", "\u5224\u65AD\u8BCD", "\u53EA\u8981", "dum"], "ergo": ["ergo", "\u5224\u65AD\u8BCD", "\u6240\u4EE5", "erg"], "exo": ["exo", "\u5224\u65AD\u8BCD", "\u5982\u679C\u2026\u2026\u90A3\u4E48\u5E94\u5F53\u2026\u2026", "exo"], "fas": ["fas", "\u5224\u65AD\u8BCD", "\u8BB8\u53EF\u3001\u5408\u6CD5", "fas"], "kaus": ["kaus", "\u5224\u65AD\u8BCD", "\u56E0\u4E3A", "kau"], "keal": ["keal", "\u5224\u65AD\u8BCD", "\u5982\u679C\u2026\u2026", "kea"], "keol": ["keol", "\u5224\u65AD\u8BCD", "\u5426\u5219\u5982\u679C\u2026\u2026", "keo"], "kon": ["kon", "\u5224\u65AD\u8BCD", "\u5E76\u4E14\u3001\u5408\u53D6", "kon"], "nefas": ["nefas", "\u5224\u65AD\u8BCD", "\u7981\u5FCC\u3001\u4E0D\u5408\u6CD5", "nef"], "nisi": ["nisi", "\u5224\u65AD\u8BCD", "\u9664\u975E", "nis"], "quan": ["quan", "\u5224\u65AD\u8BCD", "\u65E0\u8BBA", "qua"], "rase": ["rase", "\u5224\u65AD\u8BCD", "\u6709\u4E00\u771F\u5219\u4E3A\u771F", "ras"], "re": ["re", "\u5224\u65AD\u8BCD", "\u662F\u5426\u771F\u6216\u5047", "req"], "ske": ["ske", "\u5224\u65AD\u8BCD", "\u53CD\u4E8B\u5B9E\u5982\u679C", "ske"], "tam": ["tam", "\u5224\u65AD\u8BCD", "\u5F53\u2026\u2026\u65F6", "tam"], "vero": ["vero", "\u5224\u65AD\u8BCD", "\u786E\u5B9E\u3001\u5F3A\u8C03\u771F", "vro"], "priv": ["priv", "\u9650\u5B9A\u8BCD", "\u79C1\u6709\uFF1A\u53EA\u5728**\u5F53\u524D\u8BED\u5757**\u5185\u53EF\u89C1\uFF0C\u51FA\u5757\u5373\u4E0D\u53EF\u89C1", "prv"], "tut": ["tut", "\u9650\u5B9A\u8BCD", "\u53D7\u62A4\uFF1A**\u672C\u8BED\u5757\u53CA\u5176\u5B50\u5757**\u53EF\u89C1\uFF0C\u5916\u5C42\u4E0D\u53EF\u89C1", "tut"], "publ": ["publ", "\u9650\u5B9A\u8BCD", "\u516C\u5F00\uFF1A**\u6574\u4E2A\u672F\u5F0F**\u5185\u53EF\u89C1\uFF0C\u53EF\u8DE8\u5757\u4F7F\u7528", "pbl"], "consta": ["consta", "\u9650\u5B9A\u8BCD", "\u5E38\u6570\uFF1A**\u5199\u5165\u540E\u4E0D\u53EF\u518D\u8D4B\u503C**\uFF08\u6CBF\u7528\u8BCD\u6839\u8868\u300C\u5E38\u6570\u300D\u7684\u539F\u5F62\uFF09", "cns"], "has": ["has", "\u65F6\u95F4\u9650\u5B9A", "\u5728\u672A\u6765", "has"], "iam": ["iam", "\u65F6\u95F4\u9650\u5B9A", "\u5DF2\u7ECF", "iam"], "mis": ["mis", "\u65F6\u95F4\u9650\u5B9A", "\u73B0\u5728", "mis"], "mox": ["mox", "\u65F6\u95F4\u9650\u5B9A", "\u5373\u5C06", "mox"], "nun": ["nun", "\u65F6\u95F4\u9650\u5B9A", "\u4ECE\u4E0D", "nun"], "post": ["post", "\u65F6\u95F4\u9650\u5B9A", "\u4E4B\u540E", "pos"], "pre": ["pre", "\u65F6\u95F4\u9650\u5B9A", "\u4E4B\u524D", "pre"], "ros": ["ros", "\u65F6\u95F4\u9650\u5B9A", "\u5728\u53E4\u4EE3\u3001\u8FC7\u53BB", "ros"], "sem": ["sem", "\u65F6\u95F4\u9650\u5B9A", "\u603B\u662F", "sem"], "simul": ["simul", "\u65F6\u95F4\u9650\u5B9A", "\u540C\u65F6", "sim"], "ali": ["ali", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u67D0\u4E2A", "ali"], "mult": ["mult", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u591A", "mul"], "nul": ["nul", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u65E0", "nul"], "om": ["om", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u5168\u90E8\u3001\u6574\u4F53", "omn"], "part": ["part", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u90E8\u5206", "prt"], "pauc": ["pauc", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u5C11", "pau"], "selinge": ["Selinge", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u552F\u4E00\u4E00\u4E2A", "sel"], "sol": ["sol", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u4EC5\u3001\u53EA", "sol"], "tallse": ["tallse", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u6BCF\u4E00\u4E2A\u3001\u6240\u6709", "tal"], "tot": ["tot", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u6574\u4E2A", "tot"], "alius": ["alius", "\u6307\u79F0\u9650\u5B9A", "\u53E6\u4E00\u4E2A", "als"], "hic": ["hic", "\u6307\u79F0\u9650\u5B9A", "\u8FD9", "hic"], "idem": ["idem", "\u6307\u79F0\u9650\u5B9A", "\u540C\u4E00", "ide"], "ille": ["ille", "\u6307\u79F0\u9650\u5B9A", "\u90A3", "ill"], "ipse": ["ipse", "\u6307\u79F0\u9650\u5B9A", "\u81EA\u8EAB", "ips"], "quis": ["quis", "\u6307\u79F0\u9650\u5B9A", "\u54EA\u4E2A", "qui"], "quot": ["quot", "\u6307\u79F0\u9650\u5B9A", "\u591A\u5C11", "quo"], "prim": ["prim", "\u987A\u5E8F\u9650\u5B9A", "\u7B2C\u4E00\u3001\u9996\u5148", "pri"], "prior": ["prior", "\u987A\u5E8F\u9650\u5B9A", "\u524D\u4E00\u4E2A", "pir"], "prox": ["prox", "\u987A\u5E8F\u9650\u5B9A", "\u4E0B\u4E00\u4E2A", "prx"], "ultim": ["ultim", "\u987A\u5E8F\u9650\u5B9A", "\u6700\u540E", "ult"], "magis": ["magis", "\u7A0B\u5EA6\u9650\u5B9A", "\u66F4", "mag"], "max": ["max", "\u7A0B\u5EA6\u9650\u5B9A", "\u6700", "max"], "min": ["min", "\u7A0B\u5EA6\u9650\u5B9A", "\u6700\u4E0D", "min"], "minus": ["minus", "\u7A0B\u5EA6\u9650\u5B9A", "\u66F4\u5C11\u3001\u8F83\u4E0D", "mns"], "valde": ["valde", "\u7A0B\u5EA6\u9650\u5B9A", "\u5F88\u3001\u975E\u5E38", "val"], "mi": ["mi", "\u4EE3\u8BCD\uFF08\u4EBA\u79F0\uFF09", "\u6211", "mi"], "tu": ["tu", "\u4EE3\u8BCD\uFF08\u4EBA\u79F0\uFF09", "\u4F60", "tu"], "il": ["il", "\u4EE3\u8BCD\uFF08\u4EBA\u79F0\uFF09", "\u4ED6\uFF0F\u5979", "il"], "id": ["id", "\u4EE3\u8BCD\uFF08\u4EBA\u79F0\uFF09", "\u5B83", "id"], "nos": ["nos", "\u4EE3\u8BCD\uFF08\u4EBA\u79F0\uFF09", "\u6211\u4EEC", "nos"], "vos": ["vos", "\u4EE3\u8BCD\uFF08\u4EBA\u79F0\uFF09", "\u4F60\u4EEC\uFF08\u517C\u656C\u79F0\uFF09", "vos"], "les": ["les", "\u4EE3\u8BCD\uFF08\u4EBA\u79F0\uFF09", "\u4ED6\u4EEC", "les"], "tis": ["tis", "\u7591\u95EE\u8BCD", "\u8C01", "\u540D\u8BCD\u4F4D"], "ti": ["ti", "\u7591\u95EE\u8BCD", "\u4EC0\u4E48", "\u540D\u8BCD\u4F4D"], "poi": ["poi", "\u7591\u95EE\u8BCD", "\u54EA\u4E2A", "\u4FEE\u9970\u4F4D"], "pu": ["pu", "\u7591\u95EE\u8BCD", "\u54EA\u91CC", "\u8865\u8BED\u4F4D"], "pote": ["pote", "\u7591\u95EE\u8BCD", "\u4F55\u65F6", "\u9650\u5B9A\u5C42"], "dia": ["dia", "\u7591\u95EE\u8BCD", "\u4E3A\u4F55", "\u5224\u65AD\u5C42"], "pos": ["pos", "\u7591\u95EE\u8BCD", "\u5982\u4F55", "\u65B9\u5F0F\u5C42"], "poso": ["poso", "\u7591\u95EE\u8BCD", "\u591A\u5C11", "\u6570\u91CF\u4F4D"], "word": ["word", "\u91CF\u8BCD", "\u7528\u4E8E", "abbr"], "kor": ["kor", "\u91CF\u8BCD", "\u6709\u7075\u8005\uFF08\u4EBA\uFF0F\u795E\uFF0F\u65CF\uFF09", "KOR"], "kap": ["kap", "\u91CF\u8BCD", "\u8D70\u517D\u3001\u9F99", "KAPA"], "pte": ["pte", "\u91CF\u8BCD", "\u98DE\u79BD", "PTE"], "ikh": ["ikh", "\u91CF\u8BCD", "\u9C7C\u3001\u86C7\u3001\u957F\u6761\u7269", "IKH"], "pho": ["pho", "\u91CF\u8BCD", "\u8349\u6728", "PHO"], "rok": ["rok", "\u91CF\u8BCD", "\u5757\u72B6\u786C\u7269\uFF08\u77F3\uFF0F\u91D1\uFF09", "ROK"], "ker": ["ker", "\u91CF\u8BCD", "\u5668\u7269\u3001\u5DE5\u5177", "KER"], "graf": ["graf", "\u91CF\u8BCD", "\u6241\u5E73\u7269\uFF08\u7EB8\uFF0F\u5E03\uFF0F\u677F\uFF09", "GRAF"], "vat": ["vat", "\u91CF\u8BCD", "\u5BB9\u5668\u4E0E\u6DB2\u4F53", "VAT"], "mo": ["mo", "\u91CF\u8BCD", "\u98DF\u7269\u4E00\u4EFD", "MO"], "top": ["top", "\u91CF\u8BCD", "\u5730\u70B9", "TOP"], "kair": ["kair", "\u91CF\u8BCD", "\u6B21\u6570\u3001\u4E8B\u4EF6", "KAIR"], "verb": ["verb", "\u91CF\u8BCD", "\u8A00\u8BED\u3001\u6587\u5B57", "VERb"], "aps": ["aps", "\u91CF\u8BCD", "\u62BD\u8C61\u4E8B\u7269", "APS"], "inse": ["inse", "\u91CF\u8BCD", "\u866B\u8C78", "INSE"], "ka": ["ka", "\u8FDE\u63A5\u8BCD\u4E0E\u4ECE\u53E5\u6807\u8BB0", "\u9648\u8FF0\u4ECE\u53E5\u6807\u8BB0\uFF08that\uFF09\u2014\u2014\u5F00", "ka"], "ku": ["ku", "\u8FDE\u63A5\u8BCD\u4E0E\u4ECE\u53E5\u6807\u8BB0", "\u5173\u7CFB\u4ECE\u53E5\u6807\u8BB0\uFF08\u2026\u2026\u7684\uFF09\u2014\u2014\u5F00", "ku"], "ki": ["ki", "\u8FDE\u63A5\u8BCD\u4E0E\u4ECE\u53E5\u6807\u8BB0", "\u4ECE\u53E5\u95ED\u5408\u8BCD\u2014\u2014\u95ED\uFF08\u540E\u5F00\u5148\u95ED\uFF09", "ki"], "eti": ["eti", "\u8FDE\u63A5\u8BCD\u4E0E\u4ECE\u53E5\u6807\u8BB0", "\u548C\u3001\u4E0E\uFF08\u5E76\u5217\u540D\u8BCD\uFF09", "ETI"], "limit": ["limit", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u9650\u5236\uFF08\u51C6\u5165\u6761\u4EF6\uFF09\uFF1B\u4F5C\u7B5B\u9009\u952E\u65F6\u662F\u300C\u53D6\u524D\u51E0\u4E2A\u300D", "limit"], "pretium": ["pretium", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u4EE3\u4EF7\uFF08\u672F\u5F0F\u7684\u4ED8\u51FA\uFF09", "pretium"], "solum": ["solum", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u72EC\u7ACB\uFF08\u4E0D\u4F9D\u8D56\u65BD\u672F\u8005\uFF09", "solum"], "hauri": ["hauri", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u6C72\u53D6\uFF08\u81EA\u884C\u5438\u53D6\u5468\u906D\u5143\u7D20\uFF09", "hauri"], "luss": ["luss", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u9501\u5165\uFF08\u80FD\u91CF\uFF09", "luss"], "vita": ["vita", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u5BFF\u547D", "VIT"], "memoria": ["memoria", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u8BB0\u5FC6", "MEMo"], "sensus": ["sensus", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u611F\u5B98", "SEN"], "voluntas": ["voluntas", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u610F\u5FD7", "VOL"], "anima": ["anima", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u7075\u9B42", "ANI"], "vis": ["vis", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u5A01\u529B", "VIS"], "diu": ["diu", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u6301\u7EED", "diu"], "celer": ["celer", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u8FC5\u6377", "celer"], "metos": ["metos", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u5BF9\u8C61\u3001\u76EE\u6807\uFF08\u672F\u5F0F\u7684\u76EE\u6807\u9879\uFF09", "metos"], "ren": ["ren", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u8FD4\u56DE\u6570\u5B57\uFF08\u672F\u5F0F\u8F93\u51FA\uFF09", "\u2014"], "rea": ["rea", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u8FD4\u56DE\u5730\u5740\uFF08\u672F\u5F0F\u8F93\u51FA\uFF09", "\u2014"], "kigrama": ["kigrama", "\u5355\u4F4D", "\u5343\u514B\uFF08\u8D28\u91CF\uFF09", "kig"], "pondus": ["pondus", "\u5355\u4F4D", "\u91CD\u91CF\uFF08\u4E0E\u8D28\u91CF\u76F8\u5BF9\uFF09", "pon"], "sands": ["sands", "\u5355\u4F4D", "\u79D2", "san"], "minas": ["minas", "\u5355\u4F4D", "\u5206\uFF08\u949F\uFF09", "min"], "hora": ["hora", "\u5355\u4F4D", "\u5C0F\u65F6", "hor"], "dies": ["dies", "\u5355\u4F4D", "\u65E5", "die"], "annus": ["annus", "\u5355\u4F4D", "\u5E74", "ann"], "animarbo": ["Animarbo", "\u5730\u540D\u4E0E\u52BF\u529B\u540D", "\u5168\u606F\u9B42\u7075\u4E4B\u6811", "anim \uFF0B arbor"], "parasevictom": ["Parasevictom", "\u5730\u7406 \xB7 \u795E\u5BAB \xB7 \u8D27\u5E01\u4E13\u540D", "\u5E15\u62C9\u65AF\u7EF4\u767B", "\u533A\u57DF"], "root": ["root", "\u6839\u8BCD", "\u62BD\u8C61\u4E49", "abbr"], "ae": ["ae", "\u6839\u8BCD", "\u4E0A\u5347\u3001\u589E\u5F3A", "AER"], "apo": ["apo", "\u6839\u8BCD", "\u79BB\u3001\u7206\u53D1\u3001\u91CA\u653E", "APX"], "end": ["end", "\u6839\u8BCD", "\u7EC8\u70B9", "END"], "ex": ["ex", "\u6839\u8BCD", "\u5916\u3001\u8F6C\u79FB\u3001\u590D\u5236", "EXS"], "frag": ["frag", "\u6839\u8BCD", "\u7834\u788E\u3001\u65AD\u88C2", "FRG"], "grama": ["grama", "\u6839\u8BCD", "\u91CF\u3001\u91CD", "GRA"], "ho": ["ho", "\u6839\u8BCD", "\u5BB6\u3001\u805A\u3001\u5E87\u62A4", "HOM"], "kipo": ["kipo", "\u6839\u8BCD", "\u52A8\u3001\u52A0\u901F", "KIP"], "loc": ["loc", "\u6839\u8BCD", "\u5730\u70B9\u3001\u653E\u7F6E", "LOC"], "loq": ["loq", "\u6839\u8BCD", "\u8BF4\u3001\u8BED\u8A00", "LOQ"], "lus": ["lus", "\u6839\u8BCD", "\u51FB\u3001\u963B\u3001\u9501", "LUS"], "mem": ["mem", "\u6839\u8BCD", "\u8BB0\u5FC6\u3001\u5FC3\u667A", "MEM"], "mort": ["mort", "\u6839\u8BCD", "\u6B7B\u3001\u6D88\u4EA1", "MOR"], "mov": ["mov", "\u6839\u8BCD", "\u79FB\u52A8\u3001\u63A8\u52A8", "MOV"], "navi": ["navi", "\u6839\u8BCD", "\u8DEF\u5F84\u3001\u5F15\u5BFC", "NVI"], "ose": ["ose", "\u6839\u8BCD", "\u5F00\u59CB", "OSE"], "pas": ["pas", "\u6839\u8BCD", "\u573A\u3001\u7ACB\u3001\u505C\u7559", "PAS"], "redi": ["redi", "\u6839\u8BCD", "\u56DE\u3001\u518D\u3001\u505C", "RED"], "san": ["san", "\u6839\u8BCD", "\u6CBB\u6108\u3001\u4FEE\u590D", "SAN"], "stru": ["stru", "\u6839\u8BCD", "\u5EFA\u9020\u3001\u7ED3\u6784", "STR"], "vid": ["vid", "\u6839\u8BCD", "\u770B\u3001\u89C1\u3001\u89C2\u5BDF", "VID"], "viv": ["viv", "\u6839\u8BCD", "\u751F\u3001\u6D3B\u3001\u751F\u547D", "VIV"], "fraglus": ["fraglus", "\u590D\u5408\u8BCD", "\u7834\u9501\u3001\u7834\u574F\u969C\u788D", "FGL"], "loqnavi": ["loqnavi", "\u590D\u5408\u8BCD", "\u547D\u4EE4\u3001\u5492\u8BED\u5F15\u5BFC", "LQN"], "loczone": ["loczone", "\u590D\u5408\u8BCD", "\u5B9A\u4F4D\u533A\u57DF", "LCZ"], "memexpual": ["memexpual", "\u590D\u5408\u8BCD", "\u4FDD\u5B58\u8BB0\u5FC6", "MEX"], "mortsiro": ["mortsiro", "\u590D\u5408\u8BCD", "\u6B7B\u4EA1\u865A\u7A7A", "MRS"], "movpas": ["movpas", "\u590D\u5408\u8BCD", "\u79FB\u52A8\u573A\u3001\u4F20\u9001\u7AD9", "MVP"], "sanaqua": ["sanaqua", "\u590D\u5408\u8BCD", "\u6CBB\u6108\u4E4B\u6C34\u3001\u5723\u6C34", "SNQ"], "struhopas": ["struhopas", "\u590D\u5408\u8BCD", "\u5EFA\u9020\u8425\u5730", "STH"], "vidnavi": ["vidnavi", "\u590D\u5408\u8BCD", "\u89C2\u5BDF\u8DEF\u5F84", "VDN"], "vivfliam": ["vivfliam", "\u590D\u5408\u8BCD", "\u751F\u547D\u4E4B\u706B", "VVF"], "ven": ["ven", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6765", "VEN"], "iri": ["iri", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u53BB\u3001\u8D70", "IRI"], "cap": ["cap", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u62FF\u3001\u53D6", "CAP"], "don": ["don", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u7ED9", "DON"], "sci": ["sci", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u77E5\u9053", "SCI"], "ege": ["ege", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u9700\u8981", "EGE"], "aux": ["aux", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u5E2E\u52A9", "AUX"], "prc": ["prc", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u5371\u9669", "PRC"], "pop": ["pop", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u4EBA\u6C11\u3001\u4EBA\u7FA4", "POP"], "pna": ["pna", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u4EBA\u3001\u4E2A\u4F53", "PNA"], "res": ["res", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u4E8B\u7269", "RES"], "tem": ["tem", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u65F6\u95F4", "TEM"], "die": ["die", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u65E5\u3001\u767D\u5929", "DIE"], "nox": ["nox", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u591C", "NOX"], "cib": ["cib", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u98DF\u7269", "CIB"], "dom": ["dom", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u5BB6\u3001\u4F4F\u6240", "DOM"], "via": ["via", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u8DEF\u3001\u9053\u8DEF", "VIA"], "pue": ["pue", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u5B69\u5B50", "PUE"], "prn": ["prn", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u7236\u6BCD\u3001\u4EB2\u4EE3", "PRN"], "ami": ["ami", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u670B\u53CB", "AMI"], "hos": ["hos", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u654C\u4EBA", "HOS"], "rex": ["rex", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u738B", "REX"], "deu": ["deu", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u795E", "DEU"], "mgi": ["mgi", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u9B54\u6CD5", "MGI"], "tmp": ["tmp", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u98CE\u66B4", "TMP"], "aqe": ["aqe", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6D2A\u6C34", "AQE"], "plv": ["plv", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u96E8", "PLV"], "flv": ["flv", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6CB3", "FLV"], "mar": ["mar", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6D77", "MAR"], "mon": ["mon", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u5C71", "MON"], "sil": ["sil", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u68EE\u6797", "SIL"], "urb": ["urb", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u57CE\u5E02", "URB"], "pag": ["pag", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6751\u5E84", "PAG"], "edi": ["edi", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u5403", "EDI"], "bib": ["bib", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u559D", "BIB"], "dor": ["dor", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u7761", "DOR"], "cur": ["cur", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u8DD1", "CUR"], "amb": ["amb", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u8D70\u3001\u884C\u8D70", "AMB"], "vla": ["vla", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u98DE", "VLA"], "nat": ["nat", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6E38\u6CF3", "NAT"], "pug": ["pug", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6218\u6597", "PUG"], "nca": ["nca", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6740", "NCA"], "ape": ["ape", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6253\u5F00", "APE"], "cld": ["cld", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u5173\u95ED", "CLD"], "adi": ["adi", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u542C", "ADI"], "clv": ["clv", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u94A5\u5319", "CLV"], "por": ["por", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u95E8", "POR"], "yes": ["yes", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u662F", "Iy"], "no": ["no", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u5426", "Ey"] }, "keys": { "init": ["init", "\u7B5B\u9009\u952E", "\u539F\u70B9\uFF08\u53E6\u5B9A\u57FA\u51C6\uFF0C\u4E0D\u6539\u7F16\u53D1\u52A8\u4F4D\u7F6E\uFF09"], "intervall": ["intervall", "\u7B5B\u9009\u952E", "\u8DDD\u79BB\u8303\u56F4\uFF0C.. \u8868\u533A\u95F4"], "mensura": ["mensura", "\u7B5B\u9009\u952E", "\u957F\u65B9\u4F53\u5C3A\u5BF8\uFF08\u4E09\u8F74\uFF09"], "genus": ["genus", "\u7B5B\u9009\u952E", "\u7C7B\u522B\uFF1A\u65CF\u540D\u3001\u5143\u7D20\u7801\u3001\u751F\u7269\u7C7B\uFF1B\u524D\u52A0 ne \u53D6\u53CD"], "nomen": ["nomen", "\u7B5B\u9009\u952E", "\u5177\u540D\u8005"], "sigil": ["sigil", "\u7B5B\u9009\u952E", "\u5E26\u67D0\u6807\u8BB0\uFF0F\u9635\u8425\u8005"], "ratio": ["ratio", "\u7B5B\u9009\u952E", "\u6309**\u91CF\u503C\u8303\u56F4**\u7B5B\uFF08\u5A01\u529B\u3001\u7CBE\u5EA6\u7B49\u7684\u91CF\u503C\uFF09"], "versus": ["versus", "\u7B5B\u9009\u952E", "\u6309\u671D\u5411\u7B5B\uFF08\u4FEF\u4EF0\uFF0F\u6C34\u5E73\uFF09"], "ordin": ["ordin", "\u7B5B\u9009\u952E", "\u6392\u5E8F\uFF1Aproxim \u8FD1\uFF0Fprocul \u8FDC\uFF0Ftemer \u968F\u673A"], "limit": ["limit", "\u7B5B\u9009\u952E", "\u53D6\u524D\u51E0\u4E2A"] }, "units": { "mu": ["MU", "\u80FD\u91CF\u5355\u4F4D", "\u9B54\u529B\uFF08\u80FD\u91CF\uFF09\uFF1B\u5199\u5B83\u5373\u4E3A\u9501\u5B58\uFF08\u89E6\u53D1\u5F0F\u672F\u5F0F\uFF09"], "eu": ["EU", "\u80FD\u91CF\u5355\u4F4D", "\u5143\u7D20\u541E\u5410\uFF08\u80FD\u91CF\uFF09\uFF1B\u5199\u5B83\u5373\u4E3A\u9501\u5B58\uFF08\u89E6\u53D1\u5F0F\u672F\u5F0F\uFF09"], "muw": ["MUW", "\u80FD\u91CF\u5355\u4F4D", "\u9B54\u529B\u529F\u7387\uFF1B\u529F\u7387\u53E3\u5F84\uFF0C\u4E0D\u5F97\u914D luss\uFF08\u6301\u7EED\u53D1\u52A8\uFF09"], "euw": ["EUW", "\u80FD\u91CF\u5355\u4F4D", "\u5143\u7D20\u541E\u5410\u529F\u7387\uFF1B\u529F\u7387\u53E3\u5F84\uFF0C\u4E0D\u5F97\u914D luss\uFF08\u6301\u7EED\u53D1\u52A8\uFF09"], "miteas": ["miteas", "\u957F\u5EA6", "\u7C73"], "passus": ["passus", "\u957F\u5EA6\uFF08\u65E7\u5236\uFF09", "\u6B65"], "digitus": ["digitus", "\u957F\u5EA6\uFF08\u65E7\u5236\uFF09", "\u6307\u5BBD"], "cubitus": ["cubitus", "\u957F\u5EA6\uFF08\u65E7\u5236\uFF09", "\u8098"], "kigrama": ["kigrama", "\u8D28\u91CF", "\u5343\u514B"], "sands": ["sands", "\u65F6\u95F4", "\u79D2"], "minas": ["minas", "\u65F6\u95F4", "\u5206"], "hora": ["hora", "\u65F6\u95F4", "\u65F6"], "dies": ["dies", "\u65F6\u95F4", "\u65E5"], "annus": ["annus", "\u65F6\u95F4", "\u5E74"] }, "ranks": { "4": "\u03B8 \xB7 \u5BA2\u89C2\u65F6\u95F4\uFF08\u7B2C\u56DB\u7EF4\u5EA6\uFF09", "5": "b \xB7 \u5BA2\u89C2\u5E73\u884C\u65F6\u95F4\uFF08\u7B2C\u4E94\u7EF4\u5EA6\uFF09", "6": "p_b \xB7 \u5B58\u5728\u6027\u6982\u7387\uFF08\u7B2C\u516D\u7EF4\u5EA6\uFF09", "7": "t_abs \xB7 \u7EDD\u5BF9\u5BA2\u89C2\u65F6\u95F4\uFF08\u7B2C\u4E03\u7EF4\u5EA6\uFF09", "8": "\u03BB \xB7 \u65F6\u95F4\u6D41\u901F\u7387\uFF08\u7B2C\u516B\u7EF4\u5EA6\uFF09", "9": "s \xB7 \u6240\u5728\u5B87\u5B99\u7A7A\u95F4\uFF08\u7B2C\u4E5D\u7EF4\u5EA6\uFF09", "1\u20133": "x, y, z \xB7 \u4E09\u7EF4\u7A7A\u95F4\u5143\u7EC4\uFF08\u7B2C\u4E09\u7EF4\u5EA6\uFF0C\u5360 3 \u79E9\uFF09" }, "roots": { "est": ["\u5B58\u5728\u3001\u662F", "\u52A8", "est"], "ent": ["\u5B58\u5728\u8005\u3001\u5B9E\u4F53", "\u52A8", "ent"], "hom": ["\u4EBA\u3001\u4E2A\u4F53", "\u52A8", "hom"], "ver": ["\u771F\u5B9E\u3001\u786E\u5B9E", "\u52A8", "ver"], "fal": ["\u865A\u5047\u3001\u9519\u8BEF", "\u52A8", "fal"], "un": ["\u5355\u4E00\u3001\u4E00", "\u52A8", "un"], "div": ["\u5206\u5F00\u3001\u533A\u5206", "\u52A8", "div"], "iun": ["\u8FDE\u63A5\u3001\u7ED3\u5408", "\u52A8", "iun"], "mut": ["\u6539\u53D8\u3001\u8F6C\u5316", "\u52A8", "mut"], "man": ["\u4FDD\u6301\u3001\u6301\u7EED", "\u52A8", "man"], "fin": ["\u754C\u9650\u3001\u8FB9\u754C", "\u52A8", "fin"], "nov": ["\u65B0\u3001\u5D2D\u65B0", "\u52A8", "nov"], "pris": ["\u65E7\u3001\u53E4\u8001", "\u52A8", "pris"], "hyl": ["\u7269\u8D28\u3001\u6750\u6599", "\u7269", "hyl"], "cosm": ["\u79E9\u5E8F\u3001\u5B87\u5B99", "\u7269", "cosm"], "cha": ["\u6DF7\u6C8C\u3001\u65E0\u5E8F", "\u7269", "cha"], "arc": ["\u8D77\u6E90\u3001\u672C\u539F", "\u7269", "arc"], "tel": ["\u76EE\u7684\u3001\u8D8B\u5411", "\u7269", "tel"], "dyn": ["\u529B\u3001\u80FD\u91CF", "\u7269", "dyn"], "oper": ["\u64CD\u4F5C", "\u7269", "oper"], "sper": ["\u79CD\u5B50\u3001\u6839\u672C", "\u7269", "sper"], "lab": ["\u8F9B\u52B3", "\u7269", "lab"], "fund": ["\u57FA\u7840\u3001\u5E95", "\u7269", "fund"], "ter": ["\u5927\u5730\u3001\u9646\u5730", "\u7269", "ter"], "val": ["\u8C37\u5730", "\u7269", "val"], "camp": ["\u5E73\u539F\u3001\u539F\u91CE", "\u7269", "camp"], "insul": ["\u5C9B", "\u7269", "insul"], "lit": ["\u5CB8\u3001\u8FB9", "\u7269", "lit"], "nem": ["\u6797\u3001\u6811\u4E1B", "\u7269", "nem"], "vast": ["\u8352\u829C\u3001\u7A7A\u65F7", "\u7269", "vast"], "glac": ["\u51B0", "\u7269", "glac"], "niv": ["\u96EA", "\u7269", "niv"], "nebul": ["\u96FE\u3001\u4E91", "\u7269", "nebul"], "heli": ["\u592A\u9633", "\u7269", "heli"], "lun": ["\u6708\u4EAE", "\u7269", "lun"], "stel": ["\u661F", "\u7269", "stel"], "cael": ["\u5929\u7A7A", "\u7269", "cael"], "abys": ["\u6DF1\u6E0A", "\u7269", "abys"], "fluv": ["\u6CB3\u6D41", "\u7269", "fluv"], "und": ["\u6CE2\u6D6A", "\u7269", "und"], "lim": ["\u6CE5\u3001\u6CBC\u6CFD", "\u7269", "lim"], "font": ["\u6CC9", "\u7269", "font"], "lac": ["\u6E56\u3001\u6C60", "\u7269", "lac"], "gur": ["\u6F29\u6DA1", "\u7269", "gur"], "sal": ["\u76D0", "\u7269", "sal"], "riv": ["\u6EAA\u6D41", "\u7269", "riv"], "ror": ["\u9732\u6C34\u3001\u6EF4", "\u7269", "ror"], "ign": ["\u706B\u3001\u71C3\u70E7", "\u7269", "ign"], "ard": ["\u70BD\u70ED\u3001\u707C\u70E7", "\u7269", "ard"], "lux": ["\u5149\u4EAE\u3001\u7167\u660E", "\u7269", "lux"], "umb": ["\u5F71\u3001\u9634\u5F71", "\u7269", "umb"], "fum": ["\u70DF", "\u7269", "fum"], "cin": ["\u7070\u70EC", "\u7269", "cin"], "lamp": ["\u706F\u3001\u660E\u706B", "\u7269", "lamp"], "cal": ["\u70ED\u3001\u6696", "\u7269", "cal"], "frig": ["\u51B7", "\u7269", "frig"], "gel": ["\u971C\u3001\u51BB\u7ED3", "\u7269", "gel"], "aur": ["\u7A7A\u6C14\u3001\u6C14\u606F", "\u7269", "aur"], "ton": ["\u96F7", "\u7269", "ton"], "fulg": ["\u95EA\u7535", "\u7269", "fulg"], "nim": ["\u96E8\u4E91", "\u7269", "nim"], "tempes": ["\u98CE\u66B4", "\u7269", "tempes"], "pluv": ["\u96E8", "\u7269", "pluv"], "hum": ["\u6E7F\u3001\u6F6E", "\u7269", "hum"], "sic": ["\u5E72\u71E5", "\u7269", "sic"], "turb": ["\u6405\u52A8\u3001\u6DA1\u65CB", "\u7269", "turb"], "ser": ["\u6674\u6717", "\u7269", "ser"], "brum": ["\u51AC", "\u7269", "brum"], "vern": ["\u6625", "\u7269", "vern"], "aest": ["\u590F", "\u7269", "aest"], "mes": ["\u6536\u83B7\u3001\u79CB", "\u7269", "mes"], "anth": ["\u82B1", "\u7269", "anth"], "rad": ["\u6839", "\u7269", "rad"], "fol": ["\u53F6", "\u7269", "fol"], "lign": ["\u6728\u3001\u6728\u6750", "\u7269", "lign"], "herb": ["\u8349", "\u7269", "herb"], "spin": ["\u8346\u68D8\u523A", "\u7269", "spin"], "fung": ["\u83CC", "\u7269", "fung"], "cres": ["\u751F\u957F", "\u52A8", "cres"], "al": ["\u517B\u80B2", "\u52A8", "al"], "suc": ["\u6C41\u6DB2", "\u7269", "suc"], "arbor": ["\u6811", "\u7269", "arbor"], "frut": ["\u704C\u6728", "\u7269", "frut"], "ram": ["\u679D", "\u7269", "ram"], "trunc": ["\u6811\u5E72", "\u7269", "trunc"], "cort": ["\u6811\u76AE", "\u7269", "cort"], "germ": ["\u80DA\u82BD", "\u7269", "germ"], "silv": ["\u68EE\u6797", "\u7269", "silv"], "prat": ["\u8349\u5730", "\u7269", "prat"], "rhod": ["\u73AB\u7470", "\u7269", "rhod"], "lili": ["\u767E\u5408", "\u7269", "lili"], "viol": ["\u7D2B\u7F57\u5170", "\u7269", "viol"], "narc": ["\u6C34\u4ED9", "\u7269", "narc"], "hyac": ["\u98CE\u4FE1\u5B50", "\u7269", "hyac"], "myrt": ["\u6843\u91D1\u5A18", "\u7269", "myrt"], "laur": ["\u6708\u6842", "\u7269", "laur"], "querc": ["\u6A61", "\u7269", "querc"], "pin": ["\u677E", "\u7269", "pin"], "abi": ["\u6749", "\u7269", "abi"], "betul": ["\u6866", "\u7269", "betul"], "salic": ["\u67F3", "\u7269", "salic"], "tili": ["\u6934", "\u7269", "tili"], "ulm": ["\u6986", "\u7269", "ulm"], "frax": ["\u68A3", "\u7269", "frax"], "acer": ["\u67AB", "\u7269", "acer"], "fag": ["\u5C71\u6BDB\u6989", "\u7269", "fag"], "ilic": ["\u51AC\u9752", "\u7269", "ilic"], "heder": ["\u5E38\u6625\u85E4", "\u7269", "heder"], "viti": ["\u8461\u8404\u85E4", "\u7269", "viti"], "musc": ["\u82D4", "\u7269", "musc"], "filic": ["\u8568", "\u7269", "filic"], "alg": ["\u85FB", "\u7269", "alg"], "bolet": ["\u83C7", "\u7269", "bolet"], "ther": ["\u91CE\u517D", "\u7269", "ther"], "fer": ["\u91CE\u517D", "\u7269", "fer"], "belu": ["\u5DE8\u517D", "\u7269", "belu"], "besti": ["\u7272\u755C", "\u7269", "besti"], "orni": ["\u9E1F\u3001\u79BD", "\u7269", "orni"], "pisc": ["\u9C7C", "\u7269", "pisc"], "verm": ["\u866B", "\u7269", "verm"], "inse": ["\u6606\u866B", "\u7269", "inse"], "serp": ["\u86C7", "\u7269", "serp"], "bufo": ["\u87FE\u870D", "\u7269", "bufo"], "verr": ["\u516C\u732A", "\u7269", "verr"], "hirc": ["\u516C\u7F8A", "\u7269", "hirc"], "lynx": ["\u731E\u7301", "\u7269", "lynx"], "myrm": ["\u8681", "\u7269", "myrm"], "ap": ["\u8702", "\u7269", "ap"], "papi": ["\u8776", "\u7269", "papi"], "cicad": ["\u8749", "\u7269", "cicad"], "locu": ["\u8757", "\u7269", "locu"], "aran": ["\u86DB", "\u7269", "aran"], "cochl": ["\u87BA", "\u7269", "cochl"], "polyp": ["\u7AE0\u9C7C", "\u7269", "polyp"], "cet": ["\u9CB8", "\u7269", "cet"], "mustel": ["\u9F2C", "\u7269", "mustel"], "lup": ["\u72FC", "\u7269", "lup"], "vulp": ["\u72D0", "\u7269", "vulp"], "urs": ["\u718A", "\u7269", "urs"], "cerv": ["\u9E7F", "\u7269", "cerv"], "lep": ["\u5154", "\u7269", "lep"], "mys": ["\u9F20", "\u7269", "mys"], "feli": ["\u732B", "\u7269", "feli"], "can": ["\u72AC", "\u7269", "can"], "equi": ["\u9A6C", "\u7269", "equi"], "tau": ["\u725B", "\u7269", "tau"], "corp": ["\u8EAB\u4F53", "\u7269", "corp"], "ceph": ["\u5934", "\u7269", "ceph"], "vult": ["\u9762\u5BB9", "\u7269", "vult"], "ocu": ["\u773C", "\u7269", "ocu"], "oto": ["\u8033", "\u7269", "oto"], "manu": ["\u624B", "\u7269", "manu"], "ped": ["\u8DB3", "\u7269", "ped"], "dent": ["\u9F7F", "\u7269", "dent"], "ling": ["\u820C", "\u7269", "ling"], "sanguin": ["\u8840", "\u7269", "sanguin"], "carn": ["\u8089", "\u7269", "carn"], "oss": ["\u9AA8", "\u7269", "oss"], "pell": ["\u76AE", "\u7269", "pell"], "nerv": ["\u795E\u7ECF\u3001\u7B4B", "\u7269", "nerv"], "visc": ["\u5185\u810F", "\u7269", "visc"], "spir": ["\u547C\u5438\u3001\u6C14\u606F", "\u7269", "spir"], "cord": ["\u5FC3", "\u7269", "cord"], "sta": ["\u7ACB\u3001\u7AD9", "\u52A8", "sta"], "desc": ["\u4E0B\u964D", "\u52A8", "desc"], "flect": ["\u5C48\u66F2", "\u52A8", "flect"], "torqu": ["\u626D\u8F6C", "\u52A8", "torqu"], "pand": ["\u5C55\u5F00", "\u52A8", "pand"], "string": ["\u52D2\u7D27", "\u52A8", "string"], "puls": ["\u63A8\u649E", "\u52A8", "puls"], "trud": ["\u63A8\u6324", "\u52A8", "trud"], "trah": ["\u62C9\u3001\u62D6", "\u52A8", "trah"], "scand": ["\u6500\u722C", "\u52A8", "scand"], "laps": ["\u6ED1\u843D", "\u52A8", "laps"], "still": ["\u6EF4\u843D", "\u52A8", "still"], "anhel": ["\u5598\u606F", "\u52A8", "anhel"], "oscit": ["\u5475\u6B20", "\u52A8", "oscit"], "sug": ["\u542E\u5438", "\u52A8", "sug"], "glut": ["\u541E\u54BD", "\u52A8", "glut"], "vom": ["\u5455\u5410", "\u52A8", "vom"], "ming": ["\u6392\u5C3F", "\u52A8", "ming"], "sternu": ["\u55B7\u568F", "\u52A8", "sternu"], "plaud": ["\u62CD\u624B", "\u52A8", "plaud"], "quat": ["\u6447\u52A8", "\u52A8", "quat"], "palp": ["\u8F7B\u629A", "\u52A8", "palp"], "pung": ["\u523A\u624E", "\u52A8", "pung"], "ungu": ["\u722A", "\u52A8", "ungu"], "nict": ["\u7728\u773C", "\u52A8", "nict"], "sput": ["\u5410\u553E", "\u52A8", "sput"], "frend": ["\u5207\u9F7F", "\u52A8", "frend"], "hiat": ["\u5F20\u53E3", "\u52A8", "hiat"], "trem": ["\u98A4\u6296", "\u52A8", "trem"], "nix": ["\u501A\u9760", "\u52A8", "nix"], "sid": ["\u6C89\u964D", "\u52A8", "sid"], "vag": ["\u6E38\u8361", "\u52A8", "vag"], "nas": ["\u51FA\u751F", "\u52A8", "nas"], "sen": ["\u8870\u8001", "\u52A8", "sen"], "rob": ["\u5F3A\u58EE", "\u52A8", "rob"], "nutr": ["\u6ECB\u517B", "\u52A8", "nutr"], "somn": ["\u7761\u7720\u3001\u68A6", "\u52A8", "somn"], "dol": ["\u75BC\u75DB", "\u52A8", "dol"], "vuln": ["\u4F24\u3001\u521B", "\u52A8", "vuln"], "vig": ["\u8B66\u9192\u3001\u6D3B\u529B", "\u52A8", "vig"], "quiet": ["\u5B89\u5B81\u3001\u9759\u6B62", "\u52A8", "quiet"], "matur": ["\u6210\u719F", "\u52A8", "matur"], "med": ["\u533B", "\u52A8", "med"], "pharm": ["\u836F", "\u52A8", "pharm"], "remed": ["\u7597\u6CD5", "\u52A8", "remed"], "cura": ["\u7167\u62A4", "\u52A8", "cura"], "aegr": ["\u75C5", "\u52A8", "aegr"], "morb": ["\u75BE\u75C5", "\u52A8", "morb"], "febr": ["\u53D1\u70ED", "\u52A8", "febr"], "tuss": ["\u54B3", "\u52A8", "tuss"], "pest": ["\u761F\u75AB", "\u52A8", "pest"], "venen": ["\u6BD2", "\u52A8", "venen"], "anti": ["\u89E3\u836F", "\u52A8", "anti"], "chir": ["\u5916\u79D1", "\u52A8", "chir"], "phleg": ["\u75F0\u3001\u4F53\u6DB2", "\u52A8", "phleg"], "bil": ["\u80C6", "\u52A8", "bil"], "ulc": ["\u6E83\u75A1", "\u52A8", "ulc"], "tum": ["\u80BF", "\u52A8", "tum"], "frac": ["\u6298\u3001\u788E", "\u52A8", "frac"], "cica": ["\u75A4", "\u52A8", "cica"], "purg": ["\u6E05\u6CFB", "\u52A8", "purg"], "lav": ["\u6D17", "\u52A8", "lav"], "cont": ["\u4F20\u67D3", "\u52A8", "cont"], "vale": ["\u5065\u5EB7", "\u52A8", "vale"], "obst": ["\u52A9\u4EA7", "\u52A8", "obst"], "emplast": ["\u818F\u836F", "\u52A8", "emplast"], "theriac": ["\u4E07\u7075\u836F", "\u52A8", "theriac"], "sanit": ["\u536B\u751F", "\u52A8", "sanit"], "coqu": ["\u70F9\u3001\u716E", "\u7269", "coqu"], "ass": ["\u70E4\u3001\u7099", "\u7269", "ass"], "frix": ["\u714E\u3001\u70B8", "\u7269", "frix"], "ferv": ["\u716E\u6CB8", "\u7269", "ferv"], "ferm": ["\u53D1\u9175", "\u7269", "ferm"], "cond": ["\u8C03\u5473", "\u7269", "cond"], "dulc": ["\u751C", "\u7269", "dulc"], "acid": ["\u9178", "\u7269", "acid"], "amar": ["\u82E6", "\u7269", "amar"], "sals": ["\u54B8", "\u7269", "sals"], "acr": ["\u8F9B\u8FA3", "\u7269", "acr"], "arom": ["\u9999\u6C14", "\u7269", "arom"], "putr": ["\u8150\u574F", "\u7269", "putr"], "gran": ["\u8C37\u7C92", "\u7269", "gran"], "tritic": ["\u9EA6", "\u7269", "tritic"], "oryz": ["\u7A3B\u3001\u7C73", "\u7269", "oryz"], "pan": ["\u9762\u5305", "\u7269", "pan"], "ov": ["\u86CB", "\u7269", "ov"], "lact": ["\u5976", "\u7269", "lact"], "ole": ["\u6CB9", "\u7269", "ole"], "sucr": ["\u7CD6", "\u7269", "sucr"], "mel": ["\u871C", "\u7269", "mel"], "fruct": ["\u679C", "\u7269", "fruct"], "oler": ["\u852C\u83DC", "\u7269", "oler"], "jus": ["\u6C64\u6C41", "\u7269", "jus"], "oen": ["\u9152", "\u7269", "oen"], "thea": ["\u8336", "\u7269", "thea"], "far": ["\u9762\u7C89\u3001\u7CCA", "\u7269", "far"], "coen": ["\u9910\u3001\u5BB4", "\u7269", "coen"], "culin": ["\u53A8\u827A", "\u7269", "culin"], "fam": ["\u9965\u997F", "\u7269", "fam"], "sat": ["\u9971\u8DB3", "\u7269", "sat"], "siti": ["\u6E34", "\u7269", "siti"], "vor": ["\u541E\u98DF", "\u7269", "vor"], "mand": ["\u5480\u56BC", "\u7269", "mand"], "mord": ["\u54AC", "\u7269", "mord"], "lict": ["\u8214", "\u7269", "lict"], "vest": ["\u8863\u3001\u7740\u88C5", "\u7269", "vest"], "tunic": ["\u675F\u8170\u8863", "\u7269", "tunic"], "toga": ["\u957F\u888D", "\u7269", "toga"], "pall": ["\u62AB\u98CE", "\u7269", "pall"], "calce": ["\u978B", "\u7269", "calce"], "petas": ["\u5E3D", "\u7269", "petas"], "cinct": ["\u8170\u5E26", "\u7269", "cinct"], "fib": ["\u6263\u3001\u522B\u9488", "\u7269", "fib"], "acu": ["\u9488", "\u7269", "acu"], "stam": ["\u7EBF", "\u7269", "stam"], "pann": ["\u5E03", "\u7269", "pann"], "seric": ["\u4E1D", "\u7269", "seric"], "lan": ["\u7F8A\u6BDB", "\u7269", "lan"], "sut": ["\u7F1D", "\u7269", "sut"], "nect": ["\u7F16\u7EC7", "\u7269", "nect"], "solea": ["\u978B\u5E95", "\u7269", "solea"], "monil": ["\u9879\u94FE", "\u7269", "monil"], "anul": ["\u6212\u6307", "\u7269", "anul"], "coron": ["\u51A0\u5195", "\u7269", "coron"], "ung": ["\u6D82\u6CB9\u3001\u818F", "\u7269", "ung"], "fuc": ["\u5986\u9970", "\u7269", "fuc"], "specul": ["\u955C", "\u7269", "specul"], "redim": ["\u5934\u5DFE", "\u7269", "redim"], "armill": ["\u81C2\u73AF", "\u7269", "armill"], "inaur": ["\u8033\u9970", "\u7269", "inaur"], "cas": ["\u5C4B\u820D", "\u7269", "cas"], "tect": ["\u5C4B\u9876", "\u7269", "tect"], "pariet": ["\u5899", "\u7269", "pariet"], "mur": ["\u5899\u57A3", "\u7269", "mur"], "fen": ["\u7A97", "\u7269", "fen"], "limen": ["\u95E8\u69DB", "\u7269", "limen"], "pav": ["\u94FA\u5730", "\u7269", "pav"], "later": ["\u7816", "\u7269", "later"], "caem": ["\u77F3\u6599", "\u7269", "caem"], "sax": ["\u5CA9\u77F3", "\u7269", "sax"], "petr": ["\u5CA9\u5757", "\u7269", "petr"], "marm": ["\u5927\u7406\u77F3", "\u7269", "marm"], "teg": ["\u74E6", "\u7269", "teg"], "aed": ["\u5EFA\u7B51", "\u7269", "aed"], "turr": ["\u5854", "\u7269", "turr"], "arx": ["\u5821\u5792", "\u7269", "arx"], "castr": ["\u8425\u5792", "\u7269", "castr"], "moen": ["\u57CE\u5899", "\u7269", "moen"], "atr": ["\u4E2D\u5EAD", "\u7269", "atr"], "cell": ["\u623F\u95F4\u3001\u5BA4", "\u7269", "cell"], "cub": ["\u5367\u3001\u8EBA", "\u7269", "cub"], "sell": ["\u5EA7\u6905", "\u7269", "sell"], "tabl": ["\u684C\u3001\u677F", "\u7269", "tabl"], "sed": ["\u5750", "\u7269", "sed"], "foc": ["\u7089\u7076\u3001\u4E2D\u5FC3", "\u7269", "foc"], "baln": ["\u6D74", "\u7269", "baln"], "sera": ["\u95E8\u95E9", "\u7269", "sera"], "cand": ["\u70DB\u3001\u767D\u70BD", "\u7269", "cand"], "scal": ["\u68AF", "\u7269", "scal"], "portic": ["\u67F1\u5ECA", "\u7269", "portic"], "fornic": ["\u62F1", "\u7269", "fornic"], "ferr": ["\u94C1", "\u7269", "ferr"], "cupr": ["\u94DC", "\u7269", "cupr"], "argent": ["\u94F6", "\u7269", "argent"], "chrys": ["\u91D1", "\u7269", "chrys"], "plumb": ["\u94C5", "\u7269", "plumb"], "stann": ["\u9521", "\u7269", "stann"], "vitr": ["\u73BB\u7483", "\u7269", "vitr"], "malle": ["\u9524", "\u7269", "malle"], "secur": ["\u65A7", "\u7269", "secur"], "cultr": ["\u5200", "\u7269", "cultr"], "glad": ["\u5251", "\u7269", "glad"], "scut": ["\u76FE", "\u7269", "scut"], "tox": ["\u5F13", "\u7269", "tox"], "sag": ["\u7BAD", "\u7269", "sag"], "iac": ["\u6295\u77DB\u5668", "\u7269", "iac"], "ret": ["\u7F51", "\u7269", "ret"], "laqu": ["\u5957\u7D22", "\u7269", "laqu"], "ham": ["\u94A9", "\u7269", "ham"], "serr": ["\u952F", "\u7269", "serr"], "tereb": ["\u94BB", "\u7269", "tereb"], "vect": ["\u6760\u6746", "\u7269", "vect"], "troch": ["\u6ED1\u8F6E", "\u7269", "troch"], "ax": ["\u8F74", "\u7269", "ax"], "cune": ["\u6954", "\u7269", "cune"], "vincl": ["\u675F\u7F1A", "\u7269", "vincl"], "caten": ["\u94FE", "\u7269", "caten"], "fun": ["\u7EF3", "\u7269", "fun"], "cribr": ["\u7B5B", "\u7269", "cribr"], "pistill": ["\u6775", "\u7269", "pistill"], "forn": ["\u7089", "\u7269", "forn"], "vas": ["\u5BB9\u5668", "\u7269", "vas"], "amph": ["\u74EE\u3001\u7F50", "\u7269", "amph"], "cophin": ["\u63D0\u7BEE", "\u7269", "cophin"], "sacc": ["\u888B", "\u7269", "sacc"], "lapid": ["\u77F3\u6599", "\u7269", "lapid"], "aren": ["\u6C99", "\u7269", "aren"], "cret": ["\u767D\u57A9", "\u7269", "cret"], "gyps": ["\u77F3\u818F", "\u7269", "gyps"], "calc": ["\u77F3\u7070", "\u7269", "calc"], "bitu": ["\u6CA5\u9752", "\u7269", "bitu"], "resi": ["\u6811\u8102", "\u7269", "resi"], "seb": ["\u8102", "\u7269", "seb"], "adip": ["\u8102\u80AA", "\u7269", "adip"], "cori": ["\u76AE\u9769", "\u7269", "cori"], "byss": ["\u68C9", "\u7269", "byss"], "cann": ["\u9EBB", "\u7269", "cann"], "papyr": ["\u7EB8\u8349", "\u7269", "papyr"], "membr": ["\u819C", "\u7269", "membr"], "plum": ["\u7FBD\u6BDB", "\u7269", "plum"], "testa": ["\u58F3", "\u7269", "testa"], "corn": ["\u517D\u89D2", "\u7269", "corn"], "ebur": ["\u8C61\u7259", "\u7269", "ebur"], "margar": ["\u73CD\u73E0", "\u7269", "margar"], "gemm": ["\u5B9D\u77F3", "\u7269", "gemm"], "cryst": ["\u6C34\u6676", "\u7269", "cryst"], "adam": ["\u91D1\u521A", "\u7269", "adam"], "silic": ["\u7845\u77F3", "\u7269", "silic"], "argill": ["\u9676\u571F", "\u7269", "argill"], "lut": ["\u6CE5\u6D46", "\u7269", "lut"], "glutin": ["\u80F6", "\u7269", "glutin"], "agr": ["\u7530\u5730", "\u7269", "agr"], "arv": ["\u8015\u5730", "\u7269", "arv"], "sulc": ["\u7281\u6C9F", "\u7269", "sulc"], "arat": ["\u7281", "\u7269", "arat"], "seget": ["\u4F5C\u7269", "\u7269", "seget"], "frum": ["\u8C37\u7269", "\u7269", "frum"], "vine": ["\u8461\u8404\u56ED", "\u7269", "vine"], "oliv": ["\u6A44\u6984", "\u7269", "oliv"], "pom": ["\u679C\u6811", "\u7269", "pom"], "pasc": ["\u653E\u7267", "\u52A8", "pasc"], "greg": ["\u755C\u7FA4", "\u7269", "greg"], "armen": ["\u725B\u7FA4", "\u7269", "armen"], "ovil": ["\u7F8A\u5708", "\u7269", "ovil"], "capr": ["\u5C71\u7F8A", "\u7269", "capr"], "porc": ["\u732A", "\u7269", "porc"], "gall": ["\u9E21", "\u7269", "gall"], "anat": ["\u9E2D", "\u7269", "anat"], "anser": ["\u9E45", "\u7269", "anser"], "colum": ["\u9E3D", "\u7269", "colum"], "ar": ["\u8015", "\u52A8", "ar"], "ster": ["\u7CAA\u80A5", "\u7269", "ster"], "riga": ["\u704C\u6E89", "\u52A8", "riga"], "foss": ["\u6C9F\u6E20", "\u7269", "foss"], "sep": ["\u7BF1\u3001\u56F4", "\u7269", "sep"], "saept": ["\u56F4\u680F", "\u7269", "saept"], "horre": ["\u8C37\u4ED3", "\u7269", "horre"], "vill": ["\u5E84\u56ED", "\u7269", "vill"], "colon": ["\u519C\u4EBA\u3001\u57A6\u6B96", "\u7269", "colon"], "rust": ["\u4E61\u91CE", "\u7269", "rust"], "carin": ["\u9F99\u9AA8\u3001\u8239", "\u7269", "carin"], "rem": ["\u6868", "\u7269", "rem"], "sip": ["\u5E06", "\u7269", "sip"], "guber": ["\u8235", "\u7269", "guber"], "ancor": ["\u951A", "\u7269", "ancor"], "itin": ["\u65C5\u7A0B", "\u7269", "itin"], "curr": ["\u8F66\u3001\u5954\u9A70", "\u7269", "curr"], "raed": ["\u9A6C\u8F66", "\u7269", "raed"], "carr": ["\u8D27\u8F66", "\u7269", "carr"], "big": ["\u53CC\u9A7E", "\u7269", "big"], "hipp": ["\u9A6C", "\u7269", "hipp"], "asin": ["\u9A74", "\u7269", "asin"], "pass": ["\u6B65\u3001\u901A\u884C", "\u7269", "pass"], "ambul": ["\u884C\u8D70", "\u7269", "ambul"], "celer": ["\u8FC5\u6377", "\u7269", "celer"], "tran": ["\u7A7F\u8FC7", "\u7269", "tran"], "fret": ["\u6D77\u5CE1", "\u7269", "fret"], "pont": ["\u6865", "\u7269", "pont"], "nav": ["\u821F\u3001\u822A\u884C", "\u7269", "nav"], "ratis": ["\u7B4F", "\u7269", "ratis"], "phasel": ["\u5C0F\u821F", "\u7269", "phasel"], "lintr": ["\u5C0F\u8247", "\u7269", "lintr"], "statio": ["\u9A7F\u7AD9", "\u7269", "statio"], "viat": ["\u65C5\u4EBA", "\u7269", "viat"], "aud": ["\u542C", "\u52A8", "aud"], "tact": ["\u89E6\u3001\u6478", "\u52A8", "tact"], "olf": ["\u55C5", "\u52A8", "olf"], "gust": ["\u5C1D\u3001\u5473\u89C9", "\u52A8", "gust"], "cog": ["\u601D\u3001\u601D\u8003", "\u52A8", "cog"], "rat": ["\u63A8\u7406", "\u52A8", "rat"], "noe": ["\u5FC3\u667A\u3001\u7406\u6027", "\u52A8", "noe"], "cred": ["\u76F8\u4FE1", "\u52A8", "cred"], "dub": ["\u6000\u7591", "\u52A8", "dub"], "opin": ["\u770B\u6CD5\u3001\u610F\u89C1", "\u52A8", "opin"], "not": ["\u6807\u8BB0\u3001\u6CE8\u610F", "\u52A8", "not"], "sig": ["\u7B26\u53F7\u3001\u8BB0\u53F7", "\u52A8", "sig"], "int": ["\u7406\u89E3", "\u52A8", "int"], "imag": ["\u60F3\u8C61", "\u52A8", "imag"], "mir": ["\u60CA\u5947", "\u52A8", "mir"], "err": ["\u9519\u8BEF\u3001\u8FF7\u8BEF", "\u52A8", "err"], "verb": ["\u8BCD\u3001\u8A00\u8F9E", "\u52A8", "verb"], "nom": ["\u540D\u3001\u540D\u79F0", "\u52A8", "nom"], "scrib": ["\u4E66\u5199", "\u52A8", "scrib"], "leg": ["\u8BFB\u3001\u6536\u96C6", "\u52A8", "leg"], "dix": ["\u8BF4\u3001\u547D\u4EE4", "\u52A8", "dix"], "clam": ["\u547C\u558A", "\u52A8", "clam"], "silen": ["\u6C89\u9ED8", "\u52A8", "silen"], "rog": ["\u8BE2\u95EE", "\u52A8", "rog"], "nunt": ["\u6D88\u606F\u3001\u901A\u62A5", "\u52A8", "nunt"], "test": ["\u8BC1\u660E\u3001\u89C1\u8BC1", "\u52A8", "test"], "fid": ["\u4FE1\u4EFB\u3001\u4FE1\u4E49", "\u52A8", "fid"], "text": ["\u6587\u672C\u3001\u7EC7\u4F53", "\u52A8", "text"], "scho": ["\u5B66\u6821", "\u7269", "scho"], "disc": ["\u5B66\u751F", "\u7269", "disc"], "doc": ["\u6559", "\u7269", "doc"], "doct": ["\u5B66\u95EE\u3001\u6559\u4E49", "\u7269", "doct"], "stud": ["\u52E4\u5B66", "\u7269", "stud"], "lect": ["\u8BF5\u8BFB", "\u7269", "lect"], "bibl": ["\u4E66", "\u7269", "bibl"], "chart": ["\u7EB8\u3001\u5951", "\u7269", "chart"], "pagin": ["\u9875", "\u7269", "pagin"], "dial": ["\u65B9\u8A00", "\u7269", "dial"], "rhet": ["\u4FEE\u8F9E", "\u7269", "rhet"], "log": ["\u903B\u8F91\u3001\u7406", "\u7269", "log"], "math": ["\u5B66\u3001\u6570\u5B66", "\u7269", "math"], "geom": ["\u51E0\u4F55", "\u7269", "geom"], "arith": ["\u7B97\u672F", "\u7269", "arith"], "harm": ["\u548C\u8C10\u3001\u4E50", "\u7269", "harm"], "chem": ["\u70BC\u5316", "\u7269", "chem"], "astr": ["\u661F\u8FB0\u3001\u5929\u5B66", "\u7269", "astr"], "soph": ["\u667A\u6167", "\u7269", "soph"], "eru": ["\u535A\u5B66", "\u7269", "eru"], "exam": ["\u8003\u67E5", "\u7269", "exam"], "stil": ["\u7B14", "\u7269", "stil"], "atram": ["\u58A8", "\u7269", "atram"], "cera": ["\u8721", "\u7269", "cera"], "pupill": ["\u5B66\u7AE5", "\u7269", "pupill"], "didas": ["\u8BB2\u6388", "\u7269", "didas"], "thes": ["\u8BBA\u9898", "\u7269", "thes"], "quaes": ["\u95EE\u9898", "\u7269", "quaes"], "solut": ["\u89E3\u7B54", "\u7269", "solut"], "probl": ["\u96BE\u9898", "\u7269", "probl"], "du": ["\u4E8C", "\u6570", "du"], "tri": ["\u4E09", "\u6570", "tri"], "quadr": ["\u56DB", "\u6570", "quadr"], "quinq": ["\u4E94", "\u6570", "quinq"], "sex": ["\u516D", "\u6570", "sex"], "sept": ["\u4E03", "\u6570", "sept"], "oct": ["\u516B", "\u6570", "oct"], "enne": ["\u4E5D", "\u6570", "enne"], "dec": ["\u5341", "\u6570", "dec"], "hecat": ["\u767E", "\u6570", "hecat"], "mill": ["\u5343", "\u6570", "mill"], "myri": ["\u4E07", "\u6570", "myri"], "summ": ["\u548C\u3001\u603B", "\u6570", "summ"], "integ": ["\u5B8C\u6574\u3001\u6574", "\u6570", "integ"], "angul": ["\u89D2\u5F62", "\u6570", "angul"], "spha": ["\u7403\u4F53", "\u6570", "spha"], "punct": ["\u70B9", "\u6570", "punct"], "solid": ["\u7ACB\u4F53", "\u6570", "solid"], "nih": ["\u65E0\u3001\u96F6", "\u6570", "nih"], "poten": ["\u5E42\u3001\u80FD", "\u6570", "poten"], "ordin": ["\u6B21\u5E8F", "\u6570", "ordin"], "class": ["\u7C7B\u522B", "\u6570", "class"], "seri": ["\u5E8F\u5217", "\u6570", "seri"], "crit": ["\u6807\u51C6", "\u6570", "crit"], "meta": ["\u754C\u6807", "\u6570", "meta"], "indic": ["\u6307\u6807", "\u6570", "indic"], "neg": ["\u5426\u3001\u8D1F", "\u6570", "neg"], "posit": ["\u6B63\u3001\u7F6E", "\u6570", "posit"], "figur": ["\u5F62\u72B6", "\u6570", "figur"], "litr": ["\u5347", "\u7269", "litr"], "pond": ["\u91CD\u91CF", "\u7269", "pond"], "stadi": ["\u8DDD\u79BB\u5355\u4F4D", "\u7269", "stadi"], "milli": ["\u5343\u6B65", "\u7269", "milli"], "iuge": ["\u571F\u5730\u5355\u4F4D", "\u7269", "iuge"], "modi": ["\u5BB9\u91CF\u5355\u4F4D", "\u7269", "modi"], "libr": ["\u91CD\u5355\u4F4D", "\u7269", "libr"], "unci": ["\u5C0F\u5355\u4F4D", "\u7269", "unci"], "digit": ["\u6307\u5BBD", "\u7269", "digit"], "palm": ["\u638C\u5BBD", "\u7269", "palm"], "cubit": ["\u8098\u5C3A", "\u7269", "cubit"], "veloc": ["\u901F\u5EA6", "\u7269", "veloc"], "therm": ["\u70ED\u6E29", "\u7269", "therm"], "bar": ["\u538B\u5F3A", "\u7269", "bar"], "portio": ["\u4EFD\u989D", "\u7269", "portio"], "spiss": ["\u6D53\u7A20", "\u7269", "spiss"], "tenu": ["\u7A00\u8584", "\u7269", "tenu"], "purit": ["\u7EAF\u5EA6", "\u7269", "purit"], "modul": ["\u6A21\u6570", "\u7269", "modul"], "dim": ["\u7EF4\u5EA6", "\u7269", "dim"], "spat": ["\u7A7A\u95F4\u91CF", "\u7269", "spat"], "capac": ["\u5BB9\u91CF", "\u7269", "capac"], "volum": ["\u4F53\u79EF", "\u7269", "volum"], "area": ["\u9762\u79EF", "\u7269", "area"], "num": ["\u6570", "\u6027", "num"], "met": ["\u6D4B\u91CF", "\u6027", "met"], "par": ["\u6210\u5BF9\u3001\u540C\u7B49", "\u6027", "par"], "plus": ["\u52A0\u3001\u591A", "\u6027", "plus"], "minu": ["\u51CF\u3001\u5C11", "\u6027", "minu"], "magn": ["\u5927", "\u6027", "magn"], "parv": ["\u5C0F", "\u6027", "parv"], "tant": ["\u5982\u6B64\u591A", "\u6027", "tant"], "plat": ["\u5BBD\u3001\u5E73", "\u6027", "plat"], "bath": ["\u6DF1", "\u6027", "bath"], "alt": ["\u9AD8", "\u6027", "alt"], "brev": ["\u77ED", "\u6027", "brev"], "grav": ["\u91CD", "\u6027", "grav"], "lev": ["\u8F7B", "\u6027", "lev"], "dens": ["\u5BC6", "\u6027", "dens"], "rar": ["\u7A00", "\u6027", "rar"], "equ": ["\u76F8\u7B49\u3001\u5747\u8861", "\u6027", "equ"], "rela": ["\u5173\u7CFB", "\u6027", "rela"], "iden": ["\u540C\u4E00", "\u6027", "iden"], "oppo": ["\u5BF9\u7ACB", "\u6027", "oppo"], "contr": ["\u76F8\u53CD", "\u6027", "contr"], "maio": ["\u8F83\u5927", "\u6027", "maio"], "analo": ["\u6BD4\u4F8B\u3001\u7C7B\u6BD4", "\u6027", "analo"], "symb": ["\u8C61\u5F81", "\u6027", "symb"], "typ": ["\u7C7B\u578B", "\u6027", "typ"], "exem": ["\u4F8B\u5B50", "\u6027", "exem"], "parti": ["\u5212\u5206", "\u6027", "parti"], "multi": ["\u591A\u500D", "\u6027", "multi"], "recip": ["\u76F8\u4E92", "\u6027", "recip"], "mutu": ["\u4EA4\u4E92", "\u6027", "mutu"], "conseq": ["\u63A8\u8BBA", "\u6027", "conseq"], "antece": ["\u524D\u4EF6", "\u6027", "antece"], "conclu": ["\u7ED3\u8BBA", "\u6027", "conclu"], "hypoth": ["\u5047\u8BBE", "\u6027", "hypoth"], "theor": ["\u7406\u8BBA", "\u6027", "theor"], "meth": ["\u65B9\u6CD5", "\u6027", "meth"], "princ": ["\u539F\u7406", "\u6027", "princ"], "eleme": ["\u8981\u7D20", "\u6027", "eleme"], "categ": ["\u8303\u7574", "\u6027", "categ"], "essen": ["\u672C\u8D28", "\u6027", "essen"], "propr": ["\u56FA\u6709", "\u6027", "propr"], "accid": ["\u5076\u6027", "\u6027", "accid"], "grada": ["\u6E10\u53D8", "\u6027", "grada"], "syst": ["\u4F53\u7CFB", "\u6027", "syst"], "ait": ["\u539F\u56E0", "\u6027", "ait"], "dif": ["\u5DEE\u5F02", "\u6027", "dif"], "sim": ["\u76F8\u4F3C", "\u6027", "sim"], "qual": ["\u6027\u8D28\u3001\u8D28", "\u6027", "qual"], "quant": ["\u91CF\u3001\u591A\u5C11", "\u6027", "quant"], "sens": ["\u610F\u4E49\u3001\u611F\u89C9", "\u6027", "sens"], "spec": ["\u79CD\u3001\u7C7B", "\u6027", "spec"], "eff": ["\u7ED3\u679C", "\u6027", "eff"], "medi": ["\u4E2D\u95F4", "\u6027", "medi"], "extr": ["\u6781\u7AEF", "\u6027", "extr"], "stat": ["\u72B6\u6001", "\u52A8", "stat"], "conve": ["\u8F6C\u53D8", "\u52A8", "conve"], "stab": ["\u7A33\u5B9A", "\u52A8", "stab"], "fluc": ["\u6CE2\u52A8", "\u52A8", "fluc"], "vac": ["\u6447\u6446", "\u52A8", "vac"], "ruin": ["\u5D29\u6BC1", "\u52A8", "ruin"], "salus": ["\u5B89\u5168", "\u52A8", "salus"], "discr": ["\u5371\u5883", "\u52A8", "discr"], "primo": ["\u8D77\u521D", "\u52A8", "primo"], "inte": ["\u6BC1\u706D", "\u52A8", "inte"], "solit": ["\u5B64\u72EC", "\u52A8", "solit"], "plen": ["\u5145\u6EE1", "\u52A8", "plen"], "inan": ["\u7A7A\u865A", "\u52A8", "inan"], "perma": ["\u6301\u4E45", "\u52A8", "perma"], "tempo": ["\u6682\u65F6", "\u52A8", "tempo"], "perpet": ["\u6C38\u7EED", "\u52A8", "perpet"], "decad": ["\u8870\u8D25", "\u52A8", "decad"], "renov": ["\u66F4\u65B0", "\u52A8", "renov"], "restaur": ["\u6062\u590D", "\u52A8", "restaur"], "conserv": ["\u4FDD\u5B58", "\u52A8", "conserv"], "destru": ["\u7834\u574F", "\u52A8", "destru"], "corru": ["\u8150\u5316", "\u52A8", "corru"], "flux": ["\u6D41\u53D8", "\u52A8", "flux"], "equil": ["\u5E73\u8861", "\u52A8", "equil"], "tens": ["\u62C9\u7D27", "\u52A8", "tens"], "press": ["\u538B\u529B", "\u52A8", "press"], "motiv": ["\u52A8\u56E0", "\u52A8", "motiv"], "impul": ["\u51B2\u52A8", "\u52A8", "impul"], "tende": ["\u8D8B\u5411", "\u52A8", "tende"], "liqu": ["\u6DB2\u5316", "\u52A8", "liqu"], "fus": ["\u7194", "\u52A8", "fus"], "coag": ["\u51DD\u56FA", "\u52A8", "coag"], "disso": ["\u5206\u89E3", "\u52A8", "disso"], "combi": ["\u5316\u5408", "\u52A8", "combi"], "reac": ["\u53CD\u5E94", "\u52A8", "reac"], "catal": ["\u50AC\u5316", "\u52A8", "catal"], "alka": ["\u78B1", "\u52A8", "alka"], "oxyd": ["\u6C27\u5316", "\u52A8", "oxyd"], "disti": ["\u84B8\u998F", "\u52A8", "disti"], "subl": ["\u5347\u534E", "\u52A8", "subl"], "ust": ["\u7145\u70E7", "\u52A8", "ust"], "mixt": ["\u6DF7\u5408", "\u52A8", "mixt"], "filt": ["\u8FC7\u6EE4", "\u52A8", "filt"], "precip": ["\u6C89\u6DC0", "\u52A8", "precip"], "satu": ["\u9971\u548C", "\u52A8", "satu"], "dilu": ["\u7A00\u91CA", "\u52A8", "dilu"], "effe": ["\u8D77\u6CE1", "\u52A8", "effe"], "evap": ["\u84B8\u53D1", "\u52A8", "evap"], "corrod": ["\u8150\u8680", "\u52A8", "corrod"], "art": ["\u827A\u672F", "\u7269", "art"], "pict": ["\u7ED8\u753B", "\u7269", "pict"], "melo": ["\u65CB\u5F8B", "\u7269", "melo"], "cant": ["\u6B4C\u5531", "\u7269", "cant"], "chor": ["\u6B4C\u821E", "\u7269", "chor"], "lyr": ["\u7434", "\u7269", "lyr"], "tib": ["\u7B1B", "\u7269", "tib"], "tub": ["\u53F7\u89D2", "\u7269", "tub"], "tymp": ["\u9F13", "\u7269", "tymp"], "theat": ["\u5267\u573A", "\u7269", "theat"], "scae": ["\u821E\u53F0", "\u7269", "scae"], "lud": ["\u6E38\u620F\u3001\u620F", "\u7269", "lud"], "alea": ["\u8D4C\u535A", "\u7269", "alea"], "ioc": ["\u73A9\u7B11", "\u7269", "ioc"], "rid": ["\u7B11", "\u7269", "rid"], "plor": ["\u54ED", "\u7269", "plor"], "fest": ["\u8282\u5E86", "\u7269", "fest"], "pulch": ["\u7F8E", "\u7269", "pulch"], "venus": ["\u4F18\u96C5", "\u7269", "venus"], "musiv": ["\u9576\u5D4C", "\u7269", "musiv"], "pocul": ["\u676F", "\u7269", "pocul"], "convi": ["\u5BB4\u996E", "\u7269", "convi"], "spect": ["\u89C2\u770B\u3001\u6F14\u51FA", "\u7269", "spect"], "tripud": ["\u8E0F\u821E", "\u7269", "tripud"], "histri": ["\u6F14\u5458", "\u7269", "histri"], "od": ["\u6068", "\u52A8", "od"], "tim": ["\u6050\u60E7", "\u52A8", "tim"], "ira": ["\u6012", "\u52A8", "ira"], "gau": ["\u559C\u60A6", "\u52A8", "gau"], "tris": ["\u60B2\u4F24", "\u52A8", "tris"], "cup": ["\u6B32\u671B", "\u52A8", "cup"], "spes": ["\u5E0C\u671B", "\u52A8", "spes"], "pud": ["\u7F9E\u803B", "\u52A8", "pud"], "pax": ["\u548C\u5E73", "\u52A8", "pax"], "grat": ["\u611F\u6FC0", "\u52A8", "grat"], "aem": ["\u5AC9\u5992", "\u52A8", "aem"], "mulc": ["\u629A\u6170", "\u52A8", "mulc"], "volun": ["\u610F\u5FD7", "\u6027", "volun"], "inge": ["\u5929\u6027", "\u6027", "inge"], "indo": ["\u6027\u60C5", "\u6027", "indo"], "mos": ["\u4E60\u4FD7", "\u6027", "mos"], "auda": ["\u5927\u80C6", "\u6027", "auda"], "timid": ["\u602F\u61E6", "\u6027", "timid"], "clem": ["\u4EC1\u6148", "\u6027", "clem"], "seve": ["\u4E25\u5389", "\u6027", "seve"], "beni": ["\u548C\u5584", "\u6027", "beni"], "mali": ["\u6076\u6BD2", "\u6027", "mali"], "sinc": ["\u771F\u8BDA", "\u6027", "sinc"], "fall": ["\u6B3A\u8BC8", "\u6027", "fall"], "perf": ["\u80CC\u4FE1", "\u6027", "perf"], "const": ["\u575A\u5B9A", "\u6027", "const"], "pert": ["\u56FA\u6267", "\u6027", "pert"], "prud": ["\u8C28\u614E", "\u6027", "prud"], "teme": ["\u9C81\u83BD", "\u6027", "teme"], "mode": ["\u8C26\u900A", "\u6027", "mode"], "humil": ["\u8C26\u5351", "\u6027", "humil"], "arro": ["\u50B2\u6162", "\u6027", "arro"], "invi": ["\u5992\u5FCC", "\u6027", "invi"], "avar": ["\u8D2A\u5A6A", "\u6027", "avar"], "simp": ["\u5355\u7EAF", "\u6027", "simp"], "call": ["\u72E1\u9EE0", "\u6027", "call"], "stul": ["\u611A\u7B28", "\u6027", "stul"], "insa": ["\u75AF\u72C2", "\u6027", "insa"], "melan": ["\u5FE7\u90C1", "\u6027", "melan"], "soler": ["\u673A\u654F", "\u6027", "soler"], "saga": ["\u777F\u667A", "\u6027", "saga"], "irac": ["\u6613\u6012", "\u6027", "irac"], "plac": ["\u6E29\u548C", "\u6027", "plac"], "gen": ["\u65CF\u7FA4\u3001\u751F\u80B2", "\u7269", "gen"], "patr": ["\u7236", "\u7269", "patr"], "mater": ["\u6BCD", "\u7269", "mater"], "fil": ["\u5B50\u3001\u513F\u5973", "\u7269", "fil"], "sor": ["\u59D0\u59B9", "\u7269", "sor"], "frat": ["\u5144\u5F1F", "\u7269", "frat"], "soc": ["\u540C\u4F34\u3001\u793E\u7FA4", "\u7269", "soc"], "civ": ["\u516C\u6C11\u3001\u6C11", "\u7269", "civ"], "serv": ["\u670D\u4F8D\u3001\u4EC6", "\u7269", "serv"], "lib": ["\u81EA\u7531", "\u7269", "lib"], "lex": ["\u6210\u6587\u6CD5", "\u7269", "lex"], "iur": ["\u6743\u5229\u3001\u6CD5\u6743", "\u7269", "iur"], "vic": ["\u90BB\u3001\u4EA4\u66FF", "\u7269", "vic"], "host": ["\u654C\u4EBA\u3001\u5916\u4EBA", "\u7269", "host"], "nob": ["\u663E\u8D35", "\u7269", "nob"], "pleb": ["\u5E73\u6C11", "\u7269", "pleb"], "amic": ["\u53CB\u7231", "\u52A8", "amic"], "hospit": ["\u5BBE\u5BA2", "\u52A8", "hospit"], "nupt": ["\u5A5A", "\u52A8", "nupt"], "coni": ["\u914D\u5076", "\u52A8", "coni"], "avu": ["\u7956\u7236", "\u52A8", "avu"], "nepot": ["\u5B59\u8F88", "\u52A8", "nepot"], "cogn": ["\u4EB2\u65CF", "\u52A8", "cogn"], "gent": ["\u6C0F\u65CF", "\u52A8", "gent"], "inim": ["\u4EC7\u6028", "\u52A8", "inim"], "offe": ["\u5192\u72AF", "\u52A8", "offe"], "venia": ["\u5BBD\u6055", "\u52A8", "venia"], "bland": ["\u8C04\u5A9A", "\u52A8", "bland"], "adul": ["\u5949\u627F", "\u52A8", "adul"], "vitu": ["\u65A5\u9A82", "\u52A8", "vitu"], "bened": ["\u795D\u798F", "\u52A8", "bened"], "salut": ["\u95EE\u5019", "\u52A8", "salut"], "valed": ["\u544A\u522B", "\u52A8", "valed"], "oscul": ["\u543B", "\u52A8", "oscul"], "ampl": ["\u62E5\u62B1", "\u52A8", "ampl"], "patro": ["\u5E87\u62A4", "\u52A8", "patro"], "soda": ["\u540C\u4F34", "\u52A8", "soda"], "socie": ["\u793E\u56E2", "\u52A8", "socie"], "hila": ["\u6B22\u6B23", "\u52A8", "hila"], "iurg": ["\u4E89\u5435", "\u52A8", "iurg"], "rix": ["\u4E89\u6597", "\u52A8", "rix"], "gratu": ["\u795D\u8D3A", "\u52A8", "gratu"], "condo": ["\u81F4\u54C0", "\u52A8", "condo"], "pub": ["\u516C\u4F17", "\u7269", "pub"], "polis": ["\u57CE\u90A6", "\u7269", "polis"], "reg": ["\u738B\u3001\u7EDF\u6CBB", "\u7269", "reg"], "sena": ["\u5143\u8001\u9662", "\u7269", "sena"], "cons": ["\u6267\u653F\u5B98", "\u7269", "cons"], "dict": ["\u72EC\u88C1", "\u7269", "dict"], "jud": ["\u5BA1\u5224", "\u7269", "jud"], "caus": ["\u8BC9\u8BBC", "\u7269", "caus"], "poen": ["\u60E9\u7F5A", "\u7269", "poen"], "crim": ["\u7F6A", "\u7269", "crim"], "reus": ["\u88AB\u544A", "\u7269", "reus"], "vind": ["\u590D\u4EC7", "\u7269", "vind"], "pact": ["\u5951\u7EA6", "\u7269", "pact"], "foed": ["\u76DF\u7EA6", "\u7269", "foed"], "lega": ["\u4F7F\u8282", "\u7269", "lega"], "comit": ["\u96C6\u4F1A", "\u7269", "comit"], "suffr": ["\u6295\u7968", "\u7269", "suffr"], "cens": ["\u76D1\u5BDF", "\u7269", "cens"], "prov": ["\u884C\u7701", "\u7269", "prov"], "muni": ["\u81EA\u6CBB\u5E02", "\u7269", "muni"], "client": ["\u95E8\u5BA2", "\u7269", "client"], "popul": ["\u6C11\u4F17", "\u7269", "popul"], "decr": ["\u6CD5\u4EE4", "\u7269", "decr"], "edict": ["\u544A\u793A", "\u7269", "edict"], "civit": ["\u516C\u6C11\u6743", "\u7269", "civit"], "aedil": ["\u8425\u9020\u5B98", "\u7269", "aedil"], "praet": ["\u88C1\u5224\u5B98", "\u7269", "praet"], "bel": ["\u6218\u4E89", "\u52A8", "bel"], "arm": ["\u6B66\u5668\u3001\u88C5\u5907", "\u52A8", "arm"], "cid": ["\u6740\u3001\u65A9", "\u52A8", "cid"], "noc": ["\u4F24\u5BB3", "\u52A8", "noc"], "peric": ["\u5371\u9669", "\u52A8", "peric"], "def": ["\u9632\u5FA1", "\u52A8", "def"], "vin": ["\u80DC\u5229\u3001\u5F81\u670D", "\u52A8", "vin"], "obs": ["\u56F4\u56F0\u3001\u5C01\u9501", "\u52A8", "obs"], "imp": ["\u7EDF\u6CBB\u3001\u547D\u4EE4", "\u52A8", "imp"], "mina": ["\u5A01\u80C1", "\u52A8", "mina"], "fug": ["\u9003\u9041", "\u52A8", "fug"], "luct": ["\u640F\u6597", "\u52A8", "luct"], "mach": ["\u8C0B\u7565\u3001\u673A\u5DE7", "\u52A8", "mach"], "truc": ["\u51F6\u731B\u3001\u6B8B\u66B4", "\u52A8", "truc"], "mil": ["\u5175\u3001\u519B", "\u52A8", "mil"], "coh": ["\u5927\u961F", "\u52A8", "coh"], "dux": ["\u7EDF\u5E05", "\u52A8", "dux"], "vexill": ["\u519B\u65D7", "\u52A8", "vexill"], "hast": ["\u957F\u77DB", "\u52A8", "hast"], "pil": ["\u6295\u67AA", "\u52A8", "pil"], "ball": ["\u5F29\u70AE", "\u52A8", "ball"], "catap": ["\u6295\u77F3\u673A", "\u52A8", "catap"], "loric": ["\u7532\u80C4", "\u52A8", "loric"], "cass": ["\u5934\u76D4", "\u52A8", "cass"], "vall": ["\u58C1\u5792", "\u52A8", "vall"], "opp": ["\u653B\u57CE", "\u52A8", "opp"], "incu": ["\u7A81\u88AD", "\u52A8", "incu"], "praed": ["\u52AB\u63A0", "\u52A8", "praed"], "clad": ["\u60E8\u8D25", "\u52A8", "clad"], "trium": ["\u51EF\u65CB", "\u52A8", "trium"], "stip": ["\u519B\u9977", "\u52A8", "stip"], "deser": ["\u53DB\u9003", "\u52A8", "deser"], "prod": ["\u80CC\u53DB", "\u52A8", "prod"], "insid": ["\u57CB\u4F0F", "\u52A8", "insid"], "expl": ["\u4FA6\u5BDF", "\u52A8", "expl"], "praesid": ["\u9A7B\u519B", "\u52A8", "praesid"], "turma": ["\u9A91\u5175\u961F", "\u52A8", "turma"], "centuri": ["\u767E\u4EBA\u961F", "\u52A8", "centuri"], "pecu": ["\u94B1\u8D22", "\u52A8", "pecu"], "mer": ["\u5546\u54C1\u3001\u8D38\u6613", "\u52A8", "mer"], "pret": ["\u4EF7\u683C", "\u52A8", "pret"], "vend": ["\u51FA\u552E", "\u52A8", "vend"], "empt": ["\u8D2D\u4E70", "\u52A8", "empt"], "lucr": ["\u83B7\u5229", "\u52A8", "lucr"], "dam": ["\u635F\u5931", "\u52A8", "dam"], "debt": ["\u503A\u52A1", "\u52A8", "debt"], "fisc": ["\u8D22\u5E93\u3001\u516C\u5E93", "\u52A8", "fisc"], "trib": ["\u7A0E\u3001\u8D21", "\u52A8", "trib"], "divin": ["\u795E\u6027\u3001\u5360\u535C", "\u7269", "divin"], "templ": ["\u795E\u5E99", "\u7269", "templ"], "ara": ["\u796D\u575B", "\u7269", "ara"], "vict": ["\u796D\u54C1", "\u7269", "vict"], "hosti": ["\u796D\u7272", "\u7269", "hosti"], "piet": ["\u8654\u656C", "\u7269", "piet"], "cult": ["\u5D07\u62DC", "\u7269", "cult"], "prec": ["\u7948\u7977", "\u7269", "prec"], "vot": ["\u8A93\u613F", "\u7269", "vot"], "hymn": ["\u9882\u6B4C", "\u7269", "hymn"], "aug": ["\u5360\u5146", "\u7269", "aug"], "omen": ["\u5F81\u5146", "\u7269", "omen"], "fat": ["\u547D\u8FD0", "\u7269", "fat"], "sort": ["\u547D\u8FD0\u3001\u673A\u8FD0", "\u7269", "sort"], "anim": ["\u7075\u9B42\u3001\u5FC3", "\u7269", "anim"], "sanc": ["\u795E\u5723", "\u7269", "sanc"], "numi": ["\u795E\u610F", "\u7269", "numi"], "manes": ["\u4EA1\u7075", "\u7269", "manes"], "lemur": ["\u5E7D\u9B42", "\u7269", "lemur"], "necr": ["\u4EA1\u8005\u672F", "\u7269", "necr"], "orac": ["\u795E\u8C15", "\u7269", "orac"], "vat": ["\u5148\u77E5", "\u7269", "vat"], "proph": ["\u5148\u77E5\u9884\u8A00", "\u7269", "proph"], "superst": ["\u8FF7\u4FE1", "\u7269", "superst"], "pagan": ["\u5F02\u6559", "\u7269", "pagan"], "super": ["\u4E0A\u3001\u8D85\u8D8A", "\u7269", "super"], "inf": ["\u4E0B\u3001\u4E0B\u65B9", "\u7269", "inf"], "ant": ["\u524D\u3001\u5148\u524D", "\u7269", "ant"], "retr": ["\u540E\u3001\u5411\u540E", "\u7269", "retr"], "dext": ["\u53F3", "\u7269", "dext"], "sin": ["\u5DE6", "\u7269", "sin"], "circ": ["\u5468\u56F4\u3001\u73AF", "\u7269", "circ"], "cent": ["\u4E2D\u5FC3", "\u7269", "cent"], "lat": ["\u4FA7\u3001\u65C1", "\u7269", "lat"], "lon": ["\u8FDC\u3001\u957F", "\u7269", "lon"], "prop": ["\u8FD1\u3001\u90BB\u8FD1", "\u7269", "prop"], "ult": ["\u8D8A\u3001\u5F7C\u7AEF", "\u7269", "ult"], "vers": ["\u8F6C\u3001\u671D\u5411", "\u7269", "vers"], "grad": ["\u6B65\u3001\u7EA7", "\u7269", "grad"], "cron": ["\u65F6\u95F4\u3001\u65F6\u5E8F", "\u7269", "cron"], "ann": ["\u5E74", "\u7269", "ann"], "mens": ["\u6708", "\u7269", "mens"], "hor": ["\u65F6\u3001\u65F6\u8FB0", "\u7269", "hor"], "tard": ["\u8FDF\u3001\u7F13", "\u7269", "tard"], "cit": ["\u901F\u3001\u6025", "\u7269", "cit"], "aev": ["\u6C38\u4E16\u3001\u65F6\u4EE3", "\u7269", "aev"], "init": ["\u5F00\u59CB\u3001\u8D77\u521D", "\u7269", "init"], "mom": ["\u7247\u523B", "\u7269", "mom"], "diu": ["\u4E45\u3001\u957F\u4E45", "\u7269", "diu"], "rec": ["\u8FD1\u6765\u3001\u65B0\u9C9C", "\u7269", "rec"], "era": ["\u7EAA\u5143\u3001\u65F6\u671F", "\u7269", "era"], "pet": ["\u8D8B\u5411\u3001\u8FFD\u6C42", "\u52A8", "pet"], "salt": ["\u8DF3\u8DC3", "\u52A8", "salt"], "cad": ["\u5760\u843D", "\u52A8", "cad"], "asc": ["\u4E0A\u5347", "\u52A8", "asc"], "sequ": ["\u8DDF\u968F", "\u52A8", "sequ"], "mit": ["\u9001\u3001\u6D3E\u9063", "\u52A8", "mit"], "duc": ["\u5F15\u5BFC\u3001\u5E26\u9886", "\u52A8", "duc"], "veh": ["\u8FD0\u9001", "\u52A8", "veh"], "port": ["\u643A\u5E26", "\u52A8", "port"], "volat": ["\u98DE\u884C", "\u52A8", "volat"], "meat": ["\u7A7F\u884C\u3001\u7ECF\u8FC7", "\u52A8", "meat"], "red": ["\u8FD4\u56DE", "\u52A8", "red"], "ten": ["\u6301\u3001\u63E1", "\u52A8", "ten"], "rap": ["\u593A\u53D6\u3001\u6293", "\u52A8", "rap"], "toll": ["\u4E3E\u8D77", "\u52A8", "toll"], "prem": ["\u538B\u3001\u6309", "\u52A8", "prem"], "sec": ["\u5207\u3001\u5272", "\u52A8", "sec"], "trit": ["\u78E8\u3001\u78BE", "\u52A8", "trit"], "lig": ["\u7ED1\u3001\u7CFB", "\u52A8", "lig"], "solv": ["\u89E3\u3001\u677E\u5F00", "\u52A8", "solv"], "claud": ["\u5173\u95ED", "\u52A8", "claud"], "aper": ["\u6253\u5F00", "\u52A8", "aper"], "fric": ["\u6469\u64E6", "\u52A8", "fric"], "plic": ["\u6298\u53E0", "\u52A8", "plic"], "tend": ["\u4F38\u5C55", "\u52A8", "tend"], "fabr": ["\u5236\u4F5C", "\u52A8", "fabr"], "form": ["\u5851\u9020\u3001\u5F62", "\u52A8", "form"], "orn": ["\u88C5\u9970", "\u52A8", "orn"], "ping": ["\u7ED8\u3001\u753B", "\u52A8", "ping"], "sculp": ["\u96D5\u523B", "\u52A8", "sculp"], "mod": ["\u5EA6\u91CF\u3001\u6837\u5F0F", "\u52A8", "mod"], "norm": ["\u89C4\u8303\u3001\u77E9", "\u52A8", "norm"], "lin": ["\u7EBF\u3001\u7EF3", "\u52A8", "lin"], "rot": ["\u8F6E\u3001\u8F6C", "\u52A8", "rot"], "clav": ["\u9489\u3001\u952E", "\u52A8", "clav"], "ianu": ["\u95E8\u3001\u51FA\u5165\u53E3", "\u52A8", "ianu"], "col": ["\u989C\u8272", "\u6027", "col"], "alb": ["\u767D", "\u6027", "alb"], "nigr": ["\u9ED1", "\u6027", "nigr"], "rub": ["\u7EA2", "\u6027", "rub"], "vir": ["\u7EFF", "\u6027", "vir"], "caer": ["\u84DD", "\u6027", "caer"], "flav": ["\u9EC4", "\u6027", "flav"], "purp": ["\u7D2B", "\u6027", "purp"], "son": ["\u58F0\u97F3", "\u6027", "son"], "odor": ["\u6C14\u5473", "\u6027", "odor"], "sap": ["\u5473\u9053", "\u6027", "sap"], "glab": ["\u5149\u6ED1", "\u6027", "glab"], "asp": ["\u7C97\u7CD9", "\u6027", "asp"], "rig": ["\u50F5\u786C", "\u6027", "rig"], "moll": ["\u67D4\u8F6F", "\u6027", "moll"], "mag": ["\u9B54\u6CD5\u3001\u672F", "\u52A8", "mag"], "carm": ["\u5492\u8BCD", "\u52A8", "carm"], "sigil": ["\u5370\u8BB0\u3001\u7B26", "\u52A8", "sigil"], "ener": ["\u80FD\u91CF", "\u52A8", "ener"], "myst": ["\u5965\u79D8", "\u52A8", "myst"], "rit": ["\u4EEA\u5F0F", "\u52A8", "rit"], "sacr": ["\u795E\u5723", "\u52A8", "sacr"], "prof": ["\u51E1\u4FD7", "\u52A8", "prof"], "virt": ["\u6548\u529B\u3001\u5FB7\u80FD", "\u52A8", "virt"], "nex": ["\u8054\u7ED3\u3001\u7ED3", "\u52A8", "nex"], "obli": ["\u5FD8\u5374", "\u52A8", "obli"], "quaer": ["\u5BFB\u627E", "\u52A8", "quaer"], "perd": ["\u5931\u53BB\u3001\u4E22\u5931", "\u52A8", "perd"], "repar": ["\u4FEE\u8865", "\u52A8", "repar"], "resp": ["\u56DE\u7B54", "\u52A8", "resp"], "ora": ["\u8BF7\u6C42", "\u52A8", "ora"], "perm": ["\u8BB8\u53EF", "\u52A8", "perm"], "recus": ["\u62D2\u7EDD", "\u52A8", "recus"], "oppe": ["\u7B49\u5F85", "\u52A8", "oppe"], "tempt": ["\u5C1D\u8BD5", "\u52A8", "tempt"], "succ": ["\u6210\u529F", "\u52A8", "succ"], "defi": ["\u5931\u8D25", "\u52A8", "defi"], "ut": ["\u4F7F\u7528", "\u52A8", "ut"], "tute": ["\u4FDD\u62A4", "\u52A8", "tute"], "elig": ["\u9009\u62E9", "\u52A8", "elig"], "cern": ["\u51B3\u65AD", "\u52A8", "cern"], "fast": ["\u538C\u6076", "\u52A8", "fast"], "assu": ["\u4E60\u60EF", "\u52A8", "assu"], "coep": ["\u5F00\u59CB", "\u52A8", "coep"], "conti": ["\u7EE7\u7EED", "\u52A8", "conti"], "cess": ["\u505C\u6B62", "\u52A8", "cess"], "accip": ["\u63A5\u53D7", "\u52A8", "accip"], "redd": ["\u5F52\u8FD8", "\u52A8", "redd"], "caren": ["\u7F3A\u5C11", "\u52A8", "caren"], "plet": ["\u586B\u6EE1", "\u52A8", "plet"], "fier": ["\u6210\u4E3A", "\u52A8", "fier"], "perte": ["\u5C5E\u4E8E", "\u52A8", "perte"], "possi": ["\u62E5\u6709", "\u52A8", "possi"], "bon": ["\u597D", "\u6027", "bon"], "mal": ["\u574F\u3001\u6076", "\u6027", "mal"], "turp": ["\u4E11\u3001\u53EF\u803B", "\u6027", "turp"], "firm": ["\u575A\u56FA", "\u6027", "firm"], "imbe": ["\u5B71\u5F31", "\u6027", "imbe"], "dit": ["\u5BCC\u6709", "\u6027", "dit"], "paup": ["\u8D2B\u7A77", "\u6027", "paup"], "preci": ["\u8D35\u91CD", "\u6027", "preci"], "vil": ["\u4F4E\u8D31", "\u6027", "vil"], "vacu": ["\u7A7A", "\u6027", "vacu"], "crud": ["\u751F\u3001\u672A\u719F", "\u6027", "crud"], "coct": ["\u719F\u3001\u6210\u719F", "\u6027", "coct"], "rect": ["\u6B63\u786E", "\u6027", "rect"], "prav": ["\u9519\u8BEF\u3001\u6B6A\u659C", "\u6027", "prav"], "facil": ["\u5BB9\u6613", "\u6027", "facil"], "diffic": ["\u56F0\u96BE", "\u6027", "diffic"], "obsc": ["\u660F\u6697", "\u6027", "obsc"], "sord": ["\u6C61\u6D4A", "\u6027", "sord"], "mund": ["\u6D01\u51C0", "\u6027", "mund"], "miti": ["\u6E29\u987A", "\u6027", "miti"], "leni": ["\u67D4\u548C", "\u6027", "leni"], "tener": ["\u67D4\u5AE9", "\u6027", "tener"], "dure": ["\u575A\u786C", "\u6027", "dure"], "pur": ["\u7EAF\u51C0", "\u6027", "pur"], "crass": ["\u539A", "\u6027", "crass"], "poss": ["\u53EF\u80FD", "\u6027", "poss"], "neces": ["\u5FC5\u7136", "\u6027", "neces"], "actu": ["\u73B0\u5B9E", "\u6027", "actu"], "condit": ["\u6761\u4EF6", "\u6027", "condit"], "proce": ["\u8FC7\u7A0B", "\u6027", "proce"], "gnos": ["\u77E5\u8BC6", "\u6027", "gnos"], "idea": ["\u7406\u5FF5", "\u6027", "idea"], "valo": ["\u4EF7\u503C", "\u6027", "valo"], "iust": ["\u6B63\u4E49", "\u6027", "iust"], "vitio": ["\u6076\u4E60", "\u6027", "vitio"], "offic": ["\u4E49\u52A1", "\u6027", "offic"], "merit": ["\u529F\u7EE9", "\u6027", "merit"], "culp": ["\u8FC7\u5931", "\u6027", "culp"], "laus": ["\u79F0\u8D5E", "\u6027", "laus"], "honor": ["\u8363\u8A89", "\u6027", "honor"], "infa": ["\u803B\u8FB1", "\u6027", "infa"], "glor": ["\u8363\u8000", "\u6027", "glor"], "fama": ["\u540D\u58F0", "\u6027", "fama"], "nihil": ["\u865A\u65E0", "\u6027", "nihil"], "dialect": ["\u8FA9\u8BC1", "\u6027", "dialect"], "analys": ["\u5206\u6790", "\u6027", "analys"], "synthes": ["\u7EFC\u5408", "\u6027", "synthes"], "kris": ["\u5371\u673A", "\u6027", "kris"], "harmon": ["\u8C03\u548C", "\u6027", "harmon"], "nomos": ["\u6CD5\u5219", "\u6027", "nomos"], "physis": ["\u672C\u6027", "\u6027", "physis"], "techne": ["\u6280\u827A", "\u6027", "techne"], "praxis": ["\u5B9E\u8DF5", "\u6027", "praxis"], "laet": ["\u5FEB\u4E50", "\u6027", "laet"], "desp": ["\u7EDD\u671B", "\u6027", "desp"], "ango": ["\u7126\u8651", "\u6027", "ango"], "anxi": ["\u5FE7\u8651", "\u6027", "anxi"], "solli": ["\u5FE7\u5FC3", "\u6027", "solli"], "pavid": ["\u60CA\u6050", "\u6027", "pavid"], "terr": ["\u6050\u6016", "\u6027", "terr"], "horr": ["\u6218\u6817", "\u6027", "horr"], "carit": ["\u6148\u7231", "\u6027", "carit"], "benevo": ["\u5584\u610F", "\u6027", "benevo"], "miser": ["\u601C\u60AF", "\u6027", "miser"], "pati": ["\u5FCD\u8010", "\u6027", "pati"], "diffi": ["\u4E0D\u4FE1", "\u6027", "diffi"], "susp": ["\u731C\u7591", "\u6027", "susp"], "admi": ["\u94A6\u4F69", "\u6027", "admi"], "contem": ["\u8F7B\u8511", "\u6027", "contem"], "volup": ["\u4EAB\u4E50", "\u6027", "volup"], "taed": ["\u538C\u5026", "\u6027", "taed"], "curio": ["\u597D\u5947", "\u6027", "curio"], "studi": ["\u70ED\u5FF1", "\u6027", "studi"], "pigr": ["\u61D2\u60F0", "\u6027", "pigr"], "indus": ["\u52E4\u52C9", "\u6027", "indus"], "iucund": ["\u6109\u5FEB", "\u6027", "iucund"], "maer": ["\u54C0\u4F24", "\u6027", "maer"], "lug": ["\u60B2\u60BC", "\u6027", "lug"], "blandi": ["\u6E29\u67D4", "\u6027", "blandi"], "estu": ["\u6FC0\u594B", "\u6027", "estu"], "stupe": ["\u60CA\u6115", "\u6027", "stupe"], "iatro": ["\u533B\u5E08", "\u7269", "iatro"], "advoc": ["\u5F8B\u5E08", "\u7269", "advoc"], "magist": ["\u957F\u5B98", "\u7269", "magist"], "minist": ["\u81E3\u4EC6", "\u7269", "minist"], "praec": ["\u4F20\u4EE4", "\u7269", "praec"], "merc": ["\u5546\u4EBA", "\u7269", "merc"], "naut": ["\u6C34\u624B", "\u7269", "naut"], "aurig": ["\u5FA1\u8005", "\u7269", "aurig"], "past": ["\u7267\u4EBA", "\u7269", "past"], "agric": ["\u519C\u592B", "\u7269", "agric"], "opif": ["\u5DE5\u5320", "\u7269", "opif"], "pisto": ["\u9762\u5305\u5E08", "\u7269", "pisto"], "suto": ["\u978B\u5320", "\u7269", "suto"], "tons": ["\u7406\u53D1\u5E08", "\u7269", "tons"], "paed": ["\u587E\u5E08", "\u7269", "paed"], "philo": ["\u54F2\u4EBA", "\u7269", "philo"], "poet": ["\u8BD7\u4EBA", "\u7269", "poet"], "scurr": ["\u4E11\u89D2", "\u7269", "scurr"], "mim": ["\u4F36\u4EBA", "\u7269", "mim"], "flam": ["\u796D\u53F8", "\u7269", "flam"], "pereg": ["\u5916\u90A6\u4EBA", "\u7269", "pereg"], "testi": ["\u8BC1\u4EBA", "\u7269", "testi"], "auctor": ["\u4F5C\u8005", "\u7269", "auctor"], "artif": ["\u5DE7\u5320", "\u7269", "artif"], "venat": ["\u730E\u4EBA", "\u7269", "venat"], "piscat": ["\u6E14\u4EBA", "\u7269", "piscat"], "colle": ["\u540C\u50DA\u56E2", "\u7269", "colle"], "sodal": ["\u534F\u4F1A", "\u7269", "sodal"], "curia": ["\u8BAE\u4E8B\u5802", "\u7269", "curia"], "concil": ["\u4F1A\u8BAE", "\u7269", "concil"], "univ": ["\u56E2\u4F53", "\u7269", "univ"], "grem": ["\u884C\u4F1A", "\u7269", "grem"], "conf": ["\u540C\u76DF", "\u7269", "conf"], "aerar": ["\u56FD\u5E93", "\u7269", "aerar"], "telo": ["\u7A0E\u9879", "\u7269", "telo"], "annon": ["\u7CAE\u653F", "\u7269", "annon"], "censu": ["\u4EBA\u53E3\u767B\u8BB0", "\u7269", "censu"], "bema": ["\u6CD5\u5EAD", "\u7269", "bema"], "carc": ["\u76D1\u72F1", "\u7269", "carc"], "cust": ["\u770B\u5B88", "\u7269", "cust"], "equit": ["\u9A91\u58EB", "\u7269", "equit"], "sacram": ["\u8A93\u7EA6", "\u7269", "sacram"], "testam": ["\u9057\u5631", "\u7269", "testam"], "matrim": ["\u5A5A\u59FB", "\u7269", "matrim"], "patri": ["\u7956\u56FD", "\u7269", "patri"], "famil": ["\u5BB6\u5EAD", "\u7269", "famil"], "vicin": ["\u90BB\u91CC", "\u7269", "vicin"], "tribul": ["\u90E8\u65CF", "\u7269", "tribul"], "decuri": ["\u5341\u4EBA\u957F", "\u7269", "decuri"], "praefect": ["\u957F\u5B98", "\u7269", "praefect"], "quaestor": ["\u8D22\u52A1\u5B98", "\u7269", "quaestor"], "addi": ["\u52A0", "\u6027", "addi"], "subtra": ["\u51CF", "\u6027", "subtra"], "produ": ["\u79EF", "\u6027", "produ"], "impa": ["\u5947\u6570", "\u6027", "impa"], "absol": ["\u7EDD\u5BF9", "\u6027", "absol"], "comp": ["\u8BA1\u7B97", "\u6027", "comp"], "dual": ["\u4E8C\u5143", "\u6027", "dual"], "plura": ["\u591A\u5143", "\u6027", "plura"], "prog": ["\u6570\u5217", "\u6027", "prog"], "quoti": ["\u5546\u6570", "\u6027", "quoti"], "aequat": ["\u65B9\u7A0B", "\u6027", "aequat"], "radic": ["\u5F00\u65B9", "\u6027", "radic"], "potent": ["\u4E58\u65B9", "\u6027", "potent"], "logis": ["\u5BF9\u6570", "\u6027", "logis"], "calcul": ["\u6F14\u7B97", "\u6027", "calcul"], "numer": ["\u8BA1\u6570", "\u6027", "numer"], "multiplica": ["\u8FDE\u4E58", "\u6027", "multiplica"], "divid": ["\u6574\u9664", "\u6027", "divid"], "reman": ["\u4F59\u6570", "\u6027", "reman"], "aequipar": ["\u914D\u5E73", "\u6027", "aequipar"], "infin": ["\u65E0\u7A77", "\u6027", "infin"], "finit": ["\u6709\u9650", "\u6027", "finit"], "planet": ["\u884C\u661F", "\u7269", "planet"], "comet": ["\u5F57\u661F", "\u7269", "comet"], "galax": ["\u94F6\u6CB3", "\u7269", "galax"], "eclip": ["\u8680", "\u7269", "eclip"], "auror": ["\u6668\u5149", "\u7269", "auror"], "crepus": ["\u9EC4\u660F", "\u7269", "crepus"], "merid": ["\u6B63\u5348", "\u7269", "merid"], "vesp": ["\u508D\u665A", "\u7269", "vesp"], "mane": ["\u6E05\u6668", "\u7269", "mane"], "saec": ["\u4E16\u4EE3", "\u7269", "saec"], "lustr": ["\u4E94\u5E74", "\u7269", "lustr"], "kalen": ["\u6708\u521D", "\u7269", "kalen"], "idus": ["\u6708\u4E2D", "\u7269", "idus"], "hebdo": ["\u5468", "\u7269", "hebdo"], "feria": ["\u5E73\u65E5", "\u7269", "feria"], "solsti": ["\u81F3\u65E5", "\u7269", "solsti"], "equin": ["\u5206\u65E5", "\u7269", "equin"], "zodi": ["\u9EC4\u9053", "\u7269", "zodi"], "orbita": ["\u8F68\u9053", "\u7269", "orbita"], "zenith": ["\u5929\u9876", "\u7269", "zenith"], "horizon": ["\u5730\u5E73", "\u7269", "horizon"], "tropic": ["\u56DE\u5F52\u7EBF", "\u7269", "tropic"], "umbracul": ["\u65E5\u6677", "\u7269", "umbracul"], "clepsydra": ["\u6F0F\u523B", "\u7269", "clepsydra"], "nocturn": ["\u591C\u65F6", "\u7269", "nocturn"], "diurn": ["\u65E5\u65F6", "\u7269", "diurn"], "matutin": ["\u6668\u65F6", "\u7269", "matutin"], "annivers": ["\u5468\u5E74", "\u7269", "annivers"], "intern": ["\u5185\u90E8", "\u7269", "intern"], "exter": ["\u5916\u90E8", "\u7269", "exter"], "vertic": ["\u5782\u76F4", "\u7269", "vertic"], "paral": ["\u5E73\u884C", "\u7269", "paral"], "diag": ["\u5BF9\u89D2", "\u7269", "diag"], "peri": ["\u5468\u8FB9", "\u7269", "peri"], "dist": ["\u8DDD\u79BB", "\u7269", "dist"], "infim": ["\u6700\u4F4E", "\u7269", "infim"], "cis": ["\u6B64\u4FA7", "\u7269", "cis"], "intr": ["\u5185\u4FA7", "\u7269", "intr"], "extra": ["\u5916\u4FA7", "\u7269", "extra"], "superf": ["\u4E0A\u8868\u9762", "\u7269", "superf"], "advers": ["\u5BF9\u9762", "\u7269", "advers"], "avers": ["\u80CC\u9762", "\u7269", "avers"], "sinistr": ["\u5DE6\u4FA7", "\u7269", "sinistr"], "dexter": ["\u53F3\u4FA7", "\u7269", "dexter"], "obliqu": ["\u659C\u5411", "\u7269", "obliqu"], "transvers": ["\u6A2A\u5411", "\u7269", "transvers"], "longitud": ["\u7EB5\u5411", "\u7269", "longitud"], "altitud": ["\u9AD8\u5EA6", "\u7269", "altitud"], "latitud": ["\u5BBD\u5EA6", "\u7269", "latitud"], "profund": ["\u6DF1\u5EA6", "\u7269", "profund"], "magnitud": ["\u5927\u5C0F", "\u7269", "magnitud"], "intervall": ["\u95F4\u9694", "\u7269", "intervall"], "contigu": ["\u90BB\u63A5", "\u7269", "contigu"], "remot": ["\u9065\u8FDC", "\u7269", "remot"], "perce": ["\u77E5\u89C9", "\u52A8", "perce"], "intu": ["\u76F4\u89C9", "\u52A8", "intu"], "reco": ["\u56DE\u60F3", "\u52A8", "reco"], "remin": ["\u8FFD\u5FC6", "\u52A8", "remin"], "atte": ["\u6CE8\u610F", "\u52A8", "atte"], "obse": ["\u89C2\u5BDF", "\u52A8", "obse"], "adver": ["\u6CE8\u610F", "\u52A8", "adver"], "disce": ["\u8FA8\u522B", "\u52A8", "disce"], "consci": ["\u826F\u77E5", "\u52A8", "consci"], "rumo": ["\u4F20\u8A00", "\u52A8", "rumo"], "argum": ["\u8BBA\u636E", "\u52A8", "argum"], "proba": ["\u8BBA\u8BC1", "\u52A8", "proba"], "cert": ["\u786E\u4FE1", "\u52A8", "cert"], "perspic": ["\u660E\u5BDF", "\u52A8", "perspic"], "acum": ["\u654F\u9510", "\u52A8", "acum"], "hebet": ["\u8FDF\u949D", "\u52A8", "hebet"], "somnol": ["\u56F0\u5026", "\u52A8", "somnol"], "vertig": ["\u7729\u6655", "\u52A8", "vertig"], "nause": ["\u6076\u5FC3", "\u52A8", "nause"], "prurit": ["\u7619\u75D2", "\u52A8", "prurit"], "titill": ["\u9165\u75D2", "\u52A8", "titill"], "gustat": ["\u54C1\u5473", "\u52A8", "gustat"], "odorat": ["\u55C5\u95FB", "\u52A8", "odorat"], "tactil": ["\u89E6\u611F", "\u52A8", "tactil"], "aure": ["\u91D1\u8272", "\u6027", "aure"], "fusc": ["\u8910\u8272", "\u6027", "fusc"], "ciner": ["\u7070\u8272", "\u6027", "ciner"], "rose": ["\u7C89\u8272", "\u6027", "rose"], "venet": ["\u9752\u8272", "\u6027", "venet"], "ruf": ["\u8D64\u8910", "\u6027", "ruf"], "fulv": ["\u9EC4\u8910", "\u6027", "fulv"], "candor": ["\u6D01\u767D", "\u6027", "candor"], "pull": ["\u6DF1\u8272", "\u6027", "pull"], "pallor": ["\u82CD\u767D", "\u6027", "pallor"], "splend": ["\u8F89\u714C", "\u6027", "splend"], "nitid": ["\u5149\u6D01", "\u6027", "nitid"], "opac": ["\u836B\u6697", "\u6027", "opac"], "pellu": ["\u900F\u660E", "\u6027", "pellu"], "macul": ["\u6591\u70B9", "\u6027", "macul"], "varieg": ["\u6742\u8272", "\u6027", "varieg"], "marmor": ["\u7EB9\u5F69", "\u6027", "marmor"], "vitre": ["\u73BB\u7483\u5149\u6CFD", "\u6027", "vitre"], "metall": ["\u91D1\u5C5E\u5149\u6CFD", "\u6027", "metall"], "lanug": ["\u7ED2\u9762", "\u6027", "lanug"], "levig": ["\u5149\u6ED1", "\u6027", "levig"], "voc": ["\u55D3\u97F3", "\u7269", "voc"], "serm": ["\u8C08\u8BDD", "\u7269", "serm"], "syll": ["\u97F3\u8282", "\u7269", "syll"], "acce": ["\u91CD\u97F3", "\u7269", "acce"], "gramm": ["\u6587\u6CD5", "\u7269", "gramm"], "synt": ["\u53E5\u6CD5", "\u7269", "synt"], "sema": ["\u8BED\u4E49", "\u7269", "sema"], "phon": ["\u97F3\u58F0", "\u7269", "phon"], "rhyth": ["\u8282\u594F", "\u7269", "rhyth"], "orat": ["\u6F14\u8BF4", "\u7269", "orat"], "narr": ["\u53D9\u8FF0", "\u7269", "narr"], "descr": ["\u63CF\u5199", "\u7269", "descr"], "defin": ["\u5B9A\u4E49", "\u7269", "defin"], "sente": ["\u53E5\u5B50", "\u7269", "sente"], "para": ["\u6BB5\u843D", "\u7269", "para"], "poem": ["\u8BD7", "\u7269", "poem"], "fabul": ["\u5BD3\u8A00", "\u7269", "fabul"], "myth": ["\u795E\u8BDD", "\u7269", "myth"], "lexic": ["\u8BCD\u6C47", "\u7269", "lexic"], "phonem": ["\u97F3\u4F4D", "\u7269", "phonem"], "morphem": ["\u8BCD\u7D20", "\u7269", "morphem"], "etym": ["\u8BCD\u6E90", "\u7269", "etym"], "idiom": ["\u4E60\u8BED", "\u7269", "idiom"], "proverb": ["\u8C1A\u8BED", "\u7269", "proverb"], "argot": ["\u9690\u8BED", "\u7269", "argot"], "poli": ["\u6253\u78E8", "\u52A8", "poli"], "laevi": ["\u78E8\u5149", "\u52A8", "laevi"], "caela": ["\u96D5\u9542", "\u52A8", "caela"], "fict": ["\u5851\u9020", "\u52A8", "fict"], "compa": ["\u63A5\u5408", "\u52A8", "compa"], "armam": ["\u88C5\u5907", "\u52A8", "armam"], "supell": ["\u5BB6\u5177", "\u52A8", "supell"], "recep": ["\u5BB9\u5668", "\u52A8", "recep"], "cist": ["\u7BB1\u7BA7", "\u52A8", "cist"], "materi": ["\u6750\u6599", "\u52A8", "materi"], "structu": ["\u8425\u9020", "\u52A8", "structu"], "fabrica": ["\u5DE5\u574A", "\u52A8", "fabrica"], "instrument": ["\u5668\u5177", "\u52A8", "instrument"], "organ": ["\u5DE5\u5177", "\u52A8", "organ"], "utens": ["\u7528\u5177", "\u52A8", "utens"], "machin": ["\u673A\u68B0", "\u52A8", "machin"], "temper": ["\u56DE\u706B", "\u52A8", "temper"], "confl": ["\u7194\u70BC", "\u52A8", "confl"], "forgi": ["\u953B\u9020", "\u52A8", "forgi"], "incud": ["\u94C1\u7827", "\u52A8", "incud"], "foll": ["\u98CE\u7BB1", "\u52A8", "foll"], "lima": ["\u9509", "\u52A8", "lima"], "runcin": ["\u5228", "\u52A8", "runcin"], "ascia": ["\u951B", "\u52A8", "ascia"], "scalpr": ["\u523B\u5200", "\u52A8", "scalpr"], "faen": ["\u5229\u606F", "\u52A8", "faen"], "usur": ["\u9AD8\u5229", "\u52A8", "usur"], "pign": ["\u62B5\u62BC", "\u52A8", "pign"], "arrh": ["\u5B9A\u91D1", "\u52A8", "arrh"], "salar": ["\u85AA\u4FF8", "\u52A8", "salar"], "monet": ["\u94F8\u5E01", "\u52A8", "monet"], "numm": ["\u94B1\u5E01", "\u52A8", "numm"], "denar": ["\u94F6\u94B1", "\u52A8", "denar"], "talen": ["\u5927\u989D\u8D27\u5E01", "\u52A8", "talen"], "drach": ["\u8D27\u5E01\u5355\u4F4D", "\u52A8", "drach"], "merca": ["\u5E02\u573A", "\u52A8", "merca"], "nundi": ["\u96C6\u65E5", "\u52A8", "nundi"], "tabern": ["\u5E97\u94FA", "\u52A8", "tabern"], "instit": ["\u96F6\u552E\u5546", "\u52A8", "instit"], "credit": ["\u503A\u6743", "\u52A8", "credit"], "camb": ["\u5151\u6362", "\u52A8", "camb"], "stips": ["\u65BD\u820D", "\u52A8", "stips"], "locar": ["\u51FA\u79DF", "\u52A8", "locar"], "conduc": ["\u627F\u79DF", "\u52A8", "conduc"], "emptor": ["\u4E70\u4E3B", "\u52A8", "emptor"], "vendit": ["\u5356\u4E3B", "\u52A8", "vendit"], "preti": ["\u4F30\u4EF7", "\u52A8", "preti"], "aequip": ["\u7B49\u4EF7", "\u52A8", "aequip"], "compens": ["\u8865\u507F", "\u52A8", "compens"], "lucrif": ["\u725F\u5229", "\u52A8", "lucrif"], "damn": ["\u4E8F\u635F", "\u52A8", "damn"], "fener": ["\u653E\u8D37", "\u52A8", "fener"], "nummul": ["\u94B1\u5E84", "\u52A8", "nummul"], "epist": ["\u4E66\u4FE1", "\u7269", "epist"], "cod": ["\u518C", "\u7269", "cod"], "signac": ["\u5C01\u5370", "\u7269", "signac"], "curs": ["\u4FE1\u4F7F", "\u7269", "curs"], "procl": ["\u516C\u544A", "\u7269", "procl"], "mandat": ["\u547D\u4EE4\u4E66", "\u7269", "mandat"], "tom": ["\u5377", "\u7269", "tom"], "titul": ["\u6807\u9898", "\u7269", "titul"], "capit": ["\u7AE0\u8282", "\u7269", "capit"], "interp": ["\u89E3\u91CA", "\u7269", "interp"], "exege": ["\u758F\u89E3", "\u7269", "exege"], "transfer": ["\u8F6C\u8FBE", "\u7269", "transfer"], "nuntia": ["\u901A\u62A5", "\u7269", "nuntia"], "ephemer": ["\u4F20\u5355", "\u7269", "ephemer"], "libell": ["\u5C0F\u518C", "\u7269", "libell"], "pagella": ["\u4E66\u9875", "\u7269", "pagella"], "versio": ["\u8BD1\u672C", "\u7269", "versio"], "notar": ["\u901F\u8BB0", "\u7269", "notar"], "sigill": ["\u5C01\u7F04", "\u7269", "sigill"], "chiro": ["\u624B\u4E66", "\u7269", "chiro"], "tabul": ["\u6848\u5377", "\u7269", "tabul"], "semit": ["\u5C0F\u5F84", "\u7269", "semit"], "tram": ["\u5C94\u8DEF", "\u7269", "tram"], "diver": ["\u5C94\u53E3", "\u7269", "diver"], "caup": ["\u5BA2\u6808", "\u7269", "caup"], "stabu": ["\u53A9\u820D", "\u7269", "stabu"], "stratum": ["\u5E8A\u94FA", "\u7269", "stratum"], "pulv": ["\u6795", "\u7269", "pulv"], "strag": ["\u88AB\u8925", "\u7269", "strag"], "mensa": ["\u9910\u684C", "\u7269", "mensa"], "camin": ["\u58C1\u7089", "\u7269", "camin"], "lych": ["\u706F", "\u7269", "lych"], "sarcin": ["\u884C\u56CA", "\u7269", "sarcin"], "migr": ["\u8FC1\u5F99", "\u7269", "migr"], "comme": ["\u901A\u884C", "\u7269", "comme"], "viatic": ["\u65C5\u8D39", "\u7269", "viatic"], "devers": ["\u9A7F\u820D", "\u7269", "devers"], "mans": ["\u5BBF\u7AD9", "\u7269", "mans"], "exped": ["\u8FDC\u5F81", "\u7269", "exped"], "peregr": ["\u8FDC\u6E38", "\u7269", "peregr"], "profect": ["\u51FA\u53D1", "\u7269", "profect"], "redit": ["\u5F52\u6765", "\u7269", "redit"], "vad": ["\u6D89\u6E21", "\u7269", "vad"], "transit": ["\u8FC7\u5883", "\u7269", "transit"], "column": ["\u67F1", "\u7269", "column"], "episty": ["\u67F1\u9876", "\u7269", "episty"], "arcus": ["\u62F1", "\u7269", "arcus"], "pod": ["\u53F0\u57FA", "\u7269", "pod"], "exedr": ["\u5385", "\u7269", "exedr"], "latri": ["\u5395", "\u7269", "latri"], "piscin": ["\u6C34\u6C60", "\u7269", "piscin"], "hort": ["\u56ED", "\u7269", "hort"], "domus": ["\u5B85", "\u7269", "domus"], "fan": ["\u5723\u6240", "\u7269", "fan"], "delubr": ["\u795E\u9F9B", "\u7269", "delubr"], "imbri": ["\u7B52\u74E6", "\u7269", "imbri"], "antae": ["\u58C1\u67F1", "\u7269", "antae"], "posti": ["\u95E8\u67F1", "\u7269", "posti"], "cardo": ["\u95E8\u67A2", "\u7269", "cardo"], "claustr": ["\u95E9\u9501", "\u7269", "claustr"], "fores": ["\u53CC\u6249", "\u7269", "fores"], "fenest": ["\u7A97\u7256", "\u7269", "fenest"], "scalis": ["\u9636\u68AF", "\u7269", "scalis"], "subsell": ["\u957F\u51F3", "\u7269", "subsell"], "armar": ["\u6A71\u67DC", "\u7269", "armar"], "cubil": ["\u5367\u69BB", "\u7269", "cubil"], "impluvi": ["\u5929\u4E95", "\u7269", "impluvi"], "compluvi": ["\u5EAD\u9662\u9876", "\u7269", "compluvi"], "vestibu": ["\u95E8\u5385", "\u7269", "vestibu"], "antl": ["\u6C34\u6CF5", "\u7269", "antl"], "siph": ["\u8679\u5438", "\u7269", "siph"], "spira": ["\u87BA\u65CB", "\u7269", "spira"], "catar": ["\u95F8\u95E8", "\u7269", "catar"], "rotat": ["\u65CB\u8F6C", "\u7269", "rotat"], "pression": ["\u538B\u52A8", "\u7269", "pression"], "impuls": ["\u63A8\u52A8", "\u7269", "impuls"], "motri": ["\u539F\u52A8", "\u7269", "motri"], "vecti": ["\u4F20\u52A8", "\u7269", "vecti"], "dentat": ["\u9F7F\u8F6E", "\u7269", "dentat"], "cochle": ["\u87BA\u65CB\u6746", "\u7269", "cochle"], "sucul": ["\u7EDE\u76D8", "\u7269", "sucul"], "fornac": ["\u7089\u819B", "\u7269", "fornac"], "valv": ["\u9600\u95E8", "\u7269", "valv"], "tubul": ["\u7BA1\u9053", "\u7269", "tubul"], "haust": ["\u6C72\u6C34", "\u7269", "haust"], "elevat": ["\u63D0\u5347", "\u7269", "elevat"], "communic": ["\u8FDE\u901A", "\u7269", "communic"], "fim": ["\u53A9\u80A5", "\u7269", "fim"], "glum": ["\u8C37\u58F3", "\u7269", "glum"], "spic": ["\u7A57", "\u7269", "spic"], "mol": ["\u78E8", "\u7269", "mol"], "pistr": ["\u78E8\u574A", "\u7269", "pistr"], "furn": ["\u70E4\u7089", "\u7269", "furn"], "hord": ["\u5927\u9EA6", "\u7269", "hord"], "aven": ["\u71D5\u9EA6", "\u7269", "aven"], "case": ["\u5976\u916A", "\u7269", "case"], "buty": ["\u9EC4\u6CB9", "\u7269", "buty"], "pipe": ["\u80E1\u6912", "\u7269", "pipe"], "pult": ["\u7CA5", "\u7269", "pult"], "malum": ["\u82F9\u679C", "\u7269", "malum"], "fic": ["\u65E0\u82B1\u679C", "\u7269", "fic"], "uv": ["\u8461\u8404", "\u7269", "uv"], "nuc": ["\u575A\u679C", "\u7269", "nuc"], "rapa": ["\u829C\u83C1", "\u7269", "rapa"], "all": ["\u849C", "\u7269", "all"], "cep": ["\u6D0B\u8471", "\u7269", "cep"], "beta": ["\u751C\u83DC", "\u7269", "beta"], "cucurbi": ["\u74DC", "\u7269", "cucurbi"], "legum": ["\u8C46", "\u7269", "legum"], "lactuc": ["\u83B4\u82E3", "\u7269", "lactuc"], "prun": ["\u674E", "\u7269", "prun"], "ceras": ["\u6A31\u6843", "\u7269", "ceras"], "persic": ["\u6843", "\u7269", "persic"], "pir": ["\u68A8", "\u7269", "pir"], "sympt": ["\u75C7\u72B6", "\u52A8", "sympt"], "diagn": ["\u8BCA\u65AD", "\u52A8", "diagn"], "thera": ["\u6CBB\u7597", "\u52A8", "thera"], "anato": ["\u89E3\u5256", "\u52A8", "anato"], "muscul": ["\u808C\u8089", "\u52A8", "muscul"], "pulm": ["\u80BA", "\u52A8", "pulm"], "hepat": ["\u809D", "\u52A8", "hepat"], "ren": ["\u80BE", "\u52A8", "ren"], "ventr": ["\u8179", "\u52A8", "ventr"], "cut": ["\u80A4", "\u52A8", "cut"], "capill": ["\u53D1", "\u52A8", "capill"], "luxa": ["\u8131\u81FC", "\u52A8", "luxa"], "valetu": ["\u7597\u517B\u9662", "\u52A8", "valetu"], "febri": ["\u70ED\u75C5", "\u52A8", "febri"], "pesti": ["\u75AB\u75C5", "\u52A8", "pesti"], "veneni": ["\u6BD2\u7269", "\u52A8", "veneni"], "cicatr": ["\u75A4\u75D5", "\u52A8", "cicatr"], "medic": ["\u533B\u672F", "\u52A8", "medic"], "pharmac": ["\u836F\u8349", "\u52A8", "pharmac"], "obstetric": ["\u4EA7\u79D1", "\u52A8", "obstetric"], "anesthes": ["\u9EBB\u9189", "\u52A8", "anesthes"], "intestin": ["\u80A0", "\u52A8", "intestin"], "stomach": ["\u80C3", "\u52A8", "stomach"], "accus": ["\u63A7\u544A", "\u52A8", "accus"], "delic": ["\u8FDD\u6CD5", "\u52A8", "delic"], "fraud": ["\u6B3A\u8BC8", "\u52A8", "fraud"], "furt": ["\u76D7\u7A83", "\u52A8", "furt"], "iniu": ["\u4FB5\u5BB3", "\u52A8", "iniu"], "homic": ["\u6740\u4EBA", "\u52A8", "homic"], "adult": ["\u901A\u5978", "\u52A8", "adult"], "periur": ["\u4F2A\u8A93", "\u52A8", "periur"], "calum": ["\u8BEC\u544A", "\u52A8", "calum"], "iurisc": ["\u6CD5\u5B66\u5BB6", "\u52A8", "iurisc"], "provo": ["\u4E0A\u8BC9", "\u52A8", "provo"], "appell": ["\u7533\u8BC9", "\u52A8", "appell"], "damnat": ["\u5224\u7F6A", "\u52A8", "damnat"], "absolut": ["\u5F00\u91CA", "\u52A8", "absolut"], "caut": ["\u62C5\u4FDD", "\u52A8", "caut"], "fideiuss": ["\u4FDD\u8BC1", "\u52A8", "fideiuss"], "transact": ["\u548C\u89E3", "\u52A8", "transact"], "arbitr": ["\u4EF2\u88C1", "\u52A8", "arbitr"], "pacti": ["\u7EA6\u5B9A", "\u52A8", "pacti"], "stipulat": ["\u8981\u5F0F", "\u52A8", "stipulat"], "deposit": ["\u5BC4\u5B58", "\u52A8", "deposit"], "commodat": ["\u501F\u7528", "\u52A8", "commodat"], "usucap": ["\u65F6\u6548\u53D6\u5F97", "\u52A8", "usucap"], "possess": ["\u5360\u6709", "\u52A8", "possess"], "domin": ["\u6240\u6709\u6743", "\u52A8", "domin"], "servitut": ["\u5730\u5F79", "\u52A8", "servitut"], "proel": ["\u4F1A\u6218", "\u52A8", "proel"], "acie": ["\u9635\u5217", "\u52A8", "acie"], "pedit": ["\u6B65\u5175", "\u52A8", "pedit"], "arie": ["\u653B\u57CE\u69CC", "\u52A8", "arie"], "agger": ["\u571F\u5792", "\u52A8", "agger"], "spicu": ["\u77DB\u5C16", "\u52A8", "spicu"], "strat": ["\u6218\u7565", "\u52A8", "strat"], "takt": ["\u6218\u672F", "\u52A8", "takt"], "victo": ["\u80DC\u5229", "\u52A8", "victo"], "dedit": ["\u6295\u964D", "\u52A8", "dedit"], "indut": ["\u4F11\u6218", "\u52A8", "indut"], "equita": ["\u9A91\u5175", "\u52A8", "equita"], "sagitt": ["\u7BAD\u624B", "\u52A8", "sagitt"], "fundit": ["\u6295\u77F3\u624B", "\u52A8", "fundit"], "ballist": ["\u5F29\u70AE\u624B", "\u52A8", "ballist"], "signif": ["\u65D7\u624B", "\u52A8", "signif"], "tubic": ["\u53F7\u624B", "\u52A8", "tubic"], "cornic": ["\u53F7\u89D2\u624B", "\u52A8", "cornic"], "obsid": ["\u56F4\u57CE", "\u52A8", "obsid"], "expugn": ["\u5F3A\u653B", "\u52A8", "expugn"], "propugn": ["\u5B88\u5FA1", "\u52A8", "propugn"], "praesidi": ["\u5B88\u5907", "\u52A8", "praesidi"], "excubi": ["\u5C97\u54E8", "\u52A8", "excubi"], "bibli": ["\u85CF\u4E66", "\u7269", "bibli"], "acad": ["\u5B66\u56ED", "\u7269", "acad"], "gym": ["\u4F53\u80B2\u573A", "\u7269", "gym"], "histo": ["\u5386\u53F2", "\u7269", "histo"], "geogr": ["\u5730\u7406", "\u7269", "geogr"], "theol": ["\u795E\u5B66", "\u7269", "theol"], "disput": ["\u8FA9\u8BBA", "\u7269", "disput"], "exper": ["\u5B9E\u9A8C", "\u7269", "exper"], "theore": ["\u5B9A\u7406", "\u7269", "theore"], "didact": ["\u6559\u5B66\u6CD5", "\u7269", "didact"], "paidei": ["\u6559\u5316", "\u7269", "paidei"], "scholar": ["\u5B66\u4EBA", "\u7269", "scholar"], "discipul": ["\u95E8\u751F", "\u7269", "discipul"], "praecept": ["\u6559\u8BEB", "\u7269", "praecept"], "exercit": ["\u7EC3\u4E60", "\u7269", "exercit"], "commen": ["\u6CE8\u758F", "\u7269", "commen"], "gloss": ["\u7B3A\u6CE8", "\u7269", "gloss"], "annotat": ["\u6279\u6CE8", "\u7269", "annotat"], "compend": ["\u7EB2\u8981", "\u7269", "compend"], "epitom": ["\u6458\u8981", "\u7269", "epitom"], "cursus": ["\u8BFE\u7A0B", "\u7269", "cursus"], "studios": ["\u52E4\u5B66\u8005", "\u7269", "studios"], "statu": ["\u96D5\u50CF", "\u7269", "statu"], "trago": ["\u60B2\u5267", "\u7269", "trago"], "comoe": ["\u559C\u5267", "\u7269", "comoe"], "person": ["\u89D2\u8272", "\u7269", "person"], "cithar": ["\u7AD6\u7434", "\u7269", "cithar"], "cymb": ["\u94D9\u94B9", "\u7269", "cymb"], "poes": ["\u8BD7\u827A", "\u7269", "poes"], "metr": ["\u683C\u5F8B", "\u7269", "metr"], "pictor": ["\u753B\u5E08", "\u7269", "pictor"], "sculptor": ["\u96D5\u523B\u5E08", "\u7269", "sculptor"], "archit": ["\u5EFA\u7B51\u5E08", "\u7269", "archit"], "aulos": ["\u53CC\u7BA1\u7B1B", "\u7269", "aulos"], "syrinx": ["\u6392\u7BAB", "\u7269", "syrinx"], "orchestr": ["\u4E50\u6C60", "\u7269", "orchestr"], "pantomim": ["\u54D1\u5267", "\u7269", "pantomim"], "fabulat": ["\u7F16\u5267", "\u7269", "fabulat"], "versific": ["\u4F5C\u8BD7", "\u7269", "versific"], "recitat": ["\u6717\u8BF5", "\u7269", "recitat"], "improvis": ["\u5373\u5174", "\u7269", "improvis"], "virtuos": ["\u540D\u5BB6", "\u7269", "virtuos"], "divus": ["\u795E\u660E", "\u7269", "divus"], "lar": ["\u5BB6\u795E", "\u7269", "lar"], "penat": ["\u5BB6\u795E", "\u7269", "penat"], "geni": ["\u5B88\u62A4\u7075", "\u7269", "geni"], "infe": ["\u51A5\u754C", "\u7269", "infe"], "elys": ["\u4E50\u571F", "\u7269", "elys"], "tartar": ["\u51A5\u6E0A", "\u7269", "tartar"], "char": ["\u6E21\u7075\u8005", "\u7269", "char"], "styx": ["\u51A5\u6CB3", "\u7269", "styx"], "orc": ["\u51A5\u5E9C", "\u7269", "orc"], "provi": ["\u5929\u547D", "\u7269", "provi"], "nemes": ["\u62A5\u5E94", "\u7269", "nemes"], "hybr": ["\u50ED\u8D8A", "\u7269", "hybr"], "piacul": ["\u8D4E\u7F6A", "\u7269", "piacul"], "exorc": ["\u9A71\u90AA", "\u7269", "exorc"], "devot": ["\u5949\u732E", "\u7269", "devot"], "oblat": ["\u4F9B\u7269", "\u7269", "oblat"], "libat": ["\u5960\u9152", "\u7269", "libat"], "incens": ["\u711A\u9999", "\u7269", "incens"], "harus": ["\u80A0\u535C", "\u7269", "harus"], "sibyll": ["\u795E\u8C15\u96C6", "\u7269", "sibyll"], "vaticin": ["\u795E\u8C15\u5BA3\u793A", "\u7269", "vaticin"], "plant": ["\u690D\u7269", "\u7269", "plant"], "vent": ["\u98CE", "\u7269", "vent"], "humu": ["\u571F\u58E4", "\u7269", "humu"], "mundu": ["\u4E16\u754C", "\u7269", "mundu"], "flor": ["\u82B1", "\u7269", "flor"], "faun": ["\u517D\u7FA4", "\u7269", "faun"], "flum": ["\u6CB3\u6D41", "\u7269", "flum"], "litor": ["\u6D77\u6EE8", "\u7269", "litor"], "glare": ["\u783E\u77F3", "\u7269", "glare"], "limos": ["\u6DE4\u6CE5", "\u7269", "limos"], "palud": ["\u6CBC\u6CFD", "\u7269", "palud"], "saltu": ["\u6797\u5730", "\u7269", "saltu"], "coll": ["\u4E18\u9675", "\u7269", "coll"], "planit": ["\u5E73\u539F", "\u7269", "planit"], "desert": ["\u8352\u6F20", "\u7269", "desert"], "oasi": ["\u7EFF\u6D32", "\u7269", "oasi"], "paenin": ["\u534A\u5C9B", "\u7269", "paenin"], "isthm": ["\u5730\u5CE1", "\u7269", "isthm"], "promon": ["\u6D77\u89D2", "\u7269", "promon"], "portu": ["\u6E2F\u6E7E", "\u7269", "portu"], "aestu": ["\u6CB3\u53E3", "\u7269", "aestu"], "iuven": ["\u9752\u6625", "\u7269", "iuven"], "infan": ["\u5E7C\u5E74", "\u7269", "infan"], "puer": ["\u7AE5\u5E74", "\u7269", "puer"], "adole": ["\u5C11\u5E74", "\u7269", "adole"], "femin": ["\u5973\u5B50", "\u7269", "femin"], "mas": ["\u7537\u5B50", "\u7269", "mas"], "prol": ["\u540E\u4EE3", "\u7269", "prol"], "hered": ["\u7EE7\u627F", "\u7269", "hered"], "here": ["\u7EE7\u627F\u4EBA", "\u7269", "here"], "funer": ["\u846C\u793C", "\u7269", "funer"], "sepul": ["\u57CB\u846C", "\u7269", "sepul"], "tumul": ["\u575F\u51A2", "\u7269", "tumul"], "vit": ["\u751F\u547D", "\u7269", "vit"], "natal": ["\u8BDE\u8FB0", "\u7269", "natal"], "obit": ["\u8F9E\u4E16", "\u7269", "obit"], "mortu": ["\u6B7B\u8005", "\u7269", "mortu"], "superstes": ["\u9057\u5B58", "\u7269", "superstes"], "vidu": ["\u5BE1\u5C45", "\u7269", "vidu"], "nubil": ["\u5A5A\u9F84", "\u7269", "nubil"], "caelib": ["\u72EC\u8EAB", "\u7269", "caelib"], "genet": ["\u751F\u80B2", "\u7269", "genet"], "thanat": ["\u6B7B\u4EA1", "\u7269", "thanat"], "physic": ["\u7269\u7406\u5B66", "\u7269", "physic"], "atom": ["\u539F\u5B50", "\u7269", "atom"], "molec": ["\u5206\u5B50", "\u7269", "molec"], "kines": ["\u8FD0\u52A8", "\u7269", "kines"], "statik": ["\u9759\u529B\u5B66", "\u7269", "statik"], "mech": ["\u529B\u5B66", "\u7269", "mech"], "mass": ["\u8D28\u91CF", "\u7269", "mass"], "acceler": ["\u52A0\u901F\u5EA6", "\u7269", "acceler"], "gravit": ["\u5F15\u529B", "\u7269", "gravit"], "inert": ["\u60EF\u6027", "\u7269", "inert"], "elast": ["\u5F39\u6027", "\u7269", "elast"], "vibr": ["\u632F\u52A8", "\u7269", "vibr"], "frequent": ["\u9891\u7387", "\u7269", "frequent"], "amplitud": ["\u632F\u5E45", "\u7269", "amplitud"], "reson": ["\u5171\u632F", "\u7269", "reson"], "fluid": ["\u6D41\u4F53", "\u7269", "fluid"], "viscos": ["\u9ECF\u6027", "\u7269", "viscos"], "entropi": ["\u71B5", "\u7269", "entropi"], "radiat": ["\u8F90\u5C04", "\u7269", "radiat"], "conduct": ["\u4F20\u5BFC", "\u7269", "conduct"], "convect": ["\u5BF9\u6D41", "\u7269", "convect"], "induct": ["\u611F\u5E94", "\u7269", "induct"], "optic": ["\u5149\u5B66", "\u7269", "optic"], "acust": ["\u58F0\u5B66", "\u7269", "acust"], "chemis": ["\u5316\u5B66", "\u7269", "chemis"], "solvent": ["\u6EB6\u5242", "\u7269", "solvent"], "solute": ["\u6EB6\u8D28", "\u7269", "solute"], "reduct": ["\u8FD8\u539F", "\u7269", "reduct"], "compos": ["\u5316\u5408\u7269", "\u7269", "compos"], "neutr": ["\u4E2D\u6027", "\u7269", "neutr"], "ion": ["\u79BB\u5B50", "\u7269", "ion"], "cation": ["\u9633\u79BB\u5B50", "\u7269", "cation"], "anion": ["\u9634\u79BB\u5B50", "\u7269", "anion"], "electro": ["\u7535\u6781", "\u7269", "electro"], "valent": ["\u5316\u5408\u4EF7", "\u7269", "valent"], "mole": ["\u6469\u5C14", "\u7269", "mole"], "concent": ["\u6D53\u5EA6", "\u7269", "concent"], "volatil": ["\u6325\u53D1\u6027", "\u7269", "volatil"], "combust": ["\u71C3\u70E7", "\u7269", "combust"], "inciner": ["\u711A\u5316", "\u7269", "inciner"], "alloy": ["\u5408\u91D1", "\u7269", "alloy"], "amalgam": ["\u6C5E\u9F50", "\u7269", "amalgam"], "reagen": ["\u8BD5\u5242", "\u7269", "reagen"], "crucib": ["\u5769\u57DA", "\u7269", "crucib"], "retort": ["\u84B8\u998F\u5668", "\u7269", "retort"], "alembic": ["\u84B8\u998F\u91DC", "\u7269", "alembic"], "hygro": ["\u5438\u6E7F", "\u7269", "hygro"], "titrat": ["\u6EF4\u5B9A", "\u7269", "titrat"], "kat": ["\u50AC\u5316", "\u7269", "kat"], "cellul": ["\u7EC6\u80DE", "\u7269", "cellul"], "viscer": ["\u810F\u8151", "\u7269", "viscer"], "chromos": ["\u67D3\u8272\u4F53", "\u7269", "chromos"], "evolut": ["\u8FDB\u5316", "\u7269", "evolut"], "ecol": ["\u751F\u6001", "\u7269", "ecol"], "ambie": ["\u73AF\u5883", "\u7269", "ambie"], "biom": ["\u751F\u7269\u7FA4\u7CFB", "\u7269", "biom"], "biosph": ["\u751F\u7269\u5708", "\u7269", "biosph"], "habitat": ["\u6816\u606F\u5730", "\u7269", "habitat"], "niche": ["\u751F\u6001\u4F4D", "\u7269", "niche"], "symbio": ["\u5171\u751F", "\u7269", "symbio"], "parasit": ["\u5BC4\u751F", "\u7269", "parasit"], "nutrien": ["\u517B\u5206", "\u7269", "nutrien"], "metabol": ["\u4EE3\u8C22", "\u7269", "metabol"], "photos": ["\u5149\u5408", "\u7269", "photos"], "germin": ["\u53D1\u82BD", "\u7269", "germin"], "pollinat": ["\u6388\u7C89", "\u7269", "pollinat"], "fecund": ["\u7E41\u6B96\u529B", "\u7269", "fecund"], "steril": ["\u4E0D\u80B2", "\u7269", "steril"], "adapt": ["\u9002\u5E94", "\u7269", "adapt"], "ecosys": ["\u751F\u6001\u7CFB\u7EDF", "\u7269", "ecosys"], "biolo": ["\u751F\u7269\u5B66", "\u7269", "biolo"], "zoolo": ["\u52A8\u7269\u5B66", "\u7269", "zoolo"], "botan": ["\u690D\u7269\u5B66", "\u7269", "botan"], "miner": ["\u77FF\u7269", "\u7269", "miner"], "sediment": ["\u6C89\u79EF", "\u7269", "sediment"], "erosion": ["\u4FB5\u8680", "\u7269", "erosion"], "vulcan": ["\u706B\u5C71", "\u7269", "vulcan"], "seism": ["\u5730\u9707", "\u7269", "seism"], "magma": ["\u5CA9\u6D46", "\u7269", "magma"], "fossil": ["\u5316\u77F3", "\u7269", "fossil"], "tecton": ["\u677F\u5757", "\u7269", "tecton"], "fault": ["\u65AD\u5C42", "\u7269", "fault"], "orogen": ["\u9020\u5C71", "\u7269", "orogen"], "geolo": ["\u5730\u8D28\u5B66", "\u7269", "geolo"], "quarr": ["\u91C7\u77F3\u573A", "\u7269", "quarr"], "vein": ["\u77FF\u8109", "\u7269", "vein"], "chalk": ["\u77FF\u77F3", "\u7269", "chalk"], "stalac": ["\u949F\u4E73\u77F3", "\u7269", "stalac"], "karst": ["\u5580\u65AF\u7279", "\u7269", "karst"], "loess": ["\u9EC4\u571F", "\u7269", "loess"], "clay": ["\u9ECF\u571F", "\u7269", "clay"], "silt": ["\u7C89\u7802", "\u7269", "silt"], "sandst": ["\u7802\u5CA9", "\u7269", "sandst"], "calcar": ["\u77F3\u7070\u5CA9", "\u7269", "calcar"], "granit": ["\u82B1\u5C97\u5CA9", "\u7269", "granit"], "basalt": ["\u7384\u6B66\u5CA9", "\u7269", "basalt"], "slate": ["\u677F\u5CA9", "\u7269", "slate"], "quartz": ["\u77F3\u82F1", "\u7269", "quartz"], "supern": ["\u8D85\u65B0\u661F", "\u7269", "supern"], "quasar": ["\u7C7B\u661F\u4F53", "\u7269", "quasar"], "pulsar": ["\u8109\u51B2\u661F", "\u7269", "pulsar"], "astero": ["\u5C0F\u884C\u661F", "\u7269", "astero"], "meteor": ["\u6D41\u661F", "\u7269", "meteor"], "meteorit": ["\u9668\u77F3", "\u7269", "meteorit"], "satellit": ["\u536B\u661F", "\u7269", "satellit"], "aphel": ["\u8FDC\u65E5\u70B9", "\u7269", "aphel"], "perihe": ["\u8FD1\u65E5\u70B9", "\u7269", "perihe"], "equator": ["\u8D64\u9053", "\u7269", "equator"], "constel": ["\u661F\u5EA7", "\u7269", "constel"], "vacuum": ["\u771F\u7A7A", "\u7269", "vacuum"], "sidere": ["\u6052\u661F\u65F6", "\u7269", "sidere"], "occult": ["\u63A9\u661F", "\u7269", "occult"], "nadir": ["\u5929\u5E95", "\u7269", "nadir"], "azimuth": ["\u65B9\u4F4D\u89D2", "\u7269", "azimuth"], "declin": ["\u8D64\u7EAC", "\u7269", "declin"], "ascen": ["\u8D64\u7ECF", "\u7269", "ascen"], "cosmog": ["\u5B87\u5B99\u8D77\u6E90", "\u7269", "cosmog"], "parall": ["\u89C6\u5DEE", "\u7269", "parall"], "luminos": ["\u5149\u5EA6", "\u7269", "luminos"], "spectr": ["\u5149\u8C31", "\u7269", "spectr"], "radio": ["\u5C04\u7535", "\u7269", "radio"], "infrar": ["\u7EA2\u5916", "\u7269", "infrar"], "ultrav": ["\u7D2B\u5916", "\u7269", "ultrav"], "climat": ["\u6C14\u5019", "\u7269", "climat"], "atmos": ["\u5927\u6C14\u5C42", "\u7269", "atmos"], "barom": ["\u6C14\u538B\u8BA1", "\u7269", "barom"], "anemo": ["\u98CE\u901F\u8BA1", "\u7269", "anemo"], "irid": ["\u8679", "\u7269", "irid"], "halo": ["\u6655", "\u7269", "halo"], "monsun": ["\u5B63\u98CE", "\u7269", "monsun"], "cyclon": ["\u6C14\u65CB", "\u7269", "cyclon"], "anticy": ["\u53CD\u6C14\u65CB", "\u7269", "anticy"], "typh": ["\u53F0\u98CE", "\u7269", "typh"], "tornad": ["\u9F99\u5377", "\u7269", "tornad"], "sleet": ["\u96E8\u5939\u96EA", "\u7269", "sleet"], "droug": ["\u5E72\u65F1", "\u7269", "droug"], "diluv": ["\u5927\u6D2A\u6C34", "\u7269", "diluv"], "blizz": ["\u66B4\u96EA", "\u7269", "blizz"], "drizz": ["\u7EC6\u96E8", "\u7269", "drizz"], "downp": ["\u503E\u76C6", "\u7269", "downp"], "subtro": ["\u4E9A\u70ED\u5E26", "\u7269", "subtro"], "altocu": ["\u9AD8\u79EF\u4E91", "\u7269", "altocu"], "cumulo": ["\u79EF\u96E8\u4E91", "\u7269", "cumulo"], "strati": ["\u5C42\u4E91", "\u7269", "strati"], "cirr": ["\u5377\u4E91", "\u7269", "cirr"], "nimbo": ["\u96E8\u5C42\u4E91", "\u7269", "nimbo"], "condens": ["\u51DD\u7ED3", "\u7269", "condens"], "isoth": ["\u7B49\u6E29\u7EBF", "\u7269", "isoth"], "emot": ["\u60C5\u7EEA", "\u6027", "emot"], "charact": ["\u6027\u683C", "\u6027", "charact"], "intell": ["\u667A\u529B", "\u6027", "intell"], "aptitud": ["\u624D\u80FD", "\u6027", "aptitud"], "instinct": ["\u672C\u80FD", "\u6027", "instinct"], "frustr": ["\u632B\u6298", "\u6027", "frustr"], "conflict": ["\u51B2\u7A81", "\u6027", "conflict"], "depress": ["\u6291\u90C1", "\u6027", "depress"], "mania": ["\u8E81\u72C2", "\u6027", "mania"], "phobia": ["\u6050\u60E7\u75C7", "\u6027", "phobia"], "obsess": ["\u6267\u5FF5", "\u6027", "obsess"], "compuls": ["\u5F3A\u8FEB", "\u6027", "compuls"], "trauma": ["\u521B\u4F24", "\u6027", "trauma"], "accommod": ["\u987A\u5E94", "\u6027", "accommod"], "ego": ["\u81EA\u6211", "\u6027", "ego"], "attitude": ["\u6001\u5EA6", "\u6027", "attitude"], "creden": ["\u4FE1\u5FF5", "\u6027", "creden"], "preju": ["\u504F\u89C1", "\u6027", "preju"], "stereo": ["\u523B\u677F", "\u6027", "stereo"], "empath": ["\u5171\u60C5", "\u6027", "empath"], "sympath": ["\u540C\u60C5", "\u6027", "sympath"], "antipath": ["\u53CD\u611F", "\u6027", "antipath"], "sentiment": ["\u60C5\u611F", "\u6027", "sentiment"], "passion": ["\u6FC0\u60C5", "\u6027", "passion"], "ambition": ["\u96C4\u5FC3", "\u6027", "ambition"], "hierar": ["\u7B49\u7EA7\u5236", "\u7269", "hierar"], "libertus": ["\u81EA\u7531\u6C11", "\u7269", "libertus"], "margin": ["\u8FB9\u7F18\u4EBA", "\u7269", "margin"], "elite": ["\u7CBE\u82F1", "\u7269", "elite"], "prolet": ["\u65E0\u4EA7\u8005", "\u7269", "prolet"], "burgens": ["\u5E02\u6C11", "\u7269", "burgens"], "arist": ["\u8D35\u65CF\u5236", "\u7269", "arist"], "oliga": ["\u5BE1\u5934", "\u7269", "oliga"], "democr": ["\u6C11\u4E3B", "\u7269", "democr"], "monar": ["\u541B\u4E3B\u5236", "\u7269", "monar"], "tyrann": ["\u66B4\u541B", "\u7269", "tyrann"], "republic": ["\u5171\u548C", "\u7269", "republic"], "feud": ["\u5C01\u5EFA", "\u7269", "feud"], "caste": ["\u79CD\u59D3", "\u7269", "caste"], "union": ["\u8054\u76DF", "\u7269", "union"], "faction": ["\u6D3E\u7CFB", "\u7269", "faction"], "assem": ["\u8BAE\u4F1A", "\u7269", "assem"], "parlia": ["\u56FD\u4F1A", "\u7269", "parlia"], "elector": ["\u9009\u6C11", "\u7269", "elector"], "candida": ["\u5019\u9009\u4EBA", "\u7269", "candida"], "presti": ["\u58F0\u671B", "\u7269", "presti"], "mobil": ["\u6D41\u52A8", "\u7269", "mobil"], "inequ": ["\u4E0D\u5E73\u7B49", "\u7269", "inequ"], "privileg": ["\u7279\u6743", "\u7269", "privileg"], "rebell": ["\u53CD\u6297", "\u7269", "rebell"], "suppl": ["\u4F9B\u7ED9", "\u52A8", "suppl"], "deman": ["\u9700\u6C42", "\u52A8", "deman"], "bank": ["\u94F6\u884C", "\u52A8", "bank"], "capital": ["\u8D44\u672C", "\u52A8", "capital"], "consum": ["\u6D88\u8D39", "\u52A8", "consum"], "distribut": ["\u5206\u914D", "\u52A8", "distribut"], "invest": ["\u6295\u8D44", "\u52A8", "invest"], "inflation": ["\u901A\u80C0", "\u52A8", "inflation"], "deflation": ["\u901A\u7F29", "\u52A8", "deflation"], "budget": ["\u9884\u7B97", "\u52A8", "budget"], "reven": ["\u6536\u5165", "\u52A8", "reven"], "expend": ["\u652F\u51FA", "\u52A8", "expend"], "deficit": ["\u8D64\u5B57", "\u52A8", "deficit"], "surplus": ["\u76C8\u4F59", "\u52A8", "surplus"], "tarif": ["\u5173\u7A0E", "\u52A8", "tarif"], "quota": ["\u914D\u989D", "\u52A8", "quota"], "competit": ["\u7ADE\u4E89", "\u52A8", "competit"], "barter": ["\u4EE5\u7269\u6613\u7269", "\u52A8", "barter"], "currency": ["\u901A\u8D27", "\u52A8", "currency"], "stock": ["\u80A1\u4EFD", "\u52A8", "stock"], "dividend": ["\u80A1\u606F", "\u52A8", "dividend"], "oblig": ["\u503A\u5238", "\u52A8", "oblig"], "premium": ["\u4FDD\u8D39", "\u52A8", "premium"], "pension": ["\u5E74\u91D1", "\u52A8", "pension"], "constitu": ["\u5BAA\u6CD5", "\u7269", "constitu"], "statute": ["\u6210\u6587\u6CD5", "\u7269", "statute"], "aequit": ["\u8861\u5E73", "\u7269", "aequit"], "respons": ["\u8D23\u4EFB", "\u7269", "respons"], "innoc": ["\u65E0\u7F6A", "\u7269", "innoc"], "verdict": ["\u88C1\u51B3", "\u7269", "verdict"], "petition": ["\u8BF7\u613F", "\u7269", "petition"], "actor": ["\u539F\u544A", "\u7269", "actor"], "attorn": ["\u4EE3\u7406\u4EBA", "\u7269", "attorn"], "litig": ["\u4E89\u8BBC", "\u7269", "litig"], "iurisd": ["\u7BA1\u8F96", "\u7269", "iurisd"], "preced": ["\u5148\u4F8B", "\u7269", "preced"], "mediation": ["\u8C03\u89E3", "\u7269", "mediation"], "pardon": ["\u8D66\u514D", "\u7269", "pardon"], "amnesty": ["\u5927\u8D66", "\u7269", "amnesty"], "extrad": ["\u5F15\u6E21", "\u7269", "extrad"], "torture": ["\u9177\u5211", "\u7269", "torture"], "citat": ["\u4F20\u5524", "\u7269", "citat"], "warrant": ["\u4EE4\u72B6", "\u7269", "warrant"], "subpoe": ["\u4F20\u7968", "\u7269", "subpoe"], "affidav": ["\u5BA3\u8A93\u4E66", "\u7269", "affidav"], "lien": ["\u7559\u7F6E\u6743", "\u7269", "lien"], "trespass": ["\u4FB5\u5165", "\u7269", "trespass"], "neglig": ["\u8FC7\u5931", "\u7269", "neglig"], "guardi": ["\u76D1\u62A4\u4EBA", "\u7269", "guardi"], "vaccine": ["\u75AB\u82D7", "\u7269", "vaccine"], "immun": ["\u514D\u75AB", "\u7269", "immun"], "antibi": ["\u6297\u751F\u7D20", "\u7269", "antibi"], "virus": ["\u75C5\u6BD2", "\u7269", "virus"], "bacteri": ["\u7EC6\u83CC", "\u7269", "bacteri"], "inflam": ["\u708E\u75C7", "\u7269", "inflam"], "syndrome": ["\u7EFC\u5408\u5F81", "\u7269", "syndrome"], "dosis": ["\u5242\u91CF", "\u7269", "dosis"], "praesc": ["\u5904\u65B9", "\u7269", "praesc"], "clinic": ["\u8BCA\u6240", "\u7269", "clinic"], "hospital": ["\u533B\u9662", "\u7269", "hospital"], "cheirur": ["\u5916\u79D1\u533B\u5E08", "\u7269", "cheirur"], "ambula": ["\u6551\u62A4\u8F66", "\u7269", "ambula"], "scalpe": ["\u624B\u672F\u5200", "\u7269", "scalpe"], "bandag": ["\u7EF7\u5E26", "\u7269", "bandag"], "splint": ["\u5939\u677F", "\u7269", "splint"], "crutch": ["\u62D0\u6756", "\u7269", "crutch"], "prosthe": ["\u5047\u80A2", "\u7269", "prosthe"], "transpl": ["\u79FB\u690D", "\u7269", "transpl"], "dialysis": ["\u900F\u6790", "\u7269", "dialysis"], "transfu": ["\u8F93\u8840", "\u7269", "transfu"], "onco": ["\u80BF\u7624", "\u7269", "onco"], "cardio": ["\u5FC3\u810F", "\u7269", "cardio"], "pediat": ["\u513F\u79D1", "\u7269", "pediat"], "turbine": ["\u6DA1\u8F6E", "\u7269", "turbine"], "generator": ["\u53D1\u7535\u673A", "\u7269", "generator"], "piston": ["\u6D3B\u585E", "\u7269", "piston"], "cylind": ["\u6C7D\u7F38", "\u7269", "cylind"], "bolt": ["\u87BA\u6813", "\u7269", "bolt"], "rivet": ["\u94C6\u9489", "\u7269", "rivet"], "weld": ["\u710A\u63A5", "\u7269", "weld"], "sold": ["\u948E\u710A", "\u7269", "sold"], "foundr": ["\u94F8\u9020\u5382", "\u7269", "foundr"], "lathe": ["\u8F66\u5E8A", "\u7269", "lathe"], "circuit": ["\u7535\u8DEF", "\u7269", "circuit"], "amper": ["\u7535\u6D41", "\u7269", "amper"], "voltag": ["\u7535\u538B", "\u7269", "voltag"], "resist": ["\u7535\u963B", "\u7269", "resist"], "inductor": ["\u7535\u611F", "\u7269", "inductor"], "transistor": ["\u6676\u4F53\u7BA1", "\u7269", "transistor"], "diod": ["\u4E8C\u6781\u7BA1", "\u7269", "diod"], "semico": ["\u534A\u5BFC\u4F53", "\u7269", "semico"], "chip": ["\u82AF\u7247", "\u7269", "chip"], "algor": ["\u7B97\u6CD5", "\u7269", "algor"], "program": ["\u7A0B\u5E8F", "\u7269", "program"], "protocol": ["\u534F\u8BAE", "\u7269", "protocol"], "crypt": ["\u52A0\u5BC6", "\u7269", "crypt"], "binary": ["\u4E8C\u8FDB\u5236", "\u7269", "binary"], "digital": ["\u6570\u5B57", "\u7269", "digital"], "subse": ["\u5B50\u96C6", "\u7269", "subse"], "varia": ["\u53D8\u91CF", "\u7269", "varia"], "limit": ["\u6781\u9650", "\u7269", "limit"], "continuu": ["\u8FDE\u7EED", "\u7269", "continuu"], "deriv": ["\u5BFC\u6570", "\u7269", "deriv"], "differen": ["\u5FAE\u5206", "\u7269", "differen"], "probab": ["\u6982\u7387", "\u7269", "probab"], "statis": ["\u7EDF\u8BA1", "\u7269", "statis"], "averag": ["\u5E73\u5747", "\u7269", "averag"], "varian": ["\u65B9\u5DEE", "\u7269", "varian"], "correl": ["\u76F8\u5173", "\u7269", "correl"], "regres": ["\u56DE\u5F52", "\u7269", "regres"], "sampl": ["\u6837\u672C", "\u7269", "sampl"], "axiom": ["\u516C\u7406", "\u7269", "axiom"], "lemma": ["\u5F15\u7406", "\u7269", "lemma"], "topol": ["\u62D3\u6251", "\u7269", "topol"], "matrix": ["\u77E9\u9635", "\u7269", "matrix"], "determ": ["\u884C\u5217\u5F0F", "\u7269", "determ"], "permut": ["\u6392\u5217", "\u7269", "permut"], "conver": ["\u6536\u655B", "\u7269", "conver"], "diverg": ["\u53D1\u6563", "\u7269", "diverg"], "graph": ["\u56FE", "\u7269", "graph"], "recurs": ["\u9012\u5F52", "\u7269", "recurs"], "optim": ["\u6700\u4F18\u5316", "\u7269", "optim"], "proposit": ["\u547D\u9898", "\u6027", "proposit"], "premiss": ["\u524D\u63D0", "\u6027", "premiss"], "infer": ["\u63A8\u65AD", "\u6027", "infer"], "deduc": ["\u6F14\u7ECE", "\u6027", "deduc"], "abduc": ["\u6EAF\u56E0", "\u6027", "abduc"], "syllog": ["\u4E09\u6BB5\u8BBA", "\u6027", "syllog"], "induc": ["\u5F52\u7EB3", "\u6027", "induc"], "falsif": ["\u8BC1\u4F2A", "\u6027", "falsif"], "verif": ["\u9A8C\u8BC1", "\u6027", "verif"], "consist": ["\u4E00\u81F4", "\u6027", "consist"], "contradict": ["\u77DB\u76FE", "\u6027", "contradict"], "paradox": ["\u6096\u8BBA", "\u6027", "paradox"], "fallac": ["\u8C2C\u8BEF", "\u6027", "fallac"], "sophism": ["\u8BE1\u8FA9", "\u6027", "sophism"], "quantif": ["\u91CF\u5316", "\u6027", "quantif"], "predicat": ["\u8C13\u8BCD", "\u6027", "predicat"], "entail": ["\u8574\u6DB5", "\u6027", "entail"], "implic": ["\u8574\u542B", "\u6027", "implic"], "equival": ["\u7B49\u4EF7", "\u6027", "equival"], "negation": ["\u5426\u5B9A", "\u6027", "negation"], "conjunct": ["\u5408\u53D6", "\u6027", "conjunct"], "disjunct": ["\u6790\u53D6", "\u6027", "disjunct"], "tautolog": ["\u91CD\u8A00", "\u6027", "tautolog"], "assert": ["\u65AD\u8A00", "\u6027", "assert"], "corollar": ["\u7CFB", "\u6027", "corollar"], "literat": ["\u6587\u5B66", "\u7269", "literat"], "prose": ["\u6563\u6587", "\u7269", "prose"], "epic": ["\u53F2\u8BD7", "\u7269", "epic"], "lyric": ["\u6292\u60C5\u8BD7", "\u7269", "lyric"], "elegy": ["\u633D\u6B4C", "\u7269", "elegy"], "sonnet": ["\u5341\u56DB\u884C\u8BD7", "\u7269", "sonnet"], "roman": ["\u957F\u7BC7\u5C0F\u8BF4", "\u7269", "roman"], "romance": ["\u4F20\u5947", "\u7269", "romance"], "tale": ["\u6545\u4E8B", "\u7269", "tale"], "episode": ["\u63D2\u66F2", "\u7269", "episode"], "plot": ["\u60C5\u8282", "\u7269", "plot"], "theme": ["\u4E3B\u9898", "\u7269", "theme"], "motif": ["\u6BCD\u9898", "\u7269", "motif"], "protago": ["\u4E3B\u89D2", "\u7269", "protago"], "antago": ["\u53CD\u6D3E", "\u7269", "antago"], "editor": ["\u7F16\u8F91", "\u7269", "editor"], "publis": ["\u51FA\u7248\u8005", "\u7269", "publis"], "critic": ["\u6279\u8BC4\u5BB6", "\u7269", "critic"], "revie": ["\u8BC4\u8BBA", "\u7269", "revie"], "essay": ["\u968F\u7B14", "\u7269", "essay"], "biogra": ["\u4F20\u8BB0", "\u7269", "biogra"], "memoir": ["\u56DE\u5FC6\u5F55", "\u7269", "memoir"], "anthol": ["\u9009\u96C6", "\u7269", "anthol"], "metaphor": ["\u9690\u55BB", "\u7269", "metaphor"], "parody": ["\u620F\u4EFF", "\u7269", "parody"], "pitch": ["\u97F3\u9AD8", "\u7269", "pitch"], "chord": ["\u548C\u5F26", "\u7269", "chord"], "clef": ["\u8C31\u53F7", "\u7269", "clef"], "staff": ["\u8C31\u8868", "\u7269", "staff"], "ensemble": ["\u5408\u594F", "\u7269", "ensemble"], "solo": ["\u72EC\u594F", "\u7269", "solo"], "duet": ["\u4E8C\u91CD\u594F", "\u7269", "duet"], "conductor": ["\u6307\u6325", "\u7269", "conductor"], "concert": ["\u97F3\u4E50\u4F1A", "\u7269", "concert"], "opera": ["\u6B4C\u5267", "\u7269", "opera"], "operet": ["\u8F7B\u6B4C\u5267", "\u7269", "operet"], "ballet": ["\u82AD\u857E", "\u7269", "ballet"], "puppet": ["\u6728\u5076", "\u7269", "puppet"], "masque": ["\u5047\u9762\u5267", "\u7269", "masque"], "carnival": ["\u72C2\u6B22", "\u7269", "carnival"], "parade": ["\u6E38\u884C", "\u7269", "parade"], "acrobat": ["\u6742\u6280", "\u7269", "acrobat"], "jongl": ["\u6742\u800D", "\u7269", "jongl"], "aria": ["\u548F\u53F9\u8C03", "\u7269", "aria"], "sonata": ["\u594F\u9E23\u66F2", "\u7269", "sonata"], "sympho": ["\u4EA4\u54CD\u4E50", "\u7269", "sympho"], "quartet": ["\u56DB\u91CD\u594F", "\u7269", "quartet"], "prelude": ["\u524D\u594F", "\u7269", "prelude"], "canvas": ["\u753B\u5E03", "\u7269", "canvas"], "pigment": ["\u989C\u6599", "\u7269", "pigment"], "palette": ["\u8C03\u8272\u677F", "\u7269", "palette"], "brush": ["\u753B\u7B14", "\u7269", "brush"], "easel": ["\u753B\u67B6", "\u7269", "easel"], "sketch": ["\u901F\u5199", "\u7269", "sketch"], "portra": ["\u8096\u50CF", "\u7269", "portra"], "landscape": ["\u98CE\u666F", "\u7269", "landscape"], "mural": ["\u58C1\u753B", "\u7269", "mural"], "fresco": ["\u6E7F\u58C1\u753B", "\u7269", "fresco"], "engrav": ["\u7248\u753B", "\u7269", "engrav"], "etch": ["\u8680\u523B", "\u7269", "etch"], "lithog": ["\u77F3\u7248", "\u7269", "lithog"], "woodcu": ["\u6728\u523B", "\u7269", "woodcu"], "relie": ["\u6D6E\u96D5", "\u7269", "relie"], "bust": ["\u80F8\u50CF", "\u7269", "bust"], "medall": ["\u50CF\u7AE0", "\u7269", "medall"], "gallery": ["\u753B\u5ECA", "\u7269", "gallery"], "exhib": ["\u5C55\u89C8", "\u7269", "exhib"], "curator": ["\u7B56\u5C55\u4EBA", "\u7269", "curator"], "aesthe": ["\u7F8E\u5B66", "\u7269", "aesthe"], "perspe": ["\u900F\u89C6", "\u7269", "perspe"], "symmetry": ["\u5BF9\u79F0", "\u7269", "symmetry"], "contrast": ["\u5BF9\u6BD4", "\u7269", "contrast"], "tinct": ["\u6DE1\u8272", "\u7269", "tinct"], "phonet": ["\u8BED\u97F3\u5B66", "\u7269", "phonet"], "phonol": ["\u97F3\u7CFB\u5B66", "\u7269", "phonol"], "morpho": ["\u5F62\u6001\u5B66", "\u7269", "morpho"], "pragma": ["\u8BED\u7528", "\u7269", "pragma"], "sociole": ["\u793E\u4F1A\u65B9\u8A00", "\u7269", "sociole"], "pictog": ["\u8C61\u5F62", "\u7269", "pictog"], "ideog": ["\u8868\u610F", "\u7269", "ideog"], "alphabet": ["\u5B57\u6BCD\u8868", "\u7269", "alphabet"], "graphem": ["\u5B57\u7D20", "\u7269", "graphem"], "alloph": ["\u97F3\u4F4D\u53D8\u4F53", "\u7269", "alloph"], "prefix": ["\u524D\u7F00", "\u7269", "prefix"], "suffix": ["\u540E\u7F00", "\u7269", "suffix"], "infix": ["\u4E2D\u7F00", "\u7269", "infix"], "stem": ["\u8BCD\u5E72", "\u7269", "stem"], "lexem": ["\u8BCD\u4F4D", "\u7269", "lexem"], "paradigm": ["\u8BCD\u5F62\u53D8\u5316", "\u7269", "paradigm"], "declension": ["\u53D8\u683C", "\u7269", "declension"], "conjug": ["\u53D8\u4F4D", "\u7269", "conjug"], "congru": ["\u4E00\u81F4", "\u7269", "congru"], "casus": ["\u683C", "\u7269", "casus"], "aspect": ["\u4F53", "\u7269", "aspect"], "transla": ["\u7FFB\u8BD1", "\u7269", "transla"], "transcr": ["\u8F6C\u5199", "\u7269", "transcr"], "translit": ["\u97F3\u8BD1", "\u7269", "translit"], "orthogr": ["\u6B63\u5B57\u6CD5", "\u7269", "orthogr"], "guilt": ["\u5185\u759A", "\u6027", "guilt"], "superb": ["\u9A84\u50B2", "\u6027", "superb"], "zel": ["\u5992\u7FA1", "\u6027", "zel"], "resent": ["\u6028\u6068", "\u6027", "resent"], "rabi": ["\u66B4\u6012", "\u6027", "rabi"], "furia": ["\u72C2\u6012", "\u6027", "furia"], "wrath": ["\u76DB\u6012", "\u6027", "wrath"], "scorn": ["\u8511\u89C6", "\u6027", "scorn"], "dread": ["\u754F\u60E7", "\u6027", "dread"], "panic": ["\u6050\u614C", "\u6027", "panic"], "shock": ["\u9707\u60CA", "\u6027", "shock"], "surpr": ["\u60CA\u8BB6", "\u6027", "surpr"], "amaze": ["\u60CA\u5F02", "\u6027", "amaze"], "awe": ["\u656C\u754F", "\u6027", "awe"], "rever": ["\u656C\u4EF0", "\u6027", "rever"], "nostal": ["\u6000\u65E7", "\u6027", "nostal"], "grief": ["\u54C0\u75DB", "\u6027", "grief"], "optimis": ["\u4E50\u89C2", "\u6027", "optimis"], "pessim": ["\u60B2\u89C2", "\u6027", "pessim"], "conten": ["\u6EE1\u8DB3", "\u6027", "conten"], "embarr": ["\u5C34\u5C2C", "\u6027", "embarr"], "confid": ["\u81EA\u4FE1", "\u6027", "confid"], "ecsta": ["\u72C2\u559C", "\u6027", "ecsta"], "euphor": ["\u6B23\u5FEB", "\u6027", "euphor"], "irrita": ["\u70E6\u8E81", "\u6027", "irrita"], "vision": ["\u89C6\u89C9", "\u6027", "vision"], "audit": ["\u542C\u89C9", "\u6027", "audit"], "somato": ["\u8EAF\u4F53\u611F\u89C9", "\u6027", "somato"], "nocice": ["\u75DB\u89C9", "\u6027", "nocice"], "thermo": ["\u6E29\u89C9", "\u6027", "thermo"], "proprio": ["\u672C\u4F53\u89C9", "\u6027", "proprio"], "stimulus": ["\u523A\u6FC0", "\u6027", "stimulus"], "threshold": ["\u9608", "\u6027", "threshold"], "sensit": ["\u654F\u611F", "\u6027", "sensit"], "habitu": ["\u4E60\u60EF\u5316", "\u6027", "habitu"], "illusion": ["\u9519\u89C9", "\u6027", "illusion"], "halluc": ["\u5E7B\u89C9", "\u6027", "halluc"], "bright": ["\u4EAE\u5EA6", "\u6027", "bright"], "loudn": ["\u54CD\u5EA6", "\u6027", "loudn"], "reverb": ["\u6DF7\u54CD", "\u6027", "reverb"], "synest": ["\u901A\u611F", "\u6027", "synest"], "kinest": ["\u52A8\u89C9", "\u6027", "kinest"], "apperc": ["\u7EDF\u89C9", "\u6027", "apperc"], "recogn": ["\u8BC6\u522B", "\u6027", "recogn"], "identif": ["\u8FA8\u8BA4", "\u6027", "identif"], "orient": ["\u5B9A\u5411", "\u6027", "orient"], "vestibul": ["\u524D\u5EAD\u89C9", "\u6027", "vestibul"], "sensor": ["\u4F20\u611F\u5668", "\u6027", "sensor"], "rostr": ["\u5599", "\u7269", "rostr"], "ala": ["\u7FFC", "\u7269", "ala"], "ungul": ["\u8E44", "\u7269", "ungul"], "caud": ["\u5C3E", "\u7269", "caud"], "iub": ["\u9B03", "\u7269", "iub"], "vell": ["\u6BDB\u76AE", "\u7269", "vell"], "antenna": ["\u89E6\u89D2", "\u7269", "antenna"], "branchi": ["\u9CC3", "\u7269", "branchi"], "nid": ["\u5DE2", "\u7269", "nid"], "hibern": ["\u51AC\u7720", "\u7269", "hibern"], "rumin": ["\u53CD\u520D", "\u7269", "rumin"], "predat": ["\u6355\u98DF", "\u7269", "predat"], "pinna": ["\u9CCD", "\u7269", "pinna"], "squam": ["\u9CDE", "\u7269", "squam"], "crist": ["\u51A0\u7FBD", "\u7269", "crist"], "gregar": ["\u7FA4\u5C45", "\u7269", "gregar"], "carniv": ["\u98DF\u8089", "\u7269", "carniv"], "herbiv": ["\u98DF\u8349", "\u7269", "herbiv"], "omniv": ["\u6742\u98DF", "\u7269", "omniv"], "larva": ["\u5E7C\u4F53", "\u7269", "larva"], "pupa": ["\u86F9", "\u7269", "pupa"], "nymph": ["\u82E5\u866B", "\u7269", "nymph"], "cocon": ["\u8327", "\u7269", "cocon"], "chrysal": ["\u86F9\u58F3", "\u7269", "chrysal"], "plumag": ["\u7FBD\u8863", "\u7269", "plumag"], "caul": ["\u830E", "\u7269", "caul"], "gemin": ["\u53F6\u82BD", "\u7269", "gemin"], "flosc": ["\u82B1\u51A0", "\u7269", "flosc"], "petal": ["\u82B1\u74E3", "\u7269", "petal"], "stamen": ["\u96C4\u854A", "\u7269", "stamen"], "pistil": ["\u96CC\u854A", "\u7269", "pistil"], "perica": ["\u679C\u76AE", "\u7269", "perica"], "testac": ["\u79CD\u76AE", "\u7269", "testac"], "radicul": ["\u987B\u6839", "\u7269", "radicul"], "tuber": ["\u5757\u830E", "\u7269", "tuber"], "viticul": ["\u85E4\u8513", "\u7269", "viticul"], "decidu": ["\u843D\u53F6", "\u7269", "decidu"], "semperv": ["\u5E38\u7EFF", "\u7269", "semperv"], "pollin": ["\u82B1\u7C89", "\u7269", "pollin"], "insit": ["\u5AC1\u63A5", "\u7269", "insit"], "propag": ["\u6266\u63D2", "\u7269", "propag"], "putat": ["\u4FEE\u526A", "\u7269", "putat"], "tepidar": ["\u6E29\u5BA4", "\u7269", "tepidar"], "pomari": ["\u679C\u56ED", "\u7269", "pomari"], "hortul": ["\u83DC\u5703", "\u7269", "hortul"], "seminari": ["\u82D7\u5703", "\u7269", "seminari"], "stercor": ["\u65BD\u80A5", "\u7269", "stercor"], "herbic": ["\u9664\u8349", "\u7269", "herbic"], "frond": ["\u53F6\u4E1B", "\u7269", "frond"], "bulb": ["\u9CDE\u830E", "\u7269", "bulb"], "platea": ["\u8857\u9053", "\u7269", "platea"], "angipo": ["\u5DF7", "\u7269", "angipo"], "forum": ["\u5E7F\u573A", "\u7269", "forum"], "porta": ["\u57CE\u95E8", "\u7269", "porta"], "dok": ["\u7801\u5934", "\u7269", "dok"], "pharos": ["\u706F\u5854", "\u7269", "pharos"], "fontan": ["\u55B7\u6CC9", "\u7269", "fontan"], "monument": ["\u7EAA\u5FF5\u7891", "\u7269", "monument"], "macell": ["\u5E02\u573A", "\u7269", "macell"], "officina": ["\u4F5C\u574A", "\u7269", "officina"], "arena": ["\u7ADE\u6280\u573A", "\u7269", "arena"], "aquaed": ["\u6C34\u6E20", "\u7269", "aquaed"], "cloaca": ["\u4E0B\u6C34\u9053", "\u7269", "cloaca"], "lantern": ["\u8DEF\u706F", "\u7269", "lantern"], "puteus": ["\u6C34\u4E95", "\u7269", "puteus"], "campan": ["\u949F\u697C", "\u7269", "campan"], "ergast": ["\u7262\u623F", "\u7269", "ergast"], "teloni": ["\u6D77\u5173", "\u7269", "teloni"], "cancell": ["\u6805\u680F", "\u7269", "cancell"], "paviment": ["\u94FA\u9762", "\u7269", "paviment"], "crepidin": ["\u8DEF\u7F18", "\u7269", "crepidin"], "suggest": ["\u8BB2\u575B", "\u7269", "suggest"], "basilica": ["\u4F1A\u5802", "\u7269", "basilica"], "thermae": ["\u6D74\u573A", "\u7269", "thermae"], "hippodro": ["\u8DD1\u9A6C\u573A", "\u7269", "hippodro"], "mensula": ["\u5C0F\u684C", "\u7269", "mensula"], "scamnum": ["\u957F\u51F3", "\u7269", "scamnum"], "lectulus": ["\u5367\u69BB", "\u7269", "lectulus"], "pluteus": ["\u58C1\u67B6", "\u7269", "pluteus"], "calathus": ["\u82B1\u7BEE", "\u7269", "calathus"], "patina": ["\u76D8", "\u7269", "patina"], "catillus": ["\u789F", "\u7269", "catillus"], "urceus": ["\u58F6", "\u7269", "urceus"], "olla": ["\u9505", "\u7269", "olla"], "cacabus": ["\u7096\u9505", "\u7269", "cacabus"], "foculus": ["\u5C0F\u7089", "\u7269", "foculus"], "furca": ["\u53C9", "\u7269", "furca"], "cochlear": ["\u52FA", "\u7269", "cochlear"], "bacill": ["\u5C0F\u68D2\u3001\u7B77", "\u7269", "bacill"], "forfex": ["\u526A", "\u7269", "forfex"], "situla": ["\u6876", "\u7269", "situla"], "ampulla": ["\u74F6", "\u7269", "ampulla"], "candela": ["\u70DB\u53F0", "\u7269", "candela"], "pelvis": ["\u76C6", "\u7269", "pelvis"], "labrum": ["\u6D17\u6DA4\u76C6", "\u7269", "labrum"], "mappa": ["\u9910\u5DFE", "\u7269", "mappa"], "abacus": ["\u7B97\u76D8", "\u7269", "abacus"], "tintin": ["\u94C3", "\u7269", "tintin"], "scrinium": ["\u5377\u7BB1", "\u7269", "scrinium"], "capsula": ["\u5C0F\u76D2", "\u7269", "capsula"], "ablut": ["\u76E5\u6D17", "\u52A8", "ablut"], "lotio": ["\u6D17\u6DA4", "\u52A8", "lotio"], "ters": ["\u64E6\u62ED", "\u52A8", "ters"], "purgat": ["\u6253\u626B", "\u52A8", "purgat"], "compo": ["\u6574\u7406", "\u52A8", "compo"], "sarci": ["\u7F1D\u8865", "\u52A8", "sarci"], "fod": ["\u6316\u6398", "\u52A8", "fod"], "cumul": ["\u5806\u53E0", "\u52A8", "cumul"], "suspend": ["\u60AC\u6302", "\u52A8", "suspend"], "accend": ["\u70B9\u71C3", "\u52A8", "accend"], "extingu": ["\u7184\u706D", "\u52A8", "extingu"], "haur": ["\u8200\u53D6", "\u52A8", "haur"], "pensa": ["\u79F0\u91CF", "\u52A8", "pensa"], "involv": ["\u5305\u88F9", "\u52A8", "involv"], "fasc": ["\u6346\u624E", "\u52A8", "fasc"], "sterna": ["\u94FA\u5C55", "\u52A8", "sterna"], "volv": ["\u5377\u8D77", "\u52A8", "volv"], "scop": ["\u626B\u5E1A", "\u52A8", "scop"], "verrit": ["\u6E05\u626B", "\u52A8", "verrit"], "deterg": ["\u53BB\u6C61", "\u52A8", "deterg"], "laxa": ["\u653E\u677E", "\u52A8", "laxa"], "quiesc": ["\u6B47\u606F", "\u52A8", "quiesc"], "suscit": ["\u5524\u9192", "\u52A8", "suscit"], "pervig": ["\u5B88\u591C", "\u52A8", "pervig"], "famul": ["\u4F8D\u5949", "\u52A8", "famul"], "incumb": ["\u4FEF\u8EAB", "\u52A8", "incumb"], "genu": ["\u8DEA", "\u52A8", "genu"], "serpo": ["\u722C\u884C", "\u52A8", "serpo"], "volut": ["\u7FFB\u6EDA", "\u52A8", "volut"], "levat": ["\u4E3E\u8D77", "\u52A8", "levat"], "iact": ["\u629B\u63B7", "\u52A8", "iact"], "excip": ["\u63A5\u4F4F", "\u52A8", "excip"], "vellic": ["\u62E7\u634F", "\u52A8", "vellic"], "calcat": ["\u8E29\u8E0F", "\u52A8", "calcat"], "alapa": ["\u62CD\u6253", "\u52A8", "alapa"], "calcitr": ["\u8E22", "\u52A8", "calcitr"], "gest": ["\u625B\u62AC", "\u52A8", "gest"], "innu": ["\u70B9\u5934\u793A\u610F", "\u52A8", "innu"], "renu": ["\u6447\u5934\u62D2\u7EDD", "\u52A8", "renu"], "suffl": ["\u5439\u6C14", "\u52A8", "suffl"], "sibil": ["\u5439\u54E8", "\u52A8", "sibil"], "scalpt": ["\u6414", "\u52A8", "scalpt"], "tunde": ["\u6376\u6253", "\u52A8", "tunde"], "nut": ["\u6446\u52A8", "\u52A8", "nut"], "titub": ["\u8E09\u8DC4", "\u52A8", "titub"], "claudic": ["\u8DDB\u884C", "\u52A8", "claudic"], "gress": ["\u8FC8\u6B65", "\u52A8", "gress"], "sess": ["\u5750\u59FF", "\u52A8", "sess"], "fricat": ["\u63C9\u6413", "\u52A8", "fricat"], "laevis": ["\u5E73\u6ED1", "\u6027", "laevis"], "crepit": ["\u567C\u556A", "\u6027", "crepit"], "strid": ["\u523A\u8033", "\u6027", "strid"], "murmur": ["\u4F4E\u8BED\u58F0", "\u6027", "murmur"], "susurr": ["\u7AB8\u7AA3", "\u6027", "susurr"], "fragr": ["\u82AC\u82B3", "\u6027", "fragr"], "putid": ["\u6076\u81ED", "\u6027", "putid"], "sapid": ["\u6709\u5473", "\u6027", "sapid"], "insuls": ["\u65E0\u5473", "\u6027", "insuls"], "squal": ["\u6C61\u79FD", "\u6027", "squal"], "limpid": ["\u6E05\u6F88", "\u6027", "limpid"], "turbid": ["\u6D51\u6D4A", "\u6027", "turbid"], "lucid": ["\u660E\u4EAE", "\u6027", "lucid"], "tenebr": ["\u5E7D\u6697", "\u6027", "tenebr"], "pallid": ["\u82CD\u767D", "\u6027", "pallid"], "ferrugin": ["\u94C1\u9508\u8272", "\u6027", "ferrugin"], "ianthin": ["\u7D2B\u7F57\u5170\u8272", "\u6027", "ianthin"], "punic": ["\u7EDB\u7EA2", "\u6027", "punic"], "smaragd": ["\u7FE0\u7EFF", "\u6027", "smaragd"], "sapphir": ["\u5929\u84DD", "\u6027", "sapphir"], "amethyst": ["\u7D2B\u6676", "\u6027", "amethyst"], "ochr": ["\u8D6D\u77F3", "\u6027", "ochr"], "miniat": ["\u6731\u7EA2", "\u6027", "miniat"], "nive": ["\u96EA\u767D", "\u6027", "nive"], "fulgid": ["\u95EA\u8000", "\u6027", "fulgid"], "primav": ["\u65E9\u6625", "\u7269", "primav"], "hiem": ["\u4E25\u51AC", "\u7269", "hiem"], "canic": ["\u4F0F\u5929", "\u7269", "canic"], "nival": ["\u964D\u96EA", "\u7269", "nival"], "pluvial": ["\u96E8\u5B63", "\u7269", "pluvial"], "siccit": ["\u65F1\u5B63", "\u7269", "siccit"], "aestiv": ["\u590F\u4EE4", "\u7269", "aestiv"], "vernal": ["\u6625\u4EE4", "\u7269", "vernal"], "nubos": ["\u591A\u4E91", "\u7269", "nubos"], "fulmin": ["\u6253\u96F7", "\u7269", "fulmin"], "grandin": ["\u4E0B\u96F9", "\u7269", "grandin"], "pruin": ["\u7ED3\u971C", "\u7269", "pruin"], "roran": ["\u964D\u9732", "\u7269", "roran"], "calig": ["\u96FE\u972D", "\u7269", "calig"], "flatus": ["\u9635\u98CE", "\u7269", "flatus"], "afflat": ["\u5439\u62C2", "\u7269", "afflat"], "imbrif": ["\u591A\u96E8", "\u7269", "imbrif"], "gelid": ["\u4E25\u5BD2", "\u7269", "gelid"], "tepor": ["\u5FAE\u6E29", "\u7269", "tepor"], "umbrat": ["\u836B\u51C9", "\u7269", "umbrat"], "apric": ["\u5411\u9633", "\u7269", "apric"], "roscid": ["\u5E26\u9732", "\u7269", "roscid"], "nimbos": ["\u9634\u4E91", "\u7269", "nimbos"], "ventos": ["\u591A\u98CE", "\u7269", "ventos"], "frigor": ["\u5BD2\u6C14", "\u7269", "frigor"], "vehicul": ["\u8F66\u8F86", "\u7269", "vehicul"], "carpent": ["\u8F66\u67B6", "\u7269", "carpent"], "cisi": ["\u8F7B\u8F66", "\u7269", "cisi"], "essed": ["\u6218\u8F66", "\u7269", "essed"], "carruc": ["\u7BF7\u8F66", "\u7269", "carruc"], "lectic": ["\u80A9\u8206", "\u7269", "lectic"], "stiva": ["\u8F66\u8F95", "\u7269", "stiva"], "temo": ["\u8F66\u8F95", "\u7269", "temo"], "canth": ["\u8F6E\u8F8B", "\u7269", "canth"], "modiol": ["\u8F6E\u6BC2", "\u7269", "modiol"], "iugum": ["\u8F6D", "\u7269", "iugum"], "habena": ["\u7F30\u7EF3", "\u7269", "habena"], "fren": ["\u9A6C\u56BC", "\u7269", "fren"], "mutat": ["\u6362\u9A6C", "\u7269", "mutat"], "tabell": ["\u4FE1\u4F7F", "\u7269", "tabell"], "rheda": ["\u56DB\u8F6E\u8F66", "\u7269", "rheda"], "clabul": ["\u8D27\u8F66", "\u7269", "clabul"], "remig": ["\u5212\u6868", "\u7269", "remig"], "velific": ["\u626C\u5E06", "\u7269", "velific"], "navig": ["\u822A\u884C", "\u7269", "navig"], "prora": ["\u8239\u9996", "\u7269", "prora"], "puppis": ["\u8239\u5C3E", "\u7269", "puppis"], "malus": ["\u6845", "\u7269", "malus"], "antemna": ["\u5E06\u6841", "\u7269", "antemna"], "rudens": ["\u7F06\u7EF3", "\u7269", "rudens"], "venalic": ["\u8D29\u5356", "\u7269", "venalic"], "auctio": ["\u62CD\u5356", "\u7269", "auctio"], "licitat": ["\u7ADE\u4EF7", "\u7269", "licitat"], "campon": ["\u5E97\u4E3B", "\u7269", "campon"], "propola": ["\u96F6\u552E\u5546", "\u7269", "propola"], "sector": ["\u56E4\u79EF\u8005", "\u7269", "sector"], "argentar": ["\u94B1\u5E84", "\u7269", "argentar"], "mensari": ["\u5151\u6362\u5546", "\u7269", "mensari"], "trapezit": ["\u94B1\u5546", "\u7269", "trapezit"], "syngraph": ["\u501F\u636E", "\u7269", "syngraph"], "apocha": ["\u6536\u636E", "\u7269", "apocha"], "portitor": ["\u627F\u8FD0\u4EBA", "\u7269", "portitor"], "naulum": ["\u8FD0\u8D39", "\u7269", "naulum"], "vectura": ["\u8FD0\u8F93", "\u7269", "vectura"], "mercim": ["\u8D27\u7269", "\u7269", "mercim"], "promptuar": ["\u8D27\u6808", "\u7269", "promptuar"], "apotheca": ["\u8D27\u4ED3", "\u7269", "apotheca"], "empori": ["\u5546\u57E0", "\u7269", "empori"], "redempt": ["\u8D4E\u4E70", "\u7269", "redempt"], "redemptor": ["\u627F\u5305\u4EBA", "\u7269", "redemptor"], "locator": ["\u51FA\u79DF\u4EBA", "\u7269", "locator"], "fructuar": ["\u6536\u76CA\u4EBA", "\u7269", "fructuar"], "impensa": ["\u5F00\u9500", "\u7269", "impensa"], "sumptus": ["\u8D39\u7528", "\u7269", "sumptus"], "lucellum": ["\u5C0F\u5229", "\u7269", "lucellum"], "satio": ["\u64AD\u79CD", "\u52A8", "satio"], "plantat": ["\u683D\u79CD", "\u52A8", "plantat"], "sarri": ["\u9664\u8349", "\u52A8", "sarri"], "runca": ["\u62D4\u8349", "\u52A8", "runca"], "mess": ["\u6536\u5272", "\u52A8", "mess"], "tritur": ["\u8131\u7C92", "\u52A8", "tritur"], "ventil": ["\u626C\u8C37", "\u52A8", "ventil"], "granar": ["\u8C37\u4ED3", "\u7269", "granar"], "frug": ["\u6536\u6210", "\u7269", "frug"], "noval": ["\u4F11\u8015\u5730", "\u7269", "noval"], "hiberna": ["\u8D8A\u51AC", "\u52A8", "hiberna"], "pecuaria": ["\u755C\u7267", "\u52A8", "pecuaria"], "mulctr": ["\u6324\u5976", "\u52A8", "mulctr"], "tonsur": ["\u526A\u6BDB", "\u52A8", "tonsur"], "veller": ["\u7F8A\u6BDB", "\u7269", "veller"], "apicul": ["\u517B\u8702", "\u52A8", "apicul"], "sericu": ["\u517B\u8695", "\u52A8", "sericu"], "vivarium": ["\u517B\u6B96\u573A", "\u7269", "vivarium"], "compasc": ["\u5171\u7267", "\u52A8", "compasc"], "clausur": ["\u56F4\u5708", "\u52A8", "clausur"], "olivet": ["\u6A44\u6984\u56ED", "\u7269", "olivet"], "viridari": ["\u82B1\u56ED", "\u7269", "viridari"], "rosari": ["\u73AB\u7470\u56ED", "\u7269", "rosari"], "herbari": ["\u8349\u836F\u56ED", "\u7269", "herbari"], "falc": ["\u9570\u5200", "\u7269", "falc"], "figul": ["\u9676\u5DE5", "\u52A8", "figul"], "coctur": ["\u70E7\u5236", "\u52A8", "coctur"], "emal": ["\u73D0\u7405", "\u52A8", "emal"], "frit": ["\u91C9\u6599", "\u52A8", "frit"], "vitrif": ["\u6210\u73BB\u7483", "\u52A8", "vitrif"], "fusor": ["\u94F8\u5DE5", "\u52A8", "fusor"], "flatil": ["\u5439\u5236", "\u52A8", "flatil"], "politor": ["\u78E8\u5DE5", "\u52A8", "politor"], "fullon": ["\u6F02\u6D17\u5DE5", "\u52A8", "fullon"], "ting": ["\u67D3\u8272", "\u52A8", "ting"], "textrin": ["\u7EC7\u574A", "\u52A8", "textrin"], "netr": ["\u7EBA\u7EB1", "\u52A8", "netr"], "lanific": ["\u6BDB\u7EBA", "\u52A8", "lanific"], "pellio": ["\u76AE\u5320", "\u52A8", "pellio"], "coriar": ["\u5236\u9769", "\u52A8", "coriar"], "sarcinat": ["\u7F1D\u8865\u5320", "\u52A8", "sarcinat"], "sutrin": ["\u978B\u5320\u94FA", "\u52A8", "sutrin"], "scob": ["\u6728\u5C51", "\u52A8", "scob"], "rasur": ["\u5228\u82B1", "\u52A8", "rasur"], "torn": ["\u65CB\u524A", "\u52A8", "torn"], "caelam": ["\u933E\u523B", "\u52A8", "caelam"], "bractea": ["\u91D1\u7B94", "\u52A8", "bractea"], "murex": ["\u9AA8\u87BA\u7D2B", "\u52A8", "murex"], "purpurar": ["\u67D3\u574A", "\u52A8", "purpurar"], "lanari": ["\u6BDB\u7EC7\u5DE5", "\u52A8", "lanari"], "sphygm": ["\u8109\u640F", "\u52A8", "sphygm"], "arteri": ["\u52A8\u8109", "\u52A8", "arteri"], "medull": ["\u9AA8\u9AD3", "\u52A8", "medull"], "tendin": ["\u808C\u8171", "\u52A8", "tendin"], "articul": ["\u5173\u8282", "\u52A8", "articul"], "cartilag": ["\u8F6F\u9AA8", "\u52A8", "cartilag"], "ligament": ["\u97E7\u5E26", "\u52A8", "ligament"], "glandul": ["\u817A", "\u52A8", "glandul"], "splen": ["\u813E", "\u52A8", "splen"], "vesic": ["\u8180\u80F1", "\u52A8", "vesic"], "ureter": ["\u8F93\u5C3F\u7BA1", "\u52A8", "ureter"], "phleb": ["\u9759\u8109", "\u52A8", "phleb"], "gangli": ["\u795E\u7ECF\u8282", "\u52A8", "gangli"], "synaps": ["\u7A81\u89E6", "\u52A8", "synaps"], "neuron": ["\u795E\u7ECF\u5143", "\u52A8", "neuron"], "cerebr": ["\u5927\u8111", "\u52A8", "cerebr"], "cerebell": ["\u5C0F\u8111", "\u52A8", "cerebell"], "lymph": ["\u6DCB\u5DF4", "\u52A8", "lymph"], "serum": ["\u8840\u6E05", "\u52A8", "serum"], "plasma": ["\u8840\u6D46", "\u52A8", "plasma"], "hormon": ["\u6FC0\u7D20", "\u52A8", "hormon"], "enzym": ["\u9176", "\u52A8", "enzym"], "vitamin": ["\u7EF4\u751F\u7D20", "\u52A8", "vitamin"], "febrif": ["\u9000\u70ED", "\u52A8", "febrif"], "sedat": ["\u9547\u9759", "\u52A8", "sedat"], "expect": ["\u671F\u5F85", "\u6027", "expect"], "disapp": ["\u5931\u671B", "\u6027", "disapp"], "paenit": ["\u540E\u6094", "\u6027", "paenit"], "haesit": ["\u72B9\u8C6B", "\u6027", "haesit"], "destin": ["\u51B3\u610F", "\u6027", "destin"], "confirm": ["\u786E\u8BA4", "\u6027", "confirm"], "trepid": ["\u614C\u4E71", "\u6027", "trepid"], "solac": ["\u6170\u85C9", "\u6027", "solac"], "cruci": ["\u714E\u71AC", "\u6027", "cruci"], "animat": ["\u632F\u4F5C", "\u6027", "animat"], "despond": ["\u6D88\u6C89", "\u6027", "despond"], "elat": ["\u5F97\u610F", "\u6027", "elat"], "abject": ["\u81EA\u5F03", "\u6027", "abject"], "pudibund": ["\u7F9E\u602F", "\u6027", "pudibund"], "aequanim": ["\u5E73\u9759", "\u6027", "aequanim"], "perturb": ["\u70E6\u4E71", "\u6027", "perturb"], "concitat": ["\u6FC0\u52A8", "\u6027", "concitat"], "langu": ["\u5026\u6020", "\u6027", "langu"], "alacr": ["\u632F\u594B", "\u6027", "alacr"], "indign": ["\u6124\u6168", "\u6027", "indign"], "obsequ": ["\u987A\u4ECE", "\u6027", "obsequ"], "contumac": ["\u5014\u5F3A", "\u6027", "contumac"], "impavid": ["\u65E0\u754F", "\u6027", "impavid"], "exsult": ["\u96C0\u8DC3", "\u6027", "exsult"], "lament": ["\u54C0\u53F9", "\u6027", "lament"], "congrat": ["\u9053\u8D3A", "\u52A8", "congrat"], "invit": ["\u9080\u8BF7", "\u52A8", "invit"], "epul": ["\u5BB4\u98E8", "\u52A8", "epul"], "propin": ["\u656C\u9152", "\u52A8", "propin"], "officios": ["\u6BB7\u52E4", "\u52A8", "officios"], "comitat": ["\u793C\u8BA9", "\u52A8", "comitat"], "urbanit": ["\u6587\u96C5", "\u52A8", "urbanit"], "rusticit": ["\u7C97\u9C81", "\u52A8", "rusticit"], "assent": ["\u9644\u548C", "\u52A8", "assent"], "obtrect": ["\u8D2C\u635F", "\u52A8", "obtrect"], "maledict": ["\u5492\u9A82", "\u52A8", "maledict"], "congress": ["\u4F1A\u9762", "\u52A8", "congress"], "conloq": ["\u4EA4\u8C08", "\u52A8", "conloq"], "sermocin": ["\u95F2\u8C08", "\u52A8", "sermocin"], "facet": ["\u8BD9\u8C10", "\u52A8", "facet"], "conviva": ["\u540C\u5E2D", "\u52A8", "conviva"], "familiar": ["\u4EB2\u8FD1", "\u52A8", "familiar"], "gratios": ["\u627F\u6B22", "\u52A8", "gratios"], "obviam": ["\u8FCE\u5019", "\u52A8", "obviam"], "deduct": ["\u9001\u884C", "\u52A8", "deduct"], "prosequ": ["\u9001\u522B", "\u52A8", "prosequ"], "sectat": ["\u968F\u4ECE", "\u52A8", "sectat"], "assect": ["\u4F8D\u4ECE", "\u52A8", "assect"], "lepor": ["\u98CE\u8DA3", "\u52A8", "lepor"], "comis": ["\u548C\u853C", "\u52A8", "comis"], "cacumen": ["\u5C71\u5CF0", "\u7269", "cacumen"], "cliv": ["\u5C71\u5761", "\u7269", "cliv"], "convall": ["\u5CE1\u8C37", "\u7269", "convall"], "antrum": ["\u6D1E\u7A74", "\u7269", "antrum"], "spelunc": ["\u5CA9\u6D1E", "\u7269", "spelunc"], "cataract": ["\u7011\u5E03", "\u7269", "cataract"], "torren": ["\u6025\u6D41", "\u7269", "torren"], "tundr": ["\u51BB\u539F", "\u7269", "tundr"], "crater": ["\u706B\u5C71\u53E3", "\u7269", "crater"], "fumarol": ["\u55B7\u6C14\u5B54", "\u7269", "fumarol"], "scatebr": ["\u6CC9\u6E90", "\u7269", "scatebr"], "rup": ["\u5CED\u58C1", "\u7269", "rup"], "moles": ["\u5DE8\u5CA9", "\u7269", "moles"], "cautes": ["\u7901\u77F3", "\u7269", "cautes"], "scopul": ["\u7901\u5CA9", "\u7269", "scopul"], "dune": ["\u6C99\u4E18", "\u7269", "dune"], "loam": ["\u58E4\u571F", "\u7269", "loam"], "marl": ["\u6CE5\u7070", "\u7269", "marl"], "peat": ["\u6CE5\u70AD", "\u7269", "peat"], "bog": ["\u6CE5\u6CBC", "\u7269", "bog"], "moor": ["\u8352\u6CBC", "\u7269", "moor"], "heath": ["\u77F3\u5357\u8352\u539F", "\u7269", "heath"], "steppe": ["\u8349\u539F", "\u7269", "steppe"], "savanna": ["\u7A00\u6811\u8349\u539F", "\u7269", "savanna"], "jungle": ["\u4E1B\u6797", "\u7269", "jungle"], "administr": ["\u884C\u653F", "\u7269", "administr"], "regim": ["\u653F\u4F53", "\u7269", "regim"], "rescript": ["\u6555\u7B54", "\u7269", "rescript"], "diplom": ["\u6587\u4E66", "\u7269", "diplom"], "codicill": ["\u9644\u6555", "\u7269", "codicill"], "formul": ["\u7A0B\u5F0F", "\u7269", "formul"], "procurat": ["\u4EE3\u7406", "\u7269", "procurat"], "praefec": ["\u957F\u5B98\u7F72", "\u7269", "praefec"], "proconsul": ["\u603B\u7763", "\u7269", "proconsul"], "internunt": ["\u4E2D\u4ECB", "\u7269", "internunt"], "praetori": ["\u7981\u536B", "\u7269", "praetori"], "comitatus": ["\u968F\u4ECE", "\u7269", "comitatus"], "scrini": ["\u6863\u6848\u5E93", "\u7269", "scrini"], "magistrat": ["\u5B98\u804C", "\u7269", "magistrat"], "quaestur": ["\u8D22\u52A1\u5B98\u7F72", "\u7269", "quaestur"], "censur": ["\u76D1\u5BDF\u804C", "\u7269", "censur"], "tribunat": ["\u62A4\u6C11\u5B98\u804C", "\u7269", "tribunat"], "consulat": ["\u6267\u653F\u5B98\u804C", "\u7269", "consulat"], "dictatur": ["\u72EC\u88C1\u804C", "\u7269", "dictatur"], "princeps": ["\u5143\u9996", "\u7269", "princeps"], "equester": ["\u9A91\u58EB\u9636", "\u7269", "equester"], "apparit": ["\u4F8D\u4ECE\u5B98", "\u7269", "apparit"], "lictor": ["\u6248\u4ECE", "\u7269", "lictor"], "lis": ["\u8BC9\u8BBC", "\u52A8", "lis"], "controvers": ["\u4E89\u8BBC", "\u52A8", "controvers"], "cognitio": ["\u5BA1\u7406", "\u52A8", "cognitio"], "testimon": ["\u8BC1\u8A00", "\u52A8", "testimon"], "pandect": ["\u6CD5\u5178", "\u52A8", "pandect"], "digest": ["\u6C47\u7E82", "\u52A8", "digest"], "institut": ["\u6CD5\u5B66\u9636\u68AF", "\u52A8", "institut"], "novell": ["\u65B0\u6555", "\u52A8", "novell"], "supplic": ["\u8BF7\u613F", "\u52A8", "supplic"], "intercess": ["\u5F02\u8BAE", "\u52A8", "intercess"], "veto": ["\u5426\u51B3", "\u52A8", "veto"], "tribunic": ["\u5426\u51B3\u6743", "\u52A8", "tribunic"], "cognitor": ["\u8BC9\u8BBC\u4EE3\u7406\u4EBA", "\u52A8", "cognitor"], "procurator": ["\u4EE3\u8BC9\u4EBA", "\u52A8", "procurator"], "delator": ["\u544A\u53D1\u8005", "\u52A8", "delator"], "vindex": ["\u62C5\u4FDD\u4EBA", "\u52A8", "vindex"], "fideiussor": ["\u4FDD\u8BC1\u4EBA", "\u52A8", "fideiussor"], "hypothec": ["\u62B5\u62BC", "\u52A8", "hypothec"], "mancip": ["\u8981\u5F0F\u4E70\u5356", "\u52A8", "mancip"], "nexum": ["\u503A\u52A1\u5974\u5F79", "\u52A8", "nexum"], "addict": ["\u5224\u5F52\u503A\u4E3B", "\u52A8", "addict"], "obnox": ["\u8D1F\u503A", "\u52A8", "obnox"], "poenal": ["\u5211\u7F5A\u7684", "\u52A8", "poenal"], "exsil": ["\u6D41\u653E", "\u52A8", "exsil"], "deport": ["\u653E\u9010", "\u52A8", "deport"], "dimens": ["\u5C3A\u5BF8", "\u7269", "dimens"], "interstit": ["\u95F4\u9699", "\u7269", "interstit"], "ponder": ["\u79F0\u91CD", "\u7269", "ponder"], "cubat": ["\u5BB9\u79EF", "\u7269", "cubat"], "convers": ["\u6362\u7B97", "\u7269", "convers"], "scalae": ["\u6807\u5C3A", "\u7269", "scalae"], "calibr": ["\u6821\u51C6", "\u7269", "calibr"], "uncial": ["\u4E00\u5BF8\u7684", "\u7269", "uncial"], "pedal": ["\u4E00\u5C3A\u7684", "\u7269", "pedal"], "libral": ["\u4E00\u78C5\u7684", "\u7269", "libral"], "cyath": ["\u676F\u91CF", "\u7269", "cyath"], "sextar": ["\u5347\u91CF", "\u7269", "sextar"], "hemin": ["\u534A\u5347", "\u7269", "hemin"], "choenix": ["\u65E5\u7CAE\u91CF", "\u7269", "choenix"], "medimn": ["\u6597\u91CF", "\u7269", "medimn"], "congius": ["\u52A0\u4ED1\u91CF", "\u7269", "congius"], "metric": ["\u5EA6\u91CF\u5B66", "\u7269", "metric"], "geodes": ["\u6D4B\u5730", "\u7269", "geodes"], "hypsom": ["\u6D4B\u9AD8", "\u7269", "hypsom"], "thermom": ["\u6E29\u5EA6\u8BA1", "\u7269", "thermom"], "chronom": ["\u7CBE\u5BC6\u8BA1\u65F6", "\u7269", "chronom"], "odomet": ["\u8BA1\u7A0B", "\u7269", "odomet"], "peramb": ["\u6D4B\u8DDD\u8F6E", "\u7269", "peramb"], "aequipond": ["\u914D\u91CD", "\u7269", "aequipond"], "examen": ["\u8861\u5668", "\u7269", "examen"], "sustent": ["\u7EF4\u7CFB", "\u7269", "sustent"], "pollut": ["\u6C61\u67D3", "\u7269", "pollut"], "contamin": ["\u73B7\u6C61", "\u7269", "contamin"], "purific": ["\u51C0\u5316", "\u7269", "purific"], "recycl": ["\u5FAA\u73AF", "\u7269", "recycl"], "diversit": ["\u591A\u6837", "\u7269", "diversit"], "extinct": ["\u706D\u7EDD", "\u7269", "extinct"], "endang": ["\u6FD2\u5371", "\u7269", "endang"], "sanctuar": ["\u4FDD\u62A4\u533A", "\u7269", "sanctuar"], "reserv": ["\u4FDD\u7559", "\u7269", "reserv"], "reforest": ["\u518D\u9020\u6797", "\u7269", "reforest"], "afforest": ["\u9020\u6797", "\u7269", "afforest"], "drainag": ["\u6392\u6C34", "\u7269", "drainag"], "desali": ["\u8131\u76D0", "\u7269", "desali"], "fertil": ["\u80A5\u6C83", "\u7269", "fertil"], "saliniz": ["\u76D0\u6E0D\u5316", "\u7269", "saliniz"], "laterit": ["\u7EA2\u571F", "\u7269", "laterit"], "humif": ["\u8150\u6B96\u5316", "\u7269", "humif"], "compost": ["\u5806\u80A5", "\u7269", "compost"], "conservat": ["\u517B\u62A4", "\u7269", "conservat"], "parcim": ["\u8282\u7EA6", "\u7269", "parcim"], "frugal": ["\u4FED\u6734", "\u7269", "frugal"], "sterilit": ["\u8D2B\u7620", "\u7269", "sterilit"], "silvicul": ["\u80B2\u6797", "\u7269", "silvicul"], "piscicul": ["\u517B\u9C7C", "\u7269", "piscicul"], "mola": ["\u78E8\u7C89", "\u7269", "mola"], "subig": ["\u63C9\u9762", "\u7269", "subig"], "elix": ["\u71AC\u716E", "\u7269", "elix"], "acet": ["\u918B", "\u7269", "acet"], "gar": ["\u9C7C\u9171", "\u7269", "gar"], "sapa": ["\u6D53\u6D46", "\u7269", "sapa"], "defrut": ["\u679C\u6D46", "\u7269", "defrut"], "salit": ["\u814C\u6E0D", "\u7269", "salit"], "fumig": ["\u718F\u5236", "\u7269", "fumig"], "siccat": ["\u98CE\u5E72", "\u7269", "siccat"], "tost": ["\u70D8\u70E4", "\u7269", "tost"], "pins": ["\u6363\u997C", "\u7269", "pins"], "crust": ["\u9165\u76AE", "\u7269", "crust"], "placen": ["\u8584\u997C", "\u7269", "placen"], "libum": ["\u7CD5", "\u7269", "libum"], "pulment": ["\u7FB9", "\u7269", "pulment"], "condim": ["\u4F50\u6599", "\u7269", "condim"], "cinnam": ["\u8089\u6842", "\u7269", "cinnam"], "zingib": ["\u59DC", "\u7269", "zingib"], "passum": ["\u679C\u5E72", "\u7269", "passum"], "must": ["\u65B0\u9152", "\u7269", "must"], "mulsum": ["\u871C\u9152", "\u7269", "mulsum"], "lora": ["\u6DE1\u9152", "\u7269", "lora"], "amyl": ["\u6DC0\u7C89", "\u7269", "amyl"], "gelat": ["\u80F6\u51BB", "\u7269", "gelat"], "collar": ["\u8863\u9886", "\u7269", "collar"], "manic": ["\u8896", "\u7269", "manic"], "sinu": ["\u8863\u8936", "\u7269", "sinu"], "instita": ["\u7F18\u9970", "\u7269", "instita"], "nodus": ["\u7EBD\u7ED3", "\u7269", "nodus"], "sutur": ["\u7F1D\u7EBF", "\u7269", "sutur"], "pannic": ["\u886C\u91CC", "\u7269", "pannic"], "chirot": ["\u624B\u5957", "\u7269", "chirot"], "tibial": ["\u80EB\u8863\u3001\u889C", "\u7269", "tibial"], "caligu": ["\u957F\u9774", "\u7269", "caligu"], "sagum": ["\u6597\u7BF7", "\u7269", "sagum"], "paenul": ["\u62AB\u98CE", "\u7269", "paenul"], "perizo": ["\u56F4\u88D9", "\u7269", "perizo"], "amicu": ["\u62AB\u80A9", "\u7269", "amicu"], "velam": ["\u9762\u7EB1", "\u7269", "velam"], "crinal": ["\u7C2A", "\u7269", "crinal"], "limbus": ["\u7F18\u5E26", "\u7269", "limbus"], "clavus": ["\u7D2B\u6761\u7EB9", "\u7269", "clavus"], "filum": ["\u4E1D\u7EBF", "\u7269", "filum"], "fusus": ["\u7EBA\u9524", "\u7269", "fusus"], "pecten": ["\u7B58", "\u7269", "pecten"], "tela": ["\u7EC7\u5E03", "\u7269", "tela"], "mitra": ["\u5934\u5DFE", "\u7269", "mitra"], "galer": ["\u76AE\u5E3D", "\u7269", "galer"], "cucull": ["\u515C\u5E3D", "\u7269", "cucull"], "cortil": ["\u5EAD\u9662", "\u7269", "cortil"], "pergul": ["\u9732\u53F0", "\u7269", "pergul"], "clathr": ["\u680F\u6746", "\u7269", "clathr"], "luminar": ["\u5929\u7A97", "\u7269", "luminar"], "fumarium": ["\u70DF\u56F1", "\u7269", "fumarium"], "cellar": ["\u5730\u7A96", "\u7269", "cellar"], "tabulat": ["\u9601\u697C", "\u7269", "tabulat"], "equile": ["\u9A6C\u53A9", "\u7269", "equile"], "alveus": ["\u6C34\u69FD", "\u7269", "alveus"], "peribol": ["\u56F4\u5899", "\u7269", "peribol"], "propyl": ["\u95E8\u5ECA", "\u7269", "propyl"], "tectorium": ["\u7070\u6CE5", "\u7269", "tectorium"], "culmen": ["\u5C4B\u810A", "\u7269", "culmen"], "fastig": ["\u5C71\u5899", "\u7269", "fastig"], "hypoca": ["\u5730\u6696", "\u7269", "hypoca"], "lacunar": ["\u85FB\u4E95", "\u7269", "lacunar"], "antefix": ["\u6A90\u9970", "\u7269", "antefix"], "acrote": ["\u5C71\u82B1\u9970", "\u7269", "acrote"], "stylob": ["\u53F0\u57FA", "\u7269", "stylob"], "metopa": ["\u95F4\u677F", "\u7269", "metopa"], "trigly": ["\u4E09\u8054\u69FD", "\u7269", "trigly"], "architr": ["\u989D\u678B", "\u7269", "architr"], "zophor": ["\u9970\u5E26", "\u7269", "zophor"], "ambulac": ["\u56DE\u5ECA", "\u7269", "ambulac"], "xyst": ["\u6797\u836B\u9053", "\u7269", "xyst"], "frons": ["\u989D", "\u7269", "frons"], "gena": ["\u988A", "\u7269", "gena"], "mentum": ["\u988F", "\u7269", "mentum"], "cervix": ["\u9888", "\u7269", "cervix"], "umerus": ["\u80A9", "\u7269", "umerus"], "cubitus": ["\u8098", "\u7269", "cubitus"], "carpus": ["\u8155", "\u7269", "carpus"], "palma": ["\u638C", "\u7269", "palma"], "talus": ["\u8E1D", "\u7269", "talus"], "calcane": ["\u8E35", "\u7269", "calcane"], "dorsum": ["\u80CC", "\u7269", "dorsum"], "lumbus": ["\u8170", "\u7269", "lumbus"], "costa": ["\u808B", "\u7269", "costa"], "pectus": ["\u80F8", "\u7269", "pectus"], "clunis": ["\u81C0", "\u7269", "clunis"], "guttur": ["\u5589", "\u7269", "guttur"], "pharynx": ["\u54BD", "\u7269", "pharynx"], "superci": ["\u7709", "\u7269", "superci"], "cilium": ["\u776B", "\u7269", "cilium"], "pupilla": ["\u77B3", "\u7269", "pupilla"], "gingiva": ["\u9F88", "\u7269", "gingiva"], "labium": ["\u5507", "\u7269", "labium"], "bucca": ["\u53E3\u8154", "\u7269", "bucca"], "naris": ["\u9F3B\u5B54", "\u7269", "naris"], "palatum": ["\u816D", "\u7269", "palatum"], "vepres": ["\u8346\u68D8", "\u7269", "vepres"], "harundo": ["\u82A6\u82C7", "\u7269", "harundo"], "caries": ["\u8150\u6728", "\u7269", "caries"], "sarment": ["\u67AF\u679D", "\u7269", "sarment"], "ramale": ["\u843D\u679D", "\u7269", "ramale"], "putamen": ["\u679C\u6838", "\u7269", "putamen"], "glans": ["\u6A61\u5B9E", "\u7269", "glans"], "cupula": ["\u58F3\u6597", "\u7269", "cupula"], "volva": ["\u83CC\u6258", "\u7269", "volva"], "stipes": ["\u83CC\u67C4", "\u7269", "stipes"], "uligo": ["\u6E7F\u5730", "\u7269", "uligo"], "calculus": ["\u5375\u77F3", "\u7269", "calculus"], "furfur": ["\u9EB8\u76AE", "\u7269", "furfur"], "palea": ["\u8C37\u58F3", "\u7269", "palea"], "acervus": ["\u5806", "\u7269", "acervus"], "gemma": ["\u82B1\u82BD", "\u7269", "gemma"], "turio": ["\u5AE9\u82BD", "\u7269", "turio"], "surculus": ["\u65B0\u679D", "\u7269", "surculus"], "stolo": ["\u6839\u8616", "\u7269", "stolo"], "flagell": ["\u7EA4\u679D", "\u7269", "flagell"], "capreo": ["\u5377\u987B", "\u7269", "capreo"], "aculeus": ["\u8702\u523A", "\u7269", "aculeus"], "ulva": ["\u6C34\u8349", "\u7269", "ulva"], "carex": ["\u82D4\u8349", "\u7269", "carex"], "juncus": ["\u706F\u82AF\u8349", "\u7269", "juncus"], "fulgor": ["\u95EA\u5149", "\u7269", "fulgor"], "coruscat": ["\u7535\u5149", "\u7269", "coruscat"], "fulmen": ["\u96F7\u51FB", "\u7269", "fulmen"], "stilla": ["\u6C34\u73E0", "\u7269", "stilla"], "floccus": ["\u96EA\u7247", "\u7269", "floccus"], "ventulus": ["\u5FAE\u98CE", "\u7269", "ventulus"], "flamen": ["\u6C14\u6D41", "\u7269", "flamen"], "jubar": ["\u661F\u8F89", "\u7269", "jubar"], "penumbra": ["\u534A\u5F71", "\u7269", "penumbra"], "scintill": ["\u95EA\u70C1", "\u7269", "scintill"], "mic": ["\u95EA\u8000", "\u7269", "mic"], "lucifer": ["\u542F\u660E\u661F", "\u7269", "lucifer"], "noctiluc": ["\u591C\u5149", "\u7269", "noctiluc"], "halitus": ["\u8584\u96FE", "\u7269", "halitus"], "chasma": ["\u4E91\u9699\u5149", "\u7269", "chasma"], "anthel": ["\u5E7B\u65E5", "\u7269", "anthel"], "parheli": ["\u5E7B\u65E5", "\u7269", "parheli"], "aureola": ["\u5149\u6655", "\u7269", "aureola"], "serenum": ["\u6674\u7A7A", "\u7269", "serenum"], "nubilum": ["\u9634\u5929", "\u7269", "nubilum"], "occasus": ["\u65E5\u843D", "\u7269", "occasus"], "ortus": ["\u65E5\u51FA", "\u7269", "ortus"], "contici": ["\u591C\u6DF1", "\u7269", "contici"], "gallic": ["\u9E21\u9E23\u65F6", "\u7269", "gallic"], "dilucu": ["\u7834\u6653", "\u7269", "dilucu"], "aequab": ["\u6C89\u7A33", "\u6027", "aequab"], "liberal": ["\u6177\u6168", "\u6027", "liberal"], "parc": ["\u541D\u556C", "\u6027", "parc"], "probit": ["\u8BDA\u5B9E", "\u6027", "probit"], "fucat": ["\u865A\u4F2A", "\u6027", "fucat"], "fortitud": ["\u52C7\u6562", "\u6027", "fortitud"], "ignav": ["\u602F\u61E6", "\u6027", "ignav"], "indulg": ["\u5BBD\u5BB9", "\u6027", "indulg"], "faceti": ["\u5E7D\u9ED8", "\u6027", "faceti"], "serios": ["\u4E25\u8083", "\u6027", "serios"], "versut": ["\u5706\u6ED1", "\u6027", "versut"], "rigid": ["\u803F\u76F4", "\u6027", "rigid"], "suspic": ["\u591A\u7591", "\u6027", "suspic"], "credul": ["\u8F7B\u4FE1", "\u6027", "credul"], "frugi": ["\u6DE1\u6CCA", "\u6027", "frugi"], "abstin": ["\u514B\u5DF1", "\u6027", "abstin"], "intemp": ["\u653E\u7EB5", "\u6027", "intemp"], "tenac": ["\u575A\u97E7", "\u6027", "tenac"], "languid": ["\u9893\u5510", "\u6027", "languid"], "fervid": ["\u70ED\u5FF1", "\u6027", "fervid"], "frigid": ["\u51B7\u6F20", "\u6027", "frigid"], "mansuet": ["\u6E29\u9A6F", "\u6027", "mansuet"], "trucul": ["\u51F6\u6A2A", "\u6027", "trucul"], "moros": ["\u4E56\u50FB", "\u6027", "moros"], "scurril": ["\u7C97\u4FD7", "\u6027", "scurril"], "consoci": ["\u7ED3\u793E", "\u7269", "consoci"], "convent": ["\u805A\u4F1A", "\u7269", "convent"], "stipem": ["\u52DF\u6350", "\u7269", "stipem"], "discept": ["\u8FA9\u8BBA", "\u7269", "discept"], "reclam": ["\u6297\u8BAE", "\u7269", "reclam"], "interced": ["\u8C03\u505C", "\u7269", "interced"], "exsequ": ["\u5C65\u7EA6", "\u7269", "exsequ"], "spons": ["\u62C5\u4FDD", "\u7269", "spons"], "mutuum": ["\u8D4A\u6B20", "\u7269", "mutuum"], "exsolu": ["\u6E05\u507F", "\u7269", "exsolu"], "decoct": ["\u7834\u4EA7", "\u7269", "decoct"], "confus": ["\u517C\u5E76", "\u7269", "confus"], "foederat": ["\u7ED3\u76DF", "\u7269", "foederat"], "defect": ["\u53DB\u79BB", "\u7269", "defect"], "secess": ["\u5206\u79BB", "\u7269", "secess"], "coit": ["\u8054\u5408", "\u7269", "coit"], "conjur": ["\u76DF\u8A93", "\u7269", "conjur"], "tumult": ["\u9A9A\u52A8", "\u7269", "tumult"], "coercit": ["\u5F39\u538B", "\u7269", "coercit"], "proscr": ["\u516C\u654C\u5BA3\u544A", "\u7269", "proscr"], "confisc": ["\u6CA1\u6536", "\u7269", "confisc"], "multat": ["\u7F5A\u6B3E", "\u7269", "multat"], "frument": ["\u5F81\u7CAE", "\u7269", "frument"], "compar": ["\u6BD4\u8F83", "\u7269", "compar"], "perpens": ["\u6743\u8861", "\u7269", "perpens"], "refut": ["\u53CD\u9A73", "\u7269", "refut"], "conject": ["\u63A8\u6D4B", "\u7269", "conject"], "temer": ["\u81C6\u65AD", "\u7269", "temer"], "discern": ["\u660E\u8FA8", "\u7269", "discern"], "confund": ["\u6DF7\u6DC6", "\u7269", "confund"], "malint": ["\u8BEF\u89E3", "\u7269", "malint"], "perspicu": ["\u6D1E\u89C1", "\u7269", "perspicu"], "recogit": ["\u53CD\u601D", "\u7269", "recogit"], "excogit": ["\u63A8\u6572", "\u7269", "excogit"], "aestim": ["\u5BA1\u5EA6", "\u7269", "aestim"], "deliber": ["\u6289\u62E9", "\u7269", "deliber"], "select": ["\u53D6\u820D", "\u7269", "select"], "dijud": ["\u8FA8\u6790", "\u7269", "dijud"], "sentisc": ["\u4F53\u5BDF", "\u7269", "sentisc"], "compreh": ["\u9886\u609F", "\u7269", "compreh"], "cognos": ["\u53C2\u609F", "\u7269", "cognos"], "praesag": ["\u9884\u5224", "\u7269", "praesag"], "retros": ["\u56DE\u987E", "\u7269", "retros"], "dubit": ["\u8D28\u7591", "\u7269", "dubit"], "notion": ["\u6982\u5FF5", "\u7269", "notion"], "examin": ["\u5BA1\u67E5", "\u7269", "examin"], "fascic": ["\u675F", "\u7269", "fascic"], "manip": ["\u628A\u3001\u675F", "\u7269", "manip"], "corymb": ["\u4E32", "\u7269", "corymb"], "strues": ["\u5806", "\u7269", "strues"], "turba": ["\u4EBA\u7FA4", "\u7269", "turba"], "caterva": ["\u961F", "\u7269", "caterva"], "globus": ["\u56E2", "\u7269", "globus"], "gutta": ["\u6EF4", "\u7269", "gutta"], "micul": ["\u7C92", "\u7269", "micul"], "triens": ["\u4E09\u5206\u4E4B\u4E00", "\u7269", "triens"], "duplus": ["\u53CC\u500D", "\u7269", "duplus"], "triplus": ["\u4E09\u500D", "\u7269", "triplus"], "quadrupl": ["\u56DB\u500D", "\u7269", "quadrupl"], "nemo": ["\u65E0\u4EBA", "\u7269", "nemo"], "quotus": ["\u7B2C\u51E0", "\u7269", "quotus"], "tantun": ["\u540C\u91CF", "\u7269", "tantun"], "quantul": ["\u5C11\u8BB8", "\u7269", "quantul"], "tantil": ["\u4E9B\u5FAE", "\u7269", "tantil"], "aliquan": ["\u82E5\u5E72", "\u7269", "aliquan"], "singuli": ["\u5404\u4E00", "\u7269", "singuli"], "bini": ["\u6BCF\u4E8C", "\u7269", "bini"], "terni": ["\u6BCF\u4E09", "\u7269", "terni"], "seni": ["\u6BCF\u516D", "\u7269", "seni"], "viceni": ["\u6BCF\u4E8C\u5341", "\u7269", "viceni"], "centeni": ["\u6BCF\u767E", "\u7269", "centeni"], "tremor": ["\u9707\u54CD", "\u7269", "tremor"], "eruptio": ["\u55B7\u53D1", "\u7269", "eruptio"], "lava": ["\u7194\u5CA9", "\u7269", "lava"], "inundat": ["\u6CDB\u6EE5", "\u7269", "inundat"], "alluvio": ["\u51B2\u79EF", "\u7269", "alluvio"], "diluvies": ["\u6D2A\u6CDB", "\u7269", "diluvies"], "ariditas": ["\u5E72\u65F1", "\u7269", "ariditas"], "turbo": ["\u65CB\u98CE", "\u7269", "turbo"], "vortex": ["\u6F29\u6DA1", "\u7269", "vortex"], "fissura": ["\u88C2\u7F1D", "\u7269", "fissura"], "labes": ["\u5D29\u584C", "\u7269", "labes"], "crepitus": ["\u7206\u88C2\u58F0", "\u7269", "crepitus"], "sonitus": ["\u8F70\u9E23", "\u7269", "sonitus"], "terraem": ["\u5730\u9707", "\u7269", "terraem"], "incend": ["\u5927\u706B", "\u7269", "incend"], "naufrag": ["\u6D77\u96BE", "\u7269", "naufrag"], "calamit": ["\u707E\u7978", "\u7269", "calamit"], "vorago": ["\u6DF1\u6E0A\u6F29\u6DA1", "\u7269", "vorago"], "barath": ["\u6DF1\u6E0A", "\u7269", "barath"], "thorax": ["\u80F8\u7532", "\u7269", "thorax"], "ocrea": ["\u80EB\u7532", "\u7269", "ocrea"], "parma": ["\u5706\u76FE", "\u7269", "parma"], "clypeus": ["\u5706\u76FE", "\u7269", "clypeus"], "pugio": ["\u77ED\u5251", "\u7269", "pugio"], "sica": ["\u66F2\u5251", "\u7269", "sica"], "spatha": ["\u957F\u5251", "\u7269", "spatha"], "lancea": ["\u957F\u67AA", "\u7269", "lancea"], "tragula": ["\u8F7B\u6807\u67AA", "\u7269", "tragula"], "funda": ["\u6295\u77F3\u7D22", "\u7269", "funda"], "insigne": ["\u5FBD\u8BB0", "\u7269", "insigne"], "balteus": ["\u8170\u5E26", "\u7269", "balteus"], "verutum": ["\u91CD\u6807\u67AA", "\u7269", "verutum"], "matteris": ["\u91CD\u77DB", "\u7269", "matteris"], "cateia": ["\u6218\u69CC", "\u7269", "cateia"], "caestus": ["\u62F3\u5957", "\u7269", "caestus"], "clava": ["\u68CD\u68D2", "\u7269", "clava"], "fustis": ["\u77ED\u68CD", "\u7269", "fustis"], "contus": ["\u957F\u6746", "\u7269", "contus"], "sarissa": ["\u957F\u77DB", "\u7269", "sarissa"], "romphae": ["\u5DE8\u5251", "\u7269", "romphae"], "bipennis": ["\u53CC\u5203\u65A7", "\u7269", "bipennis"], "dolabra": ["\u951B\u65A7", "\u7269", "dolabra"], "harpe": ["\u5F2F\u5200", "\u7269", "harpe"], "tormentum": ["\u5F29\u70AE", "\u7269", "tormentum"], "dominus": ["\u4E3B\u4EBA\u3001\u5148\u751F", "\u7269", "dominus"], "domina": ["\u5973\u4E3B\u4EBA", "\u7269", "domina"], "senior": ["\u957F\u8005", "\u7269", "senior"], "iunior": ["\u665A\u8F88", "\u7269", "iunior"], "hospes": ["\u5BA2\u4EBA", "\u7269", "hospes"], "patronus": ["\u6069\u4E3B", "\u7269", "patronus"], "collega": ["\u540C\u50DA", "\u7269", "collega"], "affinis": ["\u59FB\u4EB2", "\u7269", "affinis"], "avuncu": ["\u53D4\u4F2F", "\u7269", "avuncu"], "amita": ["\u59D1\u59E8", "\u7269", "amita"], "socer": ["\u5CB3\u7236", "\u7269", "socer"], "socrus": ["\u5CB3\u6BCD", "\u7269", "socrus"], "gener": ["\u5973\u5A7F", "\u7269", "gener"], "nurus": ["\u513F\u5AB3", "\u7269", "nurus"], "levir": ["\u592B\u5144", "\u7269", "levir"], "privig": ["\u7EE7\u5B50", "\u7269", "privig"], "vitricus": ["\u7EE7\u7236", "\u7269", "vitricus"], "noverca": ["\u7EE7\u6BCD", "\u7269", "noverca"], "comes": ["\u4F8D\u4ECE", "\u7269", "comes"], "famulus": ["\u4EC6\u4ECE", "\u7269", "famulus"], "ancilla": ["\u5A62\u5973", "\u7269", "ancilla"], "verna": ["\u5BB6\u751F\u5974", "\u7269", "verna"], "nutrix": ["\u4E73\u6BCD", "\u7269", "nutrix"], "tutor": ["\u76D1\u62A4\u4EBA", "\u7269", "tutor"], "hospita": ["\u5973\u4E3B\u4EBA", "\u7269", "hospita"], "statura": ["\u8EAB\u6750", "\u6027", "statura"], "procer": ["\u9AD8\u5927", "\u6027", "procer"], "pumilus": ["\u77EE\u5C0F", "\u6027", "pumilus"], "obesus": ["\u80A5\u80D6", "\u6027", "obesus"], "macilent": ["\u7626\u524A", "\u6027", "macilent"], "formos": ["\u4FCA\u7F8E", "\u6027", "formos"], "deform": ["\u4E11\u964B", "\u6027", "deform"], "robust": ["\u5065\u58EE", "\u6027", "robust"], "debilit": ["\u8870\u5F31", "\u6027", "debilit"], "canus": ["\u767D\u53D1", "\u6027", "canus"], "calvus": ["\u79C3\u9876", "\u6027", "calvus"], "barbat": ["\u6709\u987B", "\u6027", "barbat"], "comat": ["\u957F\u53D1", "\u6027", "comat"], "luscus": ["\u72EC\u773C", "\u6027", "luscus"], "claudus": ["\u8DDB\u8DB3", "\u6027", "claudus"], "gibber": ["\u9A7C\u80CC", "\u6027", "gibber"], "strenuus": ["\u77EB\u5065", "\u6027", "strenuus"], "agilis": ["\u7075\u5DE7", "\u6027", "agilis"], "torosus": ["\u808C\u8089\u53D1\u8FBE", "\u6027", "torosus"], "pallens": ["\u82CD\u767D", "\u6027", "pallens"], "rubens": ["\u7EA2\u6DA6", "\u6027", "rubens"], "stigma": ["\u70D9\u5370", "\u6027", "stigma"], "livor": ["\u9752\u7D2B", "\u6027", "livor"], "vibex": ["\u97AD\u75D5", "\u6027", "vibex"], "loquac": ["\u591A\u8A00", "\u52A8", "loquac"], "taciturn": ["\u5BE1\u8A00", "\u52A8", "taciturn"], "argut": ["\u5DE7\u8FA9", "\u52A8", "argut"], "blandil": ["\u751C\u8A00", "\u52A8", "blandil"], "iura": ["\u7ACB\u8A93", "\u52A8", "iura"], "cachinn": ["\u5927\u7B11", "\u52A8", "cachinn"], "subrid": ["\u5FAE\u7B11", "\u52A8", "subrid"], "gem": ["\u547B\u541F", "\u52A8", "gem"], "eiul": ["\u54C0\u53F7", "\u52A8", "eiul"], "querul": ["\u62B1\u6028", "\u52A8", "querul"], "obtest": ["\u6073\u6C42", "\u52A8", "obtest"], "obsecr": ["\u54C0\u6C42", "\u52A8", "obsecr"], "minit": ["\u5A01\u80C1", "\u52A8", "minit"], "increpit": ["\u65A5\u8D23", "\u52A8", "increpit"], "exprobr": ["\u8D23\u96BE", "\u52A8", "exprobr"], "convic": ["\u8FB1\u9A82", "\u52A8", "convic"], "suggill": ["\u8BA5\u8BBD", "\u52A8", "suggill"], "subsann": ["\u5632\u7B11", "\u52A8", "subsann"], "dissent": ["\u5F02\u8BAE", "\u52A8", "dissent"], "peror": ["\u9648\u8BCD", "\u52A8", "peror"], "declam": ["\u6717\u8BF5", "\u52A8", "declam"], "recit": ["\u80CC\u8BF5", "\u52A8", "recit"], "pronun": ["\u5BA3\u544A", "\u52A8", "pronun"], "praelo": ["\u5F00\u573A\u767D", "\u52A8", "praelo"], "epilog": ["\u7ED3\u8BED", "\u52A8", "epilog"], "incant": ["\u541F\u5531\u65BD\u6CD5", "\u52A8", "incant"], "excant": ["\u89E3\u5492", "\u52A8", "excant"], "devov": ["\u8BC5\u5492", "\u52A8", "devov"], "exsecr": ["\u5492\u9010", "\u52A8", "exsecr"], "run": ["\u7B26\u6587", "\u52A8", "run"], "glyph": ["\u523B\u7B26", "\u52A8", "glyph"], "tessera": ["\u7B26\u724C", "\u52A8", "tessera"], "amulet": ["\u62A4\u7B26", "\u52A8", "amulet"], "talisman": ["\u6CD5\u5B9D", "\u52A8", "talisman"], "philtrum": ["\u8FF7\u836F", "\u52A8", "philtrum"], "venefic": ["\u65BD\u6BD2", "\u52A8", "venefic"], "malefic": ["\u90AA\u672F", "\u52A8", "malefic"], "benefic": ["\u5584\u672F", "\u52A8", "benefic"], "goet": ["\u5DEB\u672F", "\u52A8", "goet"], "magir": ["\u6CD5\u672F", "\u52A8", "magir"], "sortil": ["\u62BD\u7B7E\u5360\u535C", "\u52A8", "sortil"], "abjur": ["\u5F03\u8A93", "\u52A8", "abjur"], "adjur": ["\u4E25\u4EE4", "\u52A8", "adjur"], "imprec": ["\u7948\u7978", "\u52A8", "imprec"], "deprec": ["\u7948\u514D", "\u52A8", "deprec"], "arcane": ["\u79D8\u4F20", "\u52A8", "arcane"], "esoter": ["\u79D8\u6559", "\u52A8", "esoter"], "exoter": ["\u663E\u6559", "\u52A8", "exoter"], "hierat": ["\u5723\u804C\u7684", "\u52A8", "hierat"], "telet": ["\u5165\u6559\u793C", "\u52A8", "telet"], "affix": ["\u9644\u7740", "\u52A8", "affix"], "adhaer": ["\u9ECF\u9644", "\u52A8", "adhaer"], "concit": ["\u6FC0\u8D77", "\u52A8", "concit"], "impell": ["\u9A71\u52A8", "\u52A8", "impell"], "transmut": ["\u5B17\u53D8", "\u52A8", "transmut"], "phaenom": ["\u73B0\u8C61", "\u52A8", "phaenom"], "inhib": ["\u6291\u5236", "\u52A8", "inhib"], "amplif": ["\u653E\u5927", "\u52A8", "amplif"], "attenu": ["\u8870\u51CF", "\u52A8", "attenu"], "refract": ["\u6298\u5C04", "\u52A8", "refract"], "reflect": ["\u53CD\u5C04", "\u52A8", "reflect"], "absorb": ["\u5438\u6536", "\u52A8", "absorb"], "emitt": ["\u53D1\u5C04", "\u52A8", "emitt"], "diffus": ["\u6269\u6563", "\u52A8", "diffus"], "polar": ["\u6781\u6027", "\u52A8", "polar"], "aether": ["\u4EE5\u592A", "\u52A8", "aether"], "quinte": ["\u7B2C\u4E94\u5143\u7D20", "\u52A8", "quinte"], "phlogist": ["\u71C3\u7D20", "\u52A8", "phlogist"], "mana": ["\u739B\u90A3", "\u52A8", "mana"], "virtu": ["\u5FB7\u80FD", "\u52A8", "virtu"], "elan": ["\u6D3B\u529B", "\u52A8", "elan"], "chakra": ["\u8109\u8F6E", "\u52A8", "chakra"], "prana": ["\u6C14", "\u52A8", "prana"], "telesm": ["\u6CD5\u5668", "\u52A8", "telesm"], "arcanum": ["\u5965\u79D8", "\u52A8", "arcanum"], "illumin": ["\u7167\u4EAE", "\u52A8", "illumin"], "obscur": ["\u4F7F\u6697\u3001\u853D", "\u52A8", "obscur"], "lassit": ["\u75B2\u4E4F", "\u52A8", "lassit"], "palpit": ["\u5FC3\u60B8", "\u52A8", "palpit"], "sudor": ["\u6C57", "\u52A8", "sudor"], "lacrima": ["\u6CEA", "\u52A8", "lacrima"], "saliva": ["\u553E\u6DB2", "\u52A8", "saliva"], "mucus": ["\u9F3B\u6D95", "\u52A8", "mucus"], "urina": ["\u5C3F", "\u52A8", "urina"], "pulsus": ["\u8109\u640F", "\u52A8", "pulsus"], "torpor": ["\u9EBB\u6728", "\u52A8", "torpor"], "rigor": ["\u5BD2\u6218", "\u52A8", "rigor"], "vigor": ["\u7CBE\u529B", "\u52A8", "vigor"], "stamina": ["\u8010\u529B", "\u52A8", "stamina"], "sopor": ["\u660F\u7761", "\u52A8", "sopor"], "letarg": ["\u660F\u7761\u75C7", "\u52A8", "letarg"], "syncop": ["\u6655\u53A5", "\u52A8", "syncop"], "spasm": ["\u75C9\u631B", "\u52A8", "spasm"], "tetan": ["\u5F3A\u76F4", "\u52A8", "tetan"], "prurig": ["\u75D2\u75C7", "\u52A8", "prurig"], "rubor": ["\u7EA2\u80BF", "\u52A8", "rubor"], "algid": ["\u9177\u5BD2\u611F", "\u52A8", "algid"], "aestumat": ["\u71E5\u70ED", "\u52A8", "aestumat"], "inedia": ["\u7EDD\u98DF", "\u52A8", "inedia"], "crapula": ["\u5BBF\u9189", "\u52A8", "crapula"], "ebriet": ["\u9189\u9152", "\u52A8", "ebriet"], "aestus": ["\u6F6E\u6C50", "\u7269", "aestus"], "access": ["\u6DA8\u6F6E", "\u7269", "access"], "recess": ["\u843D\u6F6E", "\u7269", "recess"], "fluctus": ["\u6D6A\u5934", "\u7269", "fluctus"], "brevia": ["\u6D45\u6EE9", "\u7269", "brevia"], "canalis": ["\u822A\u9053", "\u7269", "canalis"], "navale": ["\u8239\u575E", "\u7269", "navale"], "latera": ["\u8237\u4FA7", "\u7269", "latera"], "constrat": ["\u7532\u677F", "\u7269", "constrat"], "saburra": ["\u538B\u8231", "\u7269", "saburra"], "remex": ["\u6868\u624B", "\u7269", "remex"], "gubernator": ["\u8235\u624B", "\u7269", "gubernator"], "proreta": ["\u9886\u822A", "\u7269", "proreta"], "nautic": ["\u822A\u6D77\u672F", "\u7269", "nautic"], "acta": ["\u6D77\u5CB8", "\u7269", "acta"], "salum": ["\u6D77\u6D8C", "\u7269", "salum"], "pontus": ["\u6DF1\u6D77", "\u7269", "pontus"], "aequor": ["\u6D77\u9762", "\u7269", "aequor"], "remigi": ["\u6868\u5217", "\u7269", "remigi"], "velum": ["\u5E06", "\u7269", "velum"], "syrtic": ["\u6697\u6C99", "\u7269", "syrtic"], "charyb": ["\u5927\u6F29\u6DA1", "\u7269", "charyb"], "scyll": ["\u7901\u5CA9", "\u7269", "scyll"], "harpax": ["\u94A9\u951A", "\u7269", "harpax"], "sentina": ["\u8231\u5E95\u6C61\u6C34", "\u7269", "sentina"], "venabu": ["\u730E\u77DB", "\u52A8", "venabu"], "pedica": ["\u6355\u517D\u5939", "\u52A8", "pedica"], "aucup": ["\u6355\u9E1F", "\u52A8", "aucup"], "sagena": ["\u62D6\u7F51", "\u52A8", "sagena"], "nassa": ["\u9C7C\u7B3C", "\u52A8", "nassa"], "indago": ["\u56F4\u730E", "\u52A8", "indago"], "vestig": ["\u8FFD\u8E2A", "\u52A8", "vestig"], "latibu": ["\u517D\u7A74", "\u52A8", "latibu"], "spolium": ["\u730E\u7269\u76AE", "\u52A8", "spolium"], "exuvi": ["\u8715\u58F3", "\u52A8", "exuvi"], "collect": ["\u91C7\u96C6", "\u52A8", "collect"], "baca": ["\u6D46\u679C", "\u52A8", "baca"], "casses": ["\u7F57\u7F51", "\u52A8", "casses"], "plaga": ["\u7F51\u7F57", "\u52A8", "plaga"], "tendic": ["\u7ECA\u7D22", "\u52A8", "tendic"], "decipula": ["\u9677\u9631", "\u52A8", "decipula"], "fovea": ["\u9677\u5751", "\u52A8", "fovea"], "cuspis": ["\u77DB\u5C16", "\u52A8", "cuspis"], "esca": ["\u8BF1\u9975", "\u52A8", "esca"], "illece": ["\u8BF1\u7269", "\u52A8", "illece"], "visci": ["\u7C98\u9E1F\u80F6", "\u52A8", "visci"], "trophae": ["\u730E\u83B7\u7EAA\u5FF5", "\u52A8", "trophae"], "aucupat": ["\u6355\u9E1F\u8005", "\u52A8", "aucupat"], "venatric": ["\u5973\u730E\u624B", "\u52A8", "venatric"], "decoqu": ["\u71AC\u716E", "\u52A8", "decoqu"], "excoqu": ["\u714E\u5E72", "\u52A8", "excoqu"], "incoqu": ["\u7096", "\u52A8", "incoqu"], "percoq": ["\u7096\u70C2", "\u52A8", "percoq"], "subfri": ["\u5FAE\u714E", "\u52A8", "subfri"], "inass": ["\u5165\u7089\u70E4", "\u52A8", "inass"], "farc": ["\u586B\u6599", "\u52A8", "farc"], "infund": ["\u503E\u6CE8", "\u52A8", "infund"], "perfund": ["\u6D47\u6DCB", "\u52A8", "perfund"], "asperg": ["\u6D12", "\u52A8", "asperg"], "consperg": ["\u6492\u7C89", "\u52A8", "consperg"], "inting": ["\u8638", "\u52A8", "inting"], "sorbill": ["\u555C", "\u52A8", "sorbill"], "exsug": ["\u542E", "\u52A8", "exsug"], "cremor": ["\u6D53\u6C64", "\u52A8", "cremor"], "iuscul": ["\u8584\u6C64", "\u52A8", "iuscul"], "offula": ["\u8089\u7247", "\u52A8", "offula"], "sorbitio": ["\u996E\u5242", "\u52A8", "sorbitio"], "frustum": ["\u5757", "\u52A8", "frustum"], "segmen": ["\u7247", "\u52A8", "segmen"], "buccel": ["\u4E00\u53E3", "\u52A8", "buccel"], "daps": ["\u76DB\u5BB4", "\u52A8", "daps"], "ferculum": ["\u83DC\u80B4", "\u52A8", "ferculum"], "oenopho": ["\u9152\u5668", "\u52A8", "oenopho"], "patella": ["\u6D45\u9505", "\u52A8", "patella"], "pens": ["\u7EBA\u7EBF", "\u52A8", "pens"], "colus": ["\u7EBA\u9524\u6746", "\u52A8", "colus"], "carmin": ["\u68B3\u7406", "\u52A8", "carmin"], "trama": ["\u7EAC\u7EBF", "\u52A8", "trama"], "subteg": ["\u7EAC\u7EB1", "\u52A8", "subteg"], "licium": ["\u7EFC\u7EBF", "\u52A8", "licium"], "insili": ["\u7ECF\u7EBF", "\u52A8", "insili"], "mordant": ["\u5A92\u67D3", "\u52A8", "mordant"], "alumen": ["\u660E\u77FE", "\u52A8", "alumen"], "coccum": ["\u80ED\u8102\u866B\u7EA2", "\u52A8", "coccum"], "indig": ["\u975B\u84DD", "\u52A8", "indig"], "glastum": ["\u83D8\u84DD", "\u52A8", "glastum"], "rubia": ["\u831C\u8349", "\u52A8", "rubia"], "crocus": ["\u756A\u7EA2\u82B1", "\u52A8", "crocus"], "netrix": ["\u7EBA\u5973", "\u52A8", "netrix"], "fullonica": ["\u6F02\u6D17\u574A", "\u52A8", "fullonica"], "tinctor": ["\u67D3\u5DE5", "\u52A8", "tinctor"], "calamis": ["\u70EB\u8936\u5668", "\u52A8", "calamis"], "carbasum": ["\u7EC6\u9EBB", "\u52A8", "carbasum"], "polymita": ["\u591A\u8272\u7EC7\u7269", "\u52A8", "polymita"], "plumat": ["\u7FBD\u7EC7", "\u52A8", "plumat"], "scutul": ["\u65B9\u683C\u7EB9", "\u52A8", "scutul"], "undulata": ["\u6CE2\u7EB9", "\u52A8", "undulata"], "gausapa": ["\u7ED2\u9762", "\u52A8", "gausapa"], "trilix": ["\u4E09\u80A1\u7EBF", "\u52A8", "trilix"], "domit": ["\u9A6F\u670D", "\u52A8", "domit"], "iug": ["\u5957\u8F6D", "\u52A8", "iug"], "mansue": ["\u9A6F\u5316", "\u52A8", "mansue"], "allig": ["\u62F4\u7CFB", "\u52A8", "allig"], "admiss": ["\u914D\u79CD", "\u52A8", "admiss"], "fetus": ["\u4EA7\u4ED4", "\u52A8", "fetus"], "sagin": ["\u80B2\u80A5", "\u52A8", "sagin"], "castrat": ["\u53BB\u52BF", "\u52A8", "castrat"], "inust": ["\u70D9\u5370", "\u52A8", "inust"], "agit": ["\u9A71\u8D76", "\u52A8", "agit"], "revoc": ["\u5524\u56DE", "\u52A8", "revoc"], "stabul": ["\u53A9\u517B", "\u52A8", "stabul"], "praese": ["\u9972\u69FD", "\u52A8", "praese"], "pabulum": ["\u8349\u6599", "\u52A8", "pabulum"], "adaqu": ["\u996E\u6C34", "\u52A8", "adaqu"], "sericar": ["\u8695\u5BA4", "\u52A8", "sericar"], "alvear": ["\u8702\u7BB1", "\u52A8", "alvear"], "bubul": ["\u7267\u725B\u4EBA", "\u52A8", "bubul"], "opilio": ["\u7267\u7F8A\u4EBA", "\u52A8", "opilio"], "subulc": ["\u7267\u732A\u4EBA", "\u52A8", "subulc"], "equiso": ["\u9A6C\u592B", "\u52A8", "equiso"], "capistr": ["\u7B3C\u5934", "\u52A8", "capistr"], "fiscella": ["\u8349\u7F16\u98DF\u7BEE", "\u52A8", "fiscella"], "forceps": ["\u94B3", "\u52A8", "forceps"], "stimul": ["\u523A\u68D2", "\u52A8", "stimul"], "intue": ["\u51DD\u89C6", "\u52A8", "intue"], "conspic": ["\u6CE8\u89C6", "\u52A8", "conspic"], "adspect": ["\u77A5\u89C1", "\u52A8", "adspect"], "limis": ["\u659C\u89C6", "\u52A8", "limis"], "prospic": ["\u8FDC\u773A", "\u52A8", "prospic"], "perscrut": ["\u7EC6\u5BDF", "\u52A8", "perscrut"], "scrut": ["\u63A2\u7A76", "\u52A8", "scrut"], "auscult": ["\u503E\u542C", "\u52A8", "auscult"], "degust": ["\u54C1\u5C1D", "\u52A8", "degust"], "attrect": ["\u89E6\u6478", "\u52A8", "attrect"], "contrect": ["\u629A\u5F04", "\u52A8", "contrect"], "tent": ["\u8BD5\u63A2", "\u52A8", "tent"], "negleg": ["\u5FFD\u7565", "\u52A8", "negleg"], "contu": ["\u6253\u91CF", "\u52A8", "contu"], "subleg": ["\u5077\u542C", "\u52A8", "subleg"], "rim": ["\u7AA5\u63A2", "\u52A8", "rim"], "obtut": ["\u51DD\u89C6", "\u52A8", "obtut"], "tuit": ["\u6CE8\u89C6", "\u52A8", "tuit"], "conniv": ["\u95ED\u773C", "\u52A8", "conniv"], "olfact": ["\u55C5\u95FB", "\u52A8", "olfact"], "contempl": ["\u9ED8\u89C2", "\u52A8", "contempl"], "persent": ["\u89C9\u5BDF", "\u52A8", "persent"], "animad": ["\u7559\u610F", "\u52A8", "animad"], "reper": ["\u53D1\u73B0", "\u52A8", "reper"], "nutus": ["\u9894\u9996", "\u52A8", "nutus"], "renutus": ["\u6447\u5934", "\u52A8", "renutus"], "subrisus": ["\u6D45\u7B11", "\u52A8", "subrisus"], "fletus": ["\u54ED\u6CE3", "\u52A8", "fletus"], "gemitus": ["\u53F9\u606F", "\u52A8", "gemitus"], "suspir": ["\u957F\u53F9", "\u52A8", "suspir"], "stupor": ["\u5446\u6EDE", "\u52A8", "stupor"], "fremitus": ["\u54AC\u7259", "\u52A8", "fremitus"], "stridor": ["\u54AC\u7259\u58F0", "\u52A8", "stridor"], "torvi": ["\u51F6\u76F8", "\u52A8", "torvi"], "hilarit": ["\u559C\u8272", "\u52A8", "hilarit"], "tristit": ["\u6101\u5BB9", "\u52A8", "tristit"], "severit": ["\u4E25\u5389\u795E\u8272", "\u52A8", "severit"], "verecun": ["\u8D67\u8272", "\u52A8", "verecun"], "constan": ["\u9547\u5B9A", "\u52A8", "constan"], "iactant": ["\u5F97\u610F\u4E4B\u8272", "\u52A8", "iactant"], "fastus": ["\u50B2\u6162\u4E4B\u8272", "\u52A8", "fastus"], "maestit": ["\u60B2\u621A", "\u52A8", "maestit"], "habitus": ["\u4E3E\u6B62", "\u52A8", "habitus"], "gestus": ["\u624B\u52BF", "\u52A8", "gestus"], "incessus": ["\u6B65\u6001", "\u52A8", "incessus"], "facies": ["\u9762\u8272", "\u52A8", "facies"], "exanim": ["\u5931\u8272", "\u52A8", "exanim"], "gradior": ["\u8FC8\u6B65", "\u52A8", "gradior"], "proper": ["\u75BE\u884C", "\u52A8", "proper"], "lente": ["\u7F13\u884C", "\u52A8", "lente"], "errab": ["\u5F98\u5F8A", "\u52A8", "errab"], "morat": ["\u9017\u7559", "\u52A8", "morat"], "substit": ["\u9A7B\u8DB3", "\u52A8", "substit"], "innit": ["\u501A\u9760", "\u52A8", "innit"], "recumb": ["\u659C\u501A", "\u52A8", "recumb"], "assid": ["\u7AEF\u5750", "\u52A8", "assid"], "procumb": ["\u530D\u5310", "\u52A8", "procumb"], "result": ["\u8DC3\u8D77", "\u52A8", "result"], "corrui": ["\u683D\u5012", "\u52A8", "corrui"], "adrep": ["\u530D\u5310\u800C\u884C", "\u52A8", "adrep"], "circumi": ["\u73AF\u884C", "\u52A8", "circumi"], "praegred": ["\u5148\u884C", "\u52A8", "praegred"], "subsequ": ["\u968F\u884C", "\u52A8", "subsequ"], "obambul": ["\u8E31\u6B65", "\u52A8", "obambul"], "deambul": ["\u6563\u6B65", "\u52A8", "deambul"], "contend": ["\u75BE\u5954", "\u52A8", "contend"], "festin": ["\u8D76\u8DEF", "\u52A8", "festin"], "rept": ["\u722C\u884C", "\u52A8", "rept"], "sublim": ["\u767B\u9AD8", "\u52A8", "sublim"], "nixus": ["\u594B\u529B", "\u52A8", "nixus"], "conat": ["\u5C1D\u8BD5", "\u52A8", "conat"], "tardig": ["\u7F13\u6B65", "\u52A8", "tardig"], "graveol": ["\u6D53\u81ED", "\u7269", "graveol"], "putor": ["\u8150\u81ED", "\u7269", "putor"], "rancor": ["\u54C8\u5587\u5473", "\u7269", "rancor"], "nidor": ["\u6CB9\u70DF\u5473", "\u7269", "nidor"], "sulf": ["\u786B\u5473", "\u7269", "sulf"], "muria": ["\u54B8\u8165", "\u7269", "muria"], "nardus": ["\u7518\u677E\u9999", "\u7269", "nardus"], "tus": ["\u4E73\u9999", "\u7269", "tus"], "myrrha": ["\u6CA1\u836F", "\u7269", "myrrha"], "balsam": ["\u9999\u818F", "\u7269", "balsam"], "ambra": ["\u9F99\u6D8E\u9999", "\u7269", "ambra"], "mosch": ["\u9E9D\u9999", "\u7269", "mosch"], "sandal": ["\u6A80\u9999", "\u7269", "sandal"], "camphor": ["\u6A1F\u8111", "\u7269", "camphor"], "thurib": ["\u9999\u7089", "\u7269", "thurib"], "acerra": ["\u9999\u76D2", "\u7269", "acerra"], "suffim": ["\u718F\u9999", "\u7269", "suffim"], "odoram": ["\u9999\u6599", "\u7269", "odoram"], "foetor": ["\u6076\u81ED", "\u7269", "foetor"], "exhalat": ["\u6563\u51FA", "\u7269", "exhalat"], "redol": ["\u6563\u53D1\u9999\u6C14", "\u7269", "redol"], "olens": ["\u6709\u6C14\u5473\u7684", "\u7269", "olens"], "iners": ["\u65E0\u5473\u7684", "\u7269", "iners"], "flagran": ["\u6C14\u5473\u6D53\u70C8", "\u7269", "flagran"], "dulcedo": ["\u7518\u5473", "\u6027", "dulcedo"], "amaror": ["\u82E6\u5473", "\u6027", "amaror"], "salsedo": ["\u54B8\u5473", "\u6027", "salsedo"], "austerus": ["\u6DA9", "\u6027", "austerus"], "ponticus": ["\u9178\u6DA9", "\u6027", "ponticus"], "oleag": ["\u6CB9\u6DA6", "\u6027", "oleag"], "farinac": ["\u7C89\u8D28", "\u6027", "farinac"], "friab": ["\u9165\u8106", "\u6027", "friab"], "crisp": ["\u9165\u8106\u58F0", "\u6027", "crisp"], "lentus": ["\u9ECF\u97E7", "\u6027", "lentus"], "succulent": ["\u591A\u6C41", "\u6027", "succulent"], "vapidus": ["\u8D70\u5473", "\u6027", "vapidus"], "insipidus": ["\u65E0\u5473", "\u6027", "insipidus"], "apian": ["\u871C\u751C", "\u6027", "apian"], "nauseos": ["\u4EE4\u4EBA\u4F5C\u5455", "\u6027", "nauseos"], "fastidios": ["\u5012\u80C3", "\u6027", "fastidios"], "saturit": ["\u9971\u817B", "\u6027", "saturit"], "mellitus": ["\u871C\u6E0D", "\u6027", "mellitus"], "dulciar": ["\u751C\u98DF", "\u6027", "dulciar"], "bellaria": ["\u751C\u70B9", "\u6027", "bellaria"], "crustulum": ["\u9165\u70B9", "\u6027", "crustulum"], "libari": ["\u7CD5\u70B9", "\u6027", "libari"], "potulent": ["\u996E\u54C1", "\u6027", "potulent"], "esculent": ["\u98DF\u54C1", "\u6027", "esculent"], "nitor": ["\u5149\u6CFD", "\u6027", "nitor"], "albedo": ["\u768E\u767D", "\u6027", "albedo"], "nigredo": ["\u9EDD\u9ED1", "\u6027", "nigredo"], "rubedo": ["\u8D64\u7EA2", "\u6027", "rubedo"], "viridit": ["\u7FE0\u7EFF", "\u6027", "viridit"], "caerul": ["\u851A\u84DD", "\u6027", "caerul"], "flavedo": ["\u6A59\u9EC4", "\u6027", "flavedo"], "marmorat": ["\u6591\u9A73", "\u6027", "marmorat"], "opacit": ["\u4E0D\u900F\u660E", "\u6027", "opacit"], "transluc": ["\u534A\u900F", "\u6027", "transluc"], "perlucid": ["\u900F\u4EAE", "\u6027", "perlucid"], "nitens": ["\u6DA6\u6CFD", "\u6027", "nitens"], "levor": ["\u5149\u6ED1\u5EA6", "\u6027", "levor"], "asperit": ["\u7C97\u7CD9\u611F", "\u6027", "asperit"], "glabri": ["\u65E0\u6BDB\u7684", "\u6027", "glabri"], "scabri": ["\u51F9\u51F8", "\u6027", "scabri"], "obscurit": ["\u5E7D\u6697", "\u6027", "obscurit"], "clarit": ["\u660E\u4EAE", "\u6027", "clarit"], "colorat": ["\u7740\u8272", "\u6027", "colorat"], "luminesc": ["\u53D1\u5149", "\u6027", "luminesc"], "phosphor": ["\u78F7\u5149", "\u6027", "phosphor"], "iridesc": ["\u8679\u5F69", "\u6027", "iridesc"], "refulg": ["\u8FD4\u7167", "\u6027", "refulg"], "opert": ["\u906E\u853D", "\u6027", "opert"], "reteg": ["\u663E\u9732", "\u6027", "reteg"], "sonor": ["\u6D2A\u4EAE", "\u6027", "sonor"], "clangor": ["\u94FF\u9535", "\u6027", "clangor"], "tinnit": ["\u8033\u9E23", "\u6027", "tinnit"], "bombus": ["\u55E1\u55E1", "\u6027", "bombus"], "sibilus": ["\u5636\u58F0", "\u6027", "sibilus"], "ululat": ["\u568E\u58F0", "\u6027", "ululat"], "plausus": ["\u638C\u58F0", "\u6027", "plausus"], "modulat": ["\u6291\u626C", "\u6027", "modulat"], "canor": ["\u65CB\u5F8B\u7F8E", "\u6027", "canor"], "disson": ["\u4E0D\u8C10", "\u6027", "disson"], "conson": ["\u8C10\u548C", "\u6027", "conson"], "fremor": ["\u4F4E\u6C89\u58F0", "\u6027", "fremor"], "raucit": ["\u6C99\u54D1", "\u6027", "raucit"], "arguti": ["\u5C16\u7EC6", "\u6027", "arguti"], "clariso": ["\u6E05\u4EAE", "\u6027", "clariso"], "obtusus": ["\u95F7\u54CD", "\u6027", "obtusus"], "acut": ["\u5C16\u9510", "\u6027", "acut"], "perstrep": ["\u55A7\u817E", "\u6027", "perstrep"], "obstre": ["\u5608\u6742", "\u6027", "obstre"], "stridul": ["\u5431\u5440", "\u6027", "stridul"], "modulam": ["\u66F2\u8C03", "\u6027", "modulam"], "numeri": ["\u8282\u62CD", "\u6027", "numeri"], "sonorit": ["\u54CD\u4EAE", "\u6027", "sonorit"], "boatus": ["\u725B\u9E23\u58F0", "\u6027", "boatus"], "lentor": ["\u9ECF\u6EDE", "\u6027", "lentor"], "punctur": ["\u523A\u75DB", "\u6027", "punctur"], "formicat": ["\u53D1\u9EBB", "\u6027", "formicat"], "ardor": ["\u707C\u75DB", "\u6027", "ardor"], "morsus": ["\u54AC\u75DB", "\u6027", "morsus"], "pulsat": ["\u640F\u52A8", "\u6027", "pulsat"], "callosit": ["\u8327", "\u6027", "callosit"], "mollit": ["\u67D4\u8F6F\u611F", "\u6027", "mollit"], "durit": ["\u575A\u786C\u611F", "\u6027", "durit"], "scabies": ["\u75A5\u7663", "\u6027", "scabies"], "papula": ["\u4E18\u75B9", "\u6027", "papula"], "pustula": ["\u8113\u75B1", "\u6027", "pustula"], "torridus": ["\u707C\u70ED", "\u6027", "torridus"], "tepid": ["\u5FAE\u6E29", "\u6027", "tepid"], "lubricus": ["\u6ED1\u6E9C", "\u6027", "lubricus"], "scaber": ["\u7C97\u7CD9\u9762", "\u6027", "scaber"], "rasilis": ["\u5149\u6ED1\u6613\u78E8", "\u6027", "rasilis"], "mucor": ["\u9709\u6ED1", "\u6027", "mucor"], "scalpor": ["\u523A\u75DB\u611F", "\u6027", "scalpor"], "algidit": ["\u5BD2\u51B7", "\u6027", "algidit"], "calidit": ["\u6E29\u70ED", "\u6027", "calidit"], "horrip": ["\u8D77\u9E21\u76AE", "\u6027", "horrip"], "tormina": ["\u7EDE\u75DB", "\u6027", "tormina"], "mordic": ["\u523A\u75DB", "\u6027", "mordic"], "praecipi": ["\u5760\u5D16\u5211", "\u7269", "praecipi"], "supplicium": ["\u6781\u5211", "\u7269", "supplicium"], "crux": ["\u5341\u5B57\u5211", "\u7269", "crux"], "flagrum": ["\u97AD", "\u7269", "flagrum"], "virga": ["\u6756", "\u7269", "virga"], "compes": ["\u811A\u9563", "\u7269", "compes"], "boiae": ["\u9879\u5708\u67B7", "\u7269", "boiae"], "metallum": ["\u77FF\u5F79", "\u7269", "metallum"], "decoll": ["\u65A9\u9996", "\u7269", "decoll"], "patibu": ["\u5211\u67B6", "\u7269", "patibu"], "verber": ["\u7B1E\u6253", "\u7269", "verber"], "talio": ["\u540C\u6001\u590D\u4EC7", "\u7269", "talio"], "eculeus": ["\u62F7\u95EE\u67B6", "\u7269", "eculeus"], "ungula": ["\u94B3\u70D9", "\u7269", "ungula"], "lamina": ["\u70D9\u94C1", "\u7269", "lamina"], "catasta": ["\u5211\u53F0", "\u7269", "catasta"], "manicae": ["\u624B\u94D0", "\u7269", "manicae"], "numella": ["\u8DB3\u67B7", "\u7269", "numella"], "cippus": ["\u6728\u67B7", "\u7269", "cippus"], "cruciat": ["\u9177\u5211", "\u7269", "cruciat"], "excarn": ["\u51CC\u8FDF", "\u7269", "excarn"], "strangul": ["\u7EDE\u6740", "\u7269", "strangul"], "submer": ["\u6EBA\u5211", "\u7269", "submer"], "ustion": ["\u706B\u5211", "\u7269", "ustion"], "mulcta": ["\u7F5A\u91D1", "\u7269", "mulcta"], "dot": ["\u5AC1\u5986", "\u7269", "dot"], "thalamus": ["\u5A5A\u623F", "\u7269", "thalamus"], "pronuba": ["\u4F34\u5A18", "\u7269", "pronuba"], "auspex": ["\u8BC1\u5A5A", "\u7269", "auspex"], "taeda": ["\u5A5A\u70AC", "\u7269", "taeda"], "confarr": ["\u9EA6\u997C\u5A5A", "\u7269", "confarr"], "repudium": ["\u4F11\u5A5A", "\u7269", "repudium"], "iustit": ["\u56FD\u4E27", "\u7269", "iustit"], "lugubr": ["\u4E27\u670D", "\u7269", "lugubr"], "planctus": ["\u6376\u80F8\u54C0\u54ED", "\u7269", "planctus"], "naenia": ["\u633D\u6B4C", "\u7269", "naenia"], "rogus": ["\u706B\u846C\u5806", "\u7269", "rogus"], "bustum": ["\u706B\u846C\u573A", "\u7269", "bustum"], "sarcoph": ["\u77F3\u68FA", "\u7269", "sarcoph"], "parental": ["\u796D\u7956\u8282", "\u7269", "parental"], "inferiae": ["\u796D\u4EA1", "\u7269", "inferiae"], "novendi": ["\u4E5D\u65E5\u796D", "\u7269", "novendi"], "silicer": ["\u4E27\u5BB4", "\u7269", "silicer"], "iusta": ["\u846C\u793C", "\u7269", "iusta"], "elogium": ["\u5893\u5FD7\u94ED", "\u7269", "elogium"], "cunae": ["\u6447\u7BEE", "\u7269", "cunae"], "togavir": ["\u6210\u5E74\u888D", "\u7269", "togavir"], "deductio": ["\u8FCE\u4EB2", "\u7269", "deductio"], "pompa": ["\u4EEA\u4ED7", "\u7269", "pompa"], "fasces": ["\u6743\u6807", "\u7269", "fasces"], "sors": ["\u4EFD\u989D", "\u7269", "sors"], "symbola": ["\u5206\u644A", "\u7269", "symbola"], "collecta": ["\u644A\u6D3E", "\u7269", "collecta"], "collatio": ["\u51D1\u4EFD", "\u7269", "collatio"], "pensita": ["\u644A\u8FD8", "\u7269", "pensita"], "decuma": ["\u4EC0\u4E00\u7A0E", "\u7269", "decuma"], "centesi": ["\u767E\u5206\u7A0E", "\u7269", "centesi"], "vicensi": ["\u4E8C\u5341\u5206\u7A0E", "\u7269", "vicensi"], "multa": ["\u7F5A\u91D1", "\u7269", "multa"], "manubi": ["\u6218\u5229\u54C1", "\u7269", "manubi"], "donativ": ["\u8D4F\u8D50", "\u7269", "donativ"], "congiar": ["\u8D50\u7CAE", "\u7269", "congiar"], "largitio": ["\u8D4F\u8D49", "\u7269", "largitio"], "sortit": ["\u62BD\u7B7E\u5206\u914D", "\u7269", "sortit"], "adsigna": ["\u5206\u914D", "\u7269", "adsigna"], "attribu": ["\u5F52\u5C5E", "\u7269", "attribu"], "dispens": ["\u8C03\u5EA6", "\u7269", "dispens"], "erogat": ["\u53D1\u653E", "\u7269", "erogat"], "ratioci": ["\u6838\u7B97", "\u7269", "ratioci"], "expensum": ["\u652F\u51FA\u8D26", "\u7269", "expensum"], "accept": ["\u6536\u5165\u8D26", "\u7269", "accept"], "collybus": ["\u5151\u6362\u7387", "\u7269", "collybus"], "fenerat": ["\u653E\u8D37\u8005", "\u7269", "fenerat"], "peculi": ["\u79C1\u4EA7", "\u7269", "peculi"], "ephipp": ["\u9A6C\u978D", "\u7269", "ephipp"], "stapes": ["\u9A6C\u956B", "\u7269", "stapes"], "scutica": ["\u97AD", "\u7269", "scutica"], "crepida": ["\u8E44\u94C1", "\u7269", "crepida"], "culcitra": ["\u978D\u8925", "\u7269", "culcitra"], "cingulum": ["\u809A\u5E26", "\u7269", "cingulum"], "calcari": ["\u9A6C\u523A", "\u7269", "calcari"], "sagma": ["\u9A6E\u67B6", "\u7269", "sagma"], "clitell": ["\u9A6E\u978D", "\u7269", "clitell"], "lupatum": ["\u9A6C\u8854\u94C1", "\u7269", "lupatum"], "desultor": ["\u9A6C\u672F\u5E08", "\u7269", "desultor"], "veredus": ["\u9A7F\u9A6C", "\u7269", "veredus"], "caballus": ["\u9A7D\u9A6C", "\u7269", "caballus"], "sonipes": ["\u8E44\u58F0\u9A6C", "\u7269", "sonipes"], "quadriga": ["\u56DB\u9A6C\u6218\u8F66", "\u7269", "quadriga"], "bige": ["\u53CC\u9A6C\u8F66", "\u7269", "bige"], "hippoco": ["\u9A6C\u592B", "\u7269", "hippoco"], "strator": ["\u9A6C\u592B", "\u7269", "strator"], "parhipp": ["\u526F\u9A6C", "\u7269", "parhipp"], "faler": ["\u9A6C\u9970", "\u7269", "faler"], "mulus": ["\u9AA1", "\u7269", "mulus"], "burdo": ["\u5F79\u9AA1", "\u7269", "burdo"], "iument": ["\u5F79\u755C", "\u7269", "iument"], "curso": ["\u8DD1\u9A6C", "\u7269", "curso"], "equirr": ["\u8D5B\u9A6C\u8282", "\u7269", "equirr"], "astrag": ["\u9AB0\u9AA8", "\u52A8", "astrag"], "scacc": ["\u68CB\u5B50", "\u52A8", "scacc"], "latrunc": ["\u8DF3\u68CB", "\u52A8", "latrunc"], "pila": ["\u73A9\u7403", "\u52A8", "pila"], "harpast": ["\u62A2\u7403\u620F", "\u52A8", "harpast"], "trigon": ["\u4E09\u89D2\u7403\u620F", "\u52A8", "trigon"], "certamen": ["\u7ADE\u8D5B", "\u52A8", "certamen"], "palaest": ["\u89D2\u529B\u573A", "\u52A8", "palaest"], "luctam": ["\u89D2\u529B", "\u52A8", "luctam"], "pancrat": ["\u5168\u80FD\u640F\u6597", "\u52A8", "pancrat"], "discus": ["\u94C1\u997C", "\u52A8", "discus"], "iaculum": ["\u6807\u67AA", "\u52A8", "iaculum"], "funamb": ["\u8D70\u7D22", "\u52A8", "funamb"], "praestig": ["\u5E7B\u672F", "\u52A8", "praestig"], "agon": ["\u7ADE\u8D5B", "\u52A8", "agon"], "athlet": ["\u7ADE\u6280\u8005", "\u52A8", "athlet"], "gymnic": ["\u7ADE\u6280\u7684", "\u52A8", "gymnic"], "stadio": ["\u7ADE\u8D70", "\u52A8", "stadio"], "diaul": ["\u5F80\u8FD4\u8DD1", "\u52A8", "diaul"], "coryc": ["\u7EC3\u62F3\u888B", "\u52A8", "coryc"], "halter": ["\u54D1\u94C3", "\u52A8", "halter"], "sphaeri": ["\u7403\u5BA4", "\u52A8", "sphaeri"], "aleator": ["\u8D4C\u5F92", "\u52A8", "aleator"], "fritill": ["\u9AB0\u7B52", "\u52A8", "fritill"], "petaur": ["\u8DF3\u677F", "\u52A8", "petaur"], "ascesis": ["\u82E6\u4FEE", "\u7269", "ascesis"], "meditatio": ["\u51A5\u60F3", "\u7269", "meditatio"], "ieiunium": ["\u658B\u6212", "\u7269", "ieiunium"], "litania": ["\u8FDE\u7977", "\u7269", "litania"], "psalmus": ["\u5723\u548F", "\u7269", "psalmus"], "monachus": ["\u4FEE\u58EB", "\u7269", "monachus"], "anacho": ["\u9690\u4FEE\u8005", "\u7269", "anacho"], "abbas": ["\u9662\u957F", "\u7269", "abbas"], "prioris": ["\u5973\u9662\u957F", "\u7269", "prioris"], "novic": ["\u521D\u5B66\u751F", "\u7269", "novic"], "obedientia": ["\u670D\u4ECE", "\u7269", "obedientia"], "paupertas": ["\u6E05\u8D2B", "\u7269", "paupertas"], "castitas": ["\u5B88\u8D1E", "\u7269", "castitas"], "oratorium": ["\u7948\u7977\u5BA4", "\u7269", "oratorium"], "cenobi": ["\u56E2\u4FEE\u9662", "\u7269", "cenobi"], "stupa": ["\u5854\u5E99", "\u7269", "stupa"], "pagoda": ["\u4F5B\u5854", "\u7269", "pagoda"], "sangha": ["\u50E7\u56E2", "\u7269", "sangha"], "bhikkhu": ["\u6BD4\u4E18", "\u7269", "bhikkhu"], "yogi": ["\u745C\u4F3D\u58EB", "\u7269", "yogi"], "asana": ["\u5750\u59FF", "\u7269", "asana"], "mantra": ["\u771F\u8A00", "\u7269", "mantra"], "sutra": ["\u7ECF", "\u7269", "sutra"], "dharma": ["\u6CD5\u7406", "\u7269", "dharma"], "karma": ["\u4E1A", "\u7269", "karma"], "cephala": ["\u5934\u75DB", "\u7269", "cephala"], "odontal": ["\u7259\u75DB", "\u7269", "odontal"], "arthrit": ["\u5173\u8282\u708E", "\u7269", "arthrit"], "podagra": ["\u75DB\u98CE", "\u7269", "podagra"], "colic": ["\u7EDE\u75DB", "\u7269", "colic"], "diarrh": ["\u8179\u6CFB", "\u7269", "diarrh"], "dysent": ["\u75E2\u75BE", "\u7269", "dysent"], "obstip": ["\u4FBF\u79D8", "\u7269", "obstip"], "lipoth": ["\u660F\u53A5", "\u7269", "lipoth"], "convuls": ["\u62BD\u6410", "\u7269", "convuls"], "paralys": ["\u762B\u75EA", "\u7269", "paralys"], "caecit": ["\u5931\u660E", "\u7269", "caecit"], "surdit": ["\u8033\u804B", "\u7269", "surdit"], "aphasia": ["\u5931\u8BED", "\u7269", "aphasia"], "amnesia": ["\u5065\u5FD8", "\u7269", "amnesia"], "icterus": ["\u9EC4\u75B8", "\u7269", "icterus"], "hydrops": ["\u6C34\u80BF", "\u7269", "hydrops"], "abscess": ["\u8113\u80BF", "\u7269", "abscess"], "gangrae": ["\u574F\u75BD", "\u7269", "gangrae"], "febricula": ["\u4F4E\u70ED", "\u7269", "febricula"], "struma": ["\u7630\u75AC", "\u7269", "struma"], "variola": ["\u5929\u82B1", "\u7269", "variola"], "morbill": ["\u9EBB\u75B9", "\u7269", "morbill"], "scarlat": ["\u7329\u7EA2\u70ED", "\u7269", "scarlat"], "diphthe": ["\u767D\u5589", "\u7269", "diphthe"], "faex": ["\u9152\u6E23", "\u52A8", "faex"], "vinace": ["\u8461\u8404\u6E23", "\u52A8", "vinace"], "torcul": ["\u538B\u69A8\u673A", "\u52A8", "torcul"], "prelum": ["\u69A8\u673A", "\u52A8", "prelum"], "lacus": ["\u9152\u6C60", "\u52A8", "lacus"], "cupa": ["\u9152\u6876", "\u52A8", "cupa"], "penus": ["\u50A8\u7CAE", "\u52A8", "penus"], "silo": ["\u5730\u7A96\u4ED3", "\u52A8", "silo"], "salitur": ["\u814C\u85CF", "\u52A8", "salitur"], "liquam": ["\u9C7C\u9171\u6C41", "\u52A8", "liquam"], "conditu": ["\u814C\u6E0D", "\u52A8", "conditu"], "carnar": ["\u8089\u5E93", "\u52A8", "carnar"], "doliar": ["\u6876\u5320", "\u52A8", "doliar"], "cupar": ["\u6876\u5320", "\u52A8", "cupar"], "vindemia": ["\u91C7\u8461\u8404", "\u52A8", "vindemia"], "torcular": ["\u69A8\u9152", "\u52A8", "torcular"], "caroen": ["\u716E\u9152", "\u52A8", "caroen"], "oleari": ["\u6CB9\u5546", "\u52A8", "oleari"], "vinari": ["\u9152\u5546", "\u52A8", "vinari"], "cetari": ["\u9C7C\u5546", "\u52A8", "cetari"], "frigida": ["\u51B7\u85CF\u5BA4", "\u52A8", "frigida"], "carnifi": ["\u5C60\u5BB0\u573A", "\u52A8", "carnifi"], "salsam": ["\u814C\u9C7C", "\u52A8", "salsam"], "salsur": ["\u76D0\u6E0D", "\u52A8", "salsur"], "fumos": ["\u718F\u5236\u7684", "\u52A8", "fumos"], "discrim": ["\u53D1\u7F1D", "\u7269", "discrim"], "crinale": ["\u53D1\u9488", "\u7269", "crinale"], "pulvis": ["\u7C89", "\u7269", "pulvis"], "cerussa": ["\u94C5\u7C89", "\u7269", "cerussa"], "purpuris": ["\u80ED\u8102", "\u7269", "purpuris"], "rubrica": ["\u8D6D\u7EA2", "\u7269", "rubrica"], "stibi": ["\u9EDB", "\u7269", "stibi"], "unguent": ["\u9999\u818F", "\u7269", "unguent"], "myrothe": ["\u9999\u6CB9\u76D2", "\u7269", "myrothe"], "narthe": ["\u836F\u818F\u76D2", "\u7269", "narthe"], "tonstrin": ["\u5243\u53D1\u94FA", "\u7269", "tonstrin"], "novacula": ["\u5243\u5200", "\u7269", "novacula"], "volsella": ["\u954A", "\u7269", "volsella"], "depil": ["\u62D4\u6BDB", "\u7269", "depil"], "smegma": ["\u64E6\u8EAB\u818F", "\u7269", "smegma"], "strigilis": ["\u522E\u8EAB\u5668", "\u7269", "strigilis"], "sudator": ["\u6C57\u6D74\u5BA4", "\u7269", "sudator"], "tepidarium": ["\u6E29\u6D74\u5BA4", "\u7269", "tepidarium"], "capilla": ["\u53D1\u5F0F", "\u7269", "capilla"], "ciniflo": ["\u70EB\u53D1\u5E08", "\u7269", "ciniflo"], "crinis": ["\u53D1\u4E1D", "\u7269", "crinis"], "collyr": ["\u773C\u818F", "\u7269", "collyr"], "psilot": ["\u8131\u6BDB\u836F", "\u7269", "psilot"], "sapo": ["\u7682", "\u7269", "sapo"], "puella": ["\u5973\u5B69", "\u7269", "puella"], "parvul": ["\u5E7C\u7AE5", "\u7269", "parvul"], "lactens": ["\u4E73\u513F", "\u7269", "lactens"], "crepund": ["\u6447\u94C3", "\u7269", "crepund"], "oscill": ["\u5C0F\u9762\u5177", "\u7269", "oscill"], "turben": ["\u9640\u87BA", "\u7269", "turben"], "trochus": ["\u94C1\u73AF", "\u7269", "trochus"], "pilula": ["\u5C0F\u7403", "\u7269", "pilula"], "gerula": ["\u80B2\u513F\u5AC2", "\u7269", "gerula"], "ludicrum": ["\u73A9\u7269", "\u7269", "ludicrum"], "crepitac": ["\u6447\u54CD\u5668", "\u7269", "crepitac"], "rhombus": ["\u9640\u87BA", "\u7269", "rhombus"], "lusus": ["\u6E38\u620F", "\u7269", "lusus"], "nugae": ["\u7410\u620F", "\u7269", "nugae"], "gerrae": ["\u73A9\u610F\u513F", "\u7269", "gerrae"], "inepti": ["\u5B09\u95F9", "\u7269", "inepti"], "ludibrium": ["\u7B11\u67C4\u73A9\u7269", "\u7269", "ludibrium"], "puerilis": ["\u7A1A\u6C14", "\u7269", "puerilis"], "vagitus": ["\u5A74\u513F\u557C", "\u7269", "vagitus"], "balbut": ["\u54BF\u5440", "\u7269", "balbut"], "mammula": ["\u513F\u8BED\u5988", "\u7269", "mammula"], "pusio": ["\u5C0F\u7537\u5B69", "\u7269", "pusio"], "pusa": ["\u5C0F\u5973\u5B69", "\u7269", "pusa"], "paegnium": ["\u73A9\u7269", "\u7269", "paegnium"], "infantil": ["\u5E7C\u513F\u7684", "\u7269", "infantil"], "vomer": ["\u7281\u94E7", "\u7269", "vomer"], "dental": ["\u7281\u9F7F", "\u7269", "dental"], "raster": ["\u8019", "\u7269", "raster"], "sarcul": ["\u9504", "\u7269", "sarcul"], "bidens": ["\u53CC\u9F7F\u9504", "\u7269", "bidens"], "secula": ["\u9570\u5200", "\u7269", "secula"], "vannus": ["\u7C38\u7B95", "\u7269", "vannus"], "tribel": ["\u8131\u7C92\u5668", "\u7269", "tribel"], "pala": ["\u94F2", "\u7269", "pala"], "rutrum": ["\u9539", "\u7269", "rutrum"], "ligo": ["\u9E64\u5634\u9504", "\u7269", "ligo"], "marra": ["\u5927\u9504", "\u7269", "marra"], "occator": ["\u8019\u5730\u8005", "\u7269", "occator"], "fossor": ["\u6398\u571F\u8005", "\u7269", "fossor"], "sator": ["\u64AD\u79CD\u8005", "\u7269", "sator"], "messor": ["\u6536\u5272\u8005", "\u7269", "messor"], "arator": ["\u8015\u8005", "\u7269", "arator"], "putator": ["\u4FEE\u526A\u8005", "\u7269", "putator"], "fiscina": ["\u8349\u7BEE", "\u7269", "fiscina"], "corbis": ["\u7CAE\u7B50", "\u7269", "corbis"], "qualus": ["\u7BD3", "\u7269", "qualus"], "sporta": ["\u7BEE\u7B50", "\u7269", "sporta"], "rutellum": ["\u5C0F\u9539", "\u7269", "rutellum"], "marculus": ["\u5C0F\u9524", "\u7269", "marculus"], "falcula": ["\u5C0F\u9570", "\u7269", "falcula"], "officin": ["\u5320\u4EBA", "\u7269", "officin"], "tegular": ["\u74E6\u5320", "\u7269", "tegular"], "dealba": ["\u7C89\u5237\u5320", "\u7269", "dealba"], "scenogr": ["\u5E03\u666F\u5E08", "\u7269", "scenogr"], "glutinat": ["\u88F1\u7CCA\u5320", "\u7269", "glutinat"], "clavar": ["\u9501\u5320", "\u7269", "clavar"], "serrar": ["\u952F\u5320", "\u7269", "serrar"], "vitrar": ["\u73BB\u7483\u5320", "\u7269", "vitrar"], "aurif": ["\u91D1\u5320", "\u7269", "aurif"], "argentari": ["\u94F6\u5668\u5320", "\u7269", "argentari"], "lignar": ["\u6728\u5320", "\u7269", "lignar"], "marmorar": ["\u77F3\u5320", "\u7269", "marmorar"], "calcinar": ["\u70E7\u7070\u5320", "\u7269", "calcinar"], "laterar": ["\u7816\u5320", "\u7269", "laterar"], "fictor": ["\u5851\u5320", "\u7269", "fictor"], "ceropla": ["\u8721\u5851\u5320", "\u7269", "ceropla"], "coronar": ["\u82B1\u51A0\u5320", "\u7269", "coronar"], "unguentar": ["\u9999\u818F\u5320", "\u7269", "unguentar"], "saponar": ["\u5236\u7682\u5320", "\u7269", "saponar"], "armamentar": ["\u5175\u5668\u5320", "\u7269", "armamentar"], "scutar": ["\u76FE\u5320", "\u7269", "scutar"], "sellular": ["\u6905\u5320", "\u7269", "sellular"], "lecticar": ["\u80A9\u8206\u5320", "\u7269", "lecticar"], "tornat": ["\u65CB\u5DE5", "\u7269", "tornat"], "limat": ["\u9509\u5DE5", "\u7269", "limat"], "aula": ["\u5BAB\u5EF7", "\u7269", "aula"], "regia": ["\u738B\u5BAB", "\u7269", "regia"], "palatium": ["\u5BAB\u6BBF", "\u7269", "palatium"], "thronus": ["\u738B\u5EA7", "\u7269", "thronus"], "diadema": ["\u738B\u51A0", "\u7269", "diadema"], "sceptrum": ["\u6743\u6756", "\u7269", "sceptrum"], "infula": ["\u7EF6\u5E26", "\u7269", "infula"], "audientia": ["\u89D0\u89C1", "\u7269", "audientia"], "admissio": ["\u53EC\u89C1", "\u7269", "admissio"], "salutat": ["\u671D\u8D3A", "\u7269", "salutat"], "processi": ["\u4EEA\u4ED7\u6E38\u884C", "\u7269", "processi"], "nomencl": ["\u5531\u540D\u5B98", "\u7269", "nomencl"], "cubicul": ["\u4F8D\u5BDD\u5B98", "\u7269", "cubicul"], "aulae": ["\u5BAB\u4EBA", "\u7269", "aulae"], "sellacur": ["\u8C61\u7259\u6905", "\u7269", "sellacur"], "chlamys": ["\u5BAB\u888D", "\u7269", "chlamys"], "paludam": ["\u5143\u5E05\u62AB\u98CE", "\u7269", "paludam"], "cathedra": ["\u5B9D\u5EA7", "\u7269", "cathedra"], "solium": ["\u5FA1\u5EA7", "\u7269", "solium"], "referen": ["\u594F\u4E8B\u5B98", "\u7269", "referen"], "silentia": ["\u9759\u9ED8\u5B98", "\u7269", "silentia"], "castren": ["\u5BAB\u5EF7\u603B\u7BA1", "\u7269", "castren"], "sacella": ["\u5E93\u5B98", "\u7269", "sacella"], "ostiar": ["\u95E8\u5B98", "\u7269", "ostiar"], "decanus": ["\u5341\u4EBA\u957F", "\u7269", "decanus"], "sollemn": ["\u5E86\u5178", "\u7269", "sollemn"], "circens": ["\u7ADE\u6280\u4F1A", "\u7269", "circens"], "saturnal": ["\u519C\u795E\u8282", "\u7269", "saturnal"], "luperca": ["\u7267\u795E\u8282", "\u7269", "luperca"], "floral": ["\u82B1\u795E\u8282", "\u7269", "floral"], "compita": ["\u8DEF\u53E3\u8282", "\u7269", "compita"], "rosali": ["\u73AB\u7470\u8282", "\u7269", "rosali"], "amburb": ["\u7ED5\u57CE\u796D", "\u7269", "amburb"], "muner": ["\u89D2\u6597\u8868\u6F14", "\u7269", "muner"], "naumach": ["\u6D77\u6218\u8868\u6F14", "\u7269", "naumach"], "bacchan": ["\u9152\u795E\u8282", "\u7269", "bacchan"], "cereal": ["\u8C37\u795E\u8282", "\u7269", "cereal"], "vestal": ["\u7076\u795E\u8282", "\u7269", "vestal"], "quirina": ["\u5E02\u6C11\u8282", "\u7269", "quirina"], "fordici": ["\u5B55\u725B\u796D", "\u7269", "fordici"], "ambarva": ["\u7530\u5DE1\u796D", "\u7269", "ambarva"], "terminal": ["\u754C\u77F3\u8282", "\u7269", "terminal"], "regifug": ["\u9010\u738B\u8282", "\u7269", "regifug"], "nefast": ["\u51F6\u65E5", "\u7269", "nefast"], "intercal": ["\u95F0\u6708", "\u7269", "intercal"], "vinali": ["\u9152\u8282", "\u7269", "vinali"], "meditri": ["\u65B0\u9152\u8282", "\u7269", "meditri"], "fontin": ["\u6CC9\u8282", "\u7269", "fontin"], "robiga": ["\u795B\u9508\u8282", "\u7269", "robiga"], "opali": ["\u4E30\u4EA7\u8282", "\u7269", "opali"], "schedula": ["\u5C0F\u7B7E", "\u7269", "schedula"], "frontis": ["\u6249\u9875", "\u7269", "frontis"], "praefat": ["\u5E8F\u8A00", "\u7269", "praefat"], "prooemi": ["\u7EEA\u8BBA", "\u7269", "prooemi"], "appendi": ["\u9644\u5F55", "\u7269", "appendi"], "marginal": ["\u9875\u8FB9\u6CE8", "\u7269", "marginal"], "scholi": ["\u7B3A\u6CE8", "\u7269", "scholi"], "coloph": ["\u9898\u8DCB", "\u7269", "coloph"], "explicit": ["\u5377\u672B\u9898", "\u7269", "explicit"], "incipit": ["\u5377\u9996\u9898", "\u7269", "incipit"], "quatern": ["\u4E66\u5E16", "\u7269", "quatern"], "pugilla": ["\u624B\u672D\u677F", "\u7269", "pugilla"], "diptych": ["\u53CC\u6298\u677F", "\u7269", "diptych"], "tripty": ["\u4E09\u6298\u677F", "\u7269", "tripty"], "polypty": ["\u591A\u6298\u677F", "\u7269", "polypty"], "subscri": ["\u5377\u672B\u7F72\u540D", "\u7269", "subscri"], "bybl": ["\u7EB8\u838E\u8349\u82AF", "\u7269", "bybl"], "bombyci": ["\u68C9\u7EB8", "\u7269", "bombyci"], "pumex": ["\u78E8\u7EB8\u77F3", "\u7269", "pumex"], "commenta": ["\u6CE8\u8BB0", "\u7269", "commenta"], "diar": ["\u65E5\u8BB0", "\u7269", "diar"], "adversa": ["\u6742\u8BB0", "\u7269", "adversa"], "capitula": ["\u6555\u4EE4\u96C6", "\u7269", "capitula"], "breviar": ["\u8282\u672C", "\u7269", "breviar"], "florileg": ["\u82B1\u7D6E\u96C6", "\u7269", "florileg"], "molitura": ["\u78E8\u7C89", "\u52A8", "molitura"], "pistur": ["\u8202\u7C73", "\u52A8", "pistur"], "cribrat": ["\u7B5B\u7C89", "\u52A8", "cribrat"], "subact": ["\u63C9\u9762", "\u52A8", "subact"], "assatur": ["\u7099\u70E4", "\u52A8", "assatur"], "frictur": ["\u6CB9\u70B8", "\u52A8", "frictur"], "infusio": ["\u6D78\u6CE1", "\u52A8", "infusio"], "macera": ["\u6D78\u6E0D", "\u52A8", "macera"], "torrefa": ["\u7119\u7092", "\u52A8", "torrefa"], "pressur": ["\u538B\u69A8", "\u52A8", "pressur"], "gelatio": ["\u51BB\u7ED3", "\u52A8", "gelatio"], "mellif": ["\u917F\u871C", "\u52A8", "mellif"], "vinif": ["\u917F\u9152", "\u52A8", "vinif"], "acetif": ["\u917F\u918B", "\u52A8", "acetif"], "caseif": ["\u5236\u916A", "\u52A8", "caseif"], "panif": ["\u5236\u9762\u5305", "\u52A8", "panif"], "oleif": ["\u69A8\u6CB9", "\u52A8", "oleif"], "saccharif": ["\u5236\u7CD6", "\u52A8", "saccharif"], "farinari": ["\u78E8\u574A\u4E3B", "\u52A8", "farinari"], "molito": ["\u78E8\u574A\u4E3B", "\u52A8", "molito"], "condito": ["\u8C03\u5473\u8005", "\u52A8", "condito"], "salsamen": ["\u814C\u9C7C\u5320", "\u52A8", "salsamen"], "carnari": ["\u8089\u8D29", "\u52A8", "carnari"], "cisterna": ["\u84C4\u6C34\u6C60", "\u7269", "cisterna"], "rotaqua": ["\u6C34\u8F66", "\u7269", "rotaqua"], "molaaqu": ["\u6C34\u78E8", "\u7269", "molaaqu"], "incile": ["\u5F15\u6C34\u6E20", "\u7269", "incile"], "emissar": ["\u6392\u6C34\u9053", "\u7269", "emissar"], "colare": ["\u6EE4\u6C34", "\u7269", "colare"], "fistula": ["\u6C34\u7BA1", "\u7269", "fistula"], "castella": ["\u6C34\u5854", "\u7269", "castella"], "hydraul": ["\u6C34\u529B\u673A\u68B0", "\u7269", "hydraul"], "noria": ["\u6C34\u8F66", "\u7269", "noria"], "aquilex": ["\u627E\u6C34\u4EBA", "\u7269", "aquilex"], "groma": ["\u6D4B\u89D2\u4EEA", "\u7269", "groma"], "choroba": ["\u6C34\u51C6\u4EEA", "\u7269", "choroba"], "dioptra": ["\u6D4B\u89D2\u5668", "\u7269", "dioptra"], "puteal": ["\u4E95\u680F", "\u7269", "puteal"], "substruc": ["\u57FA\u5824", "\u7269", "substruc"], "fulcimen": ["\u652F\u67F1", "\u7269", "fulcimen"], "aquagi": ["\u6C34\u9053\u7A0E", "\u7269", "aquagi"], "navigi": ["\u901A\u822A", "\u7269", "navigi"], "ripa": ["\u6CB3\u5CB8", "\u7269", "ripa"], "molendi": ["\u78E8\u574A", "\u7269", "molendi"], "siphunc": ["\u5C0F\u7BA1", "\u7269", "siphunc"], "canalic": ["\u5C0F\u6E20", "\u7269", "canalic"], "aquari": ["\u6C34\u5DE5", "\u7269", "aquari"], "librator": ["\u6C34\u51C6\u6D4B\u91CF\u5458", "\u7269", "librator"], "celox": ["\u5FEB\u8239", "\u7269", "celox"], "liburna": ["\u8F7B\u5E06\u8239", "\u7269", "liburna"], "triremis": ["\u4E09\u5217\u6868\u8239", "\u7269", "triremis"], "quinqueremis": ["\u4E94\u5217\u6868\u8239", "\u7269", "quinqueremis"], "actuaria": ["\u5FEB\u8247", "\u7269", "actuaria"], "ponto": ["\u5E73\u5E95\u8239", "\u7269", "ponto"], "scapha": ["\u5C0F\u8247", "\u7269", "scapha"], "horia": ["\u6E14\u8239", "\u7269", "horia"], "onerari": ["\u5546\u8239", "\u7269", "onerari"], "longa": ["\u6218\u8239", "\u7269", "longa"], "lembus": ["\u8F7B\u821F", "\u7269", "lembus"], "cercur": ["\u8D5B\u666E\u52D2\u65AF\u8239", "\u7269", "cercur"], "catasco": ["\u4FA6\u5BDF\u8239", "\u7269", "catasco"], "hippago": ["\u8FD0\u9A6C\u8239", "\u7269", "hippago"], "schedia": ["\u7B4F", "\u7269", "schedia"], "utricul": ["\u76AE\u7B4F", "\u7269", "utricul"], "carabus": ["\u67F3\u6761\u8247", "\u7269", "carabus"], "nauclerus": ["\u8239\u4E3B", "\u7269", "nauclerus"], "celeus": ["\u6868\u624B\u957F", "\u7269", "celeus"], "apparat": ["\u7D22\u5177", "\u7269", "apparat"], "anquina": ["\u5E06\u811A\u7D22", "\u7269", "anquina"], "scalmus": ["\u6868\u67B6", "\u7269", "scalmus"], "tonsa": ["\u6868\u53F6", "\u7269", "tonsa"], "portisc": ["\u6868\u624B\u6B4C\u8005", "\u7269", "portisc"], "hortat": ["\u50AC\u6868\u8005", "\u7269", "hortat"], "madeo": ["\u6D78\u6E7F", "\u52A8", "madeo"], "madid": ["\u6E7F\u900F", "\u52A8", "madid"], "udus": ["\u6F6E\u6E7F", "\u52A8", "udus"], "bulla": ["\u6C34\u6CE1", "\u52A8", "bulla"], "spuma": ["\u6CE1\u6CAB", "\u52A8", "spuma"], "merso": ["\u6C89\u6CA1", "\u52A8", "merso"], "fluito": ["\u6F02\u6D6E", "\u52A8", "fluito"], "subsid": ["\u4E0B\u6C89", "\u52A8", "subsid"], "emerg": ["\u6D6E\u51FA", "\u52A8", "emerg"], "stillici": ["\u6EF4\u6C34", "\u52A8", "stillici"], "proluvi": ["\u51B2\u79EF", "\u52A8", "proluvi"], "colluvi": ["\u6DE4\u79EF", "\u52A8", "colluvi"], "manatio": ["\u6D8C\u6D41", "\u52A8", "manatio"], "profluvi": ["\u6D41\u51FA", "\u52A8", "profluvi"], "redunda": ["\u6EA2\u51FA", "\u52A8", "redunda"], "exundat": ["\u6CDB\u6EE5", "\u52A8", "exundat"], "irrigu": ["\u704C\u533A", "\u52A8", "irrigu"], "aquatio": ["\u53D6\u6C34", "\u52A8", "aquatio"], "haurito": ["\u6C72\u6C34\u5904", "\u52A8", "haurito"], "umecto": ["\u6DA6\u6E7F", "\u52A8", "umecto"], "roro": ["\u964D\u9732", "\u52A8", "roro"], "pluo": ["\u4E0B\u96E8", "\u52A8", "pluo"], "ningo": ["\u4E0B\u96EA", "\u52A8", "ningo"], "madefac": ["\u4F7F\u6E7F", "\u52A8", "madefac"], "arefaci": ["\u4F7F\u5E72", "\u52A8", "arefaci"], "cymatium": ["\u7EBF\u811A", "\u7269", "cymatium"], "capitellum": ["\u67F1\u5934", "\u7269", "capitellum"], "scamillus": ["\u67F1\u7840", "\u7269", "scamillus"], "anaglyph": ["\u6D6E\u96D5", "\u7269", "anaglyph"], "polychr": ["\u5F69\u7ED8", "\u7269", "polychr"], "encaust": ["\u8721\u753B", "\u7269", "encaust"], "opussect": ["\u9576\u5D4C\u77F3", "\u7269", "opussect"], "crustat": ["\u8D34\u9762", "\u7269", "crustat"], "albari": ["\u767D\u7070", "\u7269", "albari"], "signinum": ["\u788E\u77F3\u5730", "\u7269", "signinum"], "lithost": ["\u94FA\u77F3", "\u7269", "lithost"], "sectil": ["\u62FC\u82B1", "\u7269", "sectil"], "sima": ["\u6A90\u53E3", "\u7269", "sima"], "emblem": ["\u9576\u5D4C\u56FE", "\u7269", "emblem"], "hypaeth": ["\u9732\u5929\u9876", "\u7269", "hypaeth"], "columnat": ["\u5217\u67F1", "\u7269", "columnat"], "peristy": ["\u5217\u67F1\u4E2D\u5EAD", "\u7269", "peristy"], "strobil": ["\u67F1\u5934\u5377\u53F6", "\u7269", "strobil"], "voluta": ["\u6DA1\u5377", "\u7269", "voluta"], "acanthus": ["\u831B\u82D5\u53F6\u9970", "\u7269", "acanthus"], "fasciola": ["\u5C0F\u5E26\u9970", "\u7269", "fasciola"], "scotia": ["\u51F9\u5706\u7EBF", "\u7269", "scotia"], "mutulus": ["\u6A90\u4E0B\u6258\u5757", "\u7269", "mutulus"], "denticu": ["\u9F7F\u9970", "\u7269", "denticu"], "anthemion": ["\u82B1\u9970", "\u7269", "anthemion"], "campana": ["\u949F", "\u7269", "campana"], "crotalum": ["\u54CD\u677F", "\u7269", "crotalum"], "sistrum": ["\u53C9\u94C3", "\u7269", "sistrum"], "pandura": ["\u4E09\u5F26", "\u7269", "pandura"], "nablium": ["\u7AD6\u7434", "\u7269", "nablium"], "psalterium": ["\u745F", "\u7269", "psalterium"], "hydraulus": ["\u6C34\u529B\u98CE\u7434", "\u7269", "hydraulus"], "monaulus": ["\u5355\u7BA1", "\u7269", "monaulus"], "scabellum": ["\u62CD\u677F", "\u7269", "scabellum"], "melos": ["\u66F2\u8C03", "\u7269", "melos"], "tonus": ["\u8C03", "\u7269", "tonus"], "choraul": ["\u7B1B\u4F34\u6B4C\u8005", "\u7269", "choraul"], "citharo": ["\u7434\u6B4C\u8005", "\u7269", "citharo"], "auloed": ["\u7BA1\u6B4C\u8005", "\u7269", "auloed"], "tibicen": ["\u7B1B\u624B", "\u7269", "tibicen"], "fidicen": ["\u7434\u624B", "\u7269", "fidicen"], "symphon": ["\u4E50\u5E08", "\u7269", "symphon"], "musicus": ["\u4E50\u4EBA", "\u7269", "musicus"], "cantor": ["\u6B4C\u8005", "\u7269", "cantor"], "psaltes": ["\u5F39\u745F\u8005", "\u7269", "psaltes"], "saltato": ["\u821E\u8005", "\u7269", "saltato"], "exodium": ["\u5E55\u95F4\u5267", "\u7269", "exodium"], "emboli": ["\u63D2\u66F2", "\u7269", "emboli"], "minus": ["\u54D1\u5267", "\u7269", "minus"], "atellana": ["\u7B11\u5267", "\u7269", "atellana"], "tranquil": ["\u5B89\u5B81", "\u6027", "tranquil"], "fiducia": ["\u4FE1\u8D56", "\u6027", "fiducia"], "formido": ["\u60CA\u60F6", "\u6027", "formido"], "angustia": ["\u90C1\u7ED3", "\u6027", "angustia"], "moeror": ["\u60B2\u6078", "\u6027", "moeror"], "luctus": ["\u54C0\u6078", "\u6027", "luctus"], "desider": ["\u7737\u604B", "\u6027", "desider"], "dedecus": ["\u803B\u8FB1", "\u6027", "dedecus"], "ignomin": ["\u7F9E\u8FB1", "\u6027", "ignomin"], "probrum": ["\u4E11\u884C", "\u6027", "probrum"], "blandimen": ["\u67D4\u60C5", "\u6027", "blandimen"], "commotio": ["\u6FC0\u52A8", "\u6027", "commotio"], "permotio": ["\u60C5\u7EEA\u9707\u52A8", "\u6027", "permotio"], "turbatio": ["\u70E6\u4E71", "\u6027", "turbatio"], "abomina": ["\u618E\u6076", "\u6027", "abomina"], "detesta": ["\u5ACC\u6076", "\u6027", "detesta"], "aversat": ["\u53CD\u611F", "\u6027", "aversat"], "compunc": ["\u6094\u6068", "\u6027", "compunc"], "remors": ["\u6094\u610F", "\u6027", "remors"], "querimo": ["\u6028\u8BC9", "\u6027", "querimo"], "complor": ["\u54C0\u53F7", "\u6027", "complor"], "consolat": ["\u6170\u85C9", "\u6027", "consolat"], "exhorta": ["\u9F13\u52B1", "\u6027", "exhorta"], "adhorta": ["\u529D\u52C9", "\u6027", "adhorta"], "rotundus": ["\u5706\u7684", "\u6027", "rotundus"], "quadratus": ["\u65B9\u7684", "\u6027", "quadratus"], "oblongus": ["\u957F\u65B9\u7684", "\u6027", "oblongus"], "curvus": ["\u5F2F\u7684", "\u6027", "curvus"], "flexuos": ["\u66F2\u6298\u7684", "\u6027", "flexuos"], "sinuos": ["\u873F\u8712\u7684", "\u6027", "sinuos"], "angulos": ["\u591A\u89D2\u7684", "\u6027", "angulos"], "striatus": ["\u6761\u7EB9\u7684", "\u6027", "striatus"], "maculos": ["\u6591\u70B9\u7684", "\u6027", "maculos"], "globos": ["\u7403\u72B6\u7684", "\u6027", "globos"], "ovatus": ["\u5375\u5F62\u7684", "\u6027", "ovatus"], "conic": ["\u9525\u5F62\u7684", "\u6027", "conic"], "planus": ["\u5E73\u7684", "\u6027", "planus"], "convexus": ["\u51F8\u7684", "\u6027", "convexus"], "concavus": ["\u51F9\u7684", "\u6027", "concavus"], "nodos": ["\u591A\u8282\u7684", "\u6027", "nodos"], "sphaeric": ["\u7403\u9762\u7684", "\u6027", "sphaeric"], "cubicus": ["\u7ACB\u65B9\u7684", "\u6027", "cubicus"], "triangul": ["\u4E09\u89D2\u7684", "\u6027", "triangul"], "hexagon": ["\u516D\u89D2\u7684", "\u6027", "hexagon"], "acumina": ["\u5C16\u7684", "\u6027", "acumina"], "retusus": ["\u949D\u7684", "\u6027", "retusus"], "hamatus": ["\u94A9\u72B6\u7684", "\u6027", "hamatus"], "serratus": ["\u952F\u9F7F\u7684", "\u6027", "serratus"], "stellat": ["\u661F\u5F62\u7684", "\u6027", "stellat"], "sumo": ["\u62FF\u8D77", "\u52A8", "sumo"], "pono": ["\u653E\u4E0B", "\u52A8", "pono"], "extraho": ["\u62D4\u51FA", "\u52A8", "extraho"], "imprimo": ["\u538B\u5165", "\u52A8", "imprimo"], "compon": ["\u5BF9\u9F50", "\u52A8", "compon"], "aequa": ["\u5F04\u5E73", "\u52A8", "aequa"], "hebeto": ["\u5F04\u949D", "\u52A8", "hebeto"], "acuo": ["\u78E8\u5229", "\u52A8", "acuo"], "diruo": ["\u62C6\u6BC1", "\u52A8", "diruo"], "trado": ["\u4EA4\u4ED8", "\u52A8", "trado"], "abdo": ["\u85CF\u533F", "\u52A8", "abdo"], "recond": ["\u6536\u85CF", "\u52A8", "recond"], "promo": ["\u53D6\u51FA", "\u52A8", "promo"], "repono": ["\u653E\u56DE", "\u52A8", "repono"], "eximo": ["\u53D6\u51FA", "\u52A8", "eximo"], "erigo": ["\u7AD6\u7ACB", "\u52A8", "erigo"], "inclino": ["\u503E\u659C", "\u52A8", "inclino"], "percuti": ["\u6572\u51FB", "\u52A8", "percuti"], "ferio": ["\u6253\u51FB", "\u52A8", "ferio"], "verso": ["\u7FFB\u52A8", "\u52A8", "verso"], "figo": ["\u9489\u4F4F", "\u52A8", "figo"], "infigo": ["\u9489\u5165", "\u52A8", "infigo"], "defigo": ["\u9489\u7262", "\u52A8", "defigo"], "scindo": ["\u5288\u5F00", "\u52A8", "scindo"], "findo": ["\u88C2\u5F00", "\u52A8", "findo"], "grand": ["\u5B8F\u5927", "\u6027", "grand"], "ingen": ["\u5E9E\u5927", "\u6027", "ingen"], "imman": ["\u5DE8\u5927", "\u6027", "imman"], "enorm": ["\u5F02\u5E38\u5927", "\u6027", "enorm"], "spatios": ["\u5BBD\u655E", "\u6027", "spatios"], "copios": ["\u4E30\u5BCC", "\u6027", "copios"], "abund": ["\u4E30\u88D5", "\u6027", "abund"], "larg": ["\u4E30\u76DB", "\u6027", "larg"], "profus": ["\u5145\u6C9B", "\u6027", "profus"], "multip": ["\u7E41\u591A", "\u6027", "multip"], "numeros": ["\u4F17\u591A", "\u6027", "numeros"], "frequens": ["\u7A20\u5BC6", "\u6027", "frequens"], "creber": ["\u5BC6\u96C6", "\u6027", "creber"], "opim": ["\u4E30\u9976", "\u6027", "opim"], "uber": ["\u591A\u4EA7", "\u6027", "uber"], "locupl": ["\u5BCC\u88D5", "\u6027", "locupl"], "sumptu": ["\u5962\u534E", "\u6027", "sumptu"], "magnif": ["\u5B8F\u4F1F", "\u6027", "magnif"], "grandil": ["\u8C6A\u8A00", "\u6027", "grandil"], "august": ["\u5E84\u4E25", "\u6027", "august"], "coloss": ["\u5DE8\u578B", "\u6027", "coloss"], "titan": ["\u5DE8\u64D8", "\u6027", "titan"], "gigan": ["\u5DE8\u4EBA\u7684", "\u6027", "gigan"], "prolix": ["\u5197\u957F", "\u6027", "prolix"], "pusill": ["\u5FAE\u5C0F", "\u6027", "pusill"], "exigu": ["\u7A00\u5C11", "\u6027", "exigu"], "minut": ["\u7EC6\u5FAE", "\u6027", "minut"], "subtil": ["\u7CBE\u7EC6", "\u6027", "subtil"], "modic": ["\u9002\u4E2D", "\u6027", "modic"], "infreq": ["\u7A00\u5C11", "\u6027", "infreq"], "jejun": ["\u8D2B\u7620", "\u6027", "jejun"], "inops": ["\u8D2B\u4E4F", "\u6027", "inops"], "egens": ["\u532E\u4E4F", "\u6027", "egens"], "indige": ["\u77ED\u7F3A", "\u6027", "indige"], "nugax": ["\u7410\u5C51", "\u6027", "nugax"], "frivol": ["\u7410\u788E", "\u6027", "frivol"], "levid": ["\u6D45\u8584", "\u6027", "levid"], "atomus": ["\u5FAE\u5C18", "\u6027", "atomus"], "puncil": ["\u5FAE\u5C0F\u70B9", "\u6027", "puncil"], "brevil": ["\u7B80\u77ED", "\u6027", "brevil"], "exili": ["\u8D2B\u8584", "\u6027", "exili"], "macer": ["\u7626\u7620", "\u6027", "macer"], "gracil": ["\u7EA4\u7EC6", "\u6027", "gracil"], "angust": ["\u72ED\u7A84", "\u6027", "angust"], "arct": ["\u7D27\u7A84", "\u6027", "arct"], "strict": ["\u6536\u7D27", "\u6027", "strict"], "coarct": ["\u538B\u7F29", "\u6027", "coarct"], "contrac": ["\u6536\u7F29", "\u6027", "contrac"], "compres": ["\u538B\u7F29", "\u6027", "compres"], "velox": ["\u8FC5\u6377", "\u6027", "velox"], "pernix": ["\u654F\u6377", "\u6027", "pernix"], "ocior": ["\u66F4\u5FEB", "\u6027", "ocior"], "praepes": ["\u75BE\u98DE", "\u6027", "praepes"], "rapid": ["\u6025\u901F", "\u6027", "rapid"], "vehem": ["\u731B\u70C8", "\u6027", "vehem"], "incit": ["\u75BE\u884C", "\u6027", "incit"], "segnis": ["\u8FDF\u7F13", "\u6027", "segnis"], "piger": ["\u6020\u60F0", "\u6027", "piger"], "deses": ["\u61D2\u6563", "\u6027", "deses"], "morosus": ["\u62D6\u5EF6", "\u6027", "morosus"], "cunct": ["\u8FDF\u7F13", "\u6027", "cunct"], "remora": ["\u8FDF\u5EF6", "\u6027", "remora"], "praecep": ["\u6025\u4FC3", "\u6027", "praecep"], "subitus": ["\u7A81\u7136", "\u6027", "subitus"], "repens": ["\u7A81\u5140", "\u6027", "repens"], "extemp": ["\u7ACB\u523B", "\u6027", "extemp"], "seroti": ["\u8FDF\u6765", "\u6027", "seroti"], "praecox": ["\u65E9\u719F", "\u6027", "praecox"], "assidu": ["\u4E0D\u95F4\u65AD", "\u6027", "assidu"], "morato": ["\u62D6\u5EF6\u8005", "\u6027", "morato"], "cuncta": ["\u62D6\u5EF6\u8005", "\u6027", "cuncta"], "pernici": ["\u8FC5\u75BE", "\u6027", "pernici"], "propera": ["\u4ED3\u4FC3", "\u6027", "propera"], "valid": ["\u5F3A\u58EE", "\u6027", "valid"], "nervos": ["\u6709\u529B", "\u6027", "nervos"], "lacert": ["\u5065\u7855", "\u6027", "lacert"], "praepot": ["\u81F3\u5F3A", "\u6027", "praepot"], "opulen": ["\u5BCC\u529B", "\u6027", "opulen"], "infirm": ["\u75C5\u5F31", "\u6027", "infirm"], "fragil": ["\u6613\u788E", "\u6027", "fragil"], "caduc": ["\u6613\u5012", "\u6027", "caduc"], "enerv": ["\u65E0\u529B", "\u6027", "enerv"], "effetus": ["\u8870\u7AED", "\u6027", "effetus"], "marcid": ["\u840E\u5F31", "\u6027", "marcid"], "tabid": ["\u6D88\u8017", "\u6027", "tabid"], "valetud": ["\u591A\u75C5", "\u6027", "valetud"], "praeval": ["\u5360\u4F18", "\u6027", "praeval"], "superan": ["\u8D85\u8D8A", "\u6027", "superan"], "invictus": ["\u4E0D\u8D25", "\u6027", "invictus"], "impoten": ["\u65E0\u529B", "\u6027", "impoten"], "invalid": ["\u65E0\u529B", "\u6027", "invalid"], "tenellus": ["\u5A07\u5F31", "\u6027", "tenellus"], "delica": ["\u5A07\u5F31", "\u6027", "delica"], "fessus": ["\u75B2\u60EB", "\u6027", "fessus"], "lassus": ["\u75B2\u5026", "\u6027", "lassus"], "defess": ["\u7CBE\u75B2\u529B\u7AED", "\u6027", "defess"], "exhaus": ["\u8017\u7AED", "\u6027", "exhaus"], "confect": ["\u8870\u9893", "\u6027", "confect"], "specio": ["\u534E\u7F8E", "\u6027", "specio"], "decor": ["\u96C5\u81F4", "\u6027", "decor"], "elegan": ["\u4F18\u96C5", "\u6027", "elegan"], "comptus": ["\u4FEE\u9970", "\u6027", "comptus"], "lautus": ["\u7CBE\u7F8E", "\u6027", "lautus"], "concinn": ["\u5DE5\u5DE7", "\u6027", "concinn"], "lepid": ["\u98CE\u8DA3", "\u6027", "lepid"], "amabil": ["\u53EF\u7231", "\u6027", "amabil"], "suavis": ["\u7518\u7F8E", "\u6027", "suavis"], "taeter": ["\u4E11\u6076", "\u6027", "taeter"], "horrid": ["\u7C97\u964B", "\u6027", "horrid"], "monstros": ["\u602A\u5F02", "\u6027", "monstros"], "pulchel": ["\u79C0\u7F8E", "\u6027", "pulchel"], "splendid": ["\u7480\u74A8", "\u6027", "splendid"], "eximi": ["\u5353\u5F02", "\u6027", "eximi"], "insign": ["\u975E\u51E1", "\u6027", "insign"], "praest": ["\u5353\u8D8A", "\u6027", "praest"], "mediocr": ["\u5E73\u5EB8", "\u6027", "mediocr"], "turpitu": ["\u4E11\u884C", "\u6027", "turpitu"], "foedit": ["\u6C61\u79FD", "\u6027", "foedit"], "rutilus": ["\u7EA2\u8273", "\u6027", "rutilus"], "florens": ["\u7E41\u76DB", "\u6027", "florens"], "vernan": ["\u6625\u610F", "\u6027", "vernan"], "ornat": ["\u534E\u9970", "\u6027", "ornat"], "cultus": ["\u4FEE\u9970", "\u6027", "cultus"], "fari": ["\u8A00\u8BF4", "\u52A8", "fari"], "effar": ["\u5BA3\u8BF4", "\u52A8", "effar"], "proloq": ["\u5410\u9732", "\u52A8", "proloq"], "alloq": ["\u642D\u8BDD", "\u52A8", "alloq"], "eloq": ["\u9648\u8BF4", "\u52A8", "eloq"], "interloq": ["\u63D2\u8BDD", "\u52A8", "interloq"], "obloq": ["\u53CD\u9A73", "\u52A8", "obloq"], "colloq": ["\u4EA4\u8C08", "\u52A8", "colloq"], "refer": ["\u8F6C\u8FF0", "\u52A8", "refer"], "enarr": ["\u8BE6\u8FF0", "\u52A8", "enarr"], "expon": ["\u9648\u8FF0", "\u52A8", "expon"], "signifi": ["\u8868\u660E", "\u52A8", "signifi"], "declar": ["\u58F0\u660E", "\u52A8", "declar"], "testari": ["\u4F5C\u8BC1", "\u52A8", "testari"], "profit": ["\u5BA3\u79F0", "\u52A8", "profit"], "asser": ["\u4E3B\u5F20", "\u52A8", "asser"], "inscrib": ["\u9898\u5199", "\u52A8", "inscrib"], "adscrib": ["\u9644\u8BB0", "\u52A8", "adscrib"], "edic": ["\u9881\u5E03", "\u52A8", "edic"], "interdic": ["\u7981\u6B62", "\u52A8", "interdic"], "praedic": ["\u9884\u544A", "\u52A8", "praedic"], "dicax": ["\u597D\u8BA5\u8BBD", "\u52A8", "dicax"], "verbos": ["\u5197\u8A00", "\u52A8", "verbos"], "garrul": ["\u9976\u820C", "\u52A8", "garrul"], "facund": ["\u96C4\u8FA9", "\u52A8", "facund"], "aspic": ["\u6CE8\u89C6", "\u52A8", "aspic"], "circums": ["\u73AF\u89C6", "\u52A8", "circums"], "respic": ["\u56DE\u770B", "\u52A8", "respic"], "despic": ["\u8F7B\u89C6", "\u52A8", "despic"], "dispici": ["\u8FA8\u8BA4", "\u52A8", "dispici"], "inspic": ["\u5BA1\u89C6", "\u52A8", "inspic"], "perlust": ["\u904D\u89C8", "\u52A8", "perlust"], "tueri": ["\u5B88\u62A4\u770B", "\u52A8", "tueri"], "exaud": ["\u542C\u6E05", "\u52A8", "exaud"], "obaud": ["\u542C\u4ECE", "\u52A8", "obaud"], "inaud": ["\u542C\u95FB", "\u52A8", "inaud"], "subaud": ["\u542C\u51FA", "\u52A8", "subaud"], "peraud": ["\u542C\u904D", "\u52A8", "peraud"], "oculat": ["\u76EE\u51FB\u7684", "\u52A8", "oculat"], "aurit": ["\u6709\u8033\u7684", "\u52A8", "aurit"], "inspect": ["\u7EC6\u770B", "\u52A8", "inspect"], "patul": ["\u5F20\u5F00", "\u52A8", "patul"], "nosc": ["\u8BA4\u8BC6", "\u52A8", "nosc"], "agnosc": ["\u8BA4\u51FA", "\u52A8", "agnosc"], "vener": ["\u77BB\u4EF0", "\u52A8", "vener"], "ador": ["\u656C\u62DC", "\u52A8", "ador"], "aspecta": ["\u51DD\u671B", "\u52A8", "aspecta"], "visere": ["\u9020\u8BBF\u770B", "\u52A8", "visere"], "invis": ["\u63A2\u770B", "\u52A8", "invis"], "revis": ["\u91CD\u8BBF", "\u52A8", "revis"], "provis": ["\u9884\u5BDF", "\u52A8", "provis"], "capi": ["\u6293\u53D6", "\u52A8", "capi"], "prend": ["\u6349", "\u52A8", "prend"], "fero": ["\u6301\u8FD0", "\u52A8", "fero"], "sustin": ["\u6258\u4F4F", "\u52A8", "sustin"], "recipi": ["\u63A5\u56DE", "\u52A8", "recipi"], "retin": ["\u7559\u4F4F", "\u52A8", "retin"], "dimitt": ["\u653E\u5F00", "\u52A8", "dimitt"], "omitt": ["\u7565\u53BB", "\u52A8", "omitt"], "relinq": ["\u7559\u4E0B", "\u52A8", "relinq"], "desere": ["\u5F03", "\u52A8", "desere"], "abici": ["\u4E22\u5F03", "\u52A8", "abici"], "proici": ["\u629B\u51FA", "\u52A8", "proici"], "mando": ["\u4EA4\u4ED8", "\u52A8", "mando"], "commend": ["\u6258\u4ED8", "\u52A8", "commend"], "tribu": ["\u6388\u4E88", "\u52A8", "tribu"], "asport": ["\u642C\u8D70", "\u52A8", "asport"], "adveh": ["\u8FD0\u6765", "\u52A8", "adveh"], "deveh": ["\u8FD0\u4E0B", "\u52A8", "deveh"], "reveh": ["\u8FD0\u56DE", "\u52A8", "reveh"], "subveh": ["\u4E0A\u8FD0", "\u52A8", "subveh"], "transve": ["\u8F6C\u8FD0", "\u52A8", "transve"], "inveh": ["\u8FD0\u5165", "\u52A8", "inveh"], "eveh": ["\u8FD0\u51FA", "\u52A8", "eveh"], "complec": ["\u62E5\u62B1", "\u52A8", "complec"], "retent": ["\u6263\u7559", "\u52A8", "retent"], "eo": ["\u53BB", "\u52A8", "eo"], "vado": ["\u884C\u8D70", "\u52A8", "vado"], "inced": ["\u8FC8\u6B65", "\u52A8", "inced"], "perg": ["\u524D\u884C", "\u52A8", "perg"], "profic": ["\u542F\u7A0B", "\u52A8", "profic"], "egred": ["\u8D70\u51FA", "\u52A8", "egred"], "ingred": ["\u8D70\u5165", "\u52A8", "ingred"], "regred": ["\u9000\u56DE", "\u52A8", "regred"], "transgr": ["\u8D8A\u8FC7", "\u52A8", "transgr"], "congred": ["\u76F8\u4F1A", "\u52A8", "congred"], "palor": ["\u6E38\u8361", "\u52A8", "palor"], "discur": ["\u5954\u8D70", "\u52A8", "discur"], "obrepo": ["\u6F5C\u884C", "\u52A8", "obrepo"], "irrep": ["\u6F5C\u5165", "\u52A8", "irrep"], "subrep": ["\u722C\u5165", "\u52A8", "subrep"], "commig": ["\u8FC1\u5165", "\u52A8", "commig"], "emig": ["\u8FC1\u51FA", "\u52A8", "emig"], "immig": ["\u79FB\u5165", "\u52A8", "immig"], "remigr": ["\u8FC1\u56DE", "\u52A8", "remigr"], "exeo": ["\u51FA\u53BB", "\u52A8", "exeo"], "ineo": ["\u8FDB\u5165", "\u52A8", "ineo"], "pereo": ["\u6D88\u901D", "\u52A8", "pereo"], "praeteri": ["\u7ECF\u8FC7", "\u52A8", "praeteri"], "do": ["\u7ED9", "\u52A8", "do"], "largi": ["\u65BD\u4E0E", "\u52A8", "largi"], "impert": ["\u5206\u4E0E", "\u52A8", "impert"], "elarg": ["\u6177\u6168\u8D60", "\u52A8", "elarg"], "munerar": ["\u9988\u8D60", "\u52A8", "munerar"], "condon": ["\u8D60\u4E88", "\u52A8", "condon"], "restit": ["\u5F52\u8FD8", "\u52A8", "restit"], "repend": ["\u507F\u8FD8", "\u52A8", "repend"], "pendo": ["\u507F\u4ED8", "\u52A8", "pendo"], "persol": ["\u4ED8\u6E05", "\u52A8", "persol"], "acqui": ["\u53D6\u5F97", "\u52A8", "acqui"], "compara": ["\u8D2D\u7F6E", "\u52A8", "compara"], "paro": ["\u5907\u529E", "\u52A8", "paro"], "nancis": ["\u83B7\u5F97", "\u52A8", "nancis"], "potio": ["\u636E\u6709", "\u52A8", "potio"], "occup": ["\u5360\u636E", "\u52A8", "occup"], "usurp": ["\u7BE1\u53D6", "\u52A8", "usurp"], "surrip": ["\u7A83\u53D6", "\u52A8", "surrip"], "subrip": ["\u5077\u53D6", "\u52A8", "subrip"], "abrip": ["\u593A\u53BB", "\u52A8", "abrip"], "erip": ["\u62A2\u51FA", "\u52A8", "erip"], "dirip": ["\u63A0\u593A", "\u52A8", "dirip"], "corrip": ["\u652B\u53D6", "\u52A8", "corrip"], "interci": ["\u622A\u53D6", "\u52A8", "interci"], "praerip": ["\u62A2\u8D70", "\u52A8", "praerip"], "pulso": ["\u6572\u51FB", "\u52A8", "pulso"], "verbero": ["\u97AD\u6253", "\u52A8", "verbero"], "caed": ["\u780D", "\u52A8", "caed"], "rump": ["\u6298\u65AD", "\u52A8", "rump"], "quass": ["\u9707\u8361", "\u52A8", "quass"], "concut": ["\u6447\u64BC", "\u52A8", "concut"], "discut": ["\u9707\u6563", "\u52A8", "discut"], "excut": ["\u6296\u51FA", "\u52A8", "excut"], "succut": ["\u4E0B\u64BC", "\u52A8", "succut"], "labefa": ["\u52A8\u6447", "\u52A8", "labefa"], "confrin": ["\u6253\u788E", "\u52A8", "confrin"], "diffrin": ["\u7838\u88C2", "\u52A8", "diffrin"], "perfrin": ["\u51FB\u7A7F", "\u52A8", "perfrin"], "refrin": ["\u6298\u8FD4\u7834", "\u52A8", "refrin"], "tundit": ["\u6376\u6253", "\u52A8", "tundit"], "battu": ["\u51FB\u6253", "\u52A8", "battu"], "flagella": ["\u97AD\u7B1E", "\u52A8", "flagella"], "contund": ["\u6363\u788E", "\u52A8", "contund"], "extund": ["\u9524\u51FA", "\u52A8", "extund"], "retund": ["\u632B\u949D", "\u52A8", "retund"], "obtund": ["\u4F7F\u949D", "\u52A8", "obtund"], "compun": ["\u523A\u7A7F", "\u52A8", "compun"], "expun": ["\u5254\u9664", "\u52A8", "expun"], "confod": ["\u6233\u7A7F", "\u52A8", "confod"], "perfod": ["\u51FF\u7A7F", "\u52A8", "perfod"], "puto": ["\u4EE5\u4E3A", "\u52A8", "puto"], "reor": ["\u6599\u60F3", "\u52A8", "reor"], "arbitra": ["\u5224\u5B9A", "\u52A8", "arbitra"], "existim": ["\u4F30\u91CF", "\u52A8", "existim"], "cense": ["\u8BC4\u8BAE", "\u52A8", "cense"], "iudico": ["\u5224\u65AD", "\u52A8", "iudico"], "conici": ["\u63A8\u6D4B", "\u52A8", "conici"], "auguro": ["\u5360\u6D4B", "\u52A8", "auguro"], "divina": ["\u5360\u6D4B", "\u52A8", "divina"], "provide": ["\u9884\u89C1", "\u52A8", "provide"], "comper": ["\u67E5\u660E", "\u52A8", "comper"], "inven": ["\u53D1\u73B0", "\u52A8", "inven"], "noscit": ["\u719F\u8BC6", "\u52A8", "noscit"], "sentio": ["\u611F\u89C9", "\u52A8", "sentio"], "consen": ["\u540C\u611F", "\u52A8", "consen"], "sapio": ["\u6709\u89C1\u8BC6", "\u52A8", "sapio"], "desip": ["\u80E1\u6D82", "\u52A8", "desip"], "scien": ["\u77E5\u60C5\u7684", "\u52A8", "scien"], "nesci": ["\u4E0D\u77E5", "\u52A8", "nesci"], "insci": ["\u65E0\u77E5", "\u52A8", "insci"], "doctus": ["\u535A\u5B66\u7684", "\u52A8", "doctus"], "indoct": ["\u672A\u5B66", "\u52A8", "indoct"], "memini": ["\u8BB0\u5F97", "\u52A8", "memini"], "cogita": ["\u6C89\u601D\u7684", "\u52A8", "cogita"], "medita": ["\u9ED8\u60F3\u7684", "\u52A8", "medita"], "amo": ["\u7231", "\u6027", "amo"], "diligo": ["\u73CD\u7231", "\u6027", "diligo"], "carus": ["\u4EB2\u7231", "\u6027", "carus"], "fave": ["\u504F\u7231", "\u6027", "fave"], "studeo": ["\u70ED\u8877", "\u6027", "studeo"], "opto": ["\u613F\u671B", "\u6027", "opto"], "vove": ["\u8BB8\u613F", "\u6027", "vove"], "appet": ["\u6E34\u6C42", "\u6027", "appet"], "concup": ["\u8D2A\u6C42", "\u6027", "concup"], "exsecro": ["\u5492\u6068", "\u6027", "exsecro"], "detest": ["\u618E\u6076", "\u6027", "detest"], "abomin": ["\u538C\u618E", "\u6027", "abomin"], "invisus": ["\u88AB\u618E\u7684", "\u6027", "invisus"], "peros": ["\u6781\u6068", "\u6027", "peros"], "osor": ["\u618E\u6068\u8005", "\u6027", "osor"], "aemulo": ["\u4E89\u7231", "\u6027", "aemulo"], "invide": ["\u5AC9\u5992", "\u6027", "invide"], "zeloty": ["\u5992\u5FCC", "\u6027", "zeloty"], "amato": ["\u7231\u8005", "\u6027", "amato"], "amatr": ["\u5973\u7231\u8005", "\u6027", "amatr"], "dilect": ["\u73CD\u7231\u8005", "\u6027", "dilect"], "malevo": ["\u6076\u610F", "\u6027", "malevo"], "invidio": ["\u5992\u5FCC\u7684", "\u6027", "invidio"], "odios": ["\u53EF\u618E\u7684", "\u6027", "odios"], "elabor": ["\u7CBE\u4F5C", "\u52A8", "elabor"], "molio": ["\u8425\u5EFA", "\u52A8", "molio"], "elucub": ["\u82E6\u7814", "\u52A8", "elucub"], "desud": ["\u8F9B\u52B3", "\u52A8", "desud"], "defati": ["\u4F7F\u75B2", "\u52A8", "defati"], "fatig": ["\u4F7F\u7D2F", "\u52A8", "fatig"], "exancl": ["\u7AED\u529B", "\u52A8", "exancl"], "requie": ["\u5B89\u6B47", "\u52A8", "requie"], "otio": ["\u95F2\u5C45", "\u52A8", "otio"], "vaco": ["\u7A7A\u95F2", "\u52A8", "vaco"], "desid": ["\u95F2\u5750", "\u52A8", "desid"], "ignavo": ["\u5077\u61D2", "\u52A8", "ignavo"], "pigro": ["\u6020\u60F0", "\u52A8", "pigro"], "socord": ["\u6020\u60F0", "\u52A8", "socord"], "sedul": ["\u52E4\u52C9", "\u52A8", "sedul"], "operos": ["\u8D39\u529B\u7684", "\u52A8", "operos"], "labori": ["\u52E4\u52B3\u7684", "\u52A8", "labori"], "molest": ["\u70E6\u7D2F\u7684", "\u52A8", "molest"], "quietus": ["\u5B89\u5B9A\u7684", "\u52A8", "quietus"], "sedo": ["\u4F7F\u9759", "\u52A8", "sedo"], "refoci": ["\u4F7F\u6062\u590D", "\u52A8", "refoci"], "recreo": ["\u4F7F\u590D\u539F", "\u52A8", "recreo"], "refici": ["\u4FEE\u590D", "\u52A8", "refici"], "rogo": ["\u95EE", "\u52A8", "rogo"], "interro": ["\u8FFD\u95EE", "\u52A8", "interro"], "percon": ["\u8BE6\u95EE", "\u52A8", "percon"], "sciscit": ["\u63A2\u95EE", "\u52A8", "sciscit"], "exquir": ["\u7EC6\u7A76", "\u52A8", "exquir"], "requir": ["\u7D22\u6C42", "\u52A8", "requir"], "rescrib": ["\u56DE\u4FE1", "\u52A8", "rescrib"], "renunt": ["\u56DE\u62A5", "\u52A8", "renunt"], "postula": ["\u8BC9\u6C42", "\u52A8", "postula"], "exact": ["\u50AC\u7F34", "\u52A8", "exact"], "instan": ["\u50AC\u903C", "\u52A8", "instan"], "postul": ["\u8981\u6C42", "\u52A8", "postul"], "flagit": ["\u50AC\u8BA8", "\u52A8", "flagit"], "interpe": ["\u63D2\u95EE", "\u52A8", "interpe"], "ambigu": ["\u6B67\u4E49", "\u52A8", "ambigu"], "consult": ["\u8BF7\u6559", "\u52A8", "consult"], "scitor": ["\u63A2\u8BE2", "\u52A8", "scitor"], "inquis": ["\u67E5\u95EE", "\u52A8", "inquis"], "confess": ["\u4F9B\u8BA4", "\u52A8", "confess"], "affirm": ["\u80AF\u5B9A", "\u52A8", "affirm"], "abiura": ["\u77E2\u53E3\u5426\u8BA4", "\u52A8", "abiura"], "iurat": ["\u5BA3\u8A93", "\u52A8", "iurat"], "protes": ["\u58F0\u660E", "\u52A8", "protes"], "iuvo": ["\u5E2E\u52A9", "\u52A8", "iuvo"], "adiuv": ["\u63F4\u52A9", "\u52A8", "adiuv"], "auxil": ["\u652F\u63F4", "\u52A8", "auxil"], "opitu": ["\u6551\u52A9", "\u52A8", "opitu"], "subven": ["\u63A5\u6D4E", "\u52A8", "subven"], "succur": ["\u9A70\u63F4", "\u52A8", "succur"], "prosum": ["\u6709\u76CA", "\u52A8", "prosum"], "commod": ["\u4FBF\u5229", "\u52A8", "commod"], "defend": ["\u62A4\u536B", "\u52A8", "defend"], "proteg": ["\u63A9\u62A4", "\u52A8", "proteg"], "munio": ["\u7B51\u9632", "\u52A8", "munio"], "obsto": ["\u963B\u788D", "\u52A8", "obsto"], "offici": ["\u59A8\u788D", "\u52A8", "offici"], "imped": ["\u963B\u6320", "\u52A8", "imped"], "impedi": ["\u59A8\u788D", "\u52A8", "impedi"], "moror": ["\u62D6\u5EF6\u963B", "\u52A8", "moror"], "retard": ["\u5EF6\u7F13", "\u52A8", "retard"], "obstac": ["\u8BBE\u969C", "\u52A8", "obstac"], "prohib": ["\u7981\u6B62", "\u52A8", "prohib"], "suppet": ["\u589E\u63F4", "\u52A8", "suppet"], "subsidi": ["\u540E\u5907\u63F4", "\u52A8", "subsidi"], "adiuto": ["\u52A9\u624B", "\u52A8", "adiuto"], "adstip": ["\u58F0\u63F4\u8005", "\u52A8", "adstip"], "fauto": ["\u8D5E\u52A9\u8005", "\u52A8", "fauto"], "iube": ["\u547D\u4EE4", "\u52A8", "iube"], "impero": ["\u4E0B\u4EE4", "\u52A8", "impero"], "decern": ["\u88C1\u5B9A", "\u52A8", "decern"], "sancis": ["\u94A6\u5B9A", "\u52A8", "sancis"], "praescr": ["\u89C4\u5B9A", "\u52A8", "praescr"], "moneo": ["\u544A\u8BEB", "\u52A8", "moneo"], "admon": ["\u63D0\u9192", "\u52A8", "admon"], "praemon": ["\u9884\u8B66", "\u52A8", "praemon"], "denunt": ["\u901A\u4EE4", "\u52A8", "denunt"], "indico": ["\u5BA3\u5E03", "\u52A8", "indico"], "nuntio": ["\u4F20\u4EE4", "\u52A8", "nuntio"], "pareo": ["\u670D\u4ECE", "\u52A8", "pareo"], "oboed": ["\u542C\u547D", "\u52A8", "oboed"], "obtemper": ["\u9075\u4ECE", "\u52A8", "obtemper"], "morige": ["\u8FCE\u5408", "\u52A8", "morige"], "ausculto": ["\u542C\u4ECE", "\u52A8", "ausculto"], "subici": ["\u4F7F\u81E3\u670D", "\u52A8", "subici"], "dominor": ["\u4E3B\u5BB0", "\u52A8", "dominor"], "servio": ["\u670D\u5F79", "\u52A8", "servio"], "ancill": ["\u5A62\u4F8D", "\u52A8", "ancill"], "iussio": ["\u547D\u4EE4", "\u52A8", "iussio"], "scitum": ["\u51B3\u8BAE", "\u52A8", "scitum"], "vendo": ["\u5356", "\u52A8", "vendo"], "mereo": ["\u8D5A\u5F97", "\u52A8", "mereo"], "liceor": ["\u7ADE\u4E70", "\u52A8", "liceor"], "addico": ["\u5224\u5356", "\u52A8", "addico"], "mutuo": ["\u501F\u8D37", "\u52A8", "mutuo"], "faener": ["\u653E\u8D37", "\u52A8", "faener"], "credo": ["\u8D37\u51FA", "\u52A8", "credo"], "debeo": ["\u6B20", "\u52A8", "debeo"], "repraes": ["\u4ED8\u73B0", "\u52A8", "repraes"], "locito": ["\u51FA\u79DF", "\u52A8", "locito"], "emo": ["\u4E70", "\u52A8", "emo"], "nundino": ["\u505A\u4E70\u5356", "\u52A8", "nundino"], "negoti": ["\u7ECF\u8425", "\u52A8", "negoti"], "merco": ["\u7ECF\u5546", "\u52A8", "merco"], "taberno": ["\u5F00\u5E97", "\u52A8", "taberno"], "circumf": ["\u884C\u5546", "\u52A8", "circumf"], "cambio": ["\u6C47\u5151", "\u52A8", "cambio"], "chirogr": ["\u624B\u636E", "\u52A8", "chirogr"], "vadio": ["\u62B5\u62BC\u7269", "\u52A8", "vadio"], "fideiu": ["\u4F5C\u4FDD", "\u52A8", "fideiu"], "sponde": ["\u627F\u8BFA", "\u52A8", "sponde"], "exprom": ["\u4EE3\u8BFA", "\u52A8", "exprom"], "aedifi": ["\u5174\u5EFA", "\u52A8", "aedifi"], "exstru": ["\u7B51\u8D77", "\u52A8", "exstru"], "constr": ["\u6784\u5EFA", "\u52A8", "constr"], "instr": ["\u5E03\u7F6E", "\u52A8", "instr"], "evert": ["\u63A8\u7FFB", "\u52A8", "evert"], "subver": ["\u98A0\u8986", "\u52A8", "subver"], "perver": ["\u8D25\u574F", "\u52A8", "perver"], "deici": ["\u62C6\u5012", "\u52A8", "deici"], "proste": ["\u5937\u5E73", "\u52A8", "proste"], "complana": ["\u94F2\u5E73", "\u52A8", "complana"], "exscin": ["\u5937\u706D", "\u52A8", "exscin"], "demol": ["\u62C6\u6BC1", "\u52A8", "demol"], "excid": ["\u524A\u53BB", "\u52A8", "excid"], "molar": ["\u5899\u77F3", "\u52A8", "molar"], "machinor": ["\u8BBE\u8BA1\u5EFA\u9020", "\u52A8", "machinor"], "archite": ["\u4E3B\u6301\u5EFA\u9020", "\u52A8", "archite"], "exaedi": ["\u5EFA\u6210", "\u52A8", "exaedi"], "peraed": ["\u7AE3\u5DE5", "\u52A8", "peraed"], "inaedi": ["\u7B51\u5165", "\u52A8", "inaedi"], "obstr": ["\u5835\u585E", "\u52A8", "obstr"], "interst": ["\u5939\u5EFA", "\u52A8", "interst"], "prodig": ["\u62C6\u6563", "\u52A8", "prodig"], "dissip": ["\u62C6\u6563", "\u52A8", "dissip"], "vasto": ["\u8E42\u8E8F", "\u52A8", "vasto"], "ruinos": ["\u503E\u9893\u7684", "\u52A8", "ruinos"], "erudio": ["\u6559\u5BFC", "\u52A8", "erudio"], "institu": ["\u8BBE\u6559", "\u52A8", "institu"], "inform": ["\u8BAD\u5BFC", "\u52A8", "inform"], "formo": ["\u57F9\u517B", "\u52A8", "formo"], "excol": ["\u683D\u57F9", "\u52A8", "excol"], "educo": ["\u517B\u80B2", "\u52A8", "educo"], "imbu": ["\u542F\u8499", "\u52A8", "imbu"], "instil": ["\u704C\u8F93", "\u52A8", "instil"], "monstro": ["\u6307\u6559", "\u52A8", "monstro"], "demonst": ["\u6F14\u793A", "\u52A8", "demonst"], "ostend": ["\u5C55\u793A", "\u52A8", "ostend"], "disco": ["\u5B66\u4E60", "\u52A8", "disco"], "addisc": ["\u5B66\u4F1A", "\u52A8", "addisc"], "perdis": ["\u5B66\u900F", "\u52A8", "perdis"], "edisc": ["\u719F\u8BB0", "\u52A8", "edisc"], "assues": ["\u4F7F\u4E60\u60EF", "\u52A8", "assues"], "consues": ["\u60EF\u4E8E", "\u52A8", "consues"], "meditor": ["\u7814\u4E60", "\u52A8", "meditor"], "scriptit": ["\u5E38\u5199", "\u52A8", "scriptit"], "probo": ["\u8003\u6838", "\u52A8", "probo"], "improbo": ["\u5426\u51B3", "\u52A8", "improbo"], "guberno": ["\u6CBB\u7406", "\u52A8", "guberno"], "rego": ["\u7EDF\u8F96", "\u52A8", "rego"], "moderor": ["\u8282\u5236", "\u52A8", "moderor"], "tempero": ["\u8C03\u548C", "\u52A8", "tempero"], "adminis": ["\u65BD\u653F", "\u52A8", "adminis"], "procuro": ["\u7763\u529E", "\u52A8", "procuro"], "ordino": ["\u6574\u996C", "\u52A8", "ordino"], "dispon": ["\u8C03\u5EA6", "\u52A8", "dispon"], "constit": ["\u8BBE\u7ACB", "\u52A8", "constit"], "lego": ["\u59D4\u4EFB", "\u52A8", "lego"], "creo": ["\u9009\u4EFB", "\u52A8", "creo"], "design": ["\u6307\u6D3E", "\u52A8", "design"], "praefic": ["\u4EFB\u4E3A\u957F\u5B98", "\u52A8", "praefic"], "promov": ["\u64E2\u5347", "\u52A8", "promov"], "amov": ["\u514D\u804C", "\u52A8", "amov"], "summov": ["\u65A5\u9000", "\u52A8", "summov"], "remov": ["\u64A4\u804C", "\u52A8", "remov"], "depon": ["\u7F62\u9EDC", "\u52A8", "depon"], "abdic": ["\u8BA9\u4F4D", "\u52A8", "abdic"], "seditios": ["\u597D\u4E71", "\u52A8", "seditios"], "factios": ["\u7ED3\u515A", "\u52A8", "factios"], "perdue": ["\u53DB\u56FD\u8005", "\u52A8", "perdue"], "moderam": ["\u6CBB\u672F", "\u52A8", "moderam"], "pacat": ["\u7EE5\u9756\u7684", "\u52A8", "pacat"], "dormi": ["\u7761", "\u52A8", "dormi"], "somni": ["\u505A\u68A6", "\u52A8", "somni"], "dormit": ["\u6253\u76F9", "\u52A8", "dormit"], "obdorm": ["\u5165\u7761", "\u52A8", "obdorm"], "soporo": ["\u4F7F\u7761", "\u52A8", "soporo"], "consop": ["\u50AC\u7720", "\u52A8", "consop"], "sterto": ["\u6253\u9F3E", "\u52A8", "sterto"], "vigilo": ["\u5B88\u591C", "\u52A8", "vigilo"], "evigil": ["\u9192\u6765", "\u52A8", "evigil"], "experg": ["\u82CF\u9192", "\u52A8", "experg"], "excito": ["\u5524\u9192", "\u52A8", "excito"], "resipi": ["\u6E05\u9192", "\u52A8", "resipi"], "insomn": ["\u5931\u7720", "\u52A8", "insomn"], "soporif": ["\u81F4\u7761\u7684", "\u52A8", "soporif"], "somnif": ["\u50AC\u7720\u7684", "\u52A8", "somnif"], "dormitor": ["\u5367\u8005", "\u52A8", "dormitor"], "cubati": ["\u5367\u7720", "\u52A8", "cubati"], "decubi": ["\u5367\u59FF", "\u52A8", "decubi"], "accubi": ["\u4FA7\u5367", "\u52A8", "accubi"], "vigilia": ["\u5B88\u591C\u793C", "\u52A8", "vigilia"], "pervigi": ["\u901A\u5BB5", "\u52A8", "pervigi"], "noctur": ["\u591C\u95F4\u7684", "\u52A8", "noctur"], "lucubr": ["\u591C\u8BFB", "\u52A8", "lucubr"], "somnicu": ["\u55DC\u7761\u7684", "\u52A8", "somnicu"], "hypno": ["\u7761\u610F", "\u52A8", "hypno"], "arrid": ["\u5FAE\u7B11\u8FCE", "\u52A8", "arrid"], "irrid": ["\u5632\u7B11", "\u52A8", "irrid"], "derid": ["\u8BBD\u7B11", "\u52A8", "derid"], "cachinno": ["\u72C2\u7B11", "\u52A8", "cachinno"], "fleo": ["\u54ED\u6CE3", "\u52A8", "fleo"], "lacrimo": ["\u6D41\u6CEA", "\u52A8", "lacrimo"], "complora": ["\u5171\u54ED", "\u52A8", "complora"], "deplor": ["\u75DB\u54ED", "\u52A8", "deplor"], "exclam": ["\u60CA\u547C", "\u52A8", "exclam"], "vagio": ["\u5A74\u557C", "\u52A8", "vagio"], "gemisc": ["\u547B\u541F\u8D77", "\u52A8", "gemisc"], "ingem": ["\u547B\u541F", "\u52A8", "ingem"], "risus": ["\u7B11\u58F0", "\u52A8", "risus"], "lamentu": ["\u54C0\u8BCD", "\u52A8", "lamentu"], "mugitu": ["\u4F4E\u9E23", "\u52A8", "mugitu"], "singult": ["\u62BD\u6CE3", "\u52A8", "singult"], "questu": ["\u54C0\u8BC9", "\u52A8", "questu"], "ridicu": ["\u53EF\u7B11\u7684", "\u52A8", "ridicu"], "deridic": ["\u6781\u53EF\u7B11", "\u52A8", "deridic"], "renid": ["\u542B\u7B11", "\u52A8", "renid"], "flens": ["\u54ED\u6CE3\u7684", "\u52A8", "flens"], "irasc": ["\u53D1\u6012", "\u6027", "irasc"], "succens": ["\u607C\u6012", "\u6027", "succens"], "stomacho": ["\u607C\u6012", "\u6027", "stomacho"], "furo": ["\u72C2\u6012", "\u6027", "furo"], "saevi": ["\u66B4\u6012", "\u6027", "saevi"], "bacchor": ["\u72C2\u4E71", "\u6027", "bacchor"], "timeo": ["\u5BB3\u6015", "\u6027", "timeo"], "metuo": ["\u754F\u60E7", "\u6027", "metuo"], "vereor": ["\u656C\u754F", "\u6027", "vereor"], "paveo": ["\u60CA\u6050", "\u6027", "paveo"], "trepido": ["\u60F6\u6025", "\u6027", "trepido"], "exhorres": ["\u609A\u7136", "\u6027", "exhorres"], "pertime": ["\u6DF1\u60E7", "\u6027", "pertime"], "terreo": ["\u4F7F\u60E7", "\u6027", "terreo"], "dirus": ["\u53EF\u6016\u7684", "\u6027", "dirus"], "atrox": ["\u51F6\u66B4", "\u6027", "atrox"], "ferox": ["\u51F6\u731B", "\u6027", "ferox"], "immit": ["\u4E25\u9177", "\u6027", "immit"], "rabid": ["\u72C2\u6012\u7684", "\u6027", "rabid"], "furibu": ["\u66B4\u6012\u7684", "\u6027", "furibu"], "formidol": ["\u53EF\u6015\u7684", "\u6027", "formidol"], "meticul": ["\u80C6\u602F\u7684", "\u6027", "meticul"], "furor": ["\u72C2\u66B4", "\u6027", "furor"], "opulens": ["\u5BCC\u88D5", "\u6027", "opulens"], "beato": ["\u6709\u798F", "\u6027", "beato"], "fortuna": ["\u5E78\u8FD0", "\u6027", "fortuna"], "felix": ["\u5E78\u8FD0", "\u6027", "felix"], "prosper": ["\u987A\u9042", "\u6027", "prosper"], "mendic": ["\u4E5E\u8BA8\u7684", "\u6027", "mendic"], "egenu": ["\u7A77\u56F0", "\u6027", "egenu"], "penuri": ["\u532E\u4E4F", "\u6027", "penuri"], "inopi": ["\u8D2B\u4E4F", "\u6027", "inopi"], "ops": ["\u8D22\u5BCC", "\u6027", "ops"], "gaza": ["\u5B9D\u5E93", "\u6027", "gaza"], "thesaur": ["\u5B9D\u5E93", "\u6027", "thesaur"], "dapsil": ["\u4E30\u76DB", "\u6027", "dapsil"], "afflu": ["\u5BCC\u8DB3", "\u6027", "afflu"], "profluen": ["\u4E30\u6C9B", "\u6027", "profluen"], "egest": ["\u8D2B\u56F0", "\u6027", "egest"], "mendici": ["\u884C\u4E5E", "\u6027", "mendici"], "nud": ["\u8D64\u8D2B", "\u6027", "nud"], "squalor": ["\u8D2B\u964B", "\u6027", "squalor"], "provent": ["\u6536\u76CA", "\u6027", "provent"], "reditus": ["\u8FDB\u9879", "\u6027", "reditus"], "quaestu": ["\u8425\u5229", "\u6027", "quaestu"], "peculat": ["\u4FB5\u541E", "\u6027", "peculat"], "repetun": ["\u52D2\u7D22", "\u6027", "repetun"], "profusi": ["\u6325\u970D", "\u6027", "profusi"], "vetul": ["\u5C0F\u8001\u5934", "\u7269", "vetul"], "anus": ["\u8001\u5987", "\u7269", "anus"], "anil": ["\u8001\u5987\u7684", "\u7269", "anil"], "grandae": ["\u9AD8\u9F84", "\u7269", "grandae"], "decrepi": ["\u8870\u673D", "\u7269", "decrepi"], "longaev": ["\u957F\u5BFF", "\u7269", "longaev"], "iuvenis": ["\u9752\u5E74", "\u7269", "iuvenis"], "adules": ["\u5C11\u5E74", "\u7269", "adules"], "adolesc": ["\u6210\u957F", "\u7269", "adolesc"], "puber": ["\u6210\u4E01", "\u7269", "puber"], "viripo": ["\u53CA\u7B04", "\u7269", "viripo"], "caniti": ["\u767D\u5934", "\u7269", "caniti"], "seniu": ["\u66AE\u5E74", "\u7269", "seniu"], "senil": ["\u8001\u6001\u7684", "\u7269", "senil"], "pubes": ["\u6210\u4E01\u671F", "\u7269", "pubes"], "virgini": ["\u7AE5\u8D1E", "\u7269", "virgini"], "adultus": ["\u6210\u5E74\u7684", "\u7269", "adultus"], "incunab": ["\u8941\u8913", "\u7269", "incunab"], "alumn": ["\u517B\u5B50", "\u7269", "alumn"], "orphan": ["\u5B64\u513F", "\u7269", "orphan"], "avia": ["\u7956\u6BCD", "\u7269", "avia"], "maior": ["\u957F\u8F88", "\u7269", "maior"], "natu": ["\u5E74\u9F7F", "\u7269", "natu"], "primaev": ["\u521D\u5E74", "\u7269", "primaev"], "castus": ["\u6D01\u51C0", "\u6027", "castus"], "impur": ["\u4E0D\u6D01", "\u6027", "impur"], "inmund": ["\u6C61\u79FD", "\u6027", "inmund"], "caenos": ["\u6CE5\u6C61", "\u6027", "caenos"], "lutulen": ["\u6CE5\u6CDE", "\u6027", "lutulen"], "maculat": ["\u6CBE\u6C61", "\u6027", "maculat"], "inquina": ["\u73B7\u6C61", "\u6027", "inquina"], "lotura": ["\u6D17\u6DB2", "\u6027", "lotura"], "lavacr": ["\u6D74\u6C60", "\u6027", "lavacr"], "deters": ["\u64E6\u51C0", "\u6027", "deters"], "purgam": ["\u6C61\u7269", "\u6027", "purgam"], "sordes": ["\u6C61\u57A2", "\u6027", "sordes"], "caenum": ["\u6C61\u6CE5", "\u6027", "caenum"], "amurca": ["\u6CB9\u6E23", "\u6027", "amurca"], "recrem": ["\u6E23\u6ED3", "\u6027", "recrem"], "quisqui": ["\u5783\u573E", "\u6027", "quisqui"], "tersus": ["\u6D01\u51C0\u7684", "\u6027", "tersus"], "piatus": ["\u6DA4\u7F6A", "\u6027", "piatus"], "expiat": ["\u8D4E\u51C0", "\u6027", "expiat"], "lustra": ["\u7953\u51C0", "\u6027", "lustra"], "defaec": ["\u6F84\u6E05", "\u6027", "defaec"], "elutri": ["\u6DD8\u51C0", "\u6027", "elutri"], "faece": ["\u6E23\u6ED3\u7684", "\u6027", "faece"], "purgati": ["\u6E05\u6D17", "\u6027", "purgati"], "castimo": ["\u8D1E\u6D01", "\u6027", "castimo"], "sapien": ["\u667A\u6167", "\u6027", "sapien"], "cordat": ["\u660E\u667A", "\u6027", "cordat"], "consili": ["\u8C0B\u7565", "\u6027", "consili"], "fatu": ["\u611A\u5984", "\u6027", "fatu"], "insipie": ["\u65E0\u77E5", "\u6027", "insipie"], "brut": ["\u7C97\u949D", "\u6027", "brut"], "idiot": ["\u611A\u4EBA", "\u6027", "idiot"], "moroso": ["\u611A\u54F2", "\u6027", "moroso"], "littera": ["\u535A\u6587", "\u6027", "littera"], "perit": ["\u719F\u7EC3", "\u6027", "perit"], "imperit": ["\u751F\u758F", "\u6027", "imperit"], "gnar": ["\u901A\u6653", "\u6027", "gnar"], "ignar": ["\u4E0D\u77E5", "\u6027", "ignar"], "catus": ["\u7CBE\u660E\u7684", "\u6027", "catus"], "vafer": ["\u72E1\u9EE0", "\u6027", "vafer"], "astut": ["\u673A\u654F", "\u6027", "astut"], "stolid": ["\u611A\u949D", "\u6027", "stolid"], "bard": ["\u8822\u7B28", "\u6027", "bard"], "inept": ["\u7B28\u62D9", "\u6027", "inept"], "socor": ["\u611A\u949D", "\u6027", "socor"], "demen": ["\u75AF\u72C2", "\u6027", "demen"], "amens": ["\u5931\u667A", "\u6027", "amens"], "vecor": ["\u660F\u8069", "\u6027", "vecor"], "excor": ["\u65E0\u667A", "\u6027", "excor"], "phrone": ["\u5B9E\u8DF5\u667A", "\u6027", "phrone"], "edo": ["\u5403", "\u52A8", "edo"], "comed": ["\u5171\u98DF", "\u52A8", "comed"], "vescor": ["\u8FDB\u98DF", "\u52A8", "vescor"], "pascor": ["\u5403\u8349", "\u52A8", "pascor"], "gusto": ["\u54C1\u5C1D", "\u52A8", "gusto"], "deglut": ["\u541E\u54BD", "\u52A8", "deglut"], "glutt": ["\u541E", "\u52A8", "glutt"], "mastic": ["\u7EC6\u56BC", "\u52A8", "mastic"], "vorax": ["\u8D2A\u98DF", "\u52A8", "vorax"], "bibo": ["\u996E", "\u52A8", "bibo"], "poto": ["\u559D", "\u52A8", "poto"], "sorbeo": ["\u555C\u996E", "\u52A8", "sorbeo"], "potito": ["\u5E38\u996E", "\u52A8", "potito"], "esurio": ["\u997F", "\u52A8", "esurio"], "ientac": ["\u65E9\u9910", "\u52A8", "ientac"], "merenda": ["\u5348\u540E\u70B9\u5FC3", "\u52A8", "merenda"], "obsoni": ["\u83DC\u80B4", "\u52A8", "obsoni"], "ganeo": ["\u9955\u5BA2", "\u52A8", "ganeo"], "heluo": ["\u8D2A\u98DF\u8005", "\u52A8", "heluo"], "crapul": ["\u66B4\u996E", "\u52A8", "crapul"], "ebrios": ["\u55DC\u9152", "\u52A8", "ebrios"], "temulen": ["\u9189\u7684", "\u52A8", "temulen"], "induo": ["\u7A7F\u4E0A", "\u52A8", "induo"], "exuo": ["\u8131\u4E0B", "\u52A8", "exuo"], "vestio": ["\u7ED9\u7A7F", "\u52A8", "vestio"], "amici": ["\u62AB\u4E0A", "\u52A8", "amici"], "circumd": ["\u88F9\u4E0A", "\u52A8", "circumd"], "denud": ["\u88F8\u9732", "\u52A8", "denud"], "nudo": ["\u4F7F\u88F8", "\u52A8", "nudo"], "velo": ["\u906E\u76D6", "\u52A8", "velo"], "advel": ["\u8499\u4E0A", "\u52A8", "advel"], "obvolv": ["\u88F9\u4F4F", "\u52A8", "obvolv"], "evolv": ["\u89E3\u5F00", "\u52A8", "evolv"], "cingo": ["\u7CFB\u5E26", "\u52A8", "cingo"], "discin": ["\u89E3\u5E26", "\u52A8", "discin"], "succin": ["\u675F\u8170", "\u52A8", "succin"], "calceo": ["\u7A7F\u978B", "\u52A8", "calceo"], "excalc": ["\u8131\u978B", "\u52A8", "excalc"], "discal": ["\u8D64\u8DB3", "\u52A8", "discal"], "exuv": ["\u8715\u76AE", "\u52A8", "exuv"], "succinc": ["\u675F\u8170\u7684", "\u52A8", "succinc"], "semiind": ["\u534A\u7A7F\u8863\u7684", "\u52A8", "semiind"], "induv": ["\u5185\u8863", "\u52A8", "induv"], "secto": ["\u5207\u5272", "\u52A8", "secto"], "desec": ["\u5272\u4E0B", "\u52A8", "desec"], "resec": ["\u5207\u9664", "\u52A8", "resec"], "amput": ["\u622A\u80A2", "\u52A8", "amput"], "praecid": ["\u5207\u65AD", "\u52A8", "praecid"], "recid": ["\u524A\u53BB", "\u52A8", "recid"], "succid": ["\u780D\u5012", "\u52A8", "succid"], "incid": ["\u5207\u5165", "\u52A8", "incid"], "concid": ["\u5241\u788E", "\u52A8", "concid"], "dissec": ["\u5256\u5F00", "\u52A8", "dissec"], "intersec": ["\u622A\u65AD", "\u52A8", "intersec"], "consuo": ["\u7F1D\u5408", "\u52A8", "consuo"], "insuo": ["\u7F1D\u5165", "\u52A8", "insuo"], "resuo": ["\u62C6\u7F1D", "\u52A8", "resuo"], "pannicu": ["\u7834\u5E03", "\u52A8", "pannicu"], "centro": ["\u767E\u8872", "\u52A8", "centro"], "sarcio": ["\u7F1D\u7F00", "\u52A8", "sarcio"], "obsuo": ["\u5C01\u7F1D", "\u52A8", "obsuo"], "praesuo": ["\u9884\u7F1D", "\u52A8", "praesuo"], "lacero": ["\u6495\u88C2", "\u52A8", "lacero"], "dilace": ["\u6495\u788E", "\u52A8", "dilace"], "lancin": ["\u6495\u626F", "\u52A8", "lancin"], "cano": ["\u5531", "\u52A8", "cano"], "decant": ["\u541F\u5531", "\u52A8", "decant"], "recino": ["\u91CD\u5531", "\u52A8", "recino"], "incino": ["\u8D77\u5531", "\u52A8", "incino"], "concinno": ["\u5408\u5531", "\u52A8", "concinno"], "occino": ["\u5BF9\u5531", "\u52A8", "occino"], "succino": ["\u4F34\u5531", "\u52A8", "succino"], "modulor": ["\u6309\u8C03\u5531", "\u52A8", "modulor"], "psallo": ["\u629A\u7434", "\u52A8", "psallo"], "cithari": ["\u5F39\u7434", "\u52A8", "cithari"], "tibicin": ["\u5439\u7B1B", "\u52A8", "tibicin"], "buccin": ["\u5439\u53F7", "\u52A8", "buccin"], "cornici": ["\u5439\u89D2", "\u52A8", "cornici"], "persono": ["\u9E23\u54CD", "\u52A8", "persono"], "resono": ["\u56DE\u54CD", "\u52A8", "resono"], "crepo": ["\u7206\u54CD", "\u52A8", "crepo"], "cantile": ["\u5C0F\u8C03", "\u52A8", "cantile"], "fremit": ["\u8F70\u9E23", "\u52A8", "fremit"], "crepitu": ["\u7206\u54CD", "\u52A8", "crepitu"], "strepi": ["\u55A7\u54CD", "\u52A8", "strepi"], "tinnio": ["\u4E01\u5F53", "\u52A8", "tinnio"], "cantio": ["\u66F2", "\u52A8", "cantio"], "io": ["\u6B22\u547C", "\u52A8", "io"], "pingo": ["\u7ED8\u753B", "\u52A8", "pingo"], "deping": ["\u63CF\u753B", "\u52A8", "deping"], "adumbr": ["\u52FE\u8F6E\u5ED3", "\u52A8", "adumbr"], "lineo": ["\u52FE\u7EBF", "\u52A8", "lineo"], "caelo": ["\u933E\u523B", "\u52A8", "caelo"], "inscul": ["\u523B\u5165", "\u52A8", "inscul"], "exscul": ["\u523B\u51FA", "\u52A8", "exscul"], "scalpo": ["\u522E\u523B", "\u52A8", "scalpo"], "rado": ["\u522E", "\u52A8", "rado"], "tero": ["\u78E8\u64E6", "\u52A8", "tero"], "levigo": ["\u78E8\u5149", "\u52A8", "levigo"], "dolo": ["\u524A\u5E73", "\u52A8", "dolo"], "ascio": ["\u65A7\u524A", "\u52A8", "ascio"], "runco": ["\u9509\u5E73", "\u52A8", "runco"], "limo": ["\u9509", "\u52A8", "limo"], "effigi": ["\u8096\u50CF", "\u52A8", "effigi"], "torno": ["\u65CB\u523B", "\u52A8", "torno"], "chalco": ["\u94DC\u7248\u672F", "\u52A8", "chalco"], "toreum": ["\u933E\u523B\u54C1", "\u52A8", "toreum"], "caelatu": ["\u933E\u5DE5", "\u52A8", "caelatu"], "celtis": ["\u51FF", "\u52A8", "celtis"], "limatu": ["\u9509\u5C51", "\u52A8", "limatu"], "perfor": ["\u7A7F\u5B54", "\u52A8", "perfor"], "excud": ["\u953B\u523B", "\u52A8", "excud"], "ardeo": ["\u71C3\u70E7", "\u52A8", "ardeo"], "flagro": ["\u71C3\u70BD", "\u52A8", "flagro"], "cremo": ["\u711A", "\u52A8", "cremo"], "uro": ["\u70E7", "\u52A8", "uro"], "aduro": ["\u707C", "\u52A8", "aduro"], "comburo": ["\u70E7\u5C3D", "\u52A8", "comburo"], "inuro": ["\u70D9", "\u52A8", "inuro"], "exuro": ["\u70E7\u6389", "\u52A8", "exuro"], "succend": ["\u70B9\u71C3", "\u52A8", "succend"], "restin": ["\u7184\u706D", "\u52A8", "restin"], "opprim": ["\u538B\u706D", "\u52A8", "opprim"], "fumo": ["\u5192\u70DF", "\u52A8", "fumo"], "torreo": ["\u7119", "\u52A8", "torreo"], "pruna": ["\u70AD\u706B", "\u52A8", "pruna"], "carbo": ["\u70AD", "\u52A8", "carbo"], "cremio": ["\u67F4\u706B", "\u52A8", "cremio"], "fomes": ["\u5F15\u706B\u7269", "\u52A8", "fomes"], "fulig": ["\u70DF\u70B1", "\u52A8", "fulig"], "favill": ["\u98DE\u7070", "\u52A8", "favill"], "exstinc": ["\u7184\u706D", "\u52A8", "exstinc"], "ustio": ["\u70D9", "\u52A8", "ustio"], "ambust": ["\u707C\u4F24", "\u52A8", "ambust"], "adust": ["\u70E4\u7126\u7684", "\u52A8", "adust"], "praeust": ["\u70E7\u786C\u7684", "\u52A8", "praeust"], "neo": ["\u7EBA", "\u52A8", "neo"], "texo": ["\u7EC7", "\u52A8", "texo"], "torque": ["\u637B", "\u52A8", "torque"], "necto": ["\u7ED3", "\u52A8", "necto"], "vincio": ["\u7F1A", "\u52A8", "vincio"], "relig": ["\u89E3\u5F00\u7CFB", "\u52A8", "relig"], "constrin": ["\u675F\u7F1A", "\u52A8", "constrin"], "obstrin": ["\u675F\u4F4F", "\u52A8", "obstrin"], "devinc": ["\u7D27\u7F1A", "\u52A8", "devinc"], "revinc": ["\u53CD\u7F1A", "\u52A8", "revinc"], "sublig": ["\u4E0B\u7CFB", "\u52A8", "sublig"], "reticul": ["\u7ED3\u7F51", "\u52A8", "reticul"], "funicu": ["\u7EC6\u7EF3", "\u52A8", "funicu"], "retiac": ["\u5C0F\u7F51", "\u52A8", "retiac"], "stuppa": ["\u9EBB\u7D6E", "\u52A8", "stuppa"], "toment": ["\u586B\u7D6E", "\u52A8", "toment"], "pensum": ["\u4E00\u65E5\u4E4B\u7EB1", "\u52A8", "pensum"], "glome": ["\u7ED5\u7EBF", "\u52A8", "glome"], "volvo": ["\u7F20\u7ED5", "\u52A8", "volvo"], "circumv": ["\u76D8\u7ED5", "\u52A8", "circumv"], "plexus": ["\u4EA4\u7EC7", "\u52A8", "plexus"], "funal": ["\u7EF3\u7D22\u7684", "\u52A8", "funal"], "iaculor": ["\u629B\u5C04", "\u52A8", "iaculor"], "conicio": ["\u6295\u5408", "\u52A8", "conicio"], "reici": ["\u63B7\u56DE", "\u52A8", "reici"], "subicio": ["\u6295\u4E0B", "\u52A8", "subicio"], "obici": ["\u6295\u5411\u524D", "\u52A8", "obici"], "traici": ["\u63B7\u8FC7", "\u52A8", "traici"], "inicio": ["\u6295\u5165", "\u52A8", "inicio"], "praemitt": ["\u9884\u9063", "\u52A8", "praemitt"], "promitt": ["\u8BB8\u8BFA", "\u52A8", "promitt"], "admitt": ["\u63A5\u7EB3", "\u52A8", "admitt"], "committ": ["\u4EA4\u6258", "\u52A8", "committ"], "remitt": ["\u9001\u56DE", "\u52A8", "remitt"], "summitt": ["\u5448\u9001", "\u52A8", "summitt"], "transmitt": ["\u8F6C\u9001", "\u52A8", "transmitt"], "fundo": ["\u503E\u6CFB", "\u52A8", "fundo"], "effund": ["\u503E\u5012", "\u52A8", "effund"], "spargo": ["\u6492\u64AD", "\u52A8", "spargo"], "aspergo": ["\u6D12\u4E0A", "\u52A8", "aspergo"], "disperg": ["\u6563\u5F00", "\u52A8", "disperg"], "sagitto": ["\u5C04\u7BAD", "\u52A8", "sagitto"], "roto": ["\u629B\u8F6C", "\u52A8", "roto"], "adigo": ["\u6295\u63B7", "\u52A8", "adigo"], "emissi": ["\u653E\u51FA\u4E4B\u7269", "\u52A8", "emissi"], "duco": ["\u5F15", "\u52A8", "duco"], "adduc": ["\u5F15\u5411", "\u52A8", "adduc"], "abduco": ["\u5F15\u5F00", "\u52A8", "abduco"], "induco": ["\u5F15\u5165", "\u52A8", "induco"], "produc": ["\u5F15\u51FA", "\u52A8", "produc"], "reduc": ["\u5F15\u56DE", "\u52A8", "reduc"], "subduc": ["\u5F15\u9000", "\u52A8", "subduc"], "seduco": ["\u5F15\u79BB", "\u52A8", "seduco"], "circumdu": ["\u7ED5\u5F15", "\u52A8", "circumdu"], "pello": ["\u63A8\u52A8", "\u52A8", "pello"], "propel": ["\u63A8\u524D", "\u52A8", "propel"], "expel": ["\u9010\u51FA", "\u52A8", "expel"], "repel": ["\u63A8\u56DE", "\u52A8", "repel"], "compel": ["\u5F3A\u63A8", "\u52A8", "compel"], "depel": ["\u63A8\u4E0B", "\u52A8", "depel"], "dispel": ["\u9A71\u6563", "\u52A8", "dispel"], "vello": ["\u62D4", "\u52A8", "vello"], "avell": ["\u62D4\u53BB", "\u52A8", "avell"], "evell": ["\u62D4\u51FA", "\u52A8", "evell"], "revell": ["\u626F\u4E0B", "\u52A8", "revell"], "retrah": ["\u62C9\u56DE", "\u52A8", "retrah"], "detrah": ["\u62C9\u4E0B", "\u52A8", "detrah"], "convel": ["\u62D4\u8D77", "\u52A8", "convel"], "divel": ["\u626F\u5F00", "\u52A8", "divel"], "comprim": ["\u538B\u7D27", "\u52A8", "comprim"], "exprim": ["\u6324\u51FA", "\u52A8", "exprim"], "supprim": ["\u538B\u4E0B", "\u52A8", "supprim"], "reprim": ["\u6291\u5236", "\u52A8", "reprim"], "deprim": ["\u538B\u4E0B", "\u52A8", "deprim"], "arcio": ["\u7D27\u903C", "\u52A8", "arcio"], "coarto": ["\u538B\u7F29", "\u52A8", "coarto"], "frequen": ["\u6324\u6EE1", "\u52A8", "frequen"], "stipo": ["\u585E\u6EE1", "\u52A8", "stipo"], "farcio": ["\u586B\u585E", "\u52A8", "farcio"], "referc": ["\u585E\u6EE1", "\u52A8", "referc"], "conferc": ["\u538B\u5B9E", "\u52A8", "conferc"], "obtero": ["\u538B\u788E", "\u52A8", "obtero"], "contero": ["\u78E8\u788E", "\u52A8", "contero"], "attero": ["\u78E8\u635F", "\u52A8", "attero"], "detero": ["\u64E6\u635F", "\u52A8", "detero"], "arto": ["\u903C\u7D27", "\u52A8", "arto"], "adarto": ["\u7D27\u903C", "\u52A8", "adarto"], "angusto": ["\u4F7F\u7A84", "\u52A8", "angusto"], "urgeo": ["\u50AC\u903C", "\u52A8", "urgeo"], "perurge": ["\u7D27\u8FEB", "\u52A8", "perurge"], "insto": ["\u903C\u8FD1", "\u52A8", "insto"], "calco": ["\u8DF5\u8E0F", "\u52A8", "calco"], "concul": ["\u8E29\u788E", "\u52A8", "concul"], "odoro": ["\u95FB", "\u52A8", "odoro"], "oleo": ["\u53D1\u5473", "\u52A8", "oleo"], "fragro": ["\u53D1\u9999", "\u52A8", "fragro"], "puteo": ["\u53D1\u81ED", "\u52A8", "puteo"], "foete": ["\u6076\u81ED", "\u52A8", "foete"], "lambo": ["\u8214", "\u52A8", "lambo"], "liguri": ["\u8D2A\u5403", "\u52A8", "liguri"], "sallo": ["\u76D0\u6E0D", "\u52A8", "sallo"], "halitu": ["\u547C\u6C14", "\u52A8", "halitu"], "fastid": ["\u5ACC\u5473", "\u52A8", "fastid"], "amarit": ["\u82E6\u5473", "\u52A8", "amarit"], "acidit": ["\u9178\u5473", "\u52A8", "acidit"], "salugo": ["\u54B8\u5473", "\u52A8", "salugo"], "exhala": ["\u6563\u53D1", "\u52A8", "exhala"], "narco": ["\u9EBB\u9189\u6C14", "\u52A8", "narco"], "olent": ["\u9999\u6C14", "\u52A8", "olent"], "graveo": ["\u6D53\u5473", "\u52A8", "graveo"], "tinctur": ["\u6D78\u6DB2", "\u52A8", "tinctur"], "sapora": ["\u8C03\u5473\u54C1", "\u52A8", "sapora"], "gustam": ["\u54C1\u5473\u4E4B\u7269", "\u52A8", "gustam"], "suffit": ["\u718F\u70DF", "\u52A8", "suffit"], "thymia": ["\u9999\u85B0", "\u52A8", "thymia"], "tango": ["\u89E6", "\u6027", "tango"], "atting": ["\u89E6\u53CA", "\u6027", "atting"], "conting": ["\u63A5\u89E6", "\u6027", "conting"], "palpo": ["\u629A", "\u6027", "palpo"], "contrec": ["\u6469\u6332", "\u6027", "contrec"], "attrec": ["\u6469\u89E6", "\u6027", "attrec"], "perstrin": ["\u8F7B\u63A0", "\u6027", "perstrin"], "tracto": ["\u6446\u5F04", "\u6027", "tracto"], "hispid": ["\u7C97\u7CD9\u591A\u6BDB", "\u6027", "hispid"], "villosus": ["\u7ED2\u6BDB\u7684", "\u6027", "villosus"], "veluti": ["\u5929\u9E45\u7ED2\u7684", "\u6027", "veluti"], "glutino": ["\u80F6\u9ECF", "\u6027", "glutino"], "lubric": ["\u6ED1\u7684", "\u6027", "lubric"], "teres": ["\u5706\u6ED1\u7684", "\u6027", "teres"], "callos": ["\u786C\u76AE", "\u6027", "callos"], "tenax": ["\u9ECF\u97E7", "\u6027", "tenax"], "tractab": ["\u53EF\u89E6\u7684", "\u6027", "tractab"], "ictus": ["\u89E6\u51FB", "\u6027", "ictus"], "attact": ["\u63A5\u89E6", "\u6027", "attact"], "horripi": ["\u6BDB\u9AA8\u609A\u7136", "\u6027", "horripi"], "scabrit": ["\u7C97\u7CD9", "\u6027", "scabrit"], "viscam": ["\u9ECF\u7A20", "\u6027", "viscam"], "formica": ["\u9165\u75D2", "\u6027", "formica"], "saluto": ["\u81F4\u610F", "\u52A8", "saluto"], "consalu": ["\u95EE\u5019", "\u52A8", "consalu"], "appello": ["\u79F0\u547C", "\u52A8", "appello"], "compella": ["\u62DB\u547C", "\u52A8", "compella"], "convenio": ["\u4F1A\u89C1", "\u52A8", "convenio"], "visito": ["\u62DC\u8BBF", "\u52A8", "visito"], "inviso": ["\u63A2\u8BBF", "\u52A8", "inviso"], "convivo": ["\u5171\u5BB4", "\u52A8", "convivo"], "epulor": ["\u8D74\u5BB4", "\u52A8", "epulor"], "comito": ["\u966A\u540C", "\u52A8", "comito"], "prosequo": ["\u968F\u884C", "\u52A8", "prosequo"], "consect": ["\u8FFD\u968F", "\u52A8", "consect"], "occurro": ["\u8FCE\u4E0A", "\u52A8", "occurro"], "offendo": ["\u649E\u89C1", "\u52A8", "offendo"], "arcess": ["\u53EC\u6765", "\u52A8", "arcess"], "accers": ["\u4F20\u53EC", "\u52A8", "accers"], "except": ["\u63A5\u5BA2", "\u52A8", "except"], "gratulor": ["\u81F4\u8D3A", "\u52A8", "gratulor"], "condol": ["\u6170\u95EE", "\u52A8", "condol"], "consolor": ["\u5B89\u6170", "\u52A8", "consolor"], "advent": ["\u6765\u8BBF", "\u52A8", "advent"], "hospitor": ["\u505A\u5BA2", "\u52A8", "hospitor"], "deducti": ["\u62A4\u9001", "\u52A8", "deducti"], "ministro": ["\u4F8D\u5019", "\u52A8", "ministro"], "magis": ["\u66F4", "\u6570", "magis"], "parum": ["\u592A\u5C11", "\u6570", "parum"], "nimis": ["\u8FC7\u5EA6", "\u6570", "nimis"], "nimiu": ["\u592A\u591A", "\u6570", "nimiu"], "satis": ["\u8DB3\u591F", "\u6570", "satis"], "affati": ["\u5145\u5206", "\u6570", "affati"], "abunde": ["\u4E30\u8DB3", "\u6570", "abunde"], "multum": ["\u591A", "\u6570", "multum"], "paulum": ["\u5C11\u8BB8", "\u6570", "paulum"], "quantum": ["\u591A\u5C11", "\u6570", "quantum"], "tantul": ["\u5FAE\u5C0F\u91CF", "\u6570", "tantul"], "plerum": ["\u591A\u534A", "\u6570", "plerum"], "pleriqu": ["\u591A\u6570", "\u6570", "pleriqu"], "nonnih": ["\u4E0D\u5C11", "\u6570", "nonnih"], "exiguum": ["\u5C11\u8BB8", "\u6570", "exiguum"], "minimu": ["\u6700\u5C11", "\u6570", "minimu"], "maximu": ["\u6700\u591A", "\u6570", "maximu"], "plurimu": ["\u6781\u591A", "\u6570", "plurimu"], "parce": ["\u8282\u7701\u5730", "\u6570", "parce"], "summati": ["\u6982\u62EC\u5730", "\u6570", "summati"], "particu": ["\u9010\u6761", "\u6570", "particu"], "summa": ["\u603B\u91CF", "\u6570", "summa"], "multitu": ["\u4F17\u591A", "\u6570", "multitu"], "paucit": ["\u5BE1\u5C11", "\u6570", "paucit"], "neur": ["\u795E\u7ECF", "\u7269", "neur"], "myo": ["\u808C", "\u7269", "myo"], "oste": ["\u9AA8", "\u7269", "oste"], "haem": ["\u8840", "\u7269", "haem"], "cyto": ["\u7EC6\u80DE", "\u7269", "cyto"], "textus": ["\u7EC4\u7EC7", "\u7269", "textus"], "arthro": ["\u5173\u8282", "\u7269", "arthro"], "cardi": ["\u5FC3", "\u7269", "cardi"], "pneumo": ["\u80BA", "\u7269", "pneumo"], "nephro": ["\u80BE", "\u7269", "nephro"], "gastro": ["\u80C3", "\u7269", "gastro"], "entero": ["\u80A0", "\u7269", "entero"], "dermato": ["\u76AE", "\u7269", "dermato"], "ophthal": ["\u773C", "\u7269", "ophthal"], "auric": ["\u8033", "\u7269", "auric"], "rhino": ["\u9F3B", "\u7269", "rhino"], "stomato": ["\u53E3", "\u7269", "stomato"], "glosso": ["\u820C", "\u7269", "glosso"], "odonto": ["\u7259", "\u7269", "odonto"], "tricho": ["\u6BDB", "\u7269", "tricho"], "onycho": ["\u7532", "\u7269", "onycho"], "splanchno": ["\u5185\u810F", "\u7269", "splanchno"], "chondro": ["\u8F6F\u9AA8", "\u7269", "chondro"], "organo": ["\u5668\u5B98", "\u7269", "organo"], "patho": ["\u75C5", "\u7269", "patho"], "algo": ["\u75DB", "\u7269", "algo"], "pyo": ["\u8113", "\u7269", "pyo"], "septi": ["\u8150", "\u7269", "septi"], "toxo": ["\u6BD2", "\u7269", "toxo"], "therap": ["\u7597", "\u7269", "therap"], "progno": ["\u9884\u540E", "\u7269", "progno"], "sympto": ["\u75C7", "\u7269", "sympto"], "crisis": ["\u5371\u8C61", "\u7269", "crisis"], "remiss": ["\u7F13\u89E3", "\u7269", "remiss"], "recidiv": ["\u590D\u53D1", "\u7269", "recidiv"], "chrono": ["\u6162\u6027", "\u7269", "chrono"], "acuto": ["\u6025\u6027", "\u7269", "acuto"], "benigno": ["\u826F\u6027", "\u7269", "benigno"], "maligno": ["\u6076\u6027", "\u7269", "maligno"], "heredo": ["\u9057\u4F20", "\u7269", "heredo"], "allergo": ["\u8FC7\u654F", "\u7269", "allergo"], "necro": ["\u574F\u6B7B", "\u7269", "necro"], "sclero": ["\u786C\u5316", "\u7269", "sclero"], "steno": ["\u72ED\u7A84", "\u7269", "steno"], "psycho": ["\u5FC3\u7075", "\u6027", "psycho"], "noo": ["\u5FC3\u667A", "\u6027", "noo"], "mnemo": ["\u8BB0\u5FC6", "\u6027", "mnemo"], "phreno": ["\u7CBE\u795E", "\u6027", "phreno"], "thymo": ["\u60C5\u7EEA", "\u6027", "thymo"], "hormo": ["\u51B2\u52A8", "\u6027", "hormo"], "hedono": ["\u5FEB\u4E50", "\u6027", "hedono"], "phobo": ["\u6050\u60E7", "\u6027", "phobo"], "letho": ["\u9057\u5FD8\u6C89\u7761", "\u6027", "letho"], "oneiro": ["\u68A6", "\u6027", "oneiro"], "estheto": ["\u611F\u89C9", "\u6027", "estheto"], "logo": ["\u7406\u6027", "\u6027", "logo"], "doxo": ["\u610F\u89C1", "\u6027", "doxo"], "fide": ["\u4FE1\u5FF5", "\u6027", "fide"], "etho": ["\u4E60\u60EF", "\u6027", "etho"], "catharo": ["\u5BA3\u6CC4", "\u6027", "catharo"], "libido": ["\u6B32\u529B", "\u6027", "libido"], "complexo": ["\u60C5\u7ED3", "\u6027", "complexo"], "affecto": ["\u60C5\u611F", "\u6027", "affecto"], "cognito": ["\u8BA4\u77E5", "\u6027", "cognito"], "volitio": ["\u610F\u5FD7", "\u6027", "volitio"], "demo": ["\u6C11\u4F17", "\u7269", "demo"], "polito": ["\u57CE\u90A6", "\u7269", "polito"], "crati": ["\u7EDF\u6CBB", "\u7269", "crati"], "archo": ["\u4E3A\u9996", "\u7269", "archo"], "hiero": ["\u5723\u804C", "\u7269", "hiero"], "theo": ["\u795E", "\u7269", "theo"], "ethno": ["\u6C11\u65CF", "\u7269", "ethno"], "phylo": ["\u90E8\u65CF", "\u7269", "phylo"], "nomo": ["\u4E60\u4FD7\u6CD5", "\u7269", "nomo"], "grapho": ["\u4E66\u8BB0", "\u7269", "grapho"], "tyranno": ["\u50ED\u4E3B", "\u7269", "tyranno"], "oligo": ["\u5BE1\u5934", "\u7269", "oligo"], "aristo": ["\u8D35\u65CF", "\u7269", "aristo"], "pluto": ["\u5BCC\u8C6A", "\u7269", "pluto"], "anarcho": ["\u65E0\u653F\u5E9C", "\u7269", "anarcho"], "bureau": ["\u5B98\u50DA", "\u7269", "bureau"], "federo": ["\u8054\u90A6", "\u7269", "federo"], "socio": ["\u793E\u4F1A", "\u7269", "socio"], "patricio": ["\u4E16\u5BB6", "\u7269", "patricio"], "senato": ["\u5143\u8001", "\u7269", "senato"], "consulo": ["\u6267\u653F", "\u7269", "consulo"], "hydro": ["\u6C34", "\u7269", "hydro"], "pyro": ["\u706B", "\u7269", "pyro"], "aero": ["\u6C14", "\u7269", "aero"], "geo": ["\u5730", "\u7269", "geo"], "helio": ["\u65E5", "\u7269", "helio"], "seleno": ["\u6708", "\u7269", "seleno"], "astro": ["\u661F", "\u7269", "astro"], "cosmo": ["\u5B87\u5B99", "\u7269", "cosmo"], "atmo": ["\u84B8\u6C7D", "\u7269", "atmo"], "litho": ["\u77F3\u8D28", "\u7269", "litho"], "metallo": ["\u91D1\u5C5E", "\u7269", "metallo"], "crystallo": ["\u6676", "\u7269", "crystallo"], "cryo": ["\u51B7", "\u7269", "cryo"], "photo": ["\u5149", "\u7269", "photo"], "chromo": ["\u8272", "\u7269", "chromo"], "baro": ["\u91CD", "\u7269", "baro"], "cyclo": ["\u73AF", "\u7269", "cyclo"], "schema": ["\u5F62", "\u7269", "schema"], "plasto": ["\u5851", "\u7269", "plasto"], "tomo": ["\u5207", "\u7269", "tomo"], "kineto": ["\u52A8", "\u7269", "kineto"], "stato": ["\u9759", "\u7269", "stato"], "bio": ["\u751F\u547D", "\u7269", "bio"], "zoo": ["\u52A8\u7269", "\u7269", "zoo"], "phyto": ["\u690D\u7269", "\u7269", "phyto"], "viro": ["\u75C5\u6BD2", "\u7269", "viro"], "gene": ["\u57FA\u56E0", "\u7269", "gene"], "evolo": ["\u6F14\u5316", "\u7269", "evolo"], "ecos": ["\u751F\u6001", "\u7269", "ecos"], "sedes": ["\u6816\u606F\u5730", "\u7269", "sedes"], "locus": ["\u4F4D\u7F6E", "\u7269", "locus"], "convit": ["\u5171\u6816", "\u7269", "convit"], "estivo": ["\u590F\u7720", "\u7269", "estivo"], "metamorpho": ["\u53D8\u6001", "\u7269", "metamorpho"], "larvo": ["\u5E7C\u866B", "\u7269", "larvo"], "pupo": ["\u86F9", "\u7269", "pupo"], "imago": ["\u6210\u866B", "\u7269", "imago"], "ovio": ["\u5375", "\u7269", "ovio"], "mechano": ["\u673A\u68B0", "\u7269", "mechano"], "automato": ["\u81EA\u52A8", "\u7269", "automato"], "electr": ["\u7535", "\u7269", "electr"], "magneto": ["\u78C1", "\u7269", "magneto"], "pneumato": ["\u6C14\u52A8", "\u7269", "pneumato"], "teleo": ["\u8FDC", "\u7269", "teleo"], "phono": ["\u58F0", "\u7269", "phono"], "scopo": ["\u89C2\u5BDF", "\u7269", "scopo"], "crypto": ["\u9690\u79D8", "\u7269", "crypto"], "glypto": ["\u523B", "\u7269", "glypto"], "typo": ["\u5370", "\u7269", "typo"], "syntheto": ["\u5408\u6210", "\u7269", "syntheto"], "ergo": ["\u529F", "\u7269", "ergo"], "trocho": ["\u8F6E", "\u7269", "trocho"], "cochlio": ["\u87BA\u65CB", "\u7269", "cochlio"], "clino": ["\u659C", "\u7269", "clino"], "goni": ["\u89D2\u5EA6", "\u7269", "goni"], "topo": ["\u4F4D\u7F6E", "\u7269", "topo"], "taxis": ["\u6392\u5217", "\u7269", "taxis"], "harmo": ["\u5951\u5408", "\u7269", "harmo"], "itis": ["\u708E", "\u6027", "itis"], "osis": ["\u75C5\u53D8", "\u6027", "osis"], "oma": ["\u7624", "\u6027", "oma"], "emia": ["\u8840\u75C7", "\u6027", "emia"], "uria": ["\u5C3F\u75C7", "\u6027", "uria"], "rrhag": ["\u51FA\u8840", "\u6027", "rrhag"], "rrhoe": ["\u6EA2\u51FA", "\u6027", "rrhoe"], "ptos": ["\u4E0B\u5782", "\u6027", "ptos"], "plasia": ["\u589E\u751F", "\u6027", "plasia"], "troph": ["\u8425\u517B", "\u6027", "troph"], "lys": ["\u6EB6\u89E3", "\u6027", "lys"], "pex": ["\u56FA\u5B9A", "\u6027", "pex"], "ectom": ["\u5207\u9664", "\u6027", "ectom"], "otom": ["\u5207\u5F00", "\u6027", "otom"], "tonia": ["\u808C\u5F20\u529B", "\u6027", "tonia"], "praxia": ["\u884C\u4E3A", "\u6027", "praxia"], "gnosia": ["\u8BA4\u77E5", "\u6027", "gnosia"], "mnesia": ["\u8BB0\u5FC6", "\u6027", "mnesia"], "phasia": ["\u8A00\u8BED", "\u6027", "phasia"], "lalia": ["\u8C08\u8BDD", "\u6027", "lalia"], "opia": ["\u89C6\u89C9", "\u6027", "opia"], "acusis": ["\u542C\u89C9", "\u6027", "acusis"], "osmia": ["\u55C5\u89C9", "\u6027", "osmia"], "algebr": ["\u4EE3\u6570", "\u7269", "algebr"], "logarith": ["\u5BF9\u6570", "\u7269", "logarith"], "functio": ["\u51FD\u6570", "\u7269", "functio"], "consta": ["\u5E38\u6570", "\u7269", "consta"], "limes": ["\u6781\u9650", "\u7269", "limes"], "integral": ["\u79EF\u5206", "\u7269", "integral"], "vecto": ["\u5411\u91CF", "\u7269", "vecto"], "scalar": ["\u6807\u91CF", "\u7269", "scalar"], "tensor": ["\u5F20\u91CF", "\u7269", "tensor"], "grex": ["\u7FA4", "\u7269", "grex"], "campus": ["\u57DF", "\u7269", "campus"], "anulus": ["\u73AF", "\u7269", "anulus"], "tangens": ["\u5207\u7EBF", "\u7269", "tangens"], "secans": ["\u5272\u7EBF", "\u7269", "secans"], "sinus": ["\u6B63\u5F26", "\u7269", "sinus"], "cosinus": ["\u4F59\u5F26", "\u7269", "cosinus"], "lemn": ["\u5F15\u7406", "\u7269", "lemn"], "coroll": ["\u63A8\u8BBA", "\u7269", "coroll"], "demonstr": ["\u8BBA\u8BC1", "\u7269", "demonstr"], "praemiss": ["\u524D\u63D0", "\u7269", "praemiss"], "analog": ["\u7C7B\u6BD4", "\u7269", "analog"], "antinom": ["\u4E8C\u5F8B\u80CC\u53CD", "\u7269", "antinom"], "metonym": ["\u8F6C\u55BB", "\u7269", "metonym"], "synecdoch": ["\u63D0\u55BB", "\u7269", "synecdoch"], "hyperbol": ["\u5938\u5F20", "\u7269", "hyperbol"], "ironia": ["\u53CD\u8BBD", "\u7269", "ironia"], "allegor": ["\u5BD3\u8A00", "\u7269", "allegor"], "enthymem": ["\u7701\u7565\u63A8\u7406", "\u7269", "enthymem"], "aporia": ["\u7591\u96BE", "\u7269", "aporia"], "elench": ["\u53CD\u9A73\u6CD5", "\u7269", "elench"], "rhythmus": ["\u8282\u5F8B", "\u7269", "rhythmus"], "scala": ["\u97F3\u9636", "\u7269", "scala"], "octava": ["\u516B\u5EA6", "\u7269", "octava"], "monod": ["\u72EC\u594F", "\u7269", "monod"], "orchestra": ["\u4E50\u961F", "\u7269", "orchestra"], "lyricus": ["\u6292\u60C5", "\u7269", "lyricus"], "arioso": ["\u548F\u53F9", "\u7269", "arioso"], "sonat": ["\u594F\u9E23", "\u7269", "sonat"], "fuga": ["\u8D4B\u683C", "\u7269", "fuga"], "canon": ["\u5361\u519C", "\u7269", "canon"], "praelud": ["\u5E8F\u66F2", "\u7269", "praelud"], "overtura": ["\u5F00\u573A\u66F2", "\u7269", "overtura"], "cadentia": ["\u7EC8\u6B62\u5F0F", "\u7269", "cadentia"], "timbr": ["\u97F3\u8272", "\u7269", "timbr"], "virtuose": ["\u540D\u624B", "\u7269", "virtuose"], "concentus": ["\u548C\u58F0", "\u7269", "concentus"], "harmonia": ["\u548C\u58F0\u5B66", "\u7269", "harmonia"], "melisma": ["\u82B1\u8154", "\u7269", "melisma"], "tonalis": ["\u8C03\u6027\u7684", "\u7269", "tonalis"], "modalis": ["\u8C03\u5F0F\u7684", "\u7269", "modalis"], "dissonan": ["\u4E0D\u534F\u548C", "\u7269", "dissonan"], "consenan": ["\u534F\u548C", "\u7269", "consenan"], "thema": ["\u4E3B\u9898", "\u7269", "thema"], "paideia": ["\u6559\u80B2", "\u7269", "paideia"], "didactic": ["\u6559\u6388\u6CD5", "\u7269", "didactic"], "pedagog": ["\u6559\u5B66\u6CD5", "\u7269", "pedagog"], "syllabus": ["\u6559\u5B66\u5927\u7EB2", "\u7269", "syllabus"], "academia": ["\u5B66\u9662", "\u7269", "academia"], "lyceum": ["\u5B66\u56ED", "\u7269", "lyceum"], "scholarch": ["\u6821\u957F", "\u7269", "scholarch"], "professor": ["\u6559\u6388", "\u7269", "professor"], "lectura": ["\u8BB2\u5E2D", "\u7269", "lectura"], "seminarium": ["\u7814\u8BA8\u8BFE", "\u7269", "seminarium"], "tutela": ["\u5BFC\u5E08", "\u7269", "tutela"], "matricul": ["\u6CE8\u518C", "\u7269", "matricul"], "graduat": ["\u6BD5\u4E1A", "\u7269", "graduat"], "thesis": ["\u8BBA\u6587", "\u7269", "thesis"], "dissertat": ["\u5B66\u4F4D\u8BBA\u6587", "\u7269", "dissertat"], "symposium": ["\u5B66\u672F\u4F1A\u8BAE", "\u7269", "symposium"], "pedant": ["\u70AB\u5B66\u8005", "\u7269", "pedant"], "didascal": ["\u6559\u6761", "\u7269", "didascal"], "collegium": ["\u5B66\u793E", "\u7269", "collegium"], "rector": ["\u9662\u957F", "\u7269", "rector"], "auditor": ["\u65C1\u542C\u8005", "\u7269", "auditor"], "probato": ["\u8003\u8BD5", "\u7269", "probato"], "laurea": ["\u5B66\u4F4D", "\u7269", "laurea"], "oeconomia": ["\u7ECF\u6D4E", "\u7269", "oeconomia"], "chrematist": ["\u7406\u8D22\u672F", "\u7269", "chrematist"], "trapez": ["\u94F6\u884C\u5BB6", "\u7269", "trapez"], "drachma": ["\u5FB7\u62C9\u514B\u9A6C", "\u7269", "drachma"], "obolus": ["\u5C0F\u5E01", "\u7269", "obolus"], "stater": ["\u91D1\u5E01", "\u7269", "stater"], "talentum": ["\u5854\u5170\u7279", "\u7269", "talentum"], "nomism": ["\u901A\u8D27", "\u7269", "nomism"], "monopol": ["\u5784\u65AD", "\u7269", "monopol"], "oligopol": ["\u5BE1\u5934\u5784\u65AD", "\u7269", "oligopol"], "kartel": ["\u5361\u7279\u5C14", "\u7269", "kartel"], "syndicat": ["\u8F9B\u8FEA\u52A0", "\u7269", "syndicat"], "kredit": ["\u4FE1\u8D37", "\u7269", "kredit"], "debet": ["\u501F\u65B9", "\u7269", "debet"], "saldo": ["\u4F59\u989D", "\u7269", "saldo"], "ratio": ["\u9884\u7B97", "\u7269", "ratio"], "census": ["\u666E\u67E5", "\u7269", "census"], "portorium": ["\u5173\u7A0E", "\u7269", "portorium"], "nummulari": ["\u94B1\u5546", "\u7269", "nummulari"], "fenus": ["\u5229\u606F", "\u7269", "fenus"], "usura": ["\u9AD8\u5229\u8D37", "\u7269", "usura"], "syngraf": ["\u5951\u7EA6", "\u7269", "syngraf"], "banca": ["\u94B1\u5E84", "\u7269", "banca"], "strategus": ["\u6218\u7565\u5BB6", "\u7269", "strategus"], "tactica": ["\u6218\u672F", "\u7269", "tactica"], "hoplit": ["\u91CD\u88C5\u5175", "\u7269", "hoplit"], "phalanx": ["\u65B9\u9635", "\u7269", "phalanx"], "legio": ["\u519B\u56E2", "\u7269", "legio"], "maniple": ["\u5C0F\u961F", "\u7269", "maniple"], "alar": ["\u7FFC\u961F", "\u7269", "alar"], "turna": ["\u9A91\u5175\u961F", "\u7269", "turna"], "cataphract": ["\u94C1\u7532\u9A91", "\u7269", "cataphract"], "poliorket": ["\u653B\u57CE\u672F", "\u7269", "poliorket"], "navarch": ["\u8230\u961F\u53F8\u4EE4", "\u7269", "navarch"], "taxiarch": ["\u652F\u961F\u957F", "\u7269", "taxiarch"], "strategema": ["\u8BA1\u8C0B", "\u7269", "strategema"], "agmen": ["\u884C\u519B\u7EB5\u961F", "\u7269", "agmen"], "optio": ["\u526F\u5B98", "\u7269", "optio"], "decurio": ["\u5341\u592B\u957F", "\u7269", "decurio"], "centurio": ["\u767E\u592B\u957F", "\u7269", "centurio"], "tribunus": ["\u62A4\u6C11\u5B98", "\u7269", "tribunus"], "praesidium": ["\u620D\u536B", "\u7269", "praesidium"], "explorator": ["\u65A5\u5019", "\u7269", "explorator"], "speculator": ["\u63A2\u5B50", "\u7269", "speculator"], "mor": ["\u6851", "\u7269", "mor"], "autumn": ["\u79CB", "\u7269", "autumn"], "vados": ["\u6D45", "\u6027", "vados"], "latifol": ["\u9614\u53F6", "\u7269", "latifol"], "mediterran": ["\u5730\u4E2D\u6D77", "\u7269", "mediterran"], "semi": ["\u534A", "\u6027", "semi"], "infern": ["\u5730\u72F1", "\u7269", "infern"], "lumen": ["\u5FAE\u5149", "\u7269", "lumen"] } };
    module2.exports = EpXsCSyntaxPlugin;
  }
});

// src/main.js
var Plugin = require_plugin();
module.exports = Plugin;
