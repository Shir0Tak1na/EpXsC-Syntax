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

// src/data/lexicon.js
var require_lexicon = __commonJS({
  "src/data/lexicon.js"(exports2, module2) {
    "use strict";
    var SCHEMA_VERSION = 1;
    var SECTIONS = ["entries", "roots", "units", "ranks", "keys"];
    function isObject(value) {
      return !!value && typeof value === "object" && !Array.isArray(value);
    }
    function emptyLexicon() {
      return { entries: {}, roots: {}, units: {}, ranks: {}, keys: {} };
    }
    function loadBuiltinLexicon(raw) {
      if (!isObject(raw)) return { ok: false, reason: "snapshot is not an object", data: emptyLexicon() };
      if (raw.schemaVersion !== SCHEMA_VERSION) {
        return { ok: false, reason: "unsupported schemaVersion: " + String(raw.schemaVersion), data: emptyLexicon() };
      }
      if (typeof raw.lexiconVersion !== "string" || !raw.lexiconVersion) {
        return { ok: false, reason: "missing lexiconVersion", data: emptyLexicon() };
      }
      if (typeof raw.generatedAt !== "string" || !raw.generatedAt) {
        return { ok: false, reason: "missing generatedAt", data: emptyLexicon() };
      }
      for (let i = 0; i < SECTIONS.length; i++) {
        const name = SECTIONS[i];
        if (!isObject(raw[name])) {
          return { ok: false, reason: "missing object section: " + name, data: emptyLexicon() };
        }
      }
      return { ok: true, reason: "", data: raw };
    }
    module2.exports = { SCHEMA_VERSION, SECTIONS, emptyLexicon, loadBuiltinLexicon };
  }
});

// src/services/refresh-scheduler.js
var require_refresh_scheduler = __commonJS({
  "src/services/refresh-scheduler.js"(exports2, module2) {
    "use strict";
    var RefreshScheduler = class {
      constructor(run, delay, timers) {
        if (typeof run !== "function") throw new TypeError("run must be a function");
        this.run = run;
        this.delay = typeof delay === "number" ? delay : 300;
        const t = timers || {};
        this.setTimeout = t.setTimeout || setTimeout;
        this.clearTimeout = t.clearTimeout || clearTimeout;
        this.timer = null;
        this.generation = 0;
      }
      request() {
        this.cancel();
        this.generation += 1;
        const gen = this.generation;
        this.timer = this.setTimeout(() => {
          this.timer = null;
          if (gen !== this.generation) return;
          this.run();
        }, this.delay);
        return gen;
      }
      cancel() {
        if (this.timer !== null) {
          this.clearTimeout(this.timer);
          this.timer = null;
        }
      }
      pending() {
        return this.timer !== null;
      }
    };
    module2.exports = { RefreshScheduler };
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
    var GREEK = { theta: "\u03B8", Theta: "\u0398", lambda: "\u03BB", sigma: "\u03C3", Delta: "\u0394", varphi: "\u03C6", eta: "\u03B7", omega: "\u03C9", mu: "\u03BC", pi: "\u03C0", alpha: "\u03B1", beta: "\u03B2", gamma: "\u03B3", tau: "\u03C4", rho: "\u03C1" };
    function cleanMath(s) {
      let t = String(s);
      t = t.replace(/\$([^$]*)\$/g, "$1");
      t = t.replace(/\\mathrm\{([^}]*)\}/g, "$1");
      t = t.replace(/\\text\{([^}]*)\}/g, "$1");
      t = t.replace(/\\mathbb\{([^}]*)\}/g, "$1");
      t = t.replace(/\\mathcal\{([^}]*)\}/g, "$1");
      t = t.replace(/\\le(?![A-Za-z])/g, "\u2264");
      t = t.replace(/\\ge(?![A-Za-z])/g, "\u2265");
      t = t.replace(/\\times/g, "\xD7");
      t = t.replace(/\\to/g, "\u2192");
      t = t.replace(/\\([a-zA-Z]+)/g, function(all, name) {
        return GREEK[name] || name;
      });
      t = t.replace(/\\[,;!]/g, " ");
      t = t.replace(/[{}]/g, "");
      t = t.replace(/\\/g, "");
      return t.replace(/\s+/g, " ").trim();
    }
    function parseModernRanks(text) {
      const out = /* @__PURE__ */ new Map();
      const lines = text.split(/\r?\n/);
      let inTable = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!inTable) {
          if (/^\s*\|\s*序\s*\|\s*分量\s*\|\s*产生者/.test(line)) inTable = true;
          continue;
        }
        if (!/^\s*\|/.test(line)) {
          if (out.size) break;
          continue;
        }
        const cells = line.split("|").map(cleanCell);
        const rank = cells[1];
        if (!/^\d$/.test(rank)) continue;
        const parts = [];
        for (let j = 2; j <= 5; j++) {
          const v = cleanMath(cells[j] || "");
          if (v) parts.push(v);
        }
        if (parts.length) out.set(rank, parts.join(" \xB7 "));
      }
      return out;
    }
    function parseRanks(text) {
      const modern = parseModernRanks(text);
      if (modern.size) return modern;
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

// src/services/spell-registry.js
var require_spell_registry = __commonJS({
  "src/services/spell-registry.js"(exports2, module2) {
    "use strict";
    var { collectSpells } = require_spells();
    function buildSpellRegistry(sources) {
      const spells = /* @__PURE__ */ new Map();
      const list = Array.isArray(sources) ? sources : [];
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!item || typeof item.text !== "string") continue;
        collectSpells(item.text, spells, item.path || "");
      }
      return spells;
    }
    module2.exports = { buildSpellRegistry };
  }
});

// src/core/lexicon/merge.js
var require_merge = __commonJS({
  "src/core/lexicon/merge.js"(exports2, module2) {
    "use strict";
    function sameEntry(a, b) {
      return a && b && a.word === b.word && a.pos === b.pos && a.meaning === b.meaning && (a.abbr || "") === (b.abbr || "");
    }
    function mergeDictionaries(base, layers) {
      const out = new Map(base || []);
      const conflicts = [];
      const list = Array.isArray(layers) ? layers : [];
      for (let i = 0; i < list.length; i++) {
        const layer = list[i] || {};
        const name = layer.name || "layer-" + i;
        const entries = layer.entries;
        if (!entries || typeof entries.forEach !== "function") continue;
        entries.forEach(function(value, key) {
          if (out.has(key)) {
            const prev = out.get(key);
            if (!sameEntry(prev, value)) {
              conflicts.push({
                word: value.word || key,
                key,
                source: name,
                previous: prev,
                next: value,
                kinds: [
                  prev.meaning !== value.meaning ? "definition" : "",
                  prev.pos !== value.pos ? "pos" : "",
                  (prev.abbr || "") !== (value.abbr || "") ? "abbr" : ""
                ].filter(Boolean)
              });
            }
          }
          out.set(key, value);
        });
      }
      return { dictionary: out, conflicts };
    }
    module2.exports = { mergeDictionaries, sameEntry };
  }
});

// src/services/lexicon-service.js
var require_lexicon_service = __commonJS({
  "src/services/lexicon-service.js"(exports2, module2) {
    "use strict";
    var { FALLBACK, SECTIONS, splitSections, parseEntries, parseRanks, parseFilterKeys, parseUnits, parseRoots, wordsFrom } = require_parsers();
    var { buildSpellRegistry } = require_spell_registry();
    var { mergeDictionaries } = require_merge();
    function parseJsonDictionary(text) {
      const obj = JSON.parse(text);
      const root = obj && (obj.entries || obj.words) || obj || {};
      const out = /* @__PURE__ */ new Map();
      for (const key in root) {
        if (!Object.prototype.hasOwnProperty.call(root, key)) continue;
        const v = root[key];
        const word = v && typeof v === "object" && v.word ? String(v.word) : String(key);
        const entry = v && typeof v === "object" ? { word, pos: String(v.pos || v.posName || ""), meaning: String(v.meaning || v.definition || ""), abbr: String(v.abbr || "") } : { word, pos: "", meaning: String(v || ""), abbr: "" };
        if (entry.meaning) out.set(String(key).toLowerCase(), entry);
      }
      return out;
    }
    function builtinMap(builtin, part) {
      const out = /* @__PURE__ */ new Map();
      const source = builtin[part] || {};
      for (const key in source) {
        const v = source[key];
        out.set(key, { word: v[0], pos: v[1], meaning: v[2], abbr: v[3] || "" });
      }
      return out;
    }
    function builtinRanks(builtin) {
      const out = /* @__PURE__ */ new Map();
      const source = builtin.ranks || {};
      for (const key in source) out.set(key, source[key]);
      return out;
    }
    function builtinRoots(builtin) {
      const out = /* @__PURE__ */ new Map();
      const source = builtin.roots || {};
      for (const key in source) out.set(key, { word: source[key][2] || key, pos: "\u8BCD\u6839\xB7" + source[key][1], meaning: source[key][0], kind: source[key][1] });
      return out;
    }
    function builtinLists(builtin, verbRoots) {
      const bySection = {};
      const e = builtin.entries || {};
      for (const key in e) {
        const pos = e[key][1];
        (bySection[pos] = bySection[pos] || []).push(e[key][0]);
      }
      const units = Object.keys(builtin.units || {});
      return {
        keyword: wordsFrom(bySection, SECTIONS.keyword, FALLBACK.keyword),
        judge: wordsFrom(bySection, SECTIONS.judge, FALLBACK.judge),
        clause: wordsFrom(bySection, SECTIONS.clause, FALLBACK.clause),
        degree: wordsFrom(bySection, SECTIONS.degree, FALLBACK.degree),
        predicate: wordsFrom(bySection, SECTIONS.predicate, FALLBACK.predicate).concat(verbRoots || []),
        unit: wordsFrom(bySection, SECTIONS.unit, FALLBACK.unit).concat(units)
      };
    }
    function mergeInto(target, map) {
      map.forEach(function(value, key) {
        if (!target.has(key)) target.set(key, value);
      });
    }
    async function buildLexiconSnapshot(io, config, builtin, extraWords, options) {
      const info = /* @__PURE__ */ new Map();
      for (const w in extraWords) info.set(w, extraWords[w]);
      const roots = /* @__PURE__ */ new Map();
      const extraUnits = [];
      const keyWords = /* @__PURE__ */ new Set();
      let lists = null;
      let ranks = /* @__PURE__ */ new Map();
      try {
        const dictText = await io.readFile(config.DICT_PATH);
        if (dictText !== null && dictText !== void 0) {
          mergeInto(info, parseEntries(dictText));
          const map = splitSections(dictText);
          lists = {
            keyword: wordsFrom(map, SECTIONS.keyword, FALLBACK.keyword),
            judge: wordsFrom(map, SECTIONS.judge, FALLBACK.judge),
            clause: wordsFrom(map, SECTIONS.clause, FALLBACK.clause),
            degree: wordsFrom(map, SECTIONS.degree, FALLBACK.degree),
            predicate: wordsFrom(map, SECTIONS.predicate, FALLBACK.predicate),
            unit: wordsFrom(map, SECTIONS.unit, FALLBACK.unit)
          };
        } else {
          mergeInto(info, builtinMap(builtin, "entries"));
        }
        const syntaxText = await io.readFile(config.SYNTAX_PATH);
        if (syntaxText !== null && syntaxText !== void 0) {
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
          const keyMap = builtinMap(builtin, "keys");
          mergeInto(info, keyMap);
          keyMap.forEach(function(v, k) {
            keyWords.add(String(k).toLowerCase());
          });
          mergeInto(info, builtinMap(builtin, "units"));
        }
        const rankText = await io.readFile(config.RANK_PATH);
        ranks = rankText !== null && rankText !== void 0 ? parseRanks(rankText) : builtinRanks(builtin);
        const rootFiles = await io.listMarkdown(config.ROOTS_DIR);
        if (rootFiles && rootFiles.length) {
          for (let i = 0; i < rootFiles.length; i++) {
            mergeInto(roots, parseRoots(await io.readFile(rootFiles[i])));
          }
        } else {
          mergeInto(roots, builtinRoots(builtin));
        }
        roots.forEach(function(v, k) {
          if (v.kind === "\u52A8" || !info.has(k)) info.set(k, v);
        });
      } catch (err) {
        if (io.warn) io.warn(err);
        mergeInto(info, builtinMap(builtin, "entries"));
        mergeInto(info, builtinMap(builtin, "keys"));
        mergeInto(info, builtinMap(builtin, "units"));
        mergeInto(roots, builtinRoots(builtin));
        roots.forEach(function(v, k) {
          if (v.kind === "\u52A8" || !info.has(k)) info.set(k, v);
        });
        if (!ranks.size) ranks = builtinRanks(builtin);
      }
      const customPaths = options && Array.isArray(options.customDictPaths) ? options.customDictPaths : config && Array.isArray(config.CUSTOM_DICT_PATHS) ? config.CUSTOM_DICT_PATHS : [];
      const customLayers = [];
      const customErrors = [];
      const customSectionWords = { keyword: [], judge: [], clause: [], degree: [], predicate: [], unit: [] };
      for (let ci = 0; ci < customPaths.length; ci++) {
        const cpath = customPaths[ci];
        try {
          const ctext = await io.readFile(cpath);
          if (ctext === null || ctext === void 0) {
            customErrors.push({ path: cpath, code: "MISSING", message: "\u81EA\u5B9A\u4E49\u8BCD\u5E93\u4E0D\u5B58\u5728" });
            continue;
          }
          const centries = /\.json$/i.test(cpath) ? parseJsonDictionary(ctext) : parseEntries(ctext);
          customLayers.push({ name: cpath, entries: centries });
          const cmap = splitSections(ctext);
          for (const key in customSectionWords) {
            for (let si = 0; si < SECTIONS[key].length; si++) {
              const words = cmap[SECTIONS[key][si]] || [];
              for (let wi = 0; wi < words.length; wi++) customSectionWords[key].push(words[wi]);
            }
          }
          const unitMap = parseUnits(ctext);
          unitMap.forEach(function(v) {
            extraUnits.push(v.word);
            customSectionWords.unit.push(v.word);
          });
        } catch (e) {
          customErrors.push({ path: cpath, code: "READ_ERROR", message: String(e && e.message || e) });
          if (io.warn) io.warn(e);
        }
      }
      const merged = mergeDictionaries(info, customLayers);
      info.clear();
      merged.dictionary.forEach(function(v, k) {
        info.set(k, v);
      });
      const verbRoots = [];
      roots.forEach(function(v) {
        if (v.kind === "\u52A8") verbRoots.push(v.word);
      });
      if (lists) {
        lists.predicate = lists.predicate.concat(verbRoots);
        lists.unit = lists.unit.concat(extraUnits);
      } else {
        lists = builtinLists(builtin, verbRoots);
      }
      for (const key in customSectionWords) {
        for (let ci = 0; ci < customSectionWords[key].length; ci++) {
          if (lists[key].indexOf(customSectionWords[key][ci]) < 0) lists[key].push(customSectionWords[key][ci]);
        }
      }
      let spells = /* @__PURE__ */ new Map();
      try {
        const spellFiles = await io.listMarkdown(config.SPELL_DIR) || [];
        const syntaxText = await io.readFile(config.SYNTAX_PATH);
        if (syntaxText !== null && syntaxText !== void 0) spellFiles.push(config.SYNTAX_PATH);
        const sources = [];
        for (let i = 0; i < spellFiles.length; i++) {
          sources.push({ path: spellFiles[i], text: await io.readFile(spellFiles[i]) });
        }
        spells = buildSpellRegistry(sources);
      } catch (err) {
        if (io.warn) io.warn(err);
      }
      const units = /* @__PURE__ */ new Set();
      for (let i = 0; i < lists.unit.length; i++) units.add(String(lists.unit[i]).toLowerCase());
      const keys = /* @__PURE__ */ new Set();
      keyWords.forEach(function(k) {
        keys.add(String(k).toLowerCase());
      });
      info.forEach(function(v, k) {
        if (v.pos === "\u7B5B\u9009\u952E") keys.add(String(k).toLowerCase());
      });
      return { info, roots, ranks, units, keys, lists, spells, keyWords, lexiconVersion: builtin && builtin.lexiconVersion || "", dictionaryConflicts: merged.conflicts, customDictionaryErrors: customErrors };
    }
    module2.exports = { buildLexiconSnapshot, builtinLists };
  }
});

// src/core/translation/request.js
var require_request = __commonJS({
  "src/core/translation/request.js"(exports2, module2) {
    "use strict";
    var DEFAULT_PROVIDER = {
      type: "openai-compatible",
      baseUrl: "",
      endpoint: "/chat/completions",
      model: "",
      headers: {},
      apiKey: "",
      timeoutMs: 3e4,
      maxTokens: 2048,
      temperature: 0.3
    };
    function normalizeHeaders(headers) {
      const out = {};
      if (!headers || typeof headers !== "object") return out;
      for (const key in headers) {
        if (!Object.prototype.hasOwnProperty.call(headers, key)) continue;
        const value = headers[key];
        if (value === void 0 || value === null) continue;
        out[String(key)] = String(value);
      }
      return out;
    }
    function normalizeProviderConfig(input) {
      const v = input && typeof input === "object" ? input : {};
      return {
        type: String(v.type || DEFAULT_PROVIDER.type),
        baseUrl: String(v.baseUrl || "").trim(),
        endpoint: String(v.endpoint || DEFAULT_PROVIDER.endpoint).trim(),
        model: String(v.model || "").trim(),
        headers: normalizeHeaders(v.headers),
        apiKey: String(v.apiKey || ""),
        timeoutMs: Number(v.timeoutMs) > 0 ? Number(v.timeoutMs) : DEFAULT_PROVIDER.timeoutMs,
        maxTokens: Number(v.maxTokens) > 0 ? Math.floor(Number(v.maxTokens)) : DEFAULT_PROVIDER.maxTokens,
        temperature: Number.isFinite(Number(v.temperature)) ? Number(v.temperature) : DEFAULT_PROVIDER.temperature
      };
    }
    function isLoopback(host) {
      return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
    }
    function validateProviderConfig(input) {
      const cfg = normalizeProviderConfig(input);
      if (cfg.type !== "openai-compatible") return { ok: false, code: "UNSUPPORTED_PROVIDER", message: "\u4E0D\u652F\u6301\u7684 Provider \u7C7B\u578B" };
      if (!cfg.baseUrl) return { ok: false, code: "MISSING_BASE_URL", message: "\u7F3A\u5C11 Base URL" };
      if (!cfg.model) return { ok: false, code: "MISSING_MODEL", message: "\u7F3A\u5C11\u6A21\u578B\u540D\u79F0" };
      let url;
      try {
        url = new URL(cfg.baseUrl);
      } catch (e) {
        return { ok: false, code: "INVALID_BASE_URL", message: "Base URL \u4E0D\u662F\u5408\u6CD5 URL" };
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, code: "INVALID_PROTOCOL", message: "\u53EA\u5141\u8BB8 http \u6216 https" };
      if (url.protocol === "http:" && !isLoopback(url.hostname)) return { ok: false, code: "HTTPS_REQUIRED", message: "\u975E\u56DE\u73AF\u5730\u5740\u5FC5\u987B\u4F7F\u7528 HTTPS" };
      try {
        resolveEndpoint(cfg.baseUrl, cfg.endpoint);
      } catch (e) {
        return { ok: false, code: "INVALID_ENDPOINT", message: e.message };
      }
      return { ok: true, config: cfg };
    }
    function resolveEndpoint(baseUrl, endpoint) {
      const base = String(baseUrl || "").trim().replace(/\/+$/, "");
      const ep = String(endpoint || "").trim();
      if (!ep) throw new Error("endpoint \u4E0D\u80FD\u4E3A\u7A7A");
      if (/^https?:\/\//i.test(ep)) {
        try {
          new URL(ep);
        } catch (e) {
          throw new Error("endpoint \u4E0D\u662F\u5408\u6CD5 URL");
        }
        return ep;
      }
      if (!base) throw new Error("baseUrl \u4E0D\u80FD\u4E3A\u7A7A");
      try {
        new URL(base);
      } catch (e) {
        throw new Error("baseUrl \u4E0D\u662F\u5408\u6CD5 URL");
      }
      const joined = base + "/" + ep.replace(/^\/+/, "");
      if (/\/v1\/v1\//.test(joined)) throw new Error("endpoint \u4E0E baseUrl \u91CD\u590D\u4E86 /v1 \u6BB5");
      return joined;
    }
    function translationKey(parts) {
      const p = parts || {};
      const source = String(p.source || "").replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
      let h = 2166136261;
      for (let i = 0; i < source.length; i++) {
        h ^= source.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const sourceHash = ("00000000" + (h >>> 0).toString(16)).slice(-8);
      const fp = p.providerFingerprint || {};
      return JSON.stringify({
        sourceHash,
        sourceLang: p.sourceLang || "",
        targetLang: p.targetLang || "",
        lexiconVersion: p.lexiconVersion || "",
        providerType: fp.type || "",
        baseUrlOrigin: fp.baseUrlOrigin || "",
        endpoint: fp.endpoint || "",
        model: fp.model || "",
        promptVersion: fp.promptVersion || ""
      });
    }
    function providerFingerprint(config, promptVersion) {
      const cfg = normalizeProviderConfig(config);
      let origin = "";
      try {
        origin = new URL(cfg.baseUrl).origin;
      } catch (e) {
        origin = cfg.baseUrl;
      }
      return {
        type: cfg.type,
        baseUrlOrigin: origin,
        endpoint: cfg.endpoint,
        model: cfg.model,
        promptVersion: promptVersion || "v1"
      };
    }
    module2.exports = { DEFAULT_PROVIDER, normalizeProviderConfig, validateProviderConfig, resolveEndpoint, translationKey, providerFingerprint, isLoopback };
  }
});

// src/core/settings.js
var require_settings = __commonJS({
  "src/core/settings.js"(exports2, module2) {
    "use strict";
    var { DEFAULT_PROVIDER, normalizeProviderConfig } = require_request();
    var DEFAULT_SETTINGS = {
      schemaVersion: 1,
      lexicon: { customPaths: [] },
      display: { language: "auto", fallbackLanguage: "" },
      translation: {
        enabled: false,
        provider: Object.assign({}, DEFAULT_PROVIDER)
      }
    };
    function normalizePaths(input) {
      const out = [];
      const seen = /* @__PURE__ */ new Set();
      const list = Array.isArray(input) ? input : [];
      for (let i = 0; i < list.length; i++) {
        const s = String(list[i] || "").trim();
        if (!s || seen.has(s)) continue;
        seen.add(s);
        out.push(s);
      }
      return out;
    }
    function normalizeSettings(data) {
      const d = data && typeof data === "object" ? data : {};
      const lexicon = d.lexicon && typeof d.lexicon === "object" ? d.lexicon : {};
      const display = d.display && typeof d.display === "object" ? d.display : {};
      const translation = d.translation && typeof d.translation === "object" ? d.translation : {};
      const language = String(display.language || "auto").trim() || "auto";
      const fallback = String(display.fallbackLanguage || "").trim();
      return {
        schemaVersion: 1,
        lexicon: { customPaths: normalizePaths(lexicon.customPaths) },
        display: {
          language: language === "auto" ? "auto" : language,
          fallbackLanguage: fallback
        },
        translation: {
          enabled: translation.enabled === true,
          provider: normalizeProviderConfig(translation.provider)
        }
      };
    }
    module2.exports = { DEFAULT_SETTINGS, normalizeSettings, normalizePaths };
  }
});

// src/ui/settings-tab.js
var require_settings_tab = __commonJS({
  "src/ui/settings-tab.js"(exports2, module2) {
    "use strict";
    var { PluginSettingTab, Setting, Notice } = require("obsidian");
    var { normalizeSettings } = require_settings();
    var EpXsSettingsTab = class extends PluginSettingTab {
      constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
      }
      scheduleSave(delay) {
        if (this._saveTimer) window.clearTimeout(this._saveTimer);
        this._saveTimer = window.setTimeout(() => {
          this._saveTimer = null;
          this.persist();
        }, typeof delay === "number" ? delay : 400);
      }
      hide() {
        if (this._saveTimer) window.clearTimeout(this._saveTimer);
        this._saveTimer = null;
      }
      async persist() {
        try {
          await this.plugin.saveSettings();
        } catch (err) {
          new Notice("EpXsC \u8BBE\u7F6E\u4FDD\u5B58\u5931\u8D25\uFF1A" + (err && err.message ? err.message : err));
        }
      }
      display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h2", { text: "EpXsC Syntax \u8BBE\u7F6E" });
        containerEl.createEl("p", { text: "2.1.0 \u53EA\u5305\u542B\u8BCD\u5E93\u4E0E\u9605\u8BFB\u8BBE\u7F6E\uFF1B\u7FFB\u8BD1\u6A21\u578B\u914D\u7F6E\u5C5E\u4E8E 2.2.0\u3002" });
        containerEl.createEl("h3", { text: "\u8BCD\u5E93" });
        const def = containerEl.createEl("p", {
          text: "\u9ED8\u8BA4\u8BCD\u5E93\u7531\u63D2\u4EF6\u5185\u7F6E\u8DEF\u5F84\u8BFB\u53D6\uFF1B\u81EA\u5B9A\u4E49\u8BCD\u5E93\u6309\u5217\u8868\u987A\u5E8F\u8986\u76D6\uFF0C\u8D8A\u9760\u540E\u4F18\u5148\u7EA7\u8D8A\u9AD8\u3002"
        });
        def.addClass && def.addClass("setting-item-description");
        const paths = this.plugin.settings.lexicon.customPaths.join("\n");
        new Setting(containerEl).setName("\u81EA\u5B9A\u4E49\u8BCD\u5E93\u8DEF\u5F84").setDesc("\u6BCF\u884C\u4E00\u4E2A Vault \u8DEF\u5F84\uFF0C\u4F8B\u5982\uFF1A\u4E16\u754C\u8BBE\u5B9A\u96C6/\u6211\u7684\u8BCD\u5E93.md").addTextArea((text) => {
          text.inputEl.rows = 4;
          text.inputEl.style.width = "100%";
          text.setValue(paths).onChange(async (value) => {
            this.plugin.settings.lexicon.customPaths = String(value || "").split(/\r?\n/);
            this.plugin.settings = normalizeSettings(this.plugin.settings);
            this.scheduleSave();
          });
        });
        new Setting(containerEl).setName("\u5BFC\u5165\u81EA\u5B9A\u4E49\u8BCD\u5E93").setDesc("\u628A .md \u6216 .json \u6587\u4EF6\u590D\u5236\u5230\u63D2\u4EF6\u76EE\u5F55\u7684 lexicons/ \u4E0B\uFF0C\u5E76\u52A0\u5165\u8DEF\u5F84\u5217\u8868\u3002").addButton((btn) => btn.setButtonText("\u9009\u62E9\u6587\u4EF6").onClick(() => this.pickFile()));
        if (this.plugin.lexiconConflicts && this.plugin.lexiconConflicts.length) {
          containerEl.createEl("h4", { text: "\u8BCD\u5E93\u51B2\u7A81" });
          const list = containerEl.createEl("ul");
          this.plugin.lexiconConflicts.slice(0, 20).forEach((c) => {
            list.createEl("li", { text: c.word + "\uFF1A" + (c.previous && c.previous.meaning) + " \u2192 " + (c.next && c.next.meaning) + "\uFF08" + c.source + "\uFF09" });
          });
        }
        if (this.plugin.customDictionaryErrors && this.plugin.customDictionaryErrors.length) {
          containerEl.createEl("h4", { text: "\u8BCD\u5E93\u9519\u8BEF" });
          const list = containerEl.createEl("ul");
          this.plugin.customDictionaryErrors.forEach((e) => list.createEl("li", { text: e.path + "\uFF1A" + e.message }));
        }
        containerEl.createEl("h3", { text: "\u663E\u793A" });
        new Setting(containerEl).setName("\u663E\u793A\u8BED\u8A00").setDesc("auto \u8DDF\u968F Obsidian \u754C\u9762\u8BED\u8A00\uFF1B\u4E5F\u53EF\u56FA\u5B9A\u4E3A\u67D0\u4E2A\u8BED\u8A00\u6807\u7B7E\u3002").addDropdown((drop) => {
          drop.addOption("auto", "auto\uFF08\u8DDF\u968F Obsidian\uFF09");
          ["zh-CN", "zh-TW", "en", "ja"].forEach((lang) => drop.addOption(lang, lang));
          drop.setValue(this.plugin.settings.display.language || "auto").onChange(async (value) => {
            this.plugin.settings.display.language = value;
            await this.persist();
          });
        });
        new Setting(containerEl).setName("\u5907\u7528\u8BED\u8A00").setDesc("\u5F53\u524D\u8BED\u8A00\u6CA1\u6709\u8BD1\u6587\u65F6\uFF0C\u518D\u5C1D\u8BD5\u8FD9\u4E2A\u8BED\u8A00\uFF1B\u7559\u7A7A\u5219\u4E0D\u542F\u7528\u3002").addText((text) => text.setPlaceholder("\u4F8B\u5982 zh-CN").setValue(this.plugin.settings.display.fallbackLanguage || "").onChange(async (value) => {
          this.plugin.settings.display.fallbackLanguage = String(value || "").trim();
          await this.persist();
        }));
        containerEl.createEl("h3", { text: "\u7FFB\u8BD1\uFF082.2.0\uFF09" });
        const tr = this.plugin.settings.translation;
        new Setting(containerEl).setName("\u542F\u7528\u81EA\u52A8\u7FFB\u8BD1").setDesc("\u9ED8\u8BA4\u5173\u95ED\uFF1B\u5F00\u542F\u540E\u4EC5\u5728 T \u5757\u7F3A\u5F53\u524D\u8BED\u8A00\u8BD1\u6587\u65F6\u8BF7\u6C42\u672C\u5730\u6A21\u578B\u3002").addToggle((toggle) => toggle.setValue(!!tr.enabled).onChange(async (value) => {
          tr.enabled = !!value;
          await this.persist();
        }));
        new Setting(containerEl).setName("Base URL").setDesc("\u4F8B\u5982 http://127.0.0.1:11434/v1\uFF1B\u975E\u56DE\u73AF\u5730\u5740\u5FC5\u987B HTTPS\u3002").addText((text) => text.setPlaceholder("http://127.0.0.1:11434/v1").setValue(tr.provider.baseUrl || "").onChange(async (value) => {
          tr.provider.baseUrl = String(value || "").trim();
          this.scheduleSave();
        }));
        new Setting(containerEl).setName("Endpoint").setDesc("\u76F8\u5BF9 endpoint \u4F1A\u62FC\u63A5 Base URL\uFF1B\u4E5F\u53EF\u586B\u5199\u5B8C\u6574 URL\u3002").addText((text) => text.setValue(tr.provider.endpoint || "/chat/completions").onChange(async (value) => {
          tr.provider.endpoint = String(value || "").trim();
          this.scheduleSave();
        }));
        new Setting(containerEl).setName("Model").addText((text) => text.setPlaceholder("\u6A21\u578B\u540D\u79F0").setValue(tr.provider.model || "").onChange(async (value) => {
          tr.provider.model = String(value || "").trim();
          this.scheduleSave();
        }));
        new Setting(containerEl).setName("API Key").setDesc("\u53EA\u4FDD\u5B58\u5728\u63D2\u4EF6 data.json\uFF1B\u4E0D\u8981\u4F7F\u7528\u5E26\u9AD8\u6743\u9650\u7684\u957F\u671F\u4EE4\u724C\u3002").addText((text) => {
          text.inputEl.type = "password";
          text.setValue(tr.provider.apiKey || "").onChange(async (value) => {
            tr.provider.apiKey = String(value || "");
            this.scheduleSave();
          });
        });
        new Setting(containerEl).setName("Headers").setDesc("JSON \u5BF9\u8C61\uFF1B\u4E0E\u5185\u7F6E Content-Type \u5408\u5E76\u3002").addTextArea((text) => {
          text.inputEl.rows = 3;
          text.inputEl.style.width = "100%";
          text.setValue(JSON.stringify(tr.provider.headers || {}, null, 2)).onChange(async (value) => {
            try {
              const parsed = JSON.parse(String(value || "{}"));
              tr.provider.headers = parsed && typeof parsed === "object" ? parsed : {};
              this.scheduleSave();
            } catch (e) {
            }
          });
        });
        new Setting(containerEl).setName("\u53C2\u6570").setDesc("timeoutMs / maxTokens / temperature").addText((text) => text.setValue(String(tr.provider.timeoutMs || 3e4)).onChange((value) => {
          tr.provider.timeoutMs = Number(value) || 3e4;
          this.scheduleSave();
        })).addText((text) => text.setValue(String(tr.provider.maxTokens || 2048)).onChange((value) => {
          tr.provider.maxTokens = Number(value) || 2048;
          this.scheduleSave();
        })).addText((text) => text.setValue(String(tr.provider.temperature === void 0 ? 0.3 : tr.provider.temperature)).onChange((value) => {
          tr.provider.temperature = Number(value);
          this.scheduleSave();
        }));
        new Setting(containerEl).setName("\u6D4B\u8BD5\u8FDE\u63A5").setDesc("\u53EA\u5728\u4F60\u70B9\u51FB\u65F6\u53D1\u8D77\u4E00\u6B21\u8BF7\u6C42\uFF0C\u4E0D\u4FDD\u5B58\u6D4B\u8BD5\u7ED3\u679C\u3002").addButton((btn) => btn.setButtonText("\u6D4B\u8BD5").onClick(async () => {
          const result = await this.plugin.testTranslation();
          new Notice(result && result.ok ? "\u7FFB\u8BD1\u8FDE\u63A5\u6210\u529F" : "\u7FFB\u8BD1\u5931\u8D25\uFF1A" + (result && result.error ? result.error.message : "\u672A\u77E5\u9519\u8BEF"));
        }));
        containerEl.createEl("h3", { text: "\u8BCA\u65AD" });
        new Setting(containerEl).setName("\u8BCD\u6761\u7EDF\u8BA1").setDesc("\u5F53\u524D\u8BCD\u6761 " + this.plugin.info.size + " \xB7 \u8BCD\u6839 " + this.plugin.roots.size + " \xB7 \u81EA\u5B9A\u4E49\u51B2\u7A81 " + this.plugin.lexiconConflicts.length).addButton((btn) => btn.setButtonText("\u91CD\u65B0\u8F7D\u5165").onClick(async () => {
          await this.plugin.refresh();
          this.display();
        }));
      }
      pickFile() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".md,.json,text/markdown,application/json";
        input.style.display = "none";
        document.body.appendChild(input);
        input.addEventListener("change", async () => {
          const file = input.files && input.files[0];
          input.remove();
          if (!file) return;
          try {
            const text = await file.text();
            const dir = (this.plugin.manifest && this.plugin.manifest.dir ? this.plugin.manifest.dir : ".obsidian/plugins/epxsc-syntax") + "/lexicons";
            const adapter = this.app.vault.adapter;
            if (adapter && typeof adapter.mkdir === "function") {
              try {
                await adapter.mkdir(dir);
              } catch (e) {
              }
            }
            if (!adapter || typeof adapter.write !== "function") throw new Error("Vault adapter \u4E0D\u652F\u6301\u5199\u5165");
            const target = dir + "/" + file.name;
            await adapter.write(target, text);
            const list = this.plugin.settings.lexicon.customPaths;
            if (list.indexOf(target) < 0) list.push(target);
            await this.persist();
            new Notice("\u5DF2\u5BFC\u5165\u8BCD\u5E93\uFF1A" + target);
            this.display();
          } catch (err) {
            new Notice("\u8BCD\u5E93\u5BFC\u5165\u5931\u8D25\uFF1A" + (err && err.message ? err.message : err));
          }
        });
        input.click();
      }
    };
    module2.exports = { EpXsSettingsTab };
  }
});

// src/core/translation/prompt.js
var require_prompt = __commonJS({
  "src/core/translation/prompt.js"(exports2, module2) {
    "use strict";
    var PROMPT_VERSION = "epxsc-translation-v1";
    function buildTranslationMessages(input) {
      const o = input || {};
      const target = o.targetLanguage || "zh-CN";
      const source = String(o.text || "");
      const system = [
        "You are a careful translator for the constructed language EpXsC (Expaulxsirian Construct).",
        "Translate the supplied EpXsC sentence into the requested target language.",
        "Output only the translation. Do not add explanations, labels, Markdown fences or multiple variants.",
        "If the source is ambiguous, choose the most literal reading and keep names unchanged.",
        "Target language: " + target + "."
      ].join(" ");
      const user = "Translate this EpXsC sentence:\n" + source;
      return [
        { role: "system", content: system },
        { role: "user", content: user }
      ];
    }
    function cleanModelText(text) {
      let s = String(text || "").trim();
      s = s.replace(/^\x60{3}[^\n]*\n?/, "").replace(/\n?\x60{3}$/, "").trim();
      s = s.replace(/^["'\u201c\u201d]+|["'\u201c\u201d]+$/g, "").trim();
      return s;
    }
    module2.exports = { PROMPT_VERSION, buildTranslationMessages, cleanModelText };
  }
});

// src/providers/openai-compatible.js
var require_openai_compatible = __commonJS({
  "src/providers/openai-compatible.js"(exports2, module2) {
    "use strict";
    var { validateProviderConfig, resolveEndpoint, normalizeProviderConfig, providerFingerprint } = require_request();
    var { PROMPT_VERSION, buildTranslationMessages, cleanModelText } = require_prompt();
    function error(code, message, retryable) {
      return { ok: false, error: { code, message, retryable: !!retryable } };
    }
    function createOpenAICompatibleProvider(options) {
      const opts = options || {};
      const rawConfig = opts.config || {};
      const config = normalizeProviderConfig(rawConfig);
      const request = opts.request;
      const promptVersion = opts.promptVersion || PROMPT_VERSION;
      const fingerprint = providerFingerprint(config, promptVersion);
      async function translate(input) {
        const v = validateProviderConfig(config);
        if (!v.ok) return error(v.code, v.message, false);
        if (typeof request !== "function") return error("MISSING_TRANSPORT", "\u6CA1\u6709\u53EF\u7528\u7684 HTTP \u4F20\u8F93\u5C42", false);
        const text = String(input && input.text || "").trim();
        if (!text) return error("EMPTY_SOURCE", "\u6E90\u53E5\u4E3A\u7A7A", false);
        const target = String(input && input.targetLanguage || "zh-CN").trim() || "zh-CN";
        const headers = Object.assign({ "Content-Type": "application/json" }, config.headers || {});
        if (config.apiKey) headers.Authorization = "Bearer " + config.apiKey;
        const payload = {
          model: config.model,
          messages: buildTranslationMessages({ text, targetLanguage: target }),
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          stream: false
        };
        let res;
        try {
          res = await request({
            url: resolveEndpoint(config.baseUrl, config.endpoint),
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal: input && input.signal
          });
        } catch (e) {
          return error("REQUEST_FAILED", String(e && e.message || e), true);
        }
        if (!res) return error("EMPTY_RESPONSE", "\u6A21\u578B\u6CA1\u6709\u8FD4\u56DE\u54CD\u5E94", true);
        if (res.status === 401 || res.status === 403) return error("AUTH_FAILED", "\u8BA4\u8BC1\u5931\u8D25\uFF08HTTP " + res.status + "\uFF09", false);
        if (res.status === 429) return error("RATE_LIMITED", "\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\uFF08HTTP 429\uFF09", true);
        if (res.status < 200 || res.status >= 300) return error("HTTP_ERROR", "\u6A21\u578B\u8FD4\u56DE HTTP " + res.status, res.status >= 500);
        let data = res.json;
        if (!data && res.text) {
          try {
            data = JSON.parse(res.text);
          } catch (e) {
            return error("INVALID_JSON", "\u6A21\u578B\u54CD\u5E94\u4E0D\u662F JSON", true);
          }
        }
        const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        const textOut = cleanModelText(typeof content === "string" ? content : "");
        if (!textOut) return error("EMPTY_CONTENT", "\u6A21\u578B\u8FD4\u56DE\u7A7A\u8BD1\u6587", true);
        return { ok: true, text: textOut };
      }
      return {
        id: "openai-compatible",
        label: "OpenAI-compatible",
        fingerprint,
        capabilities: {
          temperature: true,
          maxTokens: true,
          streaming: false,
          cancel: "logical",
          structuredOutput: false
        },
        config,
        translate
      };
    }
    module2.exports = { createOpenAICompatibleProvider };
  }
});

// src/services/translation-service.js
var require_translation_service = __commonJS({
  "src/services/translation-service.js"(exports2, module2) {
    "use strict";
    var { translationKey, providerFingerprint } = require_request();
    function cancelled() {
      return { ok: false, error: { code: "CANCELLED", message: "\u7FFB\u8BD1\u5DF2\u53D6\u6D88", retryable: false } };
    }
    function createTranslationService(options) {
      const opts = options || {};
      const provider = opts.provider || null;
      const cacheLimit = Number(opts.cacheLimit) > 0 ? Math.floor(Number(opts.cacheLimit)) : 256;
      const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 3e4;
      const cache = /* @__PURE__ */ new Map();
      const inflight = /* @__PURE__ */ new Map();
      let epoch = 0;
      function cacheGet(key) {
        if (!cache.has(key)) return null;
        const value = cache.get(key);
        cache.delete(key);
        cache.set(key, value);
        return value;
      }
      function cacheSet(key, value) {
        if (cache.has(key)) cache.delete(key);
        cache.set(key, value);
        while (cache.size > cacheLimit) {
          const first = cache.keys().next().value;
          cache.delete(first);
        }
      }
      function clear() {
        cache.clear();
        inflight.clear();
        epoch += 1;
      }
      function cancelAll() {
        epoch += 1;
        inflight.clear();
      }
      function withTimeout(promise, ms) {
        let timer = null;
        const timeout = new Promise(function(resolve) {
          timer = setTimeout(function() {
            resolve({ ok: false, error: { code: "TIMEOUT", message: "\u7FFB\u8BD1\u8BF7\u6C42\u8D85\u65F6", retryable: true } });
          }, ms);
        });
        return Promise.race([promise, timeout]).finally(function() {
          if (timer) clearTimeout(timer);
        });
      }
      async function translate(input) {
        const optsIn = input || {};
        if (!provider) return { ok: false, error: { code: "NO_PROVIDER", message: "\u672A\u914D\u7F6E\u7FFB\u8BD1\u6A21\u578B", retryable: false } };
        const source = String(optsIn.text || "").trim();
        if (!source) return { ok: false, error: { code: "EMPTY_SOURCE", message: "\u6E90\u53E5\u4E3A\u7A7A", retryable: false } };
        const key = translationKey({
          source,
          sourceLang: optsIn.sourceLang || "epxsc",
          targetLang: optsIn.targetLanguage || optsIn.targetLang || "zh-CN",
          lexiconVersion: optsIn.lexiconVersion || "",
          providerFingerprint: optsIn.providerFingerprint || provider.fingerprint
        });
        const hit = cacheGet(key);
        if (hit) return { ok: true, text: hit.text, cached: true };
        if (inflight.has(key)) return await inflight.get(key);
        const startEpoch = epoch;
        const promise = withTimeout(provider.translate({
          text: source,
          sourceLang: optsIn.sourceLang || "epxsc",
          targetLanguage: optsIn.targetLanguage || optsIn.targetLang || "zh-CN",
          signal: optsIn.signal
        }), timeoutMs).then(function(result) {
          if (startEpoch !== epoch) return cancelled();
          if (result && result.ok) cacheSet(key, { text: result.text });
          return result;
        }).catch(function(err) {
          return { ok: false, error: { code: "PROVIDER_ERROR", message: String(err && err.message || err), retryable: true } };
        }).finally(function() {
          inflight.delete(key);
        });
        inflight.set(key, promise);
        return await promise;
      }
      return {
        translate,
        clear,
        cancelAll,
        get provider() {
          return provider;
        },
        get epoch() {
          return epoch;
        },
        get cacheSize() {
          return cache.size;
        },
        get inflightSize() {
          return inflight.size;
        }
      };
    }
    module2.exports = { createTranslationService, cancelled };
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

// src/core/markup.js
var require_markup = __commonJS({
  "src/core/markup.js"(exports2, module2) {
    "use strict";
    var { TYPES, MODIFIERS } = require_grammar();
    var { ELEMENTS } = require_parsers();
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
    function classifySquare2(inner) {
      if (/=/.test(inner)) return "\u7B5B\u9009\u952E\u8868";
      if (/^\s*:/.test(inner)) return "\u5217\u8868\u7C7B\u578B";
      if (/^\s*\d+\s*:/.test(inner)) return "\u4F4D\u6570\u58F0\u660E";
      if (/&/.test(inner)) return "\u70B9\u540D\u5217\u8868";
      if (/siro|\*/.test(inner)) return "\u76EE\u6807\u96C6";
      if (/\.\./.test(inner) || /^\s*\d+\s*$/.test(inner)) return "\u4E0B\u6807 \xB7 \u79E9";
      return "\u5217\u8868";
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
    module2.exports = { markSpellRefs, markVarUse, bracketKinds, inferKind, parseVarTypes, markDictKeys, markBracketDepth };
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

// src/services/lint-service.js
var require_lint_service = __commonJS({
  "src/services/lint-service.js"(exports2, module2) {
    "use strict";
    var { lintText } = require_lint();
    function lintSource(source, snapshot, path) {
      const s = snapshot || {};
      return lintText(source, {
        info: s.info || /* @__PURE__ */ new Map(),
        units: s.units || /* @__PURE__ */ new Set(),
        keys: s.keys || /* @__PURE__ */ new Set(),
        spells: s.spells || /* @__PURE__ */ new Map(),
        path: path || ""
      });
    }
    module2.exports = { lintSource };
  }
});

// src/renderers/epxsc-renderer.js
var require_epxsc_renderer = __commonJS({
  "src/renderers/epxsc-renderer.js"(exports2, module2) {
    "use strict";
    var { tokenizeText } = require_tokenizer();
    var { markSpellRefs, markVarUse, bracketKinds, parseVarTypes, markDictKeys, markBracketDepth } = require_markup();
    function renderEpXsC(text, grammar, info, maxLines) {
      const source = String(text || "");
      const limit = typeof maxLines === "number" ? maxLines : 50;
      if ((source.match(/\n/g) || []).length >= limit) return { skip: true, html: "", vars: /* @__PURE__ */ new Map() };
      if (!grammar) return { skip: false, html: "", vars: /* @__PURE__ */ new Map() };
      let html = markBracketDepth(tokenizeText(source, grammar), bracketKinds(source));
      const vars = parseVarTypes(source, info || /* @__PURE__ */ new Map());
      html = markVarUse(html, vars);
      html = markDictKeys(html);
      html = markSpellRefs(html);
      return { skip: false, html, vars };
    }
    module2.exports = { renderEpXsC };
  }
});

// src/core/ord/parse.js
var require_parse = __commonJS({
  "src/core/ord/parse.js"(exports2, module2) {
    "use strict";
    var CJK_RE = /[\u3400-\u9fff]/;
    var LANG_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|[0-9]{3}))?(?:-[A-Za-z0-9]{5,8})*$/;
    function baseLang(tag) {
      const n = normalizeLang(tag);
      return n ? n.split("-")[0].toLowerCase() : "";
    }
    function normalizeLang(tag) {
      if (typeof tag !== "string") return null;
      const raw = tag.trim();
      if (!raw || !LANG_RE.test(raw)) return null;
      const parts = raw.split("-").map(function(p) {
        return p.toLowerCase();
      });
      const out = [parts[0]];
      let i = 1;
      if (i < parts.length && /^[a-z]{4}$/.test(parts[i])) {
        out.push(parts[i].charAt(0).toUpperCase() + parts[i].slice(1));
        i += 1;
      }
      if (i < parts.length && /^(?:[a-z]{2}|[0-9]{3})$/.test(parts[i])) {
        out.push(parts[i].toUpperCase());
        i += 1;
      }
      while (i < parts.length) {
        out.push(parts[i]);
        i += 1;
      }
      return out.join("-");
    }
    function stableHash(text) {
      const s = String(text || "");
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return ("00000000" + (h >>> 0).toString(16)).slice(-8);
    }
    function normalizeSource(text) {
      return String(text || "").replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
    }
    function sourceHash(text) {
      return stableHash(normalizeSource(text));
    }
    function parseTranslationLine(raw) {
      let body = String(raw || "").replace(/^\s*>?\s?/, "");
      body = body.replace(/^\s+/, "");
      if (!body) return { lang: null, text: "", empty: true };
      if (body.slice(0, 2) === "\\(") {
        return { lang: null, text: body.slice(1) };
      }
      const m = /^\(([^()]*)\)(?:\s+)?([\s\S]*)$/.exec(body);
      if (m) {
        const lang = normalizeLang(m[1]);
        if (lang) return { lang, text: m[2] };
        return { lang: null, text: body };
      }
      return { lang: null, text: body };
    }
    function parseTranslations(lines) {
      const out = [];
      for (let i = 0; i < lines.length; i++) {
        const raw = String(lines[i] || "");
        if (!/^\s*>/.test(raw)) continue;
        const t = parseTranslationLine(raw);
        if (t.empty) continue;
        out.push({ lang: t.lang, text: t.text, line: i + 1 });
      }
      return out;
    }
    function parseOrdLines(source) {
      const lines = String(source || "").replace(/\r/g, "").split("\n");
      const records = [];
      const warnings = [];
      let pending = null;
      function addTranslation(record, t) {
        if (!t.text) {
          warnings.push({ code: "EMPTY_TRANSLATION", line: record.line, message: "\u7A7A\u8BD1\u6587\u5DF2\u5FFD\u7565" });
          return;
        }
        if (t.lang === null) {
          if (record.defaultTranslation) warnings.push({ code: "DUPLICATE_DEFAULT", line: record.line, message: "\u9ED8\u8BA4\u8BD1\u6587\u91CD\u590D\uFF0C\u6700\u540E\u4E00\u6761\u751F\u6548" });
          record.defaultTranslation = t.text;
          return;
        }
        const old = record.translations.filter(function(x) {
          return x.lang === t.lang;
        })[0];
        if (old) warnings.push({ code: "DUPLICATE_LANGUAGE", line: record.line, message: "\u8BED\u8A00 " + t.lang + " \u7684\u8BD1\u6587\u91CD\u590D\uFF0C\u6700\u540E\u4E00\u6761\u751F\u6548" });
        record.translations = record.translations.filter(function(x) {
          return x.lang !== t.lang;
        });
        record.translations.push({ lang: t.lang, text: t.text, line: record.line });
      }
      function flush() {
        if (!pending) return;
        records.push(pending);
        pending = null;
      }
      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const t = raw.trim();
        if (!t) {
          flush();
          records.push({ kind: "gap", line: i + 1 });
          continue;
        }
        if (t.charAt(0) === ">") {
          if (!pending) {
            warnings.push({ code: "ORPHAN_TRANSLATION", line: i + 1, message: "\u8BD1\u6587\u884C\u524D\u9762\u6CA1\u6709\u6E90\u53E5" });
            const orphan = {
              kind: "line",
              line: i + 1,
              sourceLine: null,
              src: "",
              sourceHash: "",
              translations: [],
              defaultTranslation: ""
            };
            addTranslation(orphan, parseTranslationLine(raw));
            records.push(orphan);
            continue;
          }
          addTranslation(pending, parseTranslationLine(raw));
          continue;
        }
        if (pending && !pending.defaultTranslation && !pending.translations.length && CJK_RE.test(t)) {
          pending.defaultTranslation = t;
          continue;
        }
        flush();
        pending = {
          kind: "line",
          line: i + 1,
          sourceLine: i + 1,
          src: t,
          sourceHash: sourceHash(t),
          translations: [],
          defaultTranslation: ""
        };
      }
      flush();
      return { records, warnings };
    }
    function matchTranslation(translations, lang) {
      if (!lang) return null;
      const exact = translations.filter(function(t) {
        return t.lang === lang;
      })[0];
      if (exact) return exact;
      const base = baseLang(lang);
      const sameBase = translations.filter(function(t) {
        return t.lang === base;
      })[0];
      if (sameBase) return sameBase;
      return translations.filter(function(t) {
        return baseLang(t.lang) === base;
      })[0] || null;
    }
    function pickTranslation(input) {
      const opts = input || {};
      const translations = opts.translations || [];
      const requested = normalizeLang(opts.requestedLanguage) || "";
      const fallback = normalizeLang(opts.fallbackLanguage) || "";
      const tryOrder = [];
      if (requested) {
        tryOrder.push(requested);
        if (baseLang(requested)) tryOrder.push(baseLang(requested));
      }
      if (fallback) {
        tryOrder.push(fallback);
        if (baseLang(fallback)) tryOrder.push(baseLang(fallback));
      }
      const seen = /* @__PURE__ */ new Set();
      for (let i = 0; i < tryOrder.length; i++) {
        const lang = tryOrder[i];
        if (!lang || seen.has(lang)) continue;
        seen.add(lang);
        const hit = matchTranslation(translations, lang);
        if (hit) return { kind: "human", lang: hit.lang, text: hit.text };
      }
      if (opts.defaultTranslation) return { kind: "default", lang: null, text: opts.defaultTranslation };
      return { kind: "untranslated", lang: null, text: "" };
    }
    module2.exports = {
      normalizeLang,
      baseLang,
      parseTranslationLine,
      parseTranslations,
      parseOrdLines,
      pickTranslation,
      stableHash,
      sourceHash
    };
  }
});

// src/renderers/ord-renderer.js
var require_ord_renderer = __commonJS({
  "src/renderers/ord-renderer.js"(exports2, module2) {
    "use strict";
    var { tokenizeText } = require_tokenizer();
    var { parseOrdLines, pickTranslation } = require_parse();
    function ordTokens(line, grammar) {
      const html = tokenizeText(line, grammar);
      const out = [];
      const re = /<span class="token ([a-zA-Z ]+)">([\s\S]*?)<\/span>/g;
      let m;
      while (m = re.exec(html)) out.push({ cls: m[1], text: m[2].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") });
      return out;
    }
    function ordGlossOf(tok, info, posMap) {
      const t = tok.text.trim();
      if (!t || /^[\p{P}]$/u.test(t)) return "";
      const e = info && (info.get(t) || info.get(t.toLowerCase()));
      if (e) {
        const raw = String(e.pos || "").replace("\xB7\u7F29\u5199", "");
        const pos = posMap && posMap[raw] || raw;
        const num = String(e.meaning || "").replace(/[^\u4e00-\u9fa5]/g, "");
        if (pos) return pos;
        if (num) return num.slice(0, 4);
      }
      const map = { judge: "\u5224\u65AD\u8BCD", keyword: "\u529F\u80FD\u8BCD", modifier: "\u9650\u5B9A\u8BCD", degree: "\u7A0B\u5EA6\u8BCD", unit: "\u5355\u4F4D", predicate: "\u8C13\u8BCD", element: "\u5143\u7D20\u7801", type: "\u7C7B\u578B\u540D", number: "\u6570" };
      for (const k in map) if (tok.cls.indexOf(k) >= 0) return map[k];
      return "";
    }
    function parseOrdBlocks(source, mode, grammar, info, posMap, options) {
      const parsed = parseOrdLines(source);
      const opts = options || {};
      const out = [];
      for (let i = 0; i < parsed.records.length; i++) {
        const record = parsed.records[i];
        if (record.kind === "gap") {
          out.push({ kind: "gap" });
          continue;
        }
        const picked = pickTranslation({
          translations: record.translations,
          requestedLanguage: opts.requestedLanguage,
          fallbackLanguage: opts.fallbackLanguage,
          defaultTranslation: record.defaultTranslation
        });
        const zh = picked.kind === "untranslated" ? "" : picked.text;
        const state = picked.kind === "human" || picked.kind === "default" ? "human" : "untranslated";
        if (mode === "G") {
          const toks = ordTokens(record.src, grammar);
          const tokens = toks.map(function(tok) {
            return { cls: tok.cls, text: tok.text, gloss: ordGlossOf(tok, info, posMap) };
          });
          out.push({ kind: "line", src: record.src, zh, translationState: state, translations: record.translations, sourceHash: record.sourceHash, tokens });
        } else {
          out.push({ kind: "line", src: record.src, zh, translationState: state, translations: record.translations, sourceHash: record.sourceHash, html: tokenizeText(record.src, grammar) });
        }
      }
      return out;
    }
    module2.exports = { ordTokens, ordGlossOf, parseOrdBlocks };
  }
});

// src/ui/lint-modal.js
var require_lint_modal = __commonJS({
  "src/ui/lint-modal.js"(exports2, module2) {
    "use strict";
    var { Modal } = require("obsidian");
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
    module2.exports = { LintModal };
  }
});

// src/ui/diagnostics.js
var require_diagnostics = __commonJS({
  "src/ui/diagnostics.js"(exports2, module2) {
    "use strict";
    var { MarkdownView, Notice } = require("obsidian");
    async function diagnose(plugin, BUILD) {
      const L = [];
      const add = function(s) {
        L.push(s);
      };
      add("# EpXsC \u8BCA\u65AD\u62A5\u544A");
      add("");
      add("- \u4EE3\u7801\u7248\u672C\uFF08BUILD\uFF09\uFF1A" + BUILD);
      add("- manifest \u7248\u672C\uFF1A" + (plugin.manifest && plugin.manifest.version || "?"));
      add("- \u63D2\u4EF6\u76EE\u5F55\uFF1A" + (plugin.manifest && plugin.manifest.dir || "?"));
      add("- \u751F\u6210\u65F6\u95F4\uFF1A" + (/* @__PURE__ */ new Date()).toLocaleString());
      let mode = "\u975E\u7B14\u8BB0\u89C6\u56FE";
      try {
        const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) mode = view.getMode() === "preview" ? "\u9605\u8BFB\u89C6\u56FE" : "\u5B9E\u65F6\u9884\u89C8\uFF0F\u6E90\u7801";
      } catch (e) {
      }
      add("- \u5F53\u524D\u89C6\u56FE\uFF1A**" + mode + "**");
      add("- \u8BCD\u8868\uFF1A\u8BCD\u6761 " + plugin.info.size + " \xB7 \u8BCD\u6839 " + (plugin.roots ? plugin.roots.size : "-") + " \xB7 \u79E9 " + plugin.ranks.size + " \xB7 \u8C13\u8BCD " + plugin.grammar.predicate.source.length + " \u5B57\u7B26");
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
      add("- \u515C\u5E95\u72B6\u6001\uFF1A" + (plugin._styleState || "(\u8FD8\u6CA1\u8DD1)"));
      add("");
      add("## \u63D2\u4EF6\u76EE\u5F55\u91CC\u7684 styles.css");
      try {
        const dir = plugin.manifest && plugin.manifest.dir || ".obsidian/plugins/epxsc-syntax";
        const css = await plugin.app.vault.adapter.read(dir + "/styles.css");
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
        await plugin.app.vault.adapter.write("EpXsC \u8BCA\u65AD\u62A5\u544A.md", text);
        new Notice("\u8BCA\u65AD\u62A5\u544A\u5DF2\u5199\u5165\u5E93\u6839\u76EE\u5F55\uFF1AEpXsC \u8BCA\u65AD\u62A5\u544A.md\uFF08\u4EE3\u7801\u7248\u672C " + BUILD + "\uFF09", 12e3);
      } catch (e) {
        new Notice("\u5199\u62A5\u544A\u5931\u8D25\uFF1A" + (e && e.message));
      }
      return text;
    }
    function selfCheck(plugin, BUILD) {
      let mode = "\u975E\u7B14\u8BB0\u89C6\u56FE";
      try {
        const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
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
        "\u8BCD\u6761 " + plugin.info.size + " \xB7 \u79E9 " + plugin.ranks.size + " \xB7 \u8BED\u6CD5" + (plugin.grammar ? "\u5DF2\u88C5" : "\u7F3A\u5931") + " \xB7 \u5207\u8BCD\u5668\uFF1A\u81EA\u5E26\uFF08Prism " + (window.Prism ? "\u6709" : "\u6CA1\u6709") + "\uFF09",
        "\u5F53\u524D\u89C6\u56FE\uFF1A" + mode,
        "EpXsC \u4EE3\u7801\u5757 " + (codes.length - ordBlocks) + " \u4E2A \xB7 \u666E\u901A\u53E5\u5757\uFF08G\uFF0FT\uFF09" + ordBlocks + " \u4E2A \xB7 \u5E26 token \u7684 " + tokened + " \u4E2A \xB7 \u5B9E\u65F6\u9884\u89C8\u4EE3\u7801\u884C " + lines + " \u884C",
        codes.length > 0 && tokened === 0 && mode === "\u9605\u8BFB\u89C6\u56FE" ? "\u26A0 \u9605\u8BFB\u89C6\u56FE\u91CC\u8FD9\u4E9B\u5757\u6CA1\u6709 token \u2014\u2014 \u6E32\u67D3\u6CA1\u8DD1\u8D77\u6765\uFF0C\u8BF7\u628A\u8FD9\u51E0\u884C\u53D1\u6211" : "\u6E32\u67D3\uFF1A" + (tokened > 0 ? "\u6B63\u5E38" : "\u65E0\u4EE3\u7801\u5757"),
        "\u9996\u4E2A\u5757 class\uFF1A" + firstClass,
        "\u9996\u4E2A\u5757 token \u6570\uFF1A" + tokenCount + " \xB7 \u9996\u4E2A token \u989C\u8272\uFF1A" + color,
        "\u6837\u5F0F\u8868\uFF1A" + styleState + (plugin._styleState ? " \xB7 \u515C\u5E95\uFF1A" + plugin._styleState : "")
      ].join("\n"), 15e3);
    }
    module2.exports = { diagnose, selfCheck };
  }
});

// src/adapter/config.js
var require_config = __commonJS({
  "src/adapter/config.js"(exports2, module2) {
    "use strict";
    var DICT_PATH = "\u4E16\u754C\u8BBE\u5B9A\u96C6/\u5730\u57DF\u6587\u5316\u56FE\u9274/\u8BED\u8A00/\u8FF0\u65E0\u7A7A\u8BED/\u8FF0\u65E0\u7A7A\u8BED\u8BCD\u5178.md";
    var RANK_PATH = "\u4E16\u754C\u8BBE\u5B9A\u96C6/\u8BBE\u5B9A\u6982\u5FF5\u96C6\u5408/\u7EF4\u5EA6/\u7EF4\u5EA6\u6A21\u578B.md";
    var SYNTAX_PATH = "\u4E16\u754C\u8BBE\u5B9A\u96C6/\u5730\u57DF\u6587\u5316\u56FE\u9274/\u8BED\u8A00/\u8FF0\u65E0\u7A7A\u8BED/\u8FF0\u65E0\u7A7A\u8BED\u672F\u5F0F\u8BED\u6CD5.md";
    var ROOTS_DIR = "\u4E16\u754C\u8BBE\u5B9A\u96C6/\u5730\u57DF\u6587\u5316\u56FE\u9274/\u8BED\u8A00/\u8FF0\u65E0\u7A7A\u8BED/\u8BCD\u5E93/\u8BCD\u6839\u8868/";
    var SPELL_DIR = "\u4E16\u754C\u8BBE\u5B9A\u96C6/\u8BBE\u5B9A\u6982\u5FF5\u96C6\u5408/\u9B54\u6CD5";
    var MAX_HIGHLIGHT_LINES = 50;
    module2.exports = { DICT_PATH, RANK_PATH, SYNTAX_PATH, ROOTS_DIR, SPELL_DIR, MAX_HIGHLIGHT_LINES };
  }
});

// src/ui/tooltip.js
var require_tooltip = __commonJS({
  "src/ui/tooltip.js"(exports2, module2) {
    "use strict";
    var CLASS_ORDER = ["rankRange", "bracket", "paren", "brace", "pointer", "coordRun", "negPrefix", "modifier", "declTarget", "varUse", "judge", "clause", "declaration", "variable", "type", "element", "unit", "predicate", "spellRef", "function", "keyword", "pretium", "degree", "axis", "number", "comment", "annotation", "operator", "punctuation", "word"];
    var CLASS_LABEL = {
      judge: "\u5224\u65AD\u8BCD",
      clause: "\u6761\u6B3E",
      modifier: "\u9650\u5B9A\u8BCD",
      declTarget: "\u58F0\u660E\u76EE\u6807",
      negPrefix: "\u524D\u7F6E\u5426\u5B9A",
      declaration: "\u672F\u5F0F\u540D",
      className: "\u7C7B\u540D",
      filterKey: "\u7B5B\u9009\u952E",
      filterValue: "\u7B5B\u9009\u503C",
      dictKey: "\u5B57\u5178\u952E",
      freqTag: "\u9891\u6BB5\u6807\u7B7E",
      spellRef: "\u672F\u5F0F\u5F15\u7528",
      predicate: "\u8C13\u8BCD",
      function: "\u8C13\u8BCD\u8C03\u7528",
      keyword: "",
      type: "\u7C7B\u578B\u540D",
      element: "\u5143\u7D20\u7801",
      unit: "\u5355\u4F4D",
      number: "\u6570\u503C",
      degree: "\u7A0B\u5EA6\u8BCD",
      axis: "\u7F29\u653E\u8F74",
      pretium: "\u4EE3\u4EF7"
    };
    var EXTRA_WORDS = {
      in: { word: "in", pos: "\u4ECB\u8BCD", meaning: "\u5728\u2026\u2026\u91CC\uFF08\u8BCD\u5178\u6682\u672A\u6536\u5F55\uFF0C\u6309\u672F\u5F0F\u7528\u6CD5\u8865\uFF09", abbr: "" },
      /* 第五章筛选键表：ordin= 的三个取值（词典未收，按表补） */
      proxim: { word: "proxim", pos: "\u7B5B\u9009\u503C", meaning: "\u8FD1\uFF08ordin= \u7684\u53D6\u503C\uFF09", abbr: "" },
      procul: { word: "procul", pos: "\u7B5B\u9009\u503C", meaning: "\u8FDC\uFF08ordin= \u7684\u53D6\u503C\uFF09", abbr: "" },
      temer: { word: "temer", pos: "\u7B5B\u9009\u503C", meaning: "\u968F\u673A\uFF08ordin= \u7684\u53D6\u503C\uFF09", abbr: "" }
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
    var TYPE_NOTES = {
      siro: "void\uFF1A\u65E0\u76EE\u6807\uFF0F\u65E0\u8F7D\u4F53\uFF0C\u53EF\u58F0\u660E\u53D8\u91CF\u6216\u76F4\u63A5\u5360\u4F4D"
    };
    function buildTip(cls, text, info, ranks, ctx) {
      const spellRegistry = ctx && ctx.spells || /* @__PURE__ */ new Map();
      const SECTION_POS2 = ctx && ctx.sectionPos || {};
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
      const head = WORD_KIND[String(text).toLowerCase()] || (entry.kind ? "\u8BCD\u6839\xB7" + entry.kind : CLASS_LABEL[cls] || SECTION_POS2[entry.pos] || entry.pos || "\u8BCD\u6761");
      const raw = entry.abbr || "";
      const showAbbr = raw && raw !== "\u2014" && raw !== "-" && raw.toLowerCase() !== String(text).toLowerCase();
      const note = TYPE_NOTES[String(text).toLowerCase()];
      return { label: head, body: entry.meaning + (note ? "\uFF1B" + note : "") };
    }
    module2.exports = {
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
  }
});

// src/renderers/ord-dom.js
var require_ord_dom = __commonJS({
  "src/renderers/ord-dom.js"(exports2, module2) {
    "use strict";
    var { parseOrdBlocks } = require_ord_renderer();
    var { SECTION_POS } = require_tooltip();
    function renderOrdBlockInner(el, source, mode, grammar, info, options) {
      const records = parseOrdBlocks(source, mode, grammar, info, SECTION_POS, options);
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
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        if (record.kind === "gap") {
          const gap = document.createElement("div");
          gap.className = "epx-gap";
          code.appendChild(gap);
          continue;
        }
        const line = lineEl();
        if (mode === "G") {
          const gs = document.createElement("div");
          gs.className = "epx-gs";
          const toks = record.tokens || [];
          for (let j = 0; j < toks.length; j++) {
            const tok = toks[j];
            const gw = document.createElement("span");
            gw.className = "epx-gw";
            const srcEl = document.createElement("span");
            srcEl.className = "epx-gsrc token " + tok.cls;
            srcEl.textContent = tok.text;
            gw.appendChild(srcEl);
            if (tok.gloss) {
              const gg = document.createElement("span");
              gg.className = "epx-ggl";
              gg.textContent = tok.gloss;
              gw.appendChild(gg);
            }
            gs.appendChild(gw);
          }
          line.appendChild(gs);
        } else if (record.src) {
          const srcEl = document.createElement("div");
          srcEl.className = "epx-tsrc";
          appendHTML(srcEl, record.html || "");
          line.appendChild(srcEl);
        }
        if (record.zh) {
          const zh = document.createElement("div");
          zh.className = "epx-tzh";
          zh.textContent = record.zh;
          line.appendChild(zh);
        } else if (mode === "T") {
          const zh = document.createElement("div");
          zh.className = "epx-tzh epx-tuntranslated";
          zh.textContent = "\u5C1A\u672A\u7FFB\u8BD1 / Untranslated";
          line.appendChild(zh);
          if (record.translationState === "untranslated" && options && options.autoTranslate && options.translationService && record.src) {
            zh.className = "epx-tzh epx-t-auto";
            zh.textContent = "\u81EA\u52A8\u7FFB\u8BD1\u4E2D\u2026";
            Promise.resolve(options.translationService.translate({
              text: record.src,
              sourceLang: "epxsc",
              targetLanguage: options.requestedLanguage || "zh-CN",
              lexiconVersion: options.lexiconVersion || ""
            })).then(function(result) {
              if (!zh.isConnected) return;
              if (result && result.ok) {
                zh.textContent = result.text;
                zh.classList.remove("epx-tuntranslated");
                zh.classList.add("epx-t-auto");
              } else {
                zh.textContent = "\u81EA\u52A8\u7FFB\u8BD1\u5931\u8D25\uFF08\u53EF\u91CD\u8BD5\uFF09";
                zh.classList.add("epx-t-failed");
              }
            }).catch(function() {
              if (zh.isConnected) zh.textContent = "\u81EA\u52A8\u7FFB\u8BD1\u5931\u8D25\uFF08\u53EF\u91CD\u8BD5\uFF09";
            });
          }
        }
        code.appendChild(line);
      }
      el.textContent = "";
      el.appendChild(wrap);
    }
    function renderOrdBlock(el, source, mode, grammar, info, options) {
      try {
        renderOrdBlockInner(el, source, mode, grammar, info, options);
      } catch (err) {
        console.warn("[EpXsC Syntax] \u666E\u901A\u53E5\u6E32\u67D3\u5931\u8D25\uFF1A", err);
        try {
          if (el && el.empty) el.empty();
          if (el && el.createEl) el.createEl("pre", { text: String(source || "") });
        } catch (e) {
        }
      }
    }
    module2.exports = { renderOrdBlock, renderOrdBlockInner };
  }
});

// data/builtin-lexicon.json
var require_builtin_lexicon = __commonJS({
  "data/builtin-lexicon.json"(exports2, module2) {
    module2.exports = { entries: { acutus: ["acutus", "\u540D\u8BCD", "\u5C16\u9510", "\u2014"], adi: ["adi", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u542C", "ADI"], ae: ["ae", "\u6839\u8BCD", "\u4E0A\u5347\u3001\u589E\u5F3A", "AER"], aepaus: ["aepaus", "\u52A8\u8BCD", "\u589E\u52A0\u3001\u63D0\u5347\u3001\u52A0\u5267", "AEP"], agrus: ["agrus", "\u540D\u8BCD", "\u7530\u5730", "\u2014"], alfus: ["alfus", "\u65CF\u540D", "\u7CBE\u7075\u65CF", "ALF"], ali: ["ali", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u67D0\u4E2A", "ali"], alius: ["alius", "\u6307\u79F0\u9650\u5B9A", "\u53E6\u4E00\u4E2A", "als"], alopex: ["alopex", "\u52A8\u7269\u540D", "\u72D0", "ALO"], altus: ["altus", "\u540D\u8BCD", "\u9AD8", "\u2014"], aluctio: ["aluctio", "\u540D\u8BCD", "\u7565\u62CD\u5356", "\u2014"], amb: ["amb", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u8D70\u3001\u884C\u8D70", "AMB"], ami: ["ami", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u670B\u53CB", "AMI"], amphor: ["amphor", "\u540D\u8BCD", "\u74EE\u5320", "\u2014"], angelus: ["angelus", "\u65CF\u540D", "\u8428\u79D1\u5854\u65CF", "ANG"], anima: ["anima", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u7075\u9B42", "ANI"], animarbo: ["Animarbo", "\u5730\u540D\u4E0E\u52BF\u529B\u540D", "\u5168\u606F\u9B42\u7075\u4E4B\u6811", "anim \uFF0B arbor"], annus: ["annus", "\u5355\u4F4D", "\u5E74", "ann"], anura: ["anura", "\u65CF\u540D", "\u5B89\u52AA\u62C9\u65CF", "ANU"], ape: ["ape", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6253\u5F00", "APE"], apo: ["apo", "\u6839\u8BCD", "\u79BB\u3001\u7206\u53D1\u3001\u91CA\u653E", "APX"], apolus: ["apolus", "\u52A8\u8BCD", "\u5C04\u51FB\u3001\u7206\u70B8", "APOl"], aps: ["aps", "\u91CF\u8BCD", "\u62BD\u8C61\u4E8B\u7269", "APS"], aqe: ["aqe", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6D2A\u6C34", "AQE"], aqua: ["aqua", "\u540D\u8BCD", "\u6C34\u5143\u7D20", "Aqu"], aquor: ["aquor", "\u65CF\u540D", "\u963F\u6208\u5C14\u65CF", "AQR"], ardu: ["ardu", "\u526F\u8BCD", "\u96BE", "\u2014"], arktos: ["arktos", "\u52A8\u7269\u540D", "\u718A", "ARK"], arus: ["arus", "\u540D\u8BCD", "\u8015\u4E4B\u4E8B", "\u2014"], auctio: ["auctio", "\u540D\u8BCD", "\u62CD\u5356", "\u2014"], aude: ["aude", "\u5224\u65AD\u8BCD", "\u524D\u540E\u540C\u4E00\u5219\u540C\u4E00", "aud"], aut: ["aut", "\u5224\u65AD\u8BCD", "\u5305\u542B\u6216", "aut"], aux: ["aux", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u5E2E\u52A9", "AUX"], avis: ["avis", "\u65CF\u540D", "\u9ECE\u535A\u5229\u65CF", "AVI"], bathal: ["bathal", "\u5F62\u5BB9\u8BCD", "\u6DF1\u7684", "\u2014"], bib: ["bib", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u559D", "BIB"], bilis: ["bilis", "\u52A8\u8BCD", "\u80C6", "\u2014"], bovus: ["bovus", "\u65CF\u540D", "\u666E\u7C73\u970D\u65CF", "BOV"], bradypus: ["bradypus", "\u52A8\u7269\u540D", "\u6811\u61D2", "BRA"], cada: ["cada", "\u540D\u8BCD", "\u5760\u843D\u7684\u7ED3\u679C", "\u2014"], canis: ["canis", "\u65CF\u540D", "\u574E\u90A3\u65AF\u65CF", "CAN"], cap: ["cap", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u62FF\u3001\u53D6", "CAP"], catus: ["catus", "\u52A8\u7269\u540D", "\u732B", "CAT"], causa: ["causa", "\u52A8\u8BCD", "\u7F18\u6545\u3001\u7406\u7531", "CAU"], celer: ["celer", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u8FC5\u6377", "celer"], censura: ["censura", "\u540D\u8BCD", "\u76D1\u5BDF\u4E4B\u672F", "\u2014"], centaurus: ["centaurus", "\u65CF\u540D", "\u534A\u4EBA\u9A6C\u65CF", "CEN"], ceratus: ["ceratus", "\u65CF\u540D", "\u8D5B\u62C9\u6258\u65CF", "CER"], cervus: ["cervus", "\u52A8\u7269\u540D", "\u9E7F", "CRV"], chelys: ["chelys", "\u52A8\u7269\u540D", "\u9F9F", "CHE"], chimera: ["chimera", "\u65CF\u540D", "\u5947\u7F8E\u62C9", "CHI"], cib: ["cib", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u98DF\u7269", "CIB"], cisterna: ["cisterna", "\u540D\u8BCD", "\u84C4\u6C34\u6C60", "\u2014"], cisternal: ["cisternal", "\u5F62\u5BB9\u8BCD", "\u5C5E\u4E8E\u84C4\u6C34\u6C60\u7684", "\u2014"], clar: ["clar", "\u526F\u8BCD", "\u660E", "\u2014"], cld: ["cld", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u5173\u95ED", "CLD"], clv: ["clv", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u94A5\u5319", "CLV"], cobalus: ["cobalus", "\u65CF\u540D", "\u5730\u7CBE\u65CF", "COB"], consta: ["consta", "\u9650\u5B9A\u8BCD", "\u5E38\u6570\uFF1A**\u5199\u5165\u540E\u4E0D\u53EF\u518D\u8D4B\u503C**\uFF08\u6CBF\u7528\u8BCD\u6839\u8868\u300C\u5E38\u6570\u300D\u7684\u539F\u5F62\uFF09", "cns"], covidis: ["covidis", "\u52A8\u8BCD", "\u5171\u770B", "\u2014"], crocuta: ["crocuta", "\u52A8\u7269\u540D", "\u9B23\u72D7", "CRO"], cuniculus: ["cuniculus", "\u65CF\u540D", "\u5361\u7279\u65AF\u65CF", "CUN"], cur: ["cur", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u8DD1", "CUR"], daemon: ["daemon", "\u65CF\u540D", "\u8428\u5361\u5179\u65CF", "DAE"], de: ["de", "\u4ECB\u8BCD", "\u5728\u2026\u2026\u4E4B\u5185", "dex"], deb: ["deb", "\u52A9\u52A8\u8BCD", "\u5E94\u3001\u8BE5", "deb"], dec: ["dec", "\u6570\u8BCD", "\u5341", "\u2014"], delucke: ["Delucke", "\u540D\u8BCD", "\u6697\u5143\u7D20", "Duk"], densus: ["densus", "\u540D\u8BCD", "\u5BC6", "\u2014"], deu: ["deu", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u795E", "DEU"], di: ["di", "\u4ECB\u8BCD", "\u2026\u2026\u7684\u3001\u4E4B\uFF08\u9886\u5C5E\uFF09", "di"], dia: ["dia", "\u7591\u95EE\u8BCD", "\u4E3A\u4F55", "\u5224\u65AD\u5C42"], die: ["die", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u65E5\u3001\u767D\u5929", "DIE"], dies: ["dies", "\u5355\u4F4D", "\u65E5", "die"], dis: ["dis", "\u5224\u65AD\u8BCD", "\u4E92\u65A5\u6216", "dis"], diu: ["diu", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u6301\u7EED", "diu"], dom: ["dom", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u5BB6\u3001\u4F4F\u6240", "DOM"], don: ["don", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u7ED9", "DON"], dor: ["dor", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u7761", "DOR"], draco: ["draco", "\u540D\u8BCD", "\u9F99\u3001\u4E1C\u65B9\u9F99", "DRA"], dracon: ["dracon", "\u65CF\u540D", "\u5FB7\u62C9\u514B\u65CF", "DRAk"], dum: ["dum", "\u5224\u65AD\u8BCD", "\u53EA\u8981", "dum"], dur: ["dur", "\u52A9\u52A8\u8BCD", "\u6301\u7EED\u4F53", "dur"], earthe: ["Earthe", "\u540D\u8BCD", "\u5730\u5143\u7D20", "Ert"], edi: ["edi", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u5403", "EDI"], ege: ["ege", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u9700\u8981", "EGE"], eidolon: ["eidolon", "\u65CF\u540D", "\u5E7D\u7075\u65CF", "EID"], eksul: ["eksul", "\u65CF\u540D", "\u963F\u7EB3\u8428\u65CF", "EKS"], elafus: ["elafus", "\u65CF\u540D", "\u57C3\u62C9\u83F2\u4E9A\u65CF", "ELA"], elementa: ["elementa", "\u65CF\u540D", "\u7EAF\u7CB9\u5143\u7D20\u65CF", "ELEm"], eletribon: ["Eletribon", "\u540D\u8BCD", "\u96F7\u7535", "Elc"], end: ["end", "\u6839\u8BCD", "\u7EC8\u70B9", "END"], enn: ["enn", "\u4ECB\u8BCD", "\u5728\u2026\u2026\u91CC\u9762", "enn"], ens: ["ens", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u5B58\u5728\u8005", "ENS"], equus: ["equus", "\u65CF\u540D", "\u57C3\u594E\u4ED6\u65CF", "EQU"], ergo: ["ergo", "\u5224\u65AD\u8BCD", "\u6240\u4EE5", "erg"], es: ["es", "\u52A9\u52A8\u8BCD", "\u662F\u3001\u5B58\u5728", "ess"], eti: ["eti", "\u8FDE\u63A5\u8BCD\u4E0E\u4ECE\u53E5\u6807\u8BB0", "\u548C\u3001\u4E0E\uFF08\u5E76\u5217\u540D\u8BCD\uFF09", "ETI"], ex: ["ex", "\u6839\u8BCD", "\u5916\u3001\u8F6C\u79FB\u3001\u590D\u5236", "EXS"], exo: ["exo", "\u5224\u65AD\u8BCD", "\u5982\u679C\u2026\u2026\u90A3\u4E48\u5E94\u5F53\u2026\u2026", "exo"], expaste: ["expaste", "\u52A8\u8BCD", "\u4EA4\u6362\u3001\u514B\u9686\u3001\u590D\u5236", "EXPa"], expual: ["expual", "\u52A8\u8BCD", "\u4FDD\u5B58\u3001\u50A8\u5B58", "EXPu"], extra: ["extra", "\u540D\u8BCD", "\u5916\u4FA7", "\u2014"], extravidis: ["extravidis", "\u52A8\u8BCD", "\u5916\u770B", "\u2014"], fac: ["fac", "\u52A9\u52A8\u8BCD", "\u4F7F\u3001\u8BA9", "fac"], facil: ["facil", "\u526F\u8BCD", "\u6613", "\u2014"], false: ["false", "\u5F62\u5BB9\u8BCD", "\u9519\u8BEF\u7684\u3001\u5047\u7684", "\u2014"], fas: ["fas", "\u5224\u65AD\u8BCD", "\u8BB8\u53EF\u3001\u5408\u6CD5", "fas"], felus: ["felus", "\u65CF\u540D", "\u83F2\u6797\u65CF", "FEL"], ferrfabr: ["ferrfabr", "\u540D\u8BCD", "\u94C1\u5320", "\u2014"], ferrgnos: ["ferrgnos", "\u540D\u8BCD", "\u94C1\u5B66", "\u2014"], ferus: ["ferus", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u517D\u4EBA\uFF08\u63D0\u6848\uFF09", "FER"], flagro: ["flagro", "\u540D\u8BCD", "\u71C3\u70BD\u4E4B\u4E8B", "\u2014"], flagros: ["flagros", "\u52A8\u8BCD", "\u71C3\u70BD", "\u2014"], fliam: ["fliam", "\u540D\u8BCD", "\u708E\u5143\u7D20", "Flm"], flv: ["flv", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6CB3", "FLV"], formis: ["formis", "\u52A8\u8BCD", "\u5851\u9020", "\u2014"], fort: ["fort", "\u526F\u8BCD", "\u5F3A", "\u2014"], frag: ["frag", "\u6839\u8BCD", "\u7834\u788E\u3001\u65AD\u88C2", "FRG"], fragis: ["fragis", "\u52A8\u8BCD", "\u7834\u788E\u3001\u6253\u65AD", "FRAi"], fraglus: ["fraglus", "\u590D\u5408\u8BCD", "\u7834\u9501\u3001\u7834\u574F\u969C\u788D", "FGL"], fragor: ["fragor", "\u540D\u8BCD", "\u7834\u788E\u58F0\u3001\u6545\u969C", "FRAg"], fragus: ["fragus", "\u540D\u8BCD", "\u788E\u7247\u3001\u6B8B\u9AB8", "FRGs"], gale: ["gale", "\u52A8\u7269\u540D", "\u9F2C", "GAL"], gens: ["gens", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u65CF\u3001\u8840\u7EDF\u7FA4\u4F53", "GEN"], gigas: ["gigas", "\u65CF\u540D", "\u5DE8\u4EBA\u65CF", "GIG"], gnosarium: ["gnosarium", "\u540D\u8BCD", "\u77E5\u8BC6\u4E4B\u6240", "\u2014"], graf: ["graf", "\u91CF\u8BCD", "\u6241\u5E73\u7269\uFF08\u7EB8\uFF0F\u5E03\uFF0F\u677F\uFF09", "GRAF"], grama: ["grama", "\u6839\u8BCD", "\u91CF\u3001\u91CD", "GRA"], gramakipo: ["gramakipo", "\u540D\u8BCD", "\u91CD\u529B\u52A0\u901F\u5EA6", "GRK"], granar: ["granar", "\u5F62\u5BB9\u8BCD", "\u5C5E\u4E8E\u8C37\u7C92\u7684", "\u2014"], granarus: ["granarus", "\u540D\u8BCD", "\u8C37\u4ED3", "\u2014"], hab: ["hab", "\u52A8\u8BCD", "\u6709\u3001\u62E5\u6709", "HAB"], has: ["has", "\u65F6\u95F4\u9650\u5B9A", "\u5728\u672A\u6765", "has"], hauri: ["hauri", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u6C72\u53D6\uFF08\u81EA\u884C\u5438\u53D6\u5468\u906D\u5143\u7D20\uFF09", "hauri"], hic: ["hic", "\u6307\u79F0\u9650\u5B9A", "\u8FD9", "hic"], hippos: ["hippos", "\u52A8\u7269\u540D", "\u9A6C", "HIP"], ho: ["ho", "\u6839\u8BCD", "\u5BB6\u3001\u805A\u3001\u5E87\u62A4", "HOM"], hopas: ["hopas", "\u540D\u8BCD", "\u8425\u5730\u3001\u4F11\u606F\u5904\u3001\u5E7F\u573A", "HOP"], hora: ["hora", "\u5355\u4F4D", "\u5C0F\u65F6", "hor"], hos: ["hos", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u654C\u4EBA", "HOS"], humal: ["humal", "\u5F62\u5BB9\u8BCD", "\u5C5E\u4E8E\u6E7F\u7684", "\u2014"], humaniforma: ["humaniforma", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u4EBA\u5F62\u3001\u7C7B\u4EBA", "HMF"], humanus: ["humanus", "\u65CF\u540D", "\u81EA\u7136\u4EBA", "HUM"], hyaena: ["hyaena", "\u65CF\u540D", "\u745E\u67CF\u5DF4\u65CF", "HYA"], iam: ["iam", "\u65F6\u95F4\u9650\u5B9A", "\u5DF2\u7ECF", "iam"], id: ["id", "\u4EE3\u8BCD\uFF08\u4EBA\u79F0\uFF09", "\u5B83", "id"], idem: ["idem", "\u6307\u79F0\u9650\u5B9A", "\u540C\u4E00", "ide"], ikh: ["ikh", "\u91CF\u8BCD", "\u9C7C\u3001\u86C7\u3001\u957F\u6761\u7269", "IKH"], il: ["il", "\u4EE3\u8BCD\uFF08\u4EBA\u79F0\uFF09", "\u4ED6\uFF0F\u5979", "il"], ille: ["ille", "\u6307\u79F0\u9650\u5B9A", "\u90A3", "ill"], inc: ["inc", "\u52A9\u52A8\u8BCD", "\u5F00\u59CB\u4F53", "inc"], inse: ["inse", "\u91CF\u8BCD", "\u866B\u8C78", "INSE"], inter: ["inter", "\u5F62\u5BB9\u8BCD", "\u5C5E\u4E8E\u6BC1\u706D\u7684", "\u2014"], intra: ["intra", "\u4ECB\u8BCD", "\u8FDB\u5165\u3001\u5728\u2026\u2026\u4E4B\u5185", "\u2014"], ipse: ["ipse", "\u6307\u79F0\u9650\u5B9A", "\u81EA\u8EAB", "ips"], iri: ["iri", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u53BB\u3001\u8D70", "IRI"], iter: ["iter", "\u52A9\u52A8\u8BCD", "\u91CD\u590D\u4F53", "iter"], ka: ["ka", "\u8FDE\u63A5\u8BCD\u4E0E\u4ECE\u53E5\u6807\u8BB0", "\u9648\u8FF0\u4ECE\u53E5\u6807\u8BB0\uFF08that\uFF09\u2014\u2014\u5F00", "ka"], kair: ["kair", "\u91CF\u8BCD", "\u6B21\u6570\u3001\u4E8B\u4EF6", "KAIR"], kap: ["kap", "\u91CF\u8BCD", "\u8D70\u517D\u3001\u9F99", "KAPA"], kapra: ["kapra", "\u65CF\u540D", "\u5361\u666E\u91CC\u5C3C\u65CF", "KAP"], kaus: ["kaus", "\u5224\u65AD\u8BCD", "\u56E0\u4E3A", "kau"], keal: ["keal", "\u5224\u65AD\u8BCD", "\u5982\u679C\u2026\u2026", "kea"], keol: ["keol", "\u5224\u65AD\u8BCD", "\u5426\u5219\u5982\u679C\u2026\u2026", "keo"], ker: ["ker", "\u91CF\u8BCD", "\u5668\u7269\u3001\u5DE5\u5177", "KER"], ki: ["ki", "\u8FDE\u63A5\u8BCD\u4E0E\u4ECE\u53E5\u6807\u8BB0", "\u4ECE\u53E5\u95ED\u5408\u8BCD\u2014\u2014\u95ED\uFF08\u540E\u5F00\u5148\u95ED\uFF09", "ki"], kigrama: ["kigrama", "\u5355\u4F4D", "\u5343\u514B\uFF08\u8D28\u91CF\uFF09", "kig"], kipo: ["kipo", "\u6839\u8BCD", "\u52A8\u3001\u52A0\u901F", "KIP"], kon: ["kon", "\u5224\u65AD\u8BCD", "\u5E76\u4E14\u3001\u5408\u53D6", "kon"], kor: ["kor", "\u91CF\u8BCD", "\u6709\u7075\u8005\uFF08\u4EBA\uFF0F\u795E\uFF0F\u65CF\uFF09", "KOR"], krokodilus: ["krokodilus", "\u65CF\u540D", "\u963F\u8FBE\u514B\u5229\u65AF\u65CF", "KRO"], ku: ["ku", "\u8FDE\u63A5\u8BCD\u4E0E\u4ECE\u53E5\u6807\u8BB0", "\u5173\u7CFB\u4ECE\u53E5\u6807\u8BB0\uFF08\u2026\u2026\u7684\uFF09\u2014\u2014\u5F00", "ku"], kyklops: ["kyklops", "\u65CF\u540D", "\u72EC\u773C\u5DE8\u4EBA\u65CF", "KYK"], kylin: ["kylin", "\u65CF\u540D", "\u9E92\u9E9F\u65CF", "KYL"], kyon: ["kyon", "\u52A8\u7269\u540D", "\u72AC", "KYO"], lacerta: ["lacerta", "\u52A8\u7269\u540D", "\u8725\u8734", "LAC"], lalupid: ["lalupid", "\u540D\u8BCD", "\u7565\u77F3\u6599", "\u2014"], lapidarius: ["lapidarius", "\u540D\u8BCD", "\u77F3\u6599\u8005", "\u2014"], lapidat: ["lapidat", "\u5F62\u5BB9\u8BCD", "\u5177\u6709\u77F3\u6599\u7684", "\u2014"], lapidiformis: ["lapidiformis", "\u5F62\u5BB9\u8BCD", "\u77F3\u6599\u5F62", "\u2014"], lapidulus: ["lapidulus", "\u540D\u8BCD", "\u5C0F\u77F3\u6599", "\u2014"], lapsis: ["lapsis", "\u52A8\u8BCD", "\u6ED1\u843D", "\u2014"], latus: ["latus", "\u540D\u8BCD", "\u4FA7", "\u2014"], lent: ["lent", "\u526F\u8BCD", "\u6162", "\u2014"], leo: ["leo", "\u52A8\u7269\u540D", "\u72EE", "LEO"], leon: ["leon", "\u65CF\u540D", "\u963F\u65AF\u5170\u65CF", "LEOn"], lepus: ["lepus", "\u52A8\u7269\u540D", "\u5154", "LEP"], les: ["les", "\u4EE3\u8BCD\uFF08\u4EBA\u79F0\uFF09", "\u4ED6\u4EEC", "les"], lic: ["lic", "\u52A9\u52A8\u8BCD", "\u53EF\u3001\u5141\u8BB8", "lic"], lignfabr: ["lignfabr", "\u540D\u8BCD", "\u6728\u5320", "\u2014"], limit: ["limit", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u9650\u5236\uFF08\u51C6\u5165\u6761\u4EF6\uFF09\uFF1B\u4F5C\u7B5B\u9009\u952E\u65F6\u662F\u300C\u53D6\u524D\u51E0\u4E2A\u300D", "limit"], loc: ["loc", "\u6839\u8BCD", "\u5730\u70B9\u3001\u653E\u7F6E", "LOC"], locis: ["locis", "\u52A8\u8BCD", "\u653E\u7F6E\u3001\u5B9A\u4F4D", "LOCi"], locor: ["locor", "\u540D\u8BCD", "\u5B9A\u4F4D\u5668\u3001\u653E\u7F6E\u8005", "LOCr"], locus: ["locus", "\u540D\u8BCD", "\u5730\u70B9\u3001\u4F4D\u7F6E", "LOCs"], loczone: ["loczone", "\u590D\u5408\u8BCD", "\u5B9A\u4F4D\u533A\u57DF", "LCZ"], loq: ["loq", "\u6839\u8BCD", "\u8BF4\u3001\u8BED\u8A00", "LOQ"], loqis: ["loqis", "\u52A8\u8BCD", "\u8BF4\u3001\u8BB2\u8FF0", "LOQi"], loqnavi: ["loqnavi", "\u590D\u5408\u8BCD", "\u547D\u4EE4\u3001\u5492\u8BED\u5F15\u5BFC", "LQN"], loqor: ["loqor", "\u540D\u8BCD", "\u8BF4\u8BDD\u8005\u3001\u8BB2\u8FF0\u8005", "LOQr"], loqus: ["loqus", "\u540D\u8BCD", "\u8BED\u8A00\u3001\u8BDD\u8BED", "LOQs"], lumena: ["lumena", "\u540D\u8BCD", "\u5149\u5143\u7D20", "Lum"], lumenal: ["lumenal", "\u5F62\u5BB9\u8BCD", "\u5C5E\u4E8E\u5FAE\u5149\u7684", "\u2014"], lupus: ["lupus", "\u65CF\u540D", "\u9C81\u73C0\u65CF", "LUP"], lus: ["lus", "\u6839\u8BCD", "\u51FB\u3001\u963B\u3001\u9501", "LUS"], luss: ["luss", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u9501\u5165\uFF08\u80FD\u91CF\uFF09", "luss"], lykos: ["lykos", "\u52A8\u7269\u540D", "\u72FC", "LYK"], machina: ["machina", "\u65CF\u540D", "\u673A\u68B0\u65CF", "MAC"], magis: ["magis", "\u7A0B\u5EA6\u9650\u5B9A", "\u66F4", "mag"], magism: ["magism", "\u540D\u8BCD", "\u9B54\u6CD5\u4E3B\u4E49", "\u2014"], magnal: ["magnal", "\u5F62\u5BB9\u8BCD", "\u5927\u7684", "\u2014"], mana: ["mana", "\u540D\u8BCD", "\u4FDD\u6301\u7684\u7ED3\u679C", "\u2014"], manis: ["manis", "\u52A8\u8BCD", "\u4FDD\u6301", "\u2014"], mantika: ["mantika", "\u65CF\u540D", "\u66FC\u63D0\u67EF\u65CF", "MTK"], mantis: ["mantis", "\u52A8\u7269\u540D", "\u87B3\u8782", "MAN"], manu: ["manu", "\u540D\u8BCD", "\u624B", "\u2014"], mar: ["mar", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6D77", "MAR"], marvia: ["marvia", "\u540D\u8BCD", "\u6D77\u8DEF", "\u2014"], max: ["max", "\u7A0B\u5EA6\u9650\u5B9A", "\u6700", "max"], mem: ["mem", "\u6839\u8BCD", "\u8BB0\u5FC6\u3001\u5FC3\u667A", "MEM"], memexpual: ["memexpual", "\u590D\u5408\u8BCD", "\u4FDD\u5B58\u8BB0\u5FC6", "MEX"], memis: ["memis", "\u52A8\u8BCD", "\u8BB0\u5FC6\u3001\u56DE\u5FC6", "MEMi"], memor: ["memor", "\u540D\u8BCD", "\u8BB0\u5FC6\u3001\u5FC3\u667A", "MEMr"], memoria: ["memoria", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u8BB0\u5FC6", "MEMo"], memus: ["memus", "\u540D\u8BCD", "\u601D\u60F3\u3001\u5FF5\u5934", "MEMs"], metos: ["metos", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u5BF9\u8C61\u3001\u76EE\u6807\uFF08\u672F\u5F0F\u7684\u76EE\u6807\u9879\uFF09", "metos"], mgi: ["mgi", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u9B54\u6CD5", "MGI"], mi: ["mi", "\u4EE3\u8BCD\uFF08\u4EBA\u79F0\uFF09", "\u6211", "mi"], min: ["min", "\u7A0B\u5EA6\u9650\u5B9A", "\u6700\u4E0D", "min"], minas: ["minas", "\u5355\u4F4D", "\u5206\uFF08\u949F\uFF09", "min"], minus: ["minus", "\u7A0B\u5EA6\u9650\u5B9A", "\u66F4\u5C11\u3001\u8F83\u4E0D", "mns"], mis: ["mis", "\u65F6\u95F4\u9650\u5B9A", "\u73B0\u5728", "mis"], miteas: ["Miteas", "\u540D\u8BCD", "\u7C73\u3001\u8BA1\u91CF\u5355\u4F4D", "MIT"], mo: ["mo", "\u91CF\u8BCD", "\u98DF\u7269\u4E00\u4EFD", "MO"], mon: ["mon", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u5C71", "MON"], mort: ["mort", "\u6839\u8BCD", "\u6B7B\u3001\u6D88\u4EA1", "MOR"], mortis: ["mortis", "\u52A8\u8BCD", "\u6B7B\u3001\u6D88\u4EA1", "MORi"], mortor: ["mortor", "\u540D\u8BCD", "\u6B7B\u8005\u3001\u4EA1\u7075", "MORr"], mortsiro: ["mortsiro", "\u590D\u5408\u8BCD", "\u6B7B\u4EA1\u865A\u7A7A", "MRS"], mortus: ["mortus", "\u540D\u8BCD", "\u6B7B\u4EA1", "MORs"], moschiferus: ["moschiferus", "\u52A8\u7269\u540D", "\u9E9D", "MOS"], moskus: ["moskus", "\u65CF\u540D", "\u4F9D\u7279\u62C9\u65CF", "MSK"], mov: ["mov", "\u6839\u8BCD", "\u79FB\u52A8\u3001\u63A8\u52A8", "MOV"], movis: ["movis", "\u52A8\u8BCD", "\u79FB\u52A8\u3001\u63A8\u52A8", "MOVi"], movor: ["movor", "\u540D\u8BCD", "\u63A8\u52A8\u8005\u3001\u52A8\u673A", "MOVr"], movpas: ["movpas", "\u590D\u5408\u8BCD", "\u79FB\u52A8\u573A\u3001\u4F20\u9001\u7AD9", "MVP"], movus: ["movus", "\u540D\u8BCD", "\u8FD0\u52A8\u3001\u79FB\u52A8", "MOVs"], mox: ["mox", "\u65F6\u95F4\u9650\u5B9A", "\u5373\u5C06", "mox"], mult: ["mult", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u591A", "mul"], mus: ["mus", "\u52A8\u7269\u540D", "\u9F20", "MUS"], mustela: ["mustela", "\u65CF\u540D", "\u963F\u7EB3\u7F07\u65CF", "MST"], nanus: ["nanus", "\u65CF\u540D", "\u675C\u6797\u65CF", "NAN"], nat: ["nat", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6E38\u6CF3", "NAT"], navi: ["navi", "\u6839\u8BCD", "\u8DEF\u5F84\u3001\u5F15\u5BFC", "NVI"], navis: ["navis", "\u52A8\u8BCD", "\u5F15\u5BFC\u3001\u91CA\u653E\u3001\u89E3\u9501", "NAV"], nca: ["nca", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6740", "NCA"], ne: ["ne", "\u52A9\u52A8\u8BCD", "\u4E0D\u3001\u76F8\u53CD", "neg"], nec: ["nec", "\u52A9\u52A8\u8BCD", "\u5FC5\u987B", "nec"], nefas: ["nefas", "\u5224\u65AD\u8BCD", "\u7981\u5FCC\u3001\u4E0D\u5408\u6CD5", "nef"], nevidis: ["nevidis", "\u52A8\u8BCD", "\u4E0D\u770B", "\u2014"], nimis: ["nimis", "\u6570\u8BCD", "\u8FC7\u5EA6", "\u2014"], nisi: ["nisi", "\u5224\u65AD\u8BCD", "\u9664\u975E", "nis"], no: ["no", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u5426", "Ey"], nos: ["nos", "\u4EE3\u8BCD\uFF08\u4EBA\u79F0\uFF09", "\u6211\u4EEC", "nos"], nox: ["nox", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u591C", "NOX"], nuetrue: ["Nuetrue", "\u540D\u8BCD", "\u81EA\u7136\u5143\u7D20", "Nut"], nul: ["nul", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u65E0", "nul"], nun: ["nun", "\u65F6\u95F4\u9650\u5B9A", "\u4ECE\u4E0D", "nun"], nympha: ["nympha", "\u65CF\u540D", "\u5B81\u8299\u65CF", "NYM"], om: ["om", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u5168\u90E8\u3001\u6574\u4F53", "omn"], oni: ["oni", "\u65CF\u540D", "\u9B3C\u65CF", "ONI"], ophis: ["ophis", "\u52A8\u7269\u540D", "\u86C7", "OPH"], oppes: ["oppes", "\u52A8\u8BCD", "\u7B49\u5F85", "\u2014"], ord: ["ord", "\u4ECB\u8BCD", "\u4ECE\u3001\u6E90\u81EA", "ord"], ose: ["ose", "\u6839\u8BCD", "\u5F00\u59CB", "OSE"], pag: ["pag", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6751\u5E84", "PAG"], parasevictom: ["Parasevictom", "\u5730\u7406 \xB7 \u795E\u5BAB \xB7 \u8D27\u5E01\u4E13\u540D", "\u5E15\u62C9\u65AF\u7EF4\u767B", "\u533A\u57DF"], pardalis: ["pardalis", "\u52A8\u7269\u540D", "\u8C79", "PAR"], part: ["part", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u90E8\u5206", "prt"], parum: ["parum", "\u6570\u8BCD", "\u592A\u5C11", "\u2014"], pas: ["pas", "\u6839\u8BCD", "\u573A\u3001\u7ACB\u3001\u505C\u7559", "PAS"], pauc: ["pauc", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u5C11", "pau"], paulum: ["paulum", "\u6570\u8BCD", "\u5C11\u8BB8", "\u2014"], per: ["per", "\u52A9\u52A8\u8BCD", "\u5B8C\u6210\u4F53", "per"], petasus: ["petasus", "\u540D\u8BCD", "\u5E3D", "\u2014"], pho: ["pho", "\u91CF\u8BCD", "\u8349\u6728", "PHO"], phyton: ["phyton", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u690D\u7269\u3001\u83CC", "PHY"], pilosa: ["pilosa", "\u65CF\u540D", "\u76AE\u6D1B\u8428\u65CF", "PIL"], plur: ["plur", "\u52A8\u8BCD", "\u51C0\u5316", "PLU"], pluvus: ["pluvus", "\u540D\u8BCD", "\u96E8", "\u2014"], plv: ["plv", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u96E8", "PLV"], pna: ["pna", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u4EBA\u3001\u4E2A\u4F53", "PNA"], poi: ["poi", "\u7591\u95EE\u8BCD", "\u54EA\u4E2A", "\u4FEE\u9970\u4F4D"], pondus: ["pondus", "\u5355\u4F4D", "\u91CD\u91CF\uFF08\u4E0E\u8D28\u91CF\u76F8\u5BF9\uFF09", "pon"], pop: ["pop", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u4EBA\u6C11\u3001\u4EBA\u7FA4", "POP"], por: ["por", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u95E8", "POR"], pos: ["pos", "\u7591\u95EE\u8BCD", "\u5982\u4F55", "\u65B9\u5F0F\u5C42"], poso: ["poso", "\u7591\u95EE\u8BCD", "\u591A\u5C11", "\u6570\u91CF\u4F4D"], post: ["post", "\u65F6\u95F4\u9650\u5B9A", "\u4E4B\u540E", "pos"], pot: ["pot", "\u52A9\u52A8\u8BCD", "\u80FD\u3001\u53EF\u4EE5", "pot"], pote: ["pote", "\u7591\u95EE\u8BCD", "\u4F55\u65F6", "\u9650\u5B9A\u5C42"], praevidis: ["praevidis", "\u52A8\u8BCD", "\u9884\u770B", "\u2014"], prc: ["prc", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u5371\u9669", "PRC"], pre: ["pre", "\u65F6\u95F4\u9650\u5B9A", "\u4E4B\u524D", "pre"], pretium: ["pretium", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u4EE3\u4EF7\uFF08\u672F\u5F0F\u7684\u4ED8\u51FA\uFF09", "pretium"], prim: ["prim", "\u987A\u5E8F\u9650\u5B9A", "\u7B2C\u4E00\u3001\u9996\u5148", "pri"], prior: ["prior", "\u987A\u5E8F\u9650\u5B9A", "\u524D\u4E00\u4E2A", "pir"], priv: ["priv", "\u9650\u5B9A\u8BCD", "\u79C1\u6709\uFF1A\u53EA\u5728**\u5F53\u524D\u8BED\u5757**\u5185\u53EF\u89C1\uFF0C\u51FA\u5757\u5373\u4E0D\u53EF\u89C1", "prv"], prn: ["prn", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u7236\u6BCD\u3001\u4EB2\u4EE3", "PRN"], pro: ["pro", "\u4ECB\u8BCD", "\u671D\u5411\u3001\u5411\u3001\u4E3A\u4E86", "pro"], providis: ["providis", "\u52A8\u8BCD", "\u524D\u770B", "\u2014"], prox: ["prox", "\u987A\u5E8F\u9650\u5B9A", "\u4E0B\u4E00\u4E2A", "prx"], pte: ["pte", "\u91CF\u8BCD", "\u98DE\u79BD", "PTE"], pu: ["pu", "\u7591\u95EE\u8BCD", "\u54EA\u91CC", "\u8865\u8BED\u4F4D"], publ: ["publ", "\u9650\u5B9A\u8BCD", "\u516C\u5F00\uFF1A**\u6574\u4E2A\u672F\u5F0F**\u5185\u53EF\u89C1\uFF0C\u53EF\u8DE8\u5757\u4F7F\u7528", "pbl"], pue: ["pue", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u5B69\u5B50", "PUE"], pug: ["pug", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6218\u6597", "PUG"], pumilio: ["pumilio", "\u65CF\u540D", "\u4F8F\u5112\u65CF", "PUM"], purus: ["purus", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u7EAF\u8840\u7684", "PUR"], quadr: ["quadr", "\u6570\u8BCD", "\u56DB", "\u2014"], quan: ["quan", "\u5224\u65AD\u8BCD", "\u65E0\u8BBA", "qua"], qudend: ["qudend", "\u540D\u8BCD", "\u7ED3\u675F\u3001\u7EC8\u70B9", "QUD"], quinq: ["quinq", "\u6570\u8BCD", "\u4E94", "\u2014"], quis: ["quis", "\u6307\u79F0\u9650\u5B9A", "\u54EA\u4E2A", "qui"], quot: ["quot", "\u6307\u79F0\u9650\u5B9A", "\u591A\u5C11", "quo"], rana: ["rana", "\u52A8\u7269\u540D", "\u86D9", "RAN"], rase: ["rase", "\u5224\u65AD\u8BCD", "\u6709\u4E00\u771F\u5219\u4E3A\u771F", "ras"], rattus: ["rattus", "\u65CF\u540D", "\u624E\u62C9\u514B\u65CF", "RAT"], re: ["re", "\u5224\u65AD\u8BCD", "\u662F\u5426\u771F\u6216\u5047", "req"], rea: ["rea", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u8FD4\u56DE\u5730\u5740\uFF08\u672F\u5F0F\u8F93\u51FA\uFF09", "\u2014"], redi: ["redi", "\u6839\u8BCD", "\u56DE\u3001\u518D\u3001\u505C", "RED"], ren: ["ren", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u8FD4\u56DE\u6570\u5B57\uFF08\u672F\u5F0F\u8F93\u51FA\uFF09", "\u2014"], res: ["res", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u4E8B\u7269", "RES"], restas: ["restas", "\u52A8\u8BCD", "\u91CD\u7ACB", "\u2014"], retase: ["retase", "\u52A8\u8BCD", "\u4F11\u606F\u3001 \u505C\u6B62\u3001\u91CD\u7F6E", "RET"], retrovidis: ["retrovidis", "\u52A8\u8BCD", "\u56DE\u770B", "\u2014"], revidis: ["revidis", "\u52A8\u8BCD", "\u91CD\u770B", "\u2014"], rex: ["rex", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u738B", "REX"], rinoceros: ["rinoceros", "\u52A8\u7269\u540D", "\u7280\u725B", "RIN"], rok: ["rok", "\u91CF\u8BCD", "\u5757\u72B6\u786C\u7269\uFF08\u77F3\uFF0F\u91D1\uFF09", "ROK"], root: ["root", "\u6839\u8BCD", "\u62BD\u8C61\u4E49", "abbr"], ros: ["ros", "\u65F6\u95F4\u9650\u5B9A", "\u5728\u53E4\u4EE3\u3001\u8FC7\u53BB", "ros"], salamandra: ["salamandra", "\u52A8\u7269\u540D", "\u877E\u8788", "SAL"], san: ["san", "\u6839\u8BCD", "\u6CBB\u6108\u3001\u4FEE\u590D", "SAN"], sanaqua: ["sanaqua", "\u590D\u5408\u8BCD", "\u6CBB\u6108\u4E4B\u6C34\u3001\u5723\u6C34", "SNQ"], sanarium: ["sanarium", "\u540D\u8BCD", "\u6CBB\u6108\u4E4B\u6240", "\u2014"], sands: ["sands", "\u5355\u4F4D", "\u79D2", "san"], sanguis: ["sanguis", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u8840\u7EDF\u3001\u8840\u7F18", "SNG"], sanis: ["sanis", "\u52A8\u8BCD", "\u6CBB\u6108\u3001\u4FEE\u590D", "SANi"], sanor: ["sanor", "\u540D\u8BCD", "\u6CBB\u7597\u8005\u3001\u4FEE\u590D\u8005", "SANr"], sanus: ["sanus", "\u540D\u8BCD", "\u5065\u5EB7\u3001\u6CBB\u6108", "SANs"], sartose: ["sartose", "\u540D\u8BCD", "\u5F00\u59CB\u3001\u8D77\u70B9", "SAR"], saura: ["saura", "\u65CF\u540D", "\u8428\u5F17\u62C9\u65CF", "SAU"], sci: ["sci", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u77E5\u9053", "SCI"], se: ["se", "\u52A9\u52A8\u8BCD", "\u88AB\u3001\u53CD\u8EAB", "se"], secis: ["secis", "\u52A8\u8BCD", "\u5207", "\u2014"], selinge: ["Selinge", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u552F\u4E00\u4E00\u4E2A", "sel"], sem: ["sem", "\u65F6\u95F4\u9650\u5B9A", "\u603B\u662F", "sem"], semi: ["semi", "\u540D\u8BCD", "\u534A", "\u2014"], semihumanus: ["semihumanus", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u534A\u4EBA\uFF08\u63D0\u6848\uFF09", "SEMh"], sensus: ["sensus", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u611F\u5B98", "SEN"], sept: ["sept", "\u6570\u8BCD", "\u4E03", "\u2014"], serpens: ["serpens", "\u65CF\u540D", "\u6590\u8FEA\u4E9A\u65CF", "SER"], sicus: ["sicus", "\u540D\u8BCD", "\u5E72\u71E5", "\u2014"], sil: ["sil", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u68EE\u6797", "SIL"], silvzone: ["silvzone", "\u540D\u8BCD", "\u68EE\u6797\u533A", "\u2014"], simul: ["simul", "\u65F6\u95F4\u9650\u5B9A", "\u540C\u65F6", "sim"], sirena: ["sirena", "\u65CF\u540D", "\u4EBA\u9C7C\u65CF", "SRN"], siro: ["siro", "\u540D\u8BCD", "\u865A\u7A7A", "SIR"], ske: ["ske", "\u5224\u65AD\u8BCD", "\u53CD\u4E8B\u5B9E\u5982\u679C", "ske"], skeletus: ["skeletus", "\u65CF\u540D", "\u9AB8\u9AA8\u65CF", "SKEl"], sol: ["sol", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u4EC5\u3001\u53EA", "sol"], solum: ["solum", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u72EC\u7ACB\uFF08\u4E0D\u4F9D\u8D56\u65BD\u672F\u8005\uFF09", "solum"], sombra: ["sombra", "\u526F\u8BCD", "\u6697", "\u2014"], souchos: ["souchos", "\u52A8\u7269\u540D", "\u9CC4", "SOU"], sta: ["sta", "\u540D\u8BCD", "\u7ACB\u4E4B\u4E8B", "\u2014"], stas: ["stas", "\u52A8\u8BCD", "\u7ACB", "\u2014"], sterus: ["sterus", "\u540D\u8BCD", "\u7CAA\u80A5", "\u2014"], stru: ["stru", "\u6839\u8BCD", "\u5EFA\u9020\u3001\u7ED3\u6784", "STR"], strua: ["strua", "\u540D\u8BCD", "\u5EFA\u7B51\u3001\u7ED3\u6784", "STRa"], struhopas: ["struhopas", "\u590D\u5408\u8BCD", "\u5EFA\u9020\u8425\u5730", "STH"], struis: ["struis", "\u52A8\u8BCD", "\u5EFA\u9020\u3001\u6784\u9020", "STRi"], struor: ["struor", "\u540D\u8BCD", "\u5EFA\u9020\u8005", "STRu"], sub: ["sub", "\u4ECB\u8BCD", "\u5728\u2026\u2026\u4E4B\u4E0B", "sub"], subumanus: ["subumanus", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u4E9A\u4EBA\uFF08\u63D0\u6848\uFF09", "SUB"], supervita: ["supervita", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u9AD8\u7EA7\u751F\u547D", "SUP"], supra: ["supra", "\u4ECB\u8BCD", "\u5728\u2026\u2026\u4E4B\u4E0A", "sup"], tac: ["tac", "\u526F\u8BCD", "\u9759", "\u2014"], tallse: ["tallse", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u6BCF\u4E00\u4E2A\u3001\u6240\u6709", "tal"], tam: ["tam", "\u5224\u65AD\u8BCD", "\u5F53\u2026\u2026\u65F6", "tam"], tauros: ["tauros", "\u52A8\u7269\u540D", "\u725B", "TAU"], telekinus: ["telekinus", "\u65CF\u540D", "\u5FF5\u52A8\u529B\u65CF", "TEL"], tem: ["tem", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u65F6\u95F4", "TEM"], testudo: ["testudo", "\u65CF\u540D", "\u7279\u65AF\u56FE\u6258\u65CF", "TES"], ti: ["ti", "\u7591\u95EE\u8BCD", "\u4EC0\u4E48", "\u540D\u8BCD\u4F4D"], tikaz: ["tikaz", "\u65CF\u540D", "\u63D0\u5361\u5179\u65CF", "TIK"], tis: ["tis", "\u7591\u95EE\u8BCD", "\u8C01", "\u540D\u8BCD\u4F4D"], tmp: ["tmp", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u98CE\u66B4", "TMP"], top: ["top", "\u91CF\u8BCD", "\u5730\u70B9", "TOP"], tot: ["tot", "\u6570\u91CF\u4E0E\u8303\u56F4\u9650\u5B9A", "\u6574\u4E2A", "tot"], tragos: ["tragos", "\u52A8\u7269\u540D", "\u5C71\u7F8A", "TRA"], transividis: ["transividis", "\u52A8\u8BCD", "\u900F\u770B", "\u2014"], tri: ["tri", "\u6570\u8BCD", "\u4E09", "\u2014"], tribelus: ["tribelus", "\u540D\u8BCD", "\u8131\u7C92\u5668", "\u2014"], trituris: ["trituris", "\u52A8\u8BCD", "\u8131\u7C92", "\u2014"], true: ["true", "\u5F62\u5BB9\u8BCD", "\u771F\u5B9E\u7684\u3001\u771F\u7684", "\u2014"], tu: ["tu", "\u4EE3\u8BCD\uFF08\u4EBA\u79F0\uFF09", "\u4F60", "tu"], tut: ["tut", "\u9650\u5B9A\u8BCD", "\u53D7\u62A4\uFF1A**\u672C\u8BED\u5757\u53CA\u5176\u5B50\u5757**\u53EF\u89C1\uFF0C\u5916\u5C42\u4E0D\u53EF\u89C1", "tut"], ultim: ["ultim", "\u987A\u5E8F\u9650\u5B9A", "\u6700\u540E", "ult"], umbra: ["umbra", "\u65CF\u540D", "\u6CD5\u6D85\u5170\u65CF", "UMB"], urb: ["urb", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u57CE\u5E02", "URB"], ursus: ["ursus", "\u65CF\u540D", "\u4E4C\u8428\u65AF\u65CF", "URS"], vados: ["vados", "\u52A8\u8BCD", "\u884C\u8D70", "\u2014"], vadosal: ["vadosal", "\u5F62\u5BB9\u8BCD", "\u6D45\u7684", "\u2014"], valde: ["valde", "\u7A0B\u5EA6\u9650\u5B9A", "\u5F88\u3001\u975E\u5E38", "val"], vat: ["vat", "\u91CF\u8BCD", "\u5BB9\u5668\u4E0E\u6DB2\u4F53", "VAT"], vel: ["vel", "\u526F\u8BCD", "\u5FEB", "\u2014"], velut: ["velut", "\u4ECB\u8BCD", "\u5982\u3001\u4F3C\uFF08\u660E\u55BB\uFF09", "vel"], ven: ["ven", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u6765", "VEN"], venis: ["venis", "\u540D\u8BCD", "\u6765\uFF08\u52A8\uFF09", "\u2014"], ventil: ["ventil", "\u5F62\u5BB9\u8BCD", "\u6613\u98CE\u7684", "\u2014"], ventilis: ["ventilis", "\u52A8\u8BCD", "\u626C\u8C37", "\u2014"], verb: ["verb", "\u91CF\u8BCD", "\u8A00\u8BED\u3001\u6587\u5B57", "VERb"], vernus: ["vernus", "\u540D\u8BCD", "\u6625", "\u2014"], vero: ["vero", "\u5224\u65AD\u8BCD", "\u786E\u5B9E\u3001\u5F3A\u8C03\u771F", "vro"], versipellis: ["versipellis", "\u65CF\u540D", "\u72FC\u4EBA\u65CF", "VER"], vespus: ["vespus", "\u540D\u8BCD", "\u508D\u665A", "\u2014"], vet: ["vet", "\u52A9\u52A8\u8BCD", "\u7981\u6B62", "vet"], via: ["via", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u8DEF\u3001\u9053\u8DEF", "VIA"], vid: ["vid", "\u6839\u8BCD", "\u770B\u3001\u89C1\u3001\u89C2\u5BDF", "VID"], vidal: ["vidal", "\u5F62\u5BB9\u8BCD", "\u5C5E\u4E8E\u770B\u7684", "\u2014"], vidamen: ["vidamen", "\u540D\u8BCD", "\u770B\u4E4B\u7269", "\u2014"], vidaster: ["vidaster", "\u540D\u8BCD", "\u52A3\u7B49\u770B", "\u2014"], vidax: ["vidax", "\u5F62\u5BB9\u8BCD", "\u55DC\u770B\u7684", "\u2014"], viden: ["viden", "\u526F\u8BCD", "\u4EE5\u770B\u7684\u65B9\u5F0F", "\u2014"], videsco: ["videsco", "\u52A8\u8BCD", "\u5F00\u59CB\u770B", "\u2014"], vidibilis: ["vidibilis", "\u5F62\u5BB9\u8BCD", "\u53EF\u770B\u7684", "\u2014"], vidibul: ["vidibul", "\u540D\u8BCD", "\u770B\u4E4B\u5177", "\u2014"], vidibundus: ["vidibundus", "\u5F62\u5BB9\u8BCD", "\u6B63\u770B\u7684", "\u2014"], vidifer: ["vidifer", "\u5F62\u5BB9\u8BCD", "\u5E26\u770B\u7684", "\u2014"], vidil: ["vidil", "\u5F62\u5BB9\u8BCD", "\u6613\u770B\u7684", "\u2014"], vidimentum: ["vidimentum", "\u540D\u8BCD", "\u770B\u4E4B\u624B\u6BB5", "\u2014"], vidis: ["vidis", "\u52A8\u8BCD", "\u770B\u3001\u89C2\u5BDF", "VIDi"], vidista: ["vidista", "\u540D\u8BCD", "\u770B\u5BB6", "\u2014"], viditim: ["viditim", "\u526F\u8BCD", "\u9010\u770B\u5730", "\u2014"], viditrin: ["viditrin", "\u540D\u8BCD", "\u770B\u4E4B\u6240", "\u2014"], viditrix: ["viditrix", "\u540D\u8BCD", "\u770B\u7684\u5973\u6027", "\u2014"], vidivus: ["vidivus", "\u5F62\u5BB9\u8BCD", "\u597D\u770B\u7684", "\u2014"], vidnavi: ["vidnavi", "\u590D\u5408\u8BCD", "\u89C2\u5BDF\u8DEF\u5F84", "VDN"], vidologia: ["vidologia", "\u540D\u8BCD", "\u770B\u5B66", "\u2014"], vidor: ["vidor", "\u540D\u8BCD", "\u89C2\u5BDF\u8005\u3001\u89C1\u8BC1\u8005", "VIDr"], vidorium: ["vidorium", "\u540D\u8BCD", "\u770B\u4E4B\u5668", "\u2014"], vidulent: ["vidulent", "\u5F62\u5BB9\u8BCD", "\u5BCC\u4E8E\u770B\u7684", "\u2014"], vidura: ["vidura", "\u540D\u8BCD", "\u770B\u4E4B\u672F", "\u2014"], vidus: ["vidus", "\u540D\u8BCD", "\u89C6\u89C9\u3001\u666F\u8C61", "VIDs"], vilud: ["vilud", "\u52A8\u8BCD", "\u7565\u770B", "\u2014"], vimid: ["vimid", "\u52A8\u8BCD", "\u77AC\u770B", "\u2014"], vipera: ["vipera", "\u65CF\u540D", "\u74E6\u4F0A\u51E1\u65CF", "VIP"], vis: ["vis", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u5A01\u529B", "VIS"], visid: ["visid", "\u52A8\u8BCD", "\u6781\u770B", "\u2014"], vita: ["vita", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u5BFF\u547D", "VIT"], vitad: ["vitad", "\u52A8\u8BCD", "\u53CD\u590D\u770B", "\u2014"], viv: ["viv", "\u6839\u8BCD", "\u751F\u3001\u6D3B\u3001\u751F\u547D", "VIV"], vivfliam: ["vivfliam", "\u590D\u5408\u8BCD", "\u751F\u547D\u4E4B\u706B", "VVF"], vivis: ["vivis", "\u52A8\u8BCD", "\u6D3B\u3001\u751F\u5B58", "VIVi"], vivor: ["vivor", "\u540D\u8BCD", "\u6D3B\u529B\u3001\u751F\u547D\u529B", "VIVr"], vivus: ["vivus", "\u540D\u8BCD", "\u751F\u547D\u3001\u6D3B\u4F53", "VIVs"], vla: ["vla", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u98DE", "VLA"], vol: ["vol", "\u52A9\u52A8\u8BCD", "\u613F\u3001\u8981", "vol"], voluntas: ["voluntas", "\u672F\u5F0F\u5173\u952E\u8BCD", "\u610F\u5FD7", "VOL"], vos: ["vos", "\u4EE3\u8BCD\uFF08\u4EBA\u79F0\uFF09", "\u4F60\u4EEC\uFF08\u517C\u656C\u79F0\uFF09", "vos"], vulpes: ["vulpes", "\u65CF\u540D", "\u6C83\u5C14\u73C0\u65CF", "VUL"], word: ["word", "\u91CF\u8BCD", "\u7528\u4E8E", "abbr"], wuinde: ["wuinde", "\u540D\u8BCD", "\u98CE\u5143\u7D20", "Wnd"], yes: ["yes", "\u9AD8\u9891\u8865\u5145\u8BCD", "\u662F", "Iy"], ynen: ["Ynen", "\u4ECB\u8BCD", "\u901A\u8FC7\u3001\u7531", "yne"], zone: ["zone", "\u540D\u8BCD", "\u533A\u57DF\u3001\u8303\u56F4", "ZON"], zoon: ["zoon", "\u65CF\u3001\u8840\u7EDF\u4E0E\u5206\u7C7B", "\u52A8\u7269", "ZOO"] }, generatedAt: "2026-11-16", keys: { genus: ["genus", "\u7B5B\u9009\u952E", "\u7C7B\u522B\uFF1A\u65CF\u540D\u3001\u5143\u7D20\u7801\u3001\u751F\u7269\u7C7B\uFF1B\u524D\u52A0 ne \u53D6\u53CD"], init: ["init", "\u7B5B\u9009\u952E", "\u539F\u70B9\uFF08\u53E6\u5B9A\u57FA\u51C6\uFF0C\u4E0D\u6539\u7F16\u53D1\u52A8\u4F4D\u7F6E\uFF09"], intervall: ["intervall", "\u7B5B\u9009\u952E", "\u8DDD\u79BB\u8303\u56F4\uFF0C.. \u8868\u533A\u95F4"], limit: ["limit", "\u7B5B\u9009\u952E", "\u53D6\u524D\u51E0\u4E2A"], mensura: ["mensura", "\u7B5B\u9009\u952E", "\u957F\u65B9\u4F53\u5C3A\u5BF8\uFF08\u4E09\u8F74\uFF09"], nomen: ["nomen", "\u7B5B\u9009\u952E", "\u5177\u540D\u8005"], ordin: ["ordin", "\u7B5B\u9009\u952E", "\u6392\u5E8F\uFF1Aproxim \u8FD1\uFF0Fprocul \u8FDC\uFF0Ftemer \u968F\u673A"], ratio: ["ratio", "\u7B5B\u9009\u952E", "\u6309**\u91CF\u503C\u8303\u56F4**\u7B5B\uFF08\u5A01\u529B\u3001\u7CBE\u5EA6\u7B49\u7684\u91CF\u503C\uFF09"], sigil: ["sigil", "\u7B5B\u9009\u952E", "\u5E26\u67D0\u6807\u8BB0\uFF0F\u9635\u8425\u8005"], versus: ["versus", "\u7B5B\u9009\u952E", "\u6309\u671D\u5411\u7B5B\uFF08\u4FEF\u4EF0\uFF0F\u6C34\u5E73\uFF09"] }, lexiconVersion: "1.0.0", ranks: { "4": "\u03B8 \xB7 \u5BA2\u89C2\u65F6\u95F4\uFF08\u7B2C\u56DB\u7EF4\u5EA6\uFF09", "5": "b \xB7 \u5BA2\u89C2\u5E73\u884C\u65F6\u95F4\uFF08\u7B2C\u4E94\u7EF4\u5EA6\uFF09", "6": "p_b \xB7 \u5B58\u5728\u6027\u6982\u7387\uFF08\u7B2C\u516D\u7EF4\u5EA6\uFF09", "7": "t_abs \xB7 \u7EDD\u5BF9\u5BA2\u89C2\u65F6\u95F4\uFF08\u7B2C\u4E03\u7EF4\u5EA6\uFF09", "8": "\u03BB \xB7 \u65F6\u95F4\u6D41\u901F\u7387\uFF08\u7B2C\u516B\u7EF4\u5EA6\uFF09", "9": "s \xB7 \u6240\u5728\u5B87\u5B99\u7A7A\u95F4\uFF08\u7B2C\u4E5D\u7EF4\u5EA6\uFF09", "1\u20133": "x, y, z \xB7 \u4E09\u7EF4\u7A7A\u95F4\u5143\u7EC4\uFF08\u7B2C\u4E09\u7EF4\u5EA6\uFF0C\u5360 3 \u79E9\uFF09" }, roots: { abacus: ["\u7B97\u76D8", "\u7269", "abacus"], abbas: ["\u9662\u957F", "\u7269", "abbas"], abdic: ["\u8BA9\u4F4D", "\u52A8", "abdic"], abdo: ["\u85CF\u533F", "\u52A8", "abdo"], abduc: ["\u6EAF\u56E0", "\u6027", "abduc"], abduco: ["\u5F15\u5F00", "\u52A8", "abduco"], abi: ["\u6749", "\u7269", "abi"], abici: ["\u4E22\u5F03", "\u52A8", "abici"], abiura: ["\u77E2\u53E3\u5426\u8BA4", "\u52A8", "abiura"], abject: ["\u81EA\u5F03", "\u6027", "abject"], abjur: ["\u5F03\u8A93", "\u52A8", "abjur"], ablut: ["\u76E5\u6D17", "\u52A8", "ablut"], abomin: ["\u538C\u618E", "\u6027", "abomin"], abomina: ["\u618E\u6076", "\u6027", "abomina"], abrip: ["\u593A\u53BB", "\u52A8", "abrip"], abscess: ["\u8113\u80BF", "\u7269", "abscess"], absol: ["\u7EDD\u5BF9", "\u6027", "absol"], absolut: ["\u5F00\u91CA", "\u52A8", "absolut"], absorb: ["\u5438\u6536", "\u52A8", "absorb"], abstin: ["\u514B\u5DF1", "\u6027", "abstin"], abund: ["\u4E30\u88D5", "\u6027", "abund"], abunde: ["\u4E30\u8DB3", "\u6570", "abunde"], abys: ["\u6DF1\u6E0A", "\u7269", "abys"], acad: ["\u5B66\u56ED", "\u7269", "acad"], academia: ["\u5B66\u9662", "\u7269", "academia"], acanthus: ["\u831B\u82D5\u53F6\u9970", "\u7269", "acanthus"], acce: ["\u91CD\u97F3", "\u7269", "acce"], acceler: ["\u52A0\u901F\u5EA6", "\u7269", "acceler"], accend: ["\u70B9\u71C3", "\u52A8", "accend"], accept: ["\u6536\u5165\u8D26", "\u7269", "accept"], accers: ["\u4F20\u53EC", "\u52A8", "accers"], access: ["\u6DA8\u6F6E", "\u7269", "access"], accid: ["\u5076\u6027", "\u6027", "accid"], accip: ["\u63A5\u53D7", "\u52A8", "accip"], accommod: ["\u987A\u5E94", "\u6027", "accommod"], accubi: ["\u4FA7\u5367", "\u52A8", "accubi"], accus: ["\u63A7\u544A", "\u52A8", "accus"], acer: ["\u67AB", "\u7269", "acer"], acerra: ["\u9999\u76D2", "\u7269", "acerra"], acervus: ["\u5806", "\u7269", "acervus"], acet: ["\u918B", "\u7269", "acet"], acetif: ["\u917F\u918B", "\u52A8", "acetif"], acid: ["\u9178", "\u7269", "acid"], acidit: ["\u9178\u5473", "\u52A8", "acidit"], acie: ["\u9635\u5217", "\u52A8", "acie"], acqui: ["\u53D6\u5F97", "\u52A8", "acqui"], acr: ["\u8F9B\u8FA3", "\u7269", "acr"], acrobat: ["\u6742\u6280", "\u7269", "acrobat"], acrote: ["\u5C71\u82B1\u9970", "\u7269", "acrote"], acta: ["\u6D77\u5CB8", "\u7269", "acta"], actor: ["\u539F\u544A", "\u7269", "actor"], actu: ["\u73B0\u5B9E", "\u6027", "actu"], actuaria: ["\u5FEB\u8247", "\u7269", "actuaria"], acu: ["\u9488", "\u7269", "acu"], aculeus: ["\u8702\u523A", "\u7269", "aculeus"], acum: ["\u654F\u9510", "\u52A8", "acum"], acumina: ["\u5C16\u7684", "\u6027", "acumina"], acuo: ["\u78E8\u5229", "\u52A8", "acuo"], acusis: ["\u542C\u89C9", "\u6027", "acusis"], acust: ["\u58F0\u5B66", "\u7269", "acust"], acut: ["\u5C16\u9510", "\u6027", "acut"], acuto: ["\u6025\u6027", "\u7269", "acuto"], adam: ["\u91D1\u521A", "\u7269", "adam"], adapt: ["\u9002\u5E94", "\u7269", "adapt"], adaqu: ["\u996E\u6C34", "\u52A8", "adaqu"], adarto: ["\u7D27\u903C", "\u52A8", "adarto"], addi: ["\u52A0", "\u6027", "addi"], addico: ["\u5224\u5356", "\u52A8", "addico"], addict: ["\u5224\u5F52\u503A\u4E3B", "\u52A8", "addict"], addisc: ["\u5B66\u4F1A", "\u52A8", "addisc"], adduc: ["\u5F15\u5411", "\u52A8", "adduc"], adhaer: ["\u9ECF\u9644", "\u52A8", "adhaer"], adhorta: ["\u529D\u52C9", "\u6027", "adhorta"], adigo: ["\u6295\u63B7", "\u52A8", "adigo"], adip: ["\u8102\u80AA", "\u7269", "adip"], adiuto: ["\u52A9\u624B", "\u52A8", "adiuto"], adiuv: ["\u63F4\u52A9", "\u52A8", "adiuv"], adjur: ["\u4E25\u4EE4", "\u52A8", "adjur"], admi: ["\u94A6\u4F69", "\u6027", "admi"], adminis: ["\u65BD\u653F", "\u52A8", "adminis"], administr: ["\u884C\u653F", "\u7269", "administr"], admiss: ["\u914D\u79CD", "\u52A8", "admiss"], admissio: ["\u53EC\u89C1", "\u7269", "admissio"], admitt: ["\u63A5\u7EB3", "\u52A8", "admitt"], admon: ["\u63D0\u9192", "\u52A8", "admon"], adole: ["\u5C11\u5E74", "\u7269", "adole"], adolesc: ["\u6210\u957F", "\u7269", "adolesc"], ador: ["\u656C\u62DC", "\u52A8", "ador"], adrep: ["\u530D\u5310\u800C\u884C", "\u52A8", "adrep"], adscrib: ["\u9644\u8BB0", "\u52A8", "adscrib"], adsigna: ["\u5206\u914D", "\u7269", "adsigna"], adspect: ["\u77A5\u89C1", "\u52A8", "adspect"], adstip: ["\u58F0\u63F4\u8005", "\u52A8", "adstip"], adul: ["\u5949\u627F", "\u52A8", "adul"], adules: ["\u5C11\u5E74", "\u7269", "adules"], adult: ["\u901A\u5978", "\u52A8", "adult"], adultus: ["\u6210\u5E74\u7684", "\u7269", "adultus"], adumbr: ["\u52FE\u8F6E\u5ED3", "\u52A8", "adumbr"], aduro: ["\u707C", "\u52A8", "aduro"], adust: ["\u70E4\u7126\u7684", "\u52A8", "adust"], adveh: ["\u8FD0\u6765", "\u52A8", "adveh"], advel: ["\u8499\u4E0A", "\u52A8", "advel"], advent: ["\u6765\u8BBF", "\u52A8", "advent"], adver: ["\u6CE8\u610F", "\u52A8", "adver"], advers: ["\u5BF9\u9762", "\u7269", "advers"], adversa: ["\u6742\u8BB0", "\u7269", "adversa"], advoc: ["\u5F8B\u5E08", "\u7269", "advoc"], aed: ["\u5EFA\u7B51", "\u7269", "aed"], aedifi: ["\u5174\u5EFA", "\u52A8", "aedifi"], aedil: ["\u8425\u9020\u5B98", "\u7269", "aedil"], aegr: ["\u75C5", "\u52A8", "aegr"], aem: ["\u5AC9\u5992", "\u52A8", "aem"], aemulo: ["\u4E89\u7231", "\u6027", "aemulo"], aequa: ["\u5F04\u5E73", "\u52A8", "aequa"], aequab: ["\u6C89\u7A33", "\u6027", "aequab"], aequanim: ["\u5E73\u9759", "\u6027", "aequanim"], aequat: ["\u65B9\u7A0B", "\u6027", "aequat"], aequip: ["\u7B49\u4EF7", "\u52A8", "aequip"], aequipar: ["\u914D\u5E73", "\u6027", "aequipar"], aequipond: ["\u914D\u91CD", "\u7269", "aequipond"], aequit: ["\u8861\u5E73", "\u7269", "aequit"], aequor: ["\u6D77\u9762", "\u7269", "aequor"], aerar: ["\u56FD\u5E93", "\u7269", "aerar"], aero: ["\u6C14", "\u7269", "aero"], aest: ["\u590F", "\u7269", "aest"], aesthe: ["\u7F8E\u5B66", "\u7269", "aesthe"], aestim: ["\u5BA1\u5EA6", "\u7269", "aestim"], aestiv: ["\u590F\u4EE4", "\u7269", "aestiv"], aestu: ["\u6CB3\u53E3", "\u7269", "aestu"], aestumat: ["\u71E5\u70ED", "\u52A8", "aestumat"], aestus: ["\u6F6E\u6C50", "\u7269", "aestus"], aether: ["\u4EE5\u592A", "\u52A8", "aether"], aev: ["\u6C38\u4E16\u3001\u65F6\u4EE3", "\u7269", "aev"], affati: ["\u5145\u5206", "\u6570", "affati"], affecto: ["\u60C5\u611F", "\u6027", "affecto"], affidav: ["\u5BA3\u8A93\u4E66", "\u7269", "affidav"], affinis: ["\u59FB\u4EB2", "\u7269", "affinis"], affirm: ["\u80AF\u5B9A", "\u52A8", "affirm"], affix: ["\u9644\u7740", "\u52A8", "affix"], afflat: ["\u5439\u62C2", "\u7269", "afflat"], afflu: ["\u5BCC\u8DB3", "\u6027", "afflu"], afforest: ["\u9020\u6797", "\u7269", "afforest"], agger: ["\u571F\u5792", "\u52A8", "agger"], agilis: ["\u7075\u5DE7", "\u6027", "agilis"], agit: ["\u9A71\u8D76", "\u52A8", "agit"], agmen: ["\u884C\u519B\u7EB5\u961F", "\u7269", "agmen"], agnosc: ["\u8BA4\u51FA", "\u52A8", "agnosc"], agon: ["\u7ADE\u8D5B", "\u52A8", "agon"], agr: ["\u7530\u5730", "\u7269", "agr"], agric: ["\u519C\u592B", "\u7269", "agric"], ait: ["\u539F\u56E0", "\u6027", "ait"], al: ["\u517B\u80B2", "\u52A8", "al"], ala: ["\u7FFC", "\u7269", "ala"], alacr: ["\u632F\u594B", "\u6027", "alacr"], alapa: ["\u62CD\u6253", "\u52A8", "alapa"], alar: ["\u7FFC\u961F", "\u7269", "alar"], alb: ["\u767D", "\u6027", "alb"], albari: ["\u767D\u7070", "\u7269", "albari"], albedo: ["\u768E\u767D", "\u6027", "albedo"], alea: ["\u8D4C\u535A", "\u7269", "alea"], aleator: ["\u8D4C\u5F92", "\u52A8", "aleator"], alembic: ["\u84B8\u998F\u91DC", "\u7269", "alembic"], alg: ["\u85FB", "\u7269", "alg"], algebr: ["\u4EE3\u6570", "\u7269", "algebr"], algid: ["\u9177\u5BD2\u611F", "\u52A8", "algid"], algidit: ["\u5BD2\u51B7", "\u6027", "algidit"], algo: ["\u75DB", "\u7269", "algo"], algor: ["\u7B97\u6CD5", "\u7269", "algor"], aliquan: ["\u82E5\u5E72", "\u7269", "aliquan"], alka: ["\u78B1", "\u52A8", "alka"], all: ["\u849C", "\u7269", "all"], allegor: ["\u5BD3\u8A00", "\u7269", "allegor"], allergo: ["\u8FC7\u654F", "\u7269", "allergo"], allig: ["\u62F4\u7CFB", "\u52A8", "allig"], alloph: ["\u97F3\u4F4D\u53D8\u4F53", "\u7269", "alloph"], alloq: ["\u642D\u8BDD", "\u52A8", "alloq"], alloy: ["\u5408\u91D1", "\u7269", "alloy"], alluvio: ["\u51B2\u79EF", "\u7269", "alluvio"], alphabet: ["\u5B57\u6BCD\u8868", "\u7269", "alphabet"], alt: ["\u9AD8", "\u6027", "alt"], altitud: ["\u9AD8\u5EA6", "\u7269", "altitud"], altocu: ["\u9AD8\u79EF\u4E91", "\u7269", "altocu"], alumen: ["\u660E\u77FE", "\u52A8", "alumen"], alumn: ["\u517B\u5B50", "\u7269", "alumn"], alvear: ["\u8702\u7BB1", "\u52A8", "alvear"], alveus: ["\u6C34\u69FD", "\u7269", "alveus"], amabil: ["\u53EF\u7231", "\u6027", "amabil"], amalgam: ["\u6C5E\u9F50", "\u7269", "amalgam"], amar: ["\u82E6", "\u7269", "amar"], amarit: ["\u82E6\u5473", "\u52A8", "amarit"], amaror: ["\u82E6\u5473", "\u6027", "amaror"], amato: ["\u7231\u8005", "\u6027", "amato"], amatr: ["\u5973\u7231\u8005", "\u6027", "amatr"], amaze: ["\u60CA\u5F02", "\u6027", "amaze"], ambarva: ["\u7530\u5DE1\u796D", "\u7269", "ambarva"], ambie: ["\u73AF\u5883", "\u7269", "ambie"], ambigu: ["\u6B67\u4E49", "\u52A8", "ambigu"], ambition: ["\u96C4\u5FC3", "\u6027", "ambition"], ambra: ["\u9F99\u6D8E\u9999", "\u7269", "ambra"], ambul: ["\u884C\u8D70", "\u7269", "ambul"], ambula: ["\u6551\u62A4\u8F66", "\u7269", "ambula"], ambulac: ["\u56DE\u5ECA", "\u7269", "ambulac"], amburb: ["\u7ED5\u57CE\u796D", "\u7269", "amburb"], ambust: ["\u707C\u4F24", "\u52A8", "ambust"], amens: ["\u5931\u667A", "\u6027", "amens"], amethyst: ["\u7D2B\u6676", "\u6027", "amethyst"], amic: ["\u53CB\u7231", "\u52A8", "amic"], amici: ["\u62AB\u4E0A", "\u52A8", "amici"], amicu: ["\u62AB\u80A9", "\u7269", "amicu"], amita: ["\u59D1\u59E8", "\u7269", "amita"], amnesia: ["\u5065\u5FD8", "\u7269", "amnesia"], amnesty: ["\u5927\u8D66", "\u7269", "amnesty"], amo: ["\u7231", "\u6027", "amo"], amov: ["\u514D\u804C", "\u52A8", "amov"], amper: ["\u7535\u6D41", "\u7269", "amper"], amph: ["\u74EE\u3001\u7F50", "\u7269", "amph"], ampl: ["\u62E5\u62B1", "\u52A8", "ampl"], amplif: ["\u653E\u5927", "\u52A8", "amplif"], amplitud: ["\u632F\u5E45", "\u7269", "amplitud"], ampulla: ["\u74F6", "\u7269", "ampulla"], amput: ["\u622A\u80A2", "\u52A8", "amput"], amulet: ["\u62A4\u7B26", "\u52A8", "amulet"], amurca: ["\u6CB9\u6E23", "\u6027", "amurca"], amyl: ["\u6DC0\u7C89", "\u7269", "amyl"], anacho: ["\u9690\u4FEE\u8005", "\u7269", "anacho"], anaglyph: ["\u6D6E\u96D5", "\u7269", "anaglyph"], analo: ["\u6BD4\u4F8B\u3001\u7C7B\u6BD4", "\u6027", "analo"], analog: ["\u7C7B\u6BD4", "\u7269", "analog"], analys: ["\u5206\u6790", "\u6027", "analys"], anarcho: ["\u65E0\u653F\u5E9C", "\u7269", "anarcho"], anat: ["\u9E2D", "\u7269", "anat"], anato: ["\u89E3\u5256", "\u52A8", "anato"], ancill: ["\u5A62\u4F8D", "\u52A8", "ancill"], ancilla: ["\u5A62\u5973", "\u7269", "ancilla"], ancor: ["\u951A", "\u7269", "ancor"], anemo: ["\u98CE\u901F\u8BA1", "\u7269", "anemo"], anesthes: ["\u9EBB\u9189", "\u52A8", "anesthes"], angipo: ["\u5DF7", "\u7269", "angipo"], ango: ["\u7126\u8651", "\u6027", "ango"], angul: ["\u89D2\u5F62", "\u6570", "angul"], angulos: ["\u591A\u89D2\u7684", "\u6027", "angulos"], angust: ["\u72ED\u7A84", "\u6027", "angust"], angustia: ["\u90C1\u7ED3", "\u6027", "angustia"], angusto: ["\u4F7F\u7A84", "\u52A8", "angusto"], anhel: ["\u5598\u606F", "\u52A8", "anhel"], anil: ["\u8001\u5987\u7684", "\u7269", "anil"], anim: ["\u7075\u9B42\u3001\u5FC3", "\u7269", "anim"], animad: ["\u7559\u610F", "\u52A8", "animad"], animat: ["\u632F\u4F5C", "\u6027", "animat"], anion: ["\u9634\u79BB\u5B50", "\u7269", "anion"], ann: ["\u5E74", "\u7269", "ann"], annivers: ["\u5468\u5E74", "\u7269", "annivers"], annon: ["\u7CAE\u653F", "\u7269", "annon"], annotat: ["\u6279\u6CE8", "\u7269", "annotat"], anquina: ["\u5E06\u811A\u7D22", "\u7269", "anquina"], anser: ["\u9E45", "\u7269", "anser"], ant: ["\u524D\u3001\u5148\u524D", "\u7269", "ant"], antae: ["\u58C1\u67F1", "\u7269", "antae"], antago: ["\u53CD\u6D3E", "\u7269", "antago"], antece: ["\u524D\u4EF6", "\u6027", "antece"], antefix: ["\u6A90\u9970", "\u7269", "antefix"], antemna: ["\u5E06\u6841", "\u7269", "antemna"], antenna: ["\u89E6\u89D2", "\u7269", "antenna"], anth: ["\u82B1", "\u7269", "anth"], anthel: ["\u5E7B\u65E5", "\u7269", "anthel"], anthemion: ["\u82B1\u9970", "\u7269", "anthemion"], anthol: ["\u9009\u96C6", "\u7269", "anthol"], anti: ["\u89E3\u836F", "\u52A8", "anti"], antibi: ["\u6297\u751F\u7D20", "\u7269", "antibi"], anticy: ["\u53CD\u6C14\u65CB", "\u7269", "anticy"], antinom: ["\u4E8C\u5F8B\u80CC\u53CD", "\u7269", "antinom"], antipath: ["\u53CD\u611F", "\u6027", "antipath"], antl: ["\u6C34\u6CF5", "\u7269", "antl"], antrum: ["\u6D1E\u7A74", "\u7269", "antrum"], anul: ["\u6212\u6307", "\u7269", "anul"], anulus: ["\u73AF", "\u7269", "anulus"], anus: ["\u8001\u5987", "\u7269", "anus"], anxi: ["\u5FE7\u8651", "\u6027", "anxi"], ap: ["\u8702", "\u7269", "ap"], aper: ["\u6253\u5F00", "\u52A8", "aper"], aphasia: ["\u5931\u8BED", "\u7269", "aphasia"], aphel: ["\u8FDC\u65E5\u70B9", "\u7269", "aphel"], apian: ["\u871C\u751C", "\u6027", "apian"], apicul: ["\u517B\u8702", "\u52A8", "apicul"], apocha: ["\u6536\u636E", "\u7269", "apocha"], aporia: ["\u7591\u96BE", "\u7269", "aporia"], apotheca: ["\u8D27\u4ED3", "\u7269", "apotheca"], apparat: ["\u7D22\u5177", "\u7269", "apparat"], apparit: ["\u4F8D\u4ECE\u5B98", "\u7269", "apparit"], appell: ["\u7533\u8BC9", "\u52A8", "appell"], appello: ["\u79F0\u547C", "\u52A8", "appello"], appendi: ["\u9644\u5F55", "\u7269", "appendi"], apperc: ["\u7EDF\u89C9", "\u6027", "apperc"], appet: ["\u6E34\u6C42", "\u6027", "appet"], apric: ["\u5411\u9633", "\u7269", "apric"], aptitud: ["\u624D\u80FD", "\u6027", "aptitud"], aquaed: ["\u6C34\u6E20", "\u7269", "aquaed"], aquagi: ["\u6C34\u9053\u7A0E", "\u7269", "aquagi"], aquari: ["\u6C34\u5DE5", "\u7269", "aquari"], aquatio: ["\u53D6\u6C34", "\u52A8", "aquatio"], aquilex: ["\u627E\u6C34\u4EBA", "\u7269", "aquilex"], ar: ["\u8015", "\u52A8", "ar"], ara: ["\u796D\u575B", "\u7269", "ara"], aran: ["\u86DB", "\u7269", "aran"], arat: ["\u7281", "\u7269", "arat"], arator: ["\u8015\u8005", "\u7269", "arator"], arbitr: ["\u4EF2\u88C1", "\u52A8", "arbitr"], arbitra: ["\u5224\u5B9A", "\u52A8", "arbitra"], arbor: ["\u6811", "\u7269", "arbor"], arc: ["\u8D77\u6E90\u3001\u672C\u539F", "\u7269", "arc"], arcane: ["\u79D8\u4F20", "\u52A8", "arcane"], arcanum: ["\u5965\u79D8", "\u52A8", "arcanum"], arcess: ["\u53EC\u6765", "\u52A8", "arcess"], archit: ["\u5EFA\u7B51\u5E08", "\u7269", "archit"], archite: ["\u4E3B\u6301\u5EFA\u9020", "\u52A8", "archite"], architr: ["\u989D\u678B", "\u7269", "architr"], archo: ["\u4E3A\u9996", "\u7269", "archo"], arcio: ["\u7D27\u903C", "\u52A8", "arcio"], arct: ["\u7D27\u7A84", "\u6027", "arct"], arcus: ["\u62F1", "\u7269", "arcus"], ard: ["\u70BD\u70ED\u3001\u707C\u70E7", "\u7269", "ard"], ardeo: ["\u71C3\u70E7", "\u52A8", "ardeo"], ardor: ["\u707C\u75DB", "\u6027", "ardor"], area: ["\u9762\u79EF", "\u7269", "area"], arefaci: ["\u4F7F\u5E72", "\u52A8", "arefaci"], aren: ["\u6C99", "\u7269", "aren"], arena: ["\u7ADE\u6280\u573A", "\u7269", "arena"], argent: ["\u94F6", "\u7269", "argent"], argentar: ["\u94B1\u5E84", "\u7269", "argentar"], argentari: ["\u94F6\u5668\u5320", "\u7269", "argentari"], argill: ["\u9676\u571F", "\u7269", "argill"], argot: ["\u9690\u8BED", "\u7269", "argot"], argum: ["\u8BBA\u636E", "\u52A8", "argum"], argut: ["\u5DE7\u8FA9", "\u52A8", "argut"], arguti: ["\u5C16\u7EC6", "\u6027", "arguti"], aria: ["\u548F\u53F9\u8C03", "\u7269", "aria"], ariditas: ["\u5E72\u65F1", "\u7269", "ariditas"], arie: ["\u653B\u57CE\u69CC", "\u52A8", "arie"], arioso: ["\u548F\u53F9", "\u7269", "arioso"], arist: ["\u8D35\u65CF\u5236", "\u7269", "arist"], aristo: ["\u8D35\u65CF", "\u7269", "aristo"], arith: ["\u7B97\u672F", "\u7269", "arith"], arm: ["\u6B66\u5668\u3001\u88C5\u5907", "\u52A8", "arm"], armam: ["\u88C5\u5907", "\u52A8", "armam"], armamentar: ["\u5175\u5668\u5320", "\u7269", "armamentar"], armar: ["\u6A71\u67DC", "\u7269", "armar"], armen: ["\u725B\u7FA4", "\u7269", "armen"], armill: ["\u81C2\u73AF", "\u7269", "armill"], arom: ["\u9999\u6C14", "\u7269", "arom"], arrh: ["\u5B9A\u91D1", "\u52A8", "arrh"], arrid: ["\u5FAE\u7B11\u8FCE", "\u52A8", "arrid"], arro: ["\u50B2\u6162", "\u6027", "arro"], art: ["\u827A\u672F", "\u7269", "art"], arteri: ["\u52A8\u8109", "\u52A8", "arteri"], arthrit: ["\u5173\u8282\u708E", "\u7269", "arthrit"], arthro: ["\u5173\u8282", "\u7269", "arthro"], articul: ["\u5173\u8282", "\u52A8", "articul"], artif: ["\u5DE7\u5320", "\u7269", "artif"], arto: ["\u903C\u7D27", "\u52A8", "arto"], arv: ["\u8015\u5730", "\u7269", "arv"], arx: ["\u5821\u5792", "\u7269", "arx"], asana: ["\u5750\u59FF", "\u7269", "asana"], asc: ["\u4E0A\u5347", "\u52A8", "asc"], ascen: ["\u8D64\u7ECF", "\u7269", "ascen"], ascesis: ["\u82E6\u4FEE", "\u7269", "ascesis"], ascia: ["\u951B", "\u52A8", "ascia"], ascio: ["\u65A7\u524A", "\u52A8", "ascio"], asin: ["\u9A74", "\u7269", "asin"], asp: ["\u7C97\u7CD9", "\u6027", "asp"], aspect: ["\u4F53", "\u7269", "aspect"], aspecta: ["\u51DD\u671B", "\u52A8", "aspecta"], asperg: ["\u6D12", "\u52A8", "asperg"], aspergo: ["\u6D12\u4E0A", "\u52A8", "aspergo"], asperit: ["\u7C97\u7CD9\u611F", "\u6027", "asperit"], aspic: ["\u6CE8\u89C6", "\u52A8", "aspic"], asport: ["\u642C\u8D70", "\u52A8", "asport"], ass: ["\u70E4\u3001\u7099", "\u7269", "ass"], assatur: ["\u7099\u70E4", "\u52A8", "assatur"], assect: ["\u4F8D\u4ECE", "\u52A8", "assect"], assem: ["\u8BAE\u4F1A", "\u7269", "assem"], assent: ["\u9644\u548C", "\u52A8", "assent"], asser: ["\u4E3B\u5F20", "\u52A8", "asser"], assert: ["\u65AD\u8A00", "\u6027", "assert"], assid: ["\u7AEF\u5750", "\u52A8", "assid"], assidu: ["\u4E0D\u95F4\u65AD", "\u6027", "assidu"], assu: ["\u4E60\u60EF", "\u52A8", "assu"], assues: ["\u4F7F\u4E60\u60EF", "\u52A8", "assues"], astero: ["\u5C0F\u884C\u661F", "\u7269", "astero"], astr: ["\u661F\u8FB0\u3001\u5929\u5B66", "\u7269", "astr"], astrag: ["\u9AB0\u9AA8", "\u52A8", "astrag"], astro: ["\u661F", "\u7269", "astro"], astut: ["\u673A\u654F", "\u6027", "astut"], atellana: ["\u7B11\u5267", "\u7269", "atellana"], athlet: ["\u7ADE\u6280\u8005", "\u52A8", "athlet"], atmo: ["\u84B8\u6C7D", "\u7269", "atmo"], atmos: ["\u5927\u6C14\u5C42", "\u7269", "atmos"], atom: ["\u539F\u5B50", "\u7269", "atom"], atomus: ["\u5FAE\u5C18", "\u6027", "atomus"], atr: ["\u4E2D\u5EAD", "\u7269", "atr"], atram: ["\u58A8", "\u7269", "atram"], atrox: ["\u51F6\u66B4", "\u6027", "atrox"], attact: ["\u63A5\u89E6", "\u6027", "attact"], atte: ["\u6CE8\u610F", "\u52A8", "atte"], attenu: ["\u8870\u51CF", "\u52A8", "attenu"], attero: ["\u78E8\u635F", "\u52A8", "attero"], atting: ["\u89E6\u53CA", "\u6027", "atting"], attitude: ["\u6001\u5EA6", "\u6027", "attitude"], attorn: ["\u4EE3\u7406\u4EBA", "\u7269", "attorn"], attrec: ["\u6469\u89E6", "\u6027", "attrec"], attrect: ["\u89E6\u6478", "\u52A8", "attrect"], attribu: ["\u5F52\u5C5E", "\u7269", "attribu"], auctio: ["\u62CD\u5356", "\u7269", "auctio"], auctor: ["\u4F5C\u8005", "\u7269", "auctor"], aucup: ["\u6355\u9E1F", "\u52A8", "aucup"], aucupat: ["\u6355\u9E1F\u8005", "\u52A8", "aucupat"], aud: ["\u542C", "\u52A8", "aud"], auda: ["\u5927\u80C6", "\u6027", "auda"], audientia: ["\u89D0\u89C1", "\u7269", "audientia"], audit: ["\u542C\u89C9", "\u6027", "audit"], auditor: ["\u65C1\u542C\u8005", "\u7269", "auditor"], aug: ["\u5360\u5146", "\u7269", "aug"], auguro: ["\u5360\u6D4B", "\u52A8", "auguro"], august: ["\u5E84\u4E25", "\u6027", "august"], aula: ["\u5BAB\u5EF7", "\u7269", "aula"], aulae: ["\u5BAB\u4EBA", "\u7269", "aulae"], auloed: ["\u7BA1\u6B4C\u8005", "\u7269", "auloed"], aulos: ["\u53CC\u7BA1\u7B1B", "\u7269", "aulos"], aur: ["\u7A7A\u6C14\u3001\u6C14\u606F", "\u7269", "aur"], aure: ["\u91D1\u8272", "\u6027", "aure"], aureola: ["\u5149\u6655", "\u7269", "aureola"], auric: ["\u8033", "\u7269", "auric"], aurif: ["\u91D1\u5320", "\u7269", "aurif"], aurig: ["\u5FA1\u8005", "\u7269", "aurig"], aurit: ["\u6709\u8033\u7684", "\u52A8", "aurit"], auror: ["\u6668\u5149", "\u7269", "auror"], auscult: ["\u503E\u542C", "\u52A8", "auscult"], ausculto: ["\u542C\u4ECE", "\u52A8", "ausculto"], auspex: ["\u8BC1\u5A5A", "\u7269", "auspex"], austerus: ["\u6DA9", "\u6027", "austerus"], automato: ["\u81EA\u52A8", "\u7269", "automato"], autumn: ["\u79CB", "\u7269", "autumn"], auxil: ["\u652F\u63F4", "\u52A8", "auxil"], avar: ["\u8D2A\u5A6A", "\u6027", "avar"], avell: ["\u62D4\u53BB", "\u52A8", "avell"], aven: ["\u71D5\u9EA6", "\u7269", "aven"], averag: ["\u5E73\u5747", "\u7269", "averag"], avers: ["\u80CC\u9762", "\u7269", "avers"], aversat: ["\u53CD\u611F", "\u6027", "aversat"], avia: ["\u7956\u6BCD", "\u7269", "avia"], avu: ["\u7956\u7236", "\u52A8", "avu"], avuncu: ["\u53D4\u4F2F", "\u7269", "avuncu"], awe: ["\u656C\u754F", "\u6027", "awe"], ax: ["\u8F74", "\u7269", "ax"], axiom: ["\u516C\u7406", "\u7269", "axiom"], azimuth: ["\u65B9\u4F4D\u89D2", "\u7269", "azimuth"], baca: ["\u6D46\u679C", "\u52A8", "baca"], bacchan: ["\u9152\u795E\u8282", "\u7269", "bacchan"], bacchor: ["\u72C2\u4E71", "\u6027", "bacchor"], bacill: ["\u5C0F\u68D2\u3001\u7B77", "\u7269", "bacill"], bacteri: ["\u7EC6\u83CC", "\u7269", "bacteri"], balbut: ["\u54BF\u5440", "\u7269", "balbut"], ball: ["\u5F29\u70AE", "\u52A8", "ball"], ballet: ["\u82AD\u857E", "\u7269", "ballet"], ballist: ["\u5F29\u70AE\u624B", "\u52A8", "ballist"], baln: ["\u6D74", "\u7269", "baln"], balsam: ["\u9999\u818F", "\u7269", "balsam"], balteus: ["\u8170\u5E26", "\u7269", "balteus"], banca: ["\u94B1\u5E84", "\u7269", "banca"], bandag: ["\u7EF7\u5E26", "\u7269", "bandag"], bank: ["\u94F6\u884C", "\u52A8", "bank"], bar: ["\u538B\u5F3A", "\u7269", "bar"], barath: ["\u6DF1\u6E0A", "\u7269", "barath"], barbat: ["\u6709\u987B", "\u6027", "barbat"], bard: ["\u8822\u7B28", "\u6027", "bard"], baro: ["\u91CD", "\u7269", "baro"], barom: ["\u6C14\u538B\u8BA1", "\u7269", "barom"], barter: ["\u4EE5\u7269\u6613\u7269", "\u52A8", "barter"], basalt: ["\u7384\u6B66\u5CA9", "\u7269", "basalt"], basilica: ["\u4F1A\u5802", "\u7269", "basilica"], bath: ["\u6DF1", "\u6027", "bath"], battu: ["\u51FB\u6253", "\u52A8", "battu"], beato: ["\u6709\u798F", "\u6027", "beato"], bel: ["\u6218\u4E89", "\u52A8", "bel"], bellaria: ["\u751C\u70B9", "\u6027", "bellaria"], belu: ["\u5DE8\u517D", "\u7269", "belu"], bema: ["\u6CD5\u5EAD", "\u7269", "bema"], bened: ["\u795D\u798F", "\u52A8", "bened"], benefic: ["\u5584\u672F", "\u52A8", "benefic"], benevo: ["\u5584\u610F", "\u6027", "benevo"], beni: ["\u548C\u5584", "\u6027", "beni"], benigno: ["\u826F\u6027", "\u7269", "benigno"], besti: ["\u7272\u755C", "\u7269", "besti"], beta: ["\u751C\u83DC", "\u7269", "beta"], betul: ["\u6866", "\u7269", "betul"], bhikkhu: ["\u6BD4\u4E18", "\u7269", "bhikkhu"], bibl: ["\u4E66", "\u7269", "bibl"], bibli: ["\u85CF\u4E66", "\u7269", "bibli"], bibo: ["\u996E", "\u52A8", "bibo"], bidens: ["\u53CC\u9F7F\u9504", "\u7269", "bidens"], big: ["\u53CC\u9A7E", "\u7269", "big"], bige: ["\u53CC\u9A6C\u8F66", "\u7269", "bige"], bil: ["\u80C6", "\u52A8", "bil"], binary: ["\u4E8C\u8FDB\u5236", "\u7269", "binary"], bini: ["\u6BCF\u4E8C", "\u7269", "bini"], bio: ["\u751F\u547D", "\u7269", "bio"], biogra: ["\u4F20\u8BB0", "\u7269", "biogra"], biolo: ["\u751F\u7269\u5B66", "\u7269", "biolo"], biom: ["\u751F\u7269\u7FA4\u7CFB", "\u7269", "biom"], biosph: ["\u751F\u7269\u5708", "\u7269", "biosph"], bipennis: ["\u53CC\u5203\u65A7", "\u7269", "bipennis"], bitu: ["\u6CA5\u9752", "\u7269", "bitu"], bland: ["\u8C04\u5A9A", "\u52A8", "bland"], blandi: ["\u6E29\u67D4", "\u6027", "blandi"], blandil: ["\u751C\u8A00", "\u52A8", "blandil"], blandimen: ["\u67D4\u60C5", "\u6027", "blandimen"], blizz: ["\u66B4\u96EA", "\u7269", "blizz"], boatus: ["\u725B\u9E23\u58F0", "\u6027", "boatus"], bog: ["\u6CE5\u6CBC", "\u7269", "bog"], boiae: ["\u9879\u5708\u67B7", "\u7269", "boiae"], bolet: ["\u83C7", "\u7269", "bolet"], bolt: ["\u87BA\u6813", "\u7269", "bolt"], bombus: ["\u55E1\u55E1", "\u6027", "bombus"], bombyci: ["\u68C9\u7EB8", "\u7269", "bombyci"], bon: ["\u597D", "\u6027", "bon"], botan: ["\u690D\u7269\u5B66", "\u7269", "botan"], bractea: ["\u91D1\u7B94", "\u52A8", "bractea"], branchi: ["\u9CC3", "\u7269", "branchi"], brev: ["\u77ED", "\u6027", "brev"], brevia: ["\u6D45\u6EE9", "\u7269", "brevia"], breviar: ["\u8282\u672C", "\u7269", "breviar"], brevil: ["\u7B80\u77ED", "\u6027", "brevil"], bright: ["\u4EAE\u5EA6", "\u6027", "bright"], brum: ["\u51AC", "\u7269", "brum"], brush: ["\u753B\u7B14", "\u7269", "brush"], brut: ["\u7C97\u949D", "\u6027", "brut"], bubul: ["\u7267\u725B\u4EBA", "\u52A8", "bubul"], bucca: ["\u53E3\u8154", "\u7269", "bucca"], buccel: ["\u4E00\u53E3", "\u52A8", "buccel"], buccin: ["\u5439\u53F7", "\u52A8", "buccin"], budget: ["\u9884\u7B97", "\u52A8", "budget"], bufo: ["\u87FE\u870D", "\u7269", "bufo"], bulb: ["\u9CDE\u830E", "\u7269", "bulb"], bulla: ["\u6C34\u6CE1", "\u52A8", "bulla"], burdo: ["\u5F79\u9AA1", "\u7269", "burdo"], bureau: ["\u5B98\u50DA", "\u7269", "bureau"], burgens: ["\u5E02\u6C11", "\u7269", "burgens"], bust: ["\u80F8\u50CF", "\u7269", "bust"], bustum: ["\u706B\u846C\u573A", "\u7269", "bustum"], buty: ["\u9EC4\u6CB9", "\u7269", "buty"], bybl: ["\u7EB8\u838E\u8349\u82AF", "\u7269", "bybl"], byss: ["\u68C9", "\u7269", "byss"], caballus: ["\u9A7D\u9A6C", "\u7269", "caballus"], cacabus: ["\u7096\u9505", "\u7269", "cacabus"], cachinn: ["\u5927\u7B11", "\u52A8", "cachinn"], cachinno: ["\u72C2\u7B11", "\u52A8", "cachinno"], cacumen: ["\u5C71\u5CF0", "\u7269", "cacumen"], cad: ["\u5760\u843D", "\u52A8", "cad"], cadentia: ["\u7EC8\u6B62\u5F0F", "\u7269", "cadentia"], caduc: ["\u6613\u5012", "\u6027", "caduc"], caecit: ["\u5931\u660E", "\u7269", "caecit"], caed: ["\u780D", "\u52A8", "caed"], cael: ["\u5929\u7A7A", "\u7269", "cael"], caela: ["\u96D5\u9542", "\u52A8", "caela"], caelam: ["\u933E\u523B", "\u52A8", "caelam"], caelatu: ["\u933E\u5DE5", "\u52A8", "caelatu"], caelib: ["\u72EC\u8EAB", "\u7269", "caelib"], caelo: ["\u933E\u523B", "\u52A8", "caelo"], caem: ["\u77F3\u6599", "\u7269", "caem"], caenos: ["\u6CE5\u6C61", "\u6027", "caenos"], caenum: ["\u6C61\u6CE5", "\u6027", "caenum"], caer: ["\u84DD", "\u6027", "caer"], caerul: ["\u851A\u84DD", "\u6027", "caerul"], caestus: ["\u62F3\u5957", "\u7269", "caestus"], cal: ["\u70ED\u3001\u6696", "\u7269", "cal"], calamis: ["\u70EB\u8936\u5668", "\u52A8", "calamis"], calamit: ["\u707E\u7978", "\u7269", "calamit"], calathus: ["\u82B1\u7BEE", "\u7269", "calathus"], calc: ["\u77F3\u7070", "\u7269", "calc"], calcane: ["\u8E35", "\u7269", "calcane"], calcar: ["\u77F3\u7070\u5CA9", "\u7269", "calcar"], calcari: ["\u9A6C\u523A", "\u7269", "calcari"], calcat: ["\u8E29\u8E0F", "\u52A8", "calcat"], calce: ["\u978B", "\u7269", "calce"], calceo: ["\u7A7F\u978B", "\u52A8", "calceo"], calcinar: ["\u70E7\u7070\u5320", "\u7269", "calcinar"], calcitr: ["\u8E22", "\u52A8", "calcitr"], calco: ["\u8DF5\u8E0F", "\u52A8", "calco"], calcul: ["\u6F14\u7B97", "\u6027", "calcul"], calculus: ["\u5375\u77F3", "\u7269", "calculus"], calibr: ["\u6821\u51C6", "\u7269", "calibr"], calidit: ["\u6E29\u70ED", "\u6027", "calidit"], calig: ["\u96FE\u972D", "\u7269", "calig"], caligu: ["\u957F\u9774", "\u7269", "caligu"], call: ["\u72E1\u9EE0", "\u6027", "call"], callos: ["\u786C\u76AE", "\u6027", "callos"], callosit: ["\u8327", "\u6027", "callosit"], calum: ["\u8BEC\u544A", "\u52A8", "calum"], calvus: ["\u79C3\u9876", "\u6027", "calvus"], camb: ["\u5151\u6362", "\u52A8", "camb"], cambio: ["\u6C47\u5151", "\u52A8", "cambio"], camin: ["\u58C1\u7089", "\u7269", "camin"], camp: ["\u5E73\u539F\u3001\u539F\u91CE", "\u7269", "camp"], campan: ["\u949F\u697C", "\u7269", "campan"], campana: ["\u949F", "\u7269", "campana"], camphor: ["\u6A1F\u8111", "\u7269", "camphor"], campon: ["\u5E97\u4E3B", "\u7269", "campon"], campus: ["\u57DF", "\u7269", "campus"], can: ["\u72AC", "\u7269", "can"], canalic: ["\u5C0F\u6E20", "\u7269", "canalic"], canalis: ["\u822A\u9053", "\u7269", "canalis"], cancell: ["\u6805\u680F", "\u7269", "cancell"], cand: ["\u70DB\u3001\u767D\u70BD", "\u7269", "cand"], candela: ["\u70DB\u53F0", "\u7269", "candela"], candida: ["\u5019\u9009\u4EBA", "\u7269", "candida"], candor: ["\u6D01\u767D", "\u6027", "candor"], canic: ["\u4F0F\u5929", "\u7269", "canic"], caniti: ["\u767D\u5934", "\u7269", "caniti"], cann: ["\u9EBB", "\u7269", "cann"], cano: ["\u5531", "\u52A8", "cano"], canon: ["\u5361\u519C", "\u7269", "canon"], canor: ["\u65CB\u5F8B\u7F8E", "\u6027", "canor"], cant: ["\u6B4C\u5531", "\u7269", "cant"], canth: ["\u8F6E\u8F8B", "\u7269", "canth"], cantile: ["\u5C0F\u8C03", "\u52A8", "cantile"], cantio: ["\u66F2", "\u52A8", "cantio"], cantor: ["\u6B4C\u8005", "\u7269", "cantor"], canus: ["\u767D\u53D1", "\u6027", "canus"], canvas: ["\u753B\u5E03", "\u7269", "canvas"], capac: ["\u5BB9\u91CF", "\u7269", "capac"], capi: ["\u6293\u53D6", "\u52A8", "capi"], capill: ["\u53D1", "\u52A8", "capill"], capilla: ["\u53D1\u5F0F", "\u7269", "capilla"], capistr: ["\u7B3C\u5934", "\u52A8", "capistr"], capit: ["\u7AE0\u8282", "\u7269", "capit"], capital: ["\u8D44\u672C", "\u52A8", "capital"], capitellum: ["\u67F1\u5934", "\u7269", "capitellum"], capitula: ["\u6555\u4EE4\u96C6", "\u7269", "capitula"], capr: ["\u5C71\u7F8A", "\u7269", "capr"], capreo: ["\u5377\u987B", "\u7269", "capreo"], capsula: ["\u5C0F\u76D2", "\u7269", "capsula"], carabus: ["\u67F3\u6761\u8247", "\u7269", "carabus"], carbasum: ["\u7EC6\u9EBB", "\u52A8", "carbasum"], carbo: ["\u70AD", "\u52A8", "carbo"], carc: ["\u76D1\u72F1", "\u7269", "carc"], cardi: ["\u5FC3", "\u7269", "cardi"], cardio: ["\u5FC3\u810F", "\u7269", "cardio"], cardo: ["\u95E8\u67A2", "\u7269", "cardo"], caren: ["\u7F3A\u5C11", "\u52A8", "caren"], carex: ["\u82D4\u8349", "\u7269", "carex"], caries: ["\u8150\u6728", "\u7269", "caries"], carin: ["\u9F99\u9AA8\u3001\u8239", "\u7269", "carin"], carit: ["\u6148\u7231", "\u6027", "carit"], carm: ["\u5492\u8BCD", "\u52A8", "carm"], carmin: ["\u68B3\u7406", "\u52A8", "carmin"], carn: ["\u8089", "\u7269", "carn"], carnar: ["\u8089\u5E93", "\u52A8", "carnar"], carnari: ["\u8089\u8D29", "\u52A8", "carnari"], carnifi: ["\u5C60\u5BB0\u573A", "\u52A8", "carnifi"], carniv: ["\u98DF\u8089", "\u7269", "carniv"], carnival: ["\u72C2\u6B22", "\u7269", "carnival"], caroen: ["\u716E\u9152", "\u52A8", "caroen"], carpent: ["\u8F66\u67B6", "\u7269", "carpent"], carpus: ["\u8155", "\u7269", "carpus"], carr: ["\u8D27\u8F66", "\u7269", "carr"], carruc: ["\u7BF7\u8F66", "\u7269", "carruc"], cartilag: ["\u8F6F\u9AA8", "\u52A8", "cartilag"], carus: ["\u4EB2\u7231", "\u6027", "carus"], cas: ["\u5C4B\u820D", "\u7269", "cas"], case: ["\u5976\u916A", "\u7269", "case"], caseif: ["\u5236\u916A", "\u52A8", "caseif"], cass: ["\u5934\u76D4", "\u52A8", "cass"], casses: ["\u7F57\u7F51", "\u52A8", "casses"], caste: ["\u79CD\u59D3", "\u7269", "caste"], castella: ["\u6C34\u5854", "\u7269", "castella"], castimo: ["\u8D1E\u6D01", "\u6027", "castimo"], castitas: ["\u5B88\u8D1E", "\u7269", "castitas"], castr: ["\u8425\u5792", "\u7269", "castr"], castrat: ["\u53BB\u52BF", "\u52A8", "castrat"], castren: ["\u5BAB\u5EF7\u603B\u7BA1", "\u7269", "castren"], castus: ["\u6D01\u51C0", "\u6027", "castus"], casus: ["\u683C", "\u7269", "casus"], catal: ["\u50AC\u5316", "\u52A8", "catal"], catap: ["\u6295\u77F3\u673A", "\u52A8", "catap"], cataphract: ["\u94C1\u7532\u9A91", "\u7269", "cataphract"], catar: ["\u95F8\u95E8", "\u7269", "catar"], cataract: ["\u7011\u5E03", "\u7269", "cataract"], catasco: ["\u4FA6\u5BDF\u8239", "\u7269", "catasco"], catasta: ["\u5211\u53F0", "\u7269", "catasta"], categ: ["\u8303\u7574", "\u6027", "categ"], cateia: ["\u6218\u69CC", "\u7269", "cateia"], caten: ["\u94FE", "\u7269", "caten"], caterva: ["\u961F", "\u7269", "caterva"], catharo: ["\u5BA3\u6CC4", "\u6027", "catharo"], cathedra: ["\u5B9D\u5EA7", "\u7269", "cathedra"], catillus: ["\u789F", "\u7269", "catillus"], cation: ["\u9633\u79BB\u5B50", "\u7269", "cation"], catus: ["\u7CBE\u660E\u7684", "\u6027", "catus"], caud: ["\u5C3E", "\u7269", "caud"], caul: ["\u830E", "\u7269", "caul"], caup: ["\u5BA2\u6808", "\u7269", "caup"], caus: ["\u8BC9\u8BBC", "\u7269", "caus"], caut: ["\u62C5\u4FDD", "\u52A8", "caut"], cautes: ["\u7901\u77F3", "\u7269", "cautes"], celer: ["\u8FC5\u6377", "\u7269", "celer"], celeus: ["\u6868\u624B\u957F", "\u7269", "celeus"], cell: ["\u623F\u95F4\u3001\u5BA4", "\u7269", "cell"], cellar: ["\u5730\u7A96", "\u7269", "cellar"], cellul: ["\u7EC6\u80DE", "\u7269", "cellul"], celox: ["\u5FEB\u8239", "\u7269", "celox"], celtis: ["\u51FF", "\u52A8", "celtis"], cenobi: ["\u56E2\u4FEE\u9662", "\u7269", "cenobi"], cens: ["\u76D1\u5BDF", "\u7269", "cens"], cense: ["\u8BC4\u8BAE", "\u52A8", "cense"], censu: ["\u4EBA\u53E3\u767B\u8BB0", "\u7269", "censu"], censur: ["\u76D1\u5BDF\u804C", "\u7269", "censur"], census: ["\u666E\u67E5", "\u7269", "census"], cent: ["\u4E2D\u5FC3", "\u7269", "cent"], centeni: ["\u6BCF\u767E", "\u7269", "centeni"], centesi: ["\u767E\u5206\u7A0E", "\u7269", "centesi"], centro: ["\u767E\u8872", "\u52A8", "centro"], centuri: ["\u767E\u4EBA\u961F", "\u52A8", "centuri"], centurio: ["\u767E\u592B\u957F", "\u7269", "centurio"], cep: ["\u6D0B\u8471", "\u7269", "cep"], ceph: ["\u5934", "\u7269", "ceph"], cephala: ["\u5934\u75DB", "\u7269", "cephala"], cera: ["\u8721", "\u7269", "cera"], ceras: ["\u6A31\u6843", "\u7269", "ceras"], cercur: ["\u8D5B\u666E\u52D2\u65AF\u8239", "\u7269", "cercur"], cereal: ["\u8C37\u795E\u8282", "\u7269", "cereal"], cerebell: ["\u5C0F\u8111", "\u52A8", "cerebell"], cerebr: ["\u5927\u8111", "\u52A8", "cerebr"], cern: ["\u51B3\u65AD", "\u52A8", "cern"], ceropla: ["\u8721\u5851\u5320", "\u7269", "ceropla"], cert: ["\u786E\u4FE1", "\u52A8", "cert"], certamen: ["\u7ADE\u8D5B", "\u52A8", "certamen"], cerussa: ["\u94C5\u7C89", "\u7269", "cerussa"], cerv: ["\u9E7F", "\u7269", "cerv"], cervix: ["\u9888", "\u7269", "cervix"], cess: ["\u505C\u6B62", "\u52A8", "cess"], cet: ["\u9CB8", "\u7269", "cet"], cetari: ["\u9C7C\u5546", "\u52A8", "cetari"], cha: ["\u6DF7\u6C8C\u3001\u65E0\u5E8F", "\u7269", "cha"], chakra: ["\u8109\u8F6E", "\u52A8", "chakra"], chalco: ["\u94DC\u7248\u672F", "\u52A8", "chalco"], chalk: ["\u77FF\u77F3", "\u7269", "chalk"], char: ["\u6E21\u7075\u8005", "\u7269", "char"], charact: ["\u6027\u683C", "\u6027", "charact"], chart: ["\u7EB8\u3001\u5951", "\u7269", "chart"], charyb: ["\u5927\u6F29\u6DA1", "\u7269", "charyb"], chasma: ["\u4E91\u9699\u5149", "\u7269", "chasma"], cheirur: ["\u5916\u79D1\u533B\u5E08", "\u7269", "cheirur"], chem: ["\u70BC\u5316", "\u7269", "chem"], chemis: ["\u5316\u5B66", "\u7269", "chemis"], chip: ["\u82AF\u7247", "\u7269", "chip"], chir: ["\u5916\u79D1", "\u52A8", "chir"], chiro: ["\u624B\u4E66", "\u7269", "chiro"], chirogr: ["\u624B\u636E", "\u52A8", "chirogr"], chirot: ["\u624B\u5957", "\u7269", "chirot"], chlamys: ["\u5BAB\u888D", "\u7269", "chlamys"], choenix: ["\u65E5\u7CAE\u91CF", "\u7269", "choenix"], chondro: ["\u8F6F\u9AA8", "\u7269", "chondro"], chor: ["\u6B4C\u821E", "\u7269", "chor"], choraul: ["\u7B1B\u4F34\u6B4C\u8005", "\u7269", "choraul"], chord: ["\u548C\u5F26", "\u7269", "chord"], choroba: ["\u6C34\u51C6\u4EEA", "\u7269", "choroba"], chrematist: ["\u7406\u8D22\u672F", "\u7269", "chrematist"], chromo: ["\u8272", "\u7269", "chromo"], chromos: ["\u67D3\u8272\u4F53", "\u7269", "chromos"], chrono: ["\u6162\u6027", "\u7269", "chrono"], chronom: ["\u7CBE\u5BC6\u8BA1\u65F6", "\u7269", "chronom"], chrys: ["\u91D1", "\u7269", "chrys"], chrysal: ["\u86F9\u58F3", "\u7269", "chrysal"], cica: ["\u75A4", "\u52A8", "cica"], cicad: ["\u8749", "\u7269", "cicad"], cicatr: ["\u75A4\u75D5", "\u52A8", "cicatr"], cid: ["\u6740\u3001\u65A9", "\u52A8", "cid"], cilium: ["\u776B", "\u7269", "cilium"], cin: ["\u7070\u70EC", "\u7269", "cin"], cinct: ["\u8170\u5E26", "\u7269", "cinct"], ciner: ["\u7070\u8272", "\u6027", "ciner"], cingo: ["\u7CFB\u5E26", "\u52A8", "cingo"], cingulum: ["\u809A\u5E26", "\u7269", "cingulum"], ciniflo: ["\u70EB\u53D1\u5E08", "\u7269", "ciniflo"], cinnam: ["\u8089\u6842", "\u7269", "cinnam"], cippus: ["\u6728\u67B7", "\u7269", "cippus"], circ: ["\u5468\u56F4\u3001\u73AF", "\u7269", "circ"], circens: ["\u7ADE\u6280\u4F1A", "\u7269", "circens"], circuit: ["\u7535\u8DEF", "\u7269", "circuit"], circumd: ["\u88F9\u4E0A", "\u52A8", "circumd"], circumdu: ["\u7ED5\u5F15", "\u52A8", "circumdu"], circumf: ["\u884C\u5546", "\u52A8", "circumf"], circumi: ["\u73AF\u884C", "\u52A8", "circumi"], circums: ["\u73AF\u89C6", "\u52A8", "circums"], circumv: ["\u76D8\u7ED5", "\u52A8", "circumv"], cirr: ["\u5377\u4E91", "\u7269", "cirr"], cis: ["\u6B64\u4FA7", "\u7269", "cis"], cisi: ["\u8F7B\u8F66", "\u7269", "cisi"], cist: ["\u7BB1\u7BA7", "\u52A8", "cist"], cisterna: ["\u84C4\u6C34\u6C60", "\u7269", "cisterna"], cit: ["\u901F\u3001\u6025", "\u7269", "cit"], citat: ["\u4F20\u5524", "\u7269", "citat"], cithar: ["\u7AD6\u7434", "\u7269", "cithar"], cithari: ["\u5F39\u7434", "\u52A8", "cithari"], citharo: ["\u7434\u6B4C\u8005", "\u7269", "citharo"], civ: ["\u516C\u6C11\u3001\u6C11", "\u7269", "civ"], civit: ["\u516C\u6C11\u6743", "\u7269", "civit"], clabul: ["\u8D27\u8F66", "\u7269", "clabul"], clad: ["\u60E8\u8D25", "\u52A8", "clad"], clam: ["\u547C\u558A", "\u52A8", "clam"], clangor: ["\u94FF\u9535", "\u6027", "clangor"], clariso: ["\u6E05\u4EAE", "\u6027", "clariso"], clarit: ["\u660E\u4EAE", "\u6027", "clarit"], class: ["\u7C7B\u522B", "\u6570", "class"], clathr: ["\u680F\u6746", "\u7269", "clathr"], claud: ["\u5173\u95ED", "\u52A8", "claud"], claudic: ["\u8DDB\u884C", "\u52A8", "claudic"], claudus: ["\u8DDB\u8DB3", "\u6027", "claudus"], claustr: ["\u95E9\u9501", "\u7269", "claustr"], clausur: ["\u56F4\u5708", "\u52A8", "clausur"], clav: ["\u9489\u3001\u952E", "\u52A8", "clav"], clava: ["\u68CD\u68D2", "\u7269", "clava"], clavar: ["\u9501\u5320", "\u7269", "clavar"], clavus: ["\u7D2B\u6761\u7EB9", "\u7269", "clavus"], clay: ["\u9ECF\u571F", "\u7269", "clay"], clef: ["\u8C31\u53F7", "\u7269", "clef"], clem: ["\u4EC1\u6148", "\u6027", "clem"], clepsydra: ["\u6F0F\u523B", "\u7269", "clepsydra"], client: ["\u95E8\u5BA2", "\u7269", "client"], climat: ["\u6C14\u5019", "\u7269", "climat"], clinic: ["\u8BCA\u6240", "\u7269", "clinic"], clino: ["\u659C", "\u7269", "clino"], clitell: ["\u9A6E\u978D", "\u7269", "clitell"], cliv: ["\u5C71\u5761", "\u7269", "cliv"], cloaca: ["\u4E0B\u6C34\u9053", "\u7269", "cloaca"], clunis: ["\u81C0", "\u7269", "clunis"], clypeus: ["\u5706\u76FE", "\u7269", "clypeus"], coag: ["\u51DD\u56FA", "\u52A8", "coag"], coarct: ["\u538B\u7F29", "\u6027", "coarct"], coarto: ["\u538B\u7F29", "\u52A8", "coarto"], coccum: ["\u80ED\u8102\u866B\u7EA2", "\u52A8", "coccum"], cochl: ["\u87BA", "\u7269", "cochl"], cochle: ["\u87BA\u65CB\u6746", "\u7269", "cochle"], cochlear: ["\u52FA", "\u7269", "cochlear"], cochlio: ["\u87BA\u65CB", "\u7269", "cochlio"], cocon: ["\u8327", "\u7269", "cocon"], coct: ["\u719F\u3001\u6210\u719F", "\u6027", "coct"], coctur: ["\u70E7\u5236", "\u52A8", "coctur"], cod: ["\u518C", "\u7269", "cod"], codicill: ["\u9644\u6555", "\u7269", "codicill"], coen: ["\u9910\u3001\u5BB4", "\u7269", "coen"], coep: ["\u5F00\u59CB", "\u52A8", "coep"], coercit: ["\u5F39\u538B", "\u7269", "coercit"], cog: ["\u601D\u3001\u601D\u8003", "\u52A8", "cog"], cogita: ["\u6C89\u601D\u7684", "\u52A8", "cogita"], cogn: ["\u4EB2\u65CF", "\u52A8", "cogn"], cognitio: ["\u5BA1\u7406", "\u52A8", "cognitio"], cognito: ["\u8BA4\u77E5", "\u6027", "cognito"], cognitor: ["\u8BC9\u8BBC\u4EE3\u7406\u4EBA", "\u52A8", "cognitor"], cognos: ["\u53C2\u609F", "\u7269", "cognos"], coh: ["\u5927\u961F", "\u52A8", "coh"], coit: ["\u8054\u5408", "\u7269", "coit"], col: ["\u989C\u8272", "\u6027", "col"], colare: ["\u6EE4\u6C34", "\u7269", "colare"], colic: ["\u7EDE\u75DB", "\u7269", "colic"], coll: ["\u4E18\u9675", "\u7269", "coll"], collar: ["\u8863\u9886", "\u7269", "collar"], collatio: ["\u51D1\u4EFD", "\u7269", "collatio"], colle: ["\u540C\u50DA\u56E2", "\u7269", "colle"], collect: ["\u91C7\u96C6", "\u52A8", "collect"], collecta: ["\u644A\u6D3E", "\u7269", "collecta"], collega: ["\u540C\u50DA", "\u7269", "collega"], collegium: ["\u5B66\u793E", "\u7269", "collegium"], colloq: ["\u4EA4\u8C08", "\u52A8", "colloq"], colluvi: ["\u6DE4\u79EF", "\u52A8", "colluvi"], collybus: ["\u5151\u6362\u7387", "\u7269", "collybus"], collyr: ["\u773C\u818F", "\u7269", "collyr"], colon: ["\u519C\u4EBA\u3001\u57A6\u6B96", "\u7269", "colon"], coloph: ["\u9898\u8DCB", "\u7269", "coloph"], colorat: ["\u7740\u8272", "\u6027", "colorat"], coloss: ["\u5DE8\u578B", "\u6027", "coloss"], colum: ["\u9E3D", "\u7269", "colum"], column: ["\u67F1", "\u7269", "column"], columnat: ["\u5217\u67F1", "\u7269", "columnat"], colus: ["\u7EBA\u9524\u6746", "\u52A8", "colus"], comat: ["\u957F\u53D1", "\u6027", "comat"], combi: ["\u5316\u5408", "\u52A8", "combi"], comburo: ["\u70E7\u5C3D", "\u52A8", "comburo"], combust: ["\u71C3\u70E7", "\u7269", "combust"], comed: ["\u5171\u98DF", "\u52A8", "comed"], comes: ["\u4F8D\u4ECE", "\u7269", "comes"], comet: ["\u5F57\u661F", "\u7269", "comet"], comis: ["\u548C\u853C", "\u52A8", "comis"], comit: ["\u96C6\u4F1A", "\u7269", "comit"], comitat: ["\u793C\u8BA9", "\u52A8", "comitat"], comitatus: ["\u968F\u4ECE", "\u7269", "comitatus"], comito: ["\u966A\u540C", "\u52A8", "comito"], comme: ["\u901A\u884C", "\u7269", "comme"], commen: ["\u6CE8\u758F", "\u7269", "commen"], commend: ["\u6258\u4ED8", "\u52A8", "commend"], commenta: ["\u6CE8\u8BB0", "\u7269", "commenta"], commig: ["\u8FC1\u5165", "\u52A8", "commig"], committ: ["\u4EA4\u6258", "\u52A8", "committ"], commod: ["\u4FBF\u5229", "\u52A8", "commod"], commodat: ["\u501F\u7528", "\u52A8", "commodat"], commotio: ["\u6FC0\u52A8", "\u6027", "commotio"], communic: ["\u8FDE\u901A", "\u7269", "communic"], comoe: ["\u559C\u5267", "\u7269", "comoe"], comp: ["\u8BA1\u7B97", "\u6027", "comp"], compa: ["\u63A5\u5408", "\u52A8", "compa"], compar: ["\u6BD4\u8F83", "\u7269", "compar"], compara: ["\u8D2D\u7F6E", "\u52A8", "compara"], compasc: ["\u5171\u7267", "\u52A8", "compasc"], compel: ["\u5F3A\u63A8", "\u52A8", "compel"], compella: ["\u62DB\u547C", "\u52A8", "compella"], compend: ["\u7EB2\u8981", "\u7269", "compend"], compens: ["\u8865\u507F", "\u52A8", "compens"], comper: ["\u67E5\u660E", "\u52A8", "comper"], compes: ["\u811A\u9563", "\u7269", "compes"], competit: ["\u7ADE\u4E89", "\u52A8", "competit"], compita: ["\u8DEF\u53E3\u8282", "\u7269", "compita"], complana: ["\u94F2\u5E73", "\u52A8", "complana"], complec: ["\u62E5\u62B1", "\u52A8", "complec"], complexo: ["\u60C5\u7ED3", "\u6027", "complexo"], complor: ["\u54C0\u53F7", "\u6027", "complor"], complora: ["\u5171\u54ED", "\u52A8", "complora"], compluvi: ["\u5EAD\u9662\u9876", "\u7269", "compluvi"], compo: ["\u6574\u7406", "\u52A8", "compo"], compon: ["\u5BF9\u9F50", "\u52A8", "compon"], compos: ["\u5316\u5408\u7269", "\u7269", "compos"], compost: ["\u5806\u80A5", "\u7269", "compost"], compreh: ["\u9886\u609F", "\u7269", "compreh"], compres: ["\u538B\u7F29", "\u6027", "compres"], comprim: ["\u538B\u7D27", "\u52A8", "comprim"], comptus: ["\u4FEE\u9970", "\u6027", "comptus"], compuls: ["\u5F3A\u8FEB", "\u6027", "compuls"], compun: ["\u523A\u7A7F", "\u52A8", "compun"], compunc: ["\u6094\u6068", "\u6027", "compunc"], conat: ["\u5C1D\u8BD5", "\u52A8", "conat"], concavus: ["\u51F9\u7684", "\u6027", "concavus"], concent: ["\u6D53\u5EA6", "\u7269", "concent"], concentus: ["\u548C\u58F0", "\u7269", "concentus"], concert: ["\u97F3\u4E50\u4F1A", "\u7269", "concert"], concid: ["\u5241\u788E", "\u52A8", "concid"], concil: ["\u4F1A\u8BAE", "\u7269", "concil"], concinn: ["\u5DE5\u5DE7", "\u6027", "concinn"], concinno: ["\u5408\u5531", "\u52A8", "concinno"], concit: ["\u6FC0\u8D77", "\u52A8", "concit"], concitat: ["\u6FC0\u52A8", "\u6027", "concitat"], conclu: ["\u7ED3\u8BBA", "\u6027", "conclu"], concul: ["\u8E29\u788E", "\u52A8", "concul"], concup: ["\u8D2A\u6C42", "\u6027", "concup"], concut: ["\u6447\u64BC", "\u52A8", "concut"], cond: ["\u8C03\u5473", "\u7269", "cond"], condens: ["\u51DD\u7ED3", "\u7269", "condens"], condim: ["\u4F50\u6599", "\u7269", "condim"], condit: ["\u6761\u4EF6", "\u6027", "condit"], condito: ["\u8C03\u5473\u8005", "\u52A8", "condito"], conditu: ["\u814C\u6E0D", "\u52A8", "conditu"], condo: ["\u81F4\u54C0", "\u52A8", "condo"], condol: ["\u6170\u95EE", "\u52A8", "condol"], condon: ["\u8D60\u4E88", "\u52A8", "condon"], conduc: ["\u627F\u79DF", "\u52A8", "conduc"], conduct: ["\u4F20\u5BFC", "\u7269", "conduct"], conductor: ["\u6307\u6325", "\u7269", "conductor"], conf: ["\u540C\u76DF", "\u7269", "conf"], confarr: ["\u9EA6\u997C\u5A5A", "\u7269", "confarr"], confect: ["\u8870\u9893", "\u6027", "confect"], conferc: ["\u538B\u5B9E", "\u52A8", "conferc"], confess: ["\u4F9B\u8BA4", "\u52A8", "confess"], confid: ["\u81EA\u4FE1", "\u6027", "confid"], confirm: ["\u786E\u8BA4", "\u6027", "confirm"], confisc: ["\u6CA1\u6536", "\u7269", "confisc"], confl: ["\u7194\u70BC", "\u52A8", "confl"], conflict: ["\u51B2\u7A81", "\u6027", "conflict"], confod: ["\u6233\u7A7F", "\u52A8", "confod"], confrin: ["\u6253\u788E", "\u52A8", "confrin"], confund: ["\u6DF7\u6DC6", "\u7269", "confund"], confus: ["\u517C\u5E76", "\u7269", "confus"], congiar: ["\u8D50\u7CAE", "\u7269", "congiar"], congius: ["\u52A0\u4ED1\u91CF", "\u7269", "congius"], congrat: ["\u9053\u8D3A", "\u52A8", "congrat"], congred: ["\u76F8\u4F1A", "\u52A8", "congred"], congress: ["\u4F1A\u9762", "\u52A8", "congress"], congru: ["\u4E00\u81F4", "\u7269", "congru"], coni: ["\u914D\u5076", "\u52A8", "coni"], conic: ["\u9525\u5F62\u7684", "\u6027", "conic"], conici: ["\u63A8\u6D4B", "\u52A8", "conici"], conicio: ["\u6295\u5408", "\u52A8", "conicio"], conject: ["\u63A8\u6D4B", "\u7269", "conject"], conjug: ["\u53D8\u4F4D", "\u7269", "conjug"], conjunct: ["\u5408\u53D6", "\u6027", "conjunct"], conjur: ["\u76DF\u8A93", "\u7269", "conjur"], conloq: ["\u4EA4\u8C08", "\u52A8", "conloq"], conniv: ["\u95ED\u773C", "\u52A8", "conniv"], cons: ["\u6267\u653F\u5B98", "\u7269", "cons"], consalu: ["\u95EE\u5019", "\u52A8", "consalu"], consci: ["\u826F\u77E5", "\u52A8", "consci"], consect: ["\u8FFD\u968F", "\u52A8", "consect"], consen: ["\u540C\u611F", "\u52A8", "consen"], consenan: ["\u534F\u548C", "\u7269", "consenan"], conseq: ["\u63A8\u8BBA", "\u6027", "conseq"], conserv: ["\u4FDD\u5B58", "\u52A8", "conserv"], conservat: ["\u517B\u62A4", "\u7269", "conservat"], consili: ["\u8C0B\u7565", "\u6027", "consili"], consist: ["\u4E00\u81F4", "\u6027", "consist"], consoci: ["\u7ED3\u793E", "\u7269", "consoci"], consolat: ["\u6170\u85C9", "\u6027", "consolat"], consolor: ["\u5B89\u6170", "\u52A8", "consolor"], conson: ["\u8C10\u548C", "\u6027", "conson"], consop: ["\u50AC\u7720", "\u52A8", "consop"], consperg: ["\u6492\u7C89", "\u52A8", "consperg"], conspic: ["\u6CE8\u89C6", "\u52A8", "conspic"], const: ["\u575A\u5B9A", "\u6027", "const"], consta: ["\u5E38\u6570", "\u7269", "consta"], constan: ["\u9547\u5B9A", "\u52A8", "constan"], constel: ["\u661F\u5EA7", "\u7269", "constel"], constit: ["\u8BBE\u7ACB", "\u52A8", "constit"], constitu: ["\u5BAA\u6CD5", "\u7269", "constitu"], constr: ["\u6784\u5EFA", "\u52A8", "constr"], constrat: ["\u7532\u677F", "\u7269", "constrat"], constrin: ["\u675F\u7F1A", "\u52A8", "constrin"], consues: ["\u60EF\u4E8E", "\u52A8", "consues"], consulat: ["\u6267\u653F\u5B98\u804C", "\u7269", "consulat"], consulo: ["\u6267\u653F", "\u7269", "consulo"], consult: ["\u8BF7\u6559", "\u52A8", "consult"], consum: ["\u6D88\u8D39", "\u52A8", "consum"], consuo: ["\u7F1D\u5408", "\u52A8", "consuo"], cont: ["\u4F20\u67D3", "\u52A8", "cont"], contamin: ["\u73B7\u6C61", "\u7269", "contamin"], contem: ["\u8F7B\u8511", "\u6027", "contem"], contempl: ["\u9ED8\u89C2", "\u52A8", "contempl"], conten: ["\u6EE1\u8DB3", "\u6027", "conten"], contend: ["\u75BE\u5954", "\u52A8", "contend"], contero: ["\u78E8\u788E", "\u52A8", "contero"], conti: ["\u7EE7\u7EED", "\u52A8", "conti"], contici: ["\u591C\u6DF1", "\u7269", "contici"], contigu: ["\u90BB\u63A5", "\u7269", "contigu"], conting: ["\u63A5\u89E6", "\u6027", "conting"], continuu: ["\u8FDE\u7EED", "\u7269", "continuu"], contr: ["\u76F8\u53CD", "\u6027", "contr"], contrac: ["\u6536\u7F29", "\u6027", "contrac"], contradict: ["\u77DB\u76FE", "\u6027", "contradict"], contrast: ["\u5BF9\u6BD4", "\u7269", "contrast"], contrec: ["\u6469\u6332", "\u6027", "contrec"], contrect: ["\u629A\u5F04", "\u52A8", "contrect"], controvers: ["\u4E89\u8BBC", "\u52A8", "controvers"], contu: ["\u6253\u91CF", "\u52A8", "contu"], contumac: ["\u5014\u5F3A", "\u6027", "contumac"], contund: ["\u6363\u788E", "\u52A8", "contund"], contus: ["\u957F\u6746", "\u7269", "contus"], convall: ["\u5CE1\u8C37", "\u7269", "convall"], conve: ["\u8F6C\u53D8", "\u52A8", "conve"], convect: ["\u5BF9\u6D41", "\u7269", "convect"], convel: ["\u62D4\u8D77", "\u52A8", "convel"], convenio: ["\u4F1A\u89C1", "\u52A8", "convenio"], convent: ["\u805A\u4F1A", "\u7269", "convent"], conver: ["\u6536\u655B", "\u7269", "conver"], convers: ["\u6362\u7B97", "\u7269", "convers"], convexus: ["\u51F8\u7684", "\u6027", "convexus"], convi: ["\u5BB4\u996E", "\u7269", "convi"], convic: ["\u8FB1\u9A82", "\u52A8", "convic"], convit: ["\u5171\u6816", "\u7269", "convit"], conviva: ["\u540C\u5E2D", "\u52A8", "conviva"], convivo: ["\u5171\u5BB4", "\u52A8", "convivo"], convuls: ["\u62BD\u6410", "\u7269", "convuls"], cophin: ["\u63D0\u7BEE", "\u7269", "cophin"], copios: ["\u4E30\u5BCC", "\u6027", "copios"], coqu: ["\u70F9\u3001\u716E", "\u7269", "coqu"], corbis: ["\u7CAE\u7B50", "\u7269", "corbis"], cord: ["\u5FC3", "\u7269", "cord"], cordat: ["\u660E\u667A", "\u6027", "cordat"], cori: ["\u76AE\u9769", "\u7269", "cori"], coriar: ["\u5236\u9769", "\u52A8", "coriar"], corn: ["\u517D\u89D2", "\u7269", "corn"], cornic: ["\u53F7\u89D2\u624B", "\u52A8", "cornic"], cornici: ["\u5439\u89D2", "\u52A8", "cornici"], coroll: ["\u63A8\u8BBA", "\u7269", "coroll"], corollar: ["\u7CFB", "\u6027", "corollar"], coron: ["\u51A0\u5195", "\u7269", "coron"], coronar: ["\u82B1\u51A0\u5320", "\u7269", "coronar"], corp: ["\u8EAB\u4F53", "\u7269", "corp"], correl: ["\u76F8\u5173", "\u7269", "correl"], corrip: ["\u652B\u53D6", "\u52A8", "corrip"], corrod: ["\u8150\u8680", "\u52A8", "corrod"], corru: ["\u8150\u5316", "\u52A8", "corru"], corrui: ["\u683D\u5012", "\u52A8", "corrui"], cort: ["\u6811\u76AE", "\u7269", "cort"], cortil: ["\u5EAD\u9662", "\u7269", "cortil"], coruscat: ["\u7535\u5149", "\u7269", "coruscat"], coryc: ["\u7EC3\u62F3\u888B", "\u52A8", "coryc"], corymb: ["\u4E32", "\u7269", "corymb"], cosinus: ["\u4F59\u5F26", "\u7269", "cosinus"], cosm: ["\u79E9\u5E8F\u3001\u5B87\u5B99", "\u7269", "cosm"], cosmo: ["\u5B87\u5B99", "\u7269", "cosmo"], cosmog: ["\u5B87\u5B99\u8D77\u6E90", "\u7269", "cosmog"], costa: ["\u808B", "\u7269", "costa"], crapul: ["\u66B4\u996E", "\u52A8", "crapul"], crapula: ["\u5BBF\u9189", "\u52A8", "crapula"], crass: ["\u539A", "\u6027", "crass"], crater: ["\u706B\u5C71\u53E3", "\u7269", "crater"], crati: ["\u7EDF\u6CBB", "\u7269", "crati"], creber: ["\u5BC6\u96C6", "\u6027", "creber"], cred: ["\u76F8\u4FE1", "\u52A8", "cred"], creden: ["\u4FE1\u5FF5", "\u6027", "creden"], credit: ["\u503A\u6743", "\u52A8", "credit"], credo: ["\u8D37\u51FA", "\u52A8", "credo"], credul: ["\u8F7B\u4FE1", "\u6027", "credul"], cremio: ["\u67F4\u706B", "\u52A8", "cremio"], cremo: ["\u711A", "\u52A8", "cremo"], cremor: ["\u6D53\u6C64", "\u52A8", "cremor"], creo: ["\u9009\u4EFB", "\u52A8", "creo"], crepida: ["\u8E44\u94C1", "\u7269", "crepida"], crepidin: ["\u8DEF\u7F18", "\u7269", "crepidin"], crepit: ["\u567C\u556A", "\u6027", "crepit"], crepitac: ["\u6447\u54CD\u5668", "\u7269", "crepitac"], crepitu: ["\u7206\u54CD", "\u52A8", "crepitu"], crepitus: ["\u7206\u88C2\u58F0", "\u7269", "crepitus"], crepo: ["\u7206\u54CD", "\u52A8", "crepo"], crepund: ["\u6447\u94C3", "\u7269", "crepund"], crepus: ["\u9EC4\u660F", "\u7269", "crepus"], cres: ["\u751F\u957F", "\u52A8", "cres"], cret: ["\u767D\u57A9", "\u7269", "cret"], cribr: ["\u7B5B", "\u7269", "cribr"], cribrat: ["\u7B5B\u7C89", "\u52A8", "cribrat"], crim: ["\u7F6A", "\u7269", "crim"], crinal: ["\u7C2A", "\u7269", "crinal"], crinale: ["\u53D1\u9488", "\u7269", "crinale"], crinis: ["\u53D1\u4E1D", "\u7269", "crinis"], crisis: ["\u5371\u8C61", "\u7269", "crisis"], crisp: ["\u9165\u8106\u58F0", "\u6027", "crisp"], crist: ["\u51A0\u7FBD", "\u7269", "crist"], crit: ["\u6807\u51C6", "\u6570", "crit"], critic: ["\u6279\u8BC4\u5BB6", "\u7269", "critic"], crocus: ["\u756A\u7EA2\u82B1", "\u52A8", "crocus"], cron: ["\u65F6\u95F4\u3001\u65F6\u5E8F", "\u7269", "cron"], crotalum: ["\u54CD\u677F", "\u7269", "crotalum"], cruci: ["\u714E\u71AC", "\u6027", "cruci"], cruciat: ["\u9177\u5211", "\u7269", "cruciat"], crucib: ["\u5769\u57DA", "\u7269", "crucib"], crud: ["\u751F\u3001\u672A\u719F", "\u6027", "crud"], crust: ["\u9165\u76AE", "\u7269", "crust"], crustat: ["\u8D34\u9762", "\u7269", "crustat"], crustulum: ["\u9165\u70B9", "\u6027", "crustulum"], crutch: ["\u62D0\u6756", "\u7269", "crutch"], crux: ["\u5341\u5B57\u5211", "\u7269", "crux"], cryo: ["\u51B7", "\u7269", "cryo"], crypt: ["\u52A0\u5BC6", "\u7269", "crypt"], crypto: ["\u9690\u79D8", "\u7269", "crypto"], cryst: ["\u6C34\u6676", "\u7269", "cryst"], crystallo: ["\u6676", "\u7269", "crystallo"], cub: ["\u5367\u3001\u8EBA", "\u7269", "cub"], cubat: ["\u5BB9\u79EF", "\u7269", "cubat"], cubati: ["\u5367\u7720", "\u52A8", "cubati"], cubicul: ["\u4F8D\u5BDD\u5B98", "\u7269", "cubicul"], cubicus: ["\u7ACB\u65B9\u7684", "\u6027", "cubicus"], cubil: ["\u5367\u69BB", "\u7269", "cubil"], cubit: ["\u8098\u5C3A", "\u7269", "cubit"], cubitus: ["\u8098", "\u7269", "cubitus"], cucull: ["\u515C\u5E3D", "\u7269", "cucull"], cucurbi: ["\u74DC", "\u7269", "cucurbi"], culcitra: ["\u978D\u8925", "\u7269", "culcitra"], culin: ["\u53A8\u827A", "\u7269", "culin"], culmen: ["\u5C4B\u810A", "\u7269", "culmen"], culp: ["\u8FC7\u5931", "\u6027", "culp"], cult: ["\u5D07\u62DC", "\u7269", "cult"], cultr: ["\u5200", "\u7269", "cultr"], cultus: ["\u4FEE\u9970", "\u6027", "cultus"], cumul: ["\u5806\u53E0", "\u52A8", "cumul"], cumulo: ["\u79EF\u96E8\u4E91", "\u7269", "cumulo"], cunae: ["\u6447\u7BEE", "\u7269", "cunae"], cunct: ["\u8FDF\u7F13", "\u6027", "cunct"], cuncta: ["\u62D6\u5EF6\u8005", "\u6027", "cuncta"], cune: ["\u6954", "\u7269", "cune"], cup: ["\u6B32\u671B", "\u52A8", "cup"], cupa: ["\u9152\u6876", "\u52A8", "cupa"], cupar: ["\u6876\u5320", "\u52A8", "cupar"], cupr: ["\u94DC", "\u7269", "cupr"], cupula: ["\u58F3\u6597", "\u7269", "cupula"], cura: ["\u7167\u62A4", "\u52A8", "cura"], curator: ["\u7B56\u5C55\u4EBA", "\u7269", "curator"], curia: ["\u8BAE\u4E8B\u5802", "\u7269", "curia"], curio: ["\u597D\u5947", "\u6027", "curio"], curr: ["\u8F66\u3001\u5954\u9A70", "\u7269", "curr"], currency: ["\u901A\u8D27", "\u52A8", "currency"], curs: ["\u4FE1\u4F7F", "\u7269", "curs"], curso: ["\u8DD1\u9A6C", "\u7269", "curso"], cursus: ["\u8BFE\u7A0B", "\u7269", "cursus"], curvus: ["\u5F2F\u7684", "\u6027", "curvus"], cuspis: ["\u77DB\u5C16", "\u52A8", "cuspis"], cust: ["\u770B\u5B88", "\u7269", "cust"], cut: ["\u80A4", "\u52A8", "cut"], cyath: ["\u676F\u91CF", "\u7269", "cyath"], cyclo: ["\u73AF", "\u7269", "cyclo"], cyclon: ["\u6C14\u65CB", "\u7269", "cyclon"], cylind: ["\u6C7D\u7F38", "\u7269", "cylind"], cymatium: ["\u7EBF\u811A", "\u7269", "cymatium"], cymb: ["\u94D9\u94B9", "\u7269", "cymb"], cyto: ["\u7EC6\u80DE", "\u7269", "cyto"], dam: ["\u635F\u5931", "\u52A8", "dam"], damn: ["\u4E8F\u635F", "\u52A8", "damn"], damnat: ["\u5224\u7F6A", "\u52A8", "damnat"], daps: ["\u76DB\u5BB4", "\u52A8", "daps"], dapsil: ["\u4E30\u76DB", "\u6027", "dapsil"], dealba: ["\u7C89\u5237\u5320", "\u7269", "dealba"], deambul: ["\u6563\u6B65", "\u52A8", "deambul"], debeo: ["\u6B20", "\u52A8", "debeo"], debet: ["\u501F\u65B9", "\u7269", "debet"], debilit: ["\u8870\u5F31", "\u6027", "debilit"], debt: ["\u503A\u52A1", "\u52A8", "debt"], dec: ["\u5341", "\u6570", "dec"], decad: ["\u8870\u8D25", "\u52A8", "decad"], decant: ["\u541F\u5531", "\u52A8", "decant"], decanus: ["\u5341\u4EBA\u957F", "\u7269", "decanus"], decern: ["\u88C1\u5B9A", "\u52A8", "decern"], decidu: ["\u843D\u53F6", "\u7269", "decidu"], decipula: ["\u9677\u9631", "\u52A8", "decipula"], declam: ["\u6717\u8BF5", "\u52A8", "declam"], declar: ["\u58F0\u660E", "\u52A8", "declar"], declension: ["\u53D8\u683C", "\u7269", "declension"], declin: ["\u8D64\u7EAC", "\u7269", "declin"], decoct: ["\u7834\u4EA7", "\u7269", "decoct"], decoll: ["\u65A9\u9996", "\u7269", "decoll"], decoqu: ["\u71AC\u716E", "\u52A8", "decoqu"], decor: ["\u96C5\u81F4", "\u6027", "decor"], decr: ["\u6CD5\u4EE4", "\u7269", "decr"], decrepi: ["\u8870\u673D", "\u7269", "decrepi"], decubi: ["\u5367\u59FF", "\u52A8", "decubi"], decuma: ["\u4EC0\u4E00\u7A0E", "\u7269", "decuma"], decuri: ["\u5341\u4EBA\u957F", "\u7269", "decuri"], decurio: ["\u5341\u592B\u957F", "\u7269", "decurio"], dedecus: ["\u803B\u8FB1", "\u6027", "dedecus"], dedit: ["\u6295\u964D", "\u52A8", "dedit"], deduc: ["\u6F14\u7ECE", "\u6027", "deduc"], deduct: ["\u9001\u884C", "\u52A8", "deduct"], deducti: ["\u62A4\u9001", "\u52A8", "deducti"], deductio: ["\u8FCE\u4EB2", "\u7269", "deductio"], def: ["\u9632\u5FA1", "\u52A8", "def"], defaec: ["\u6F84\u6E05", "\u6027", "defaec"], defati: ["\u4F7F\u75B2", "\u52A8", "defati"], defect: ["\u53DB\u79BB", "\u7269", "defect"], defend: ["\u62A4\u536B", "\u52A8", "defend"], defess: ["\u7CBE\u75B2\u529B\u7AED", "\u6027", "defess"], defi: ["\u5931\u8D25", "\u52A8", "defi"], deficit: ["\u8D64\u5B57", "\u52A8", "deficit"], defigo: ["\u9489\u7262", "\u52A8", "defigo"], defin: ["\u5B9A\u4E49", "\u7269", "defin"], deflation: ["\u901A\u7F29", "\u52A8", "deflation"], deform: ["\u4E11\u964B", "\u6027", "deform"], defrut: ["\u679C\u6D46", "\u7269", "defrut"], deglut: ["\u541E\u54BD", "\u52A8", "deglut"], degust: ["\u54C1\u5C1D", "\u52A8", "degust"], deici: ["\u62C6\u5012", "\u52A8", "deici"], delator: ["\u544A\u53D1\u8005", "\u52A8", "delator"], deliber: ["\u6289\u62E9", "\u7269", "deliber"], delic: ["\u8FDD\u6CD5", "\u52A8", "delic"], delica: ["\u5A07\u5F31", "\u6027", "delica"], delubr: ["\u795E\u9F9B", "\u7269", "delubr"], deman: ["\u9700\u6C42", "\u52A8", "deman"], demen: ["\u75AF\u72C2", "\u6027", "demen"], demo: ["\u6C11\u4F17", "\u7269", "demo"], democr: ["\u6C11\u4E3B", "\u7269", "democr"], demol: ["\u62C6\u6BC1", "\u52A8", "demol"], demonst: ["\u6F14\u793A", "\u52A8", "demonst"], demonstr: ["\u8BBA\u8BC1", "\u7269", "demonstr"], denar: ["\u94F6\u94B1", "\u52A8", "denar"], dens: ["\u5BC6", "\u6027", "dens"], dent: ["\u9F7F", "\u7269", "dent"], dental: ["\u7281\u9F7F", "\u7269", "dental"], dentat: ["\u9F7F\u8F6E", "\u7269", "dentat"], denticu: ["\u9F7F\u9970", "\u7269", "denticu"], denud: ["\u88F8\u9732", "\u52A8", "denud"], denunt: ["\u901A\u4EE4", "\u52A8", "denunt"], depel: ["\u63A8\u4E0B", "\u52A8", "depel"], depil: ["\u62D4\u6BDB", "\u7269", "depil"], deping: ["\u63CF\u753B", "\u52A8", "deping"], deplor: ["\u75DB\u54ED", "\u52A8", "deplor"], depon: ["\u7F62\u9EDC", "\u52A8", "depon"], deport: ["\u653E\u9010", "\u52A8", "deport"], deposit: ["\u5BC4\u5B58", "\u52A8", "deposit"], deprec: ["\u7948\u514D", "\u52A8", "deprec"], depress: ["\u6291\u90C1", "\u6027", "depress"], deprim: ["\u538B\u4E0B", "\u52A8", "deprim"], derid: ["\u8BBD\u7B11", "\u52A8", "derid"], deridic: ["\u6781\u53EF\u7B11", "\u52A8", "deridic"], deriv: ["\u5BFC\u6570", "\u7269", "deriv"], dermato: ["\u76AE", "\u7269", "dermato"], desali: ["\u8131\u76D0", "\u7269", "desali"], desc: ["\u4E0B\u964D", "\u52A8", "desc"], descr: ["\u63CF\u5199", "\u7269", "descr"], desec: ["\u5272\u4E0B", "\u52A8", "desec"], deser: ["\u53DB\u9003", "\u52A8", "deser"], desere: ["\u5F03", "\u52A8", "desere"], desert: ["\u8352\u6F20", "\u7269", "desert"], deses: ["\u61D2\u6563", "\u6027", "deses"], desid: ["\u95F2\u5750", "\u52A8", "desid"], desider: ["\u7737\u604B", "\u6027", "desider"], design: ["\u6307\u6D3E", "\u52A8", "design"], desip: ["\u80E1\u6D82", "\u52A8", "desip"], desp: ["\u7EDD\u671B", "\u6027", "desp"], despic: ["\u8F7B\u89C6", "\u52A8", "despic"], despond: ["\u6D88\u6C89", "\u6027", "despond"], destin: ["\u51B3\u610F", "\u6027", "destin"], destru: ["\u7834\u574F", "\u52A8", "destru"], desud: ["\u8F9B\u52B3", "\u52A8", "desud"], desultor: ["\u9A6C\u672F\u5E08", "\u7269", "desultor"], deterg: ["\u53BB\u6C61", "\u52A8", "deterg"], determ: ["\u884C\u5217\u5F0F", "\u7269", "determ"], detero: ["\u64E6\u635F", "\u52A8", "detero"], deters: ["\u64E6\u51C0", "\u6027", "deters"], detest: ["\u618E\u6076", "\u6027", "detest"], detesta: ["\u5ACC\u6076", "\u6027", "detesta"], detrah: ["\u62C9\u4E0B", "\u52A8", "detrah"], deveh: ["\u8FD0\u4E0B", "\u52A8", "deveh"], devers: ["\u9A7F\u820D", "\u7269", "devers"], devinc: ["\u7D27\u7F1A", "\u52A8", "devinc"], devot: ["\u5949\u732E", "\u7269", "devot"], devov: ["\u8BC5\u5492", "\u52A8", "devov"], dext: ["\u53F3", "\u7269", "dext"], dexter: ["\u53F3\u4FA7", "\u7269", "dexter"], dharma: ["\u6CD5\u7406", "\u7269", "dharma"], diadema: ["\u738B\u51A0", "\u7269", "diadema"], diag: ["\u5BF9\u89D2", "\u7269", "diag"], diagn: ["\u8BCA\u65AD", "\u52A8", "diagn"], dial: ["\u65B9\u8A00", "\u7269", "dial"], dialect: ["\u8FA9\u8BC1", "\u6027", "dialect"], dialysis: ["\u900F\u6790", "\u7269", "dialysis"], diar: ["\u65E5\u8BB0", "\u7269", "diar"], diarrh: ["\u8179\u6CFB", "\u7269", "diarrh"], diaul: ["\u5F80\u8FD4\u8DD1", "\u52A8", "diaul"], dicax: ["\u597D\u8BA5\u8BBD", "\u52A8", "dicax"], dict: ["\u72EC\u88C1", "\u7269", "dict"], dictatur: ["\u72EC\u88C1\u804C", "\u7269", "dictatur"], didact: ["\u6559\u5B66\u6CD5", "\u7269", "didact"], didactic: ["\u6559\u6388\u6CD5", "\u7269", "didactic"], didas: ["\u8BB2\u6388", "\u7269", "didas"], didascal: ["\u6559\u6761", "\u7269", "didascal"], dif: ["\u5DEE\u5F02", "\u6027", "dif"], differen: ["\u5FAE\u5206", "\u7269", "differen"], diffi: ["\u4E0D\u4FE1", "\u6027", "diffi"], diffic: ["\u56F0\u96BE", "\u6027", "diffic"], diffrin: ["\u7838\u88C2", "\u52A8", "diffrin"], diffus: ["\u6269\u6563", "\u52A8", "diffus"], digest: ["\u6C47\u7E82", "\u52A8", "digest"], digit: ["\u6307\u5BBD", "\u7269", "digit"], digital: ["\u6570\u5B57", "\u7269", "digital"], dijud: ["\u8FA8\u6790", "\u7269", "dijud"], dilace: ["\u6495\u788E", "\u52A8", "dilace"], dilect: ["\u73CD\u7231\u8005", "\u6027", "dilect"], diligo: ["\u73CD\u7231", "\u6027", "diligo"], dilu: ["\u7A00\u91CA", "\u52A8", "dilu"], dilucu: ["\u7834\u6653", "\u7269", "dilucu"], diluv: ["\u5927\u6D2A\u6C34", "\u7269", "diluv"], diluvies: ["\u6D2A\u6CDB", "\u7269", "diluvies"], dim: ["\u7EF4\u5EA6", "\u7269", "dim"], dimens: ["\u5C3A\u5BF8", "\u7269", "dimens"], dimitt: ["\u653E\u5F00", "\u52A8", "dimitt"], diod: ["\u4E8C\u6781\u7BA1", "\u7269", "diod"], dioptra: ["\u6D4B\u89D2\u5668", "\u7269", "dioptra"], diphthe: ["\u767D\u5589", "\u7269", "diphthe"], diplom: ["\u6587\u4E66", "\u7269", "diplom"], diptych: ["\u53CC\u6298\u677F", "\u7269", "diptych"], dirip: ["\u63A0\u593A", "\u52A8", "dirip"], diruo: ["\u62C6\u6BC1", "\u52A8", "diruo"], dirus: ["\u53EF\u6016\u7684", "\u6027", "dirus"], disapp: ["\u5931\u671B", "\u6027", "disapp"], disc: ["\u5B66\u751F", "\u7269", "disc"], discal: ["\u8D64\u8DB3", "\u52A8", "discal"], disce: ["\u8FA8\u522B", "\u52A8", "disce"], discept: ["\u8FA9\u8BBA", "\u7269", "discept"], discern: ["\u660E\u8FA8", "\u7269", "discern"], discin: ["\u89E3\u5E26", "\u52A8", "discin"], discipul: ["\u95E8\u751F", "\u7269", "discipul"], disco: ["\u5B66\u4E60", "\u52A8", "disco"], discr: ["\u5371\u5883", "\u52A8", "discr"], discrim: ["\u53D1\u7F1D", "\u7269", "discrim"], discur: ["\u5954\u8D70", "\u52A8", "discur"], discus: ["\u94C1\u997C", "\u52A8", "discus"], discut: ["\u9707\u6563", "\u52A8", "discut"], disjunct: ["\u6790\u53D6", "\u6027", "disjunct"], dispel: ["\u9A71\u6563", "\u52A8", "dispel"], dispens: ["\u8C03\u5EA6", "\u7269", "dispens"], disperg: ["\u6563\u5F00", "\u52A8", "disperg"], dispici: ["\u8FA8\u8BA4", "\u52A8", "dispici"], dispon: ["\u8C03\u5EA6", "\u52A8", "dispon"], disput: ["\u8FA9\u8BBA", "\u7269", "disput"], dissec: ["\u5256\u5F00", "\u52A8", "dissec"], dissent: ["\u5F02\u8BAE", "\u52A8", "dissent"], dissertat: ["\u5B66\u4F4D\u8BBA\u6587", "\u7269", "dissertat"], dissip: ["\u62C6\u6563", "\u52A8", "dissip"], disso: ["\u5206\u89E3", "\u52A8", "disso"], disson: ["\u4E0D\u8C10", "\u6027", "disson"], dissonan: ["\u4E0D\u534F\u548C", "\u7269", "dissonan"], dist: ["\u8DDD\u79BB", "\u7269", "dist"], disti: ["\u84B8\u998F", "\u52A8", "disti"], distribut: ["\u5206\u914D", "\u52A8", "distribut"], dit: ["\u5BCC\u6709", "\u6027", "dit"], diu: ["\u4E45\u3001\u957F\u4E45", "\u7269", "diu"], diurn: ["\u65E5\u65F6", "\u7269", "diurn"], div: ["\u5206\u5F00\u3001\u533A\u5206", "\u52A8", "div"], divel: ["\u626F\u5F00", "\u52A8", "divel"], diver: ["\u5C94\u53E3", "\u7269", "diver"], diverg: ["\u53D1\u6563", "\u7269", "diverg"], diversit: ["\u591A\u6837", "\u7269", "diversit"], divid: ["\u6574\u9664", "\u6027", "divid"], dividend: ["\u80A1\u606F", "\u52A8", "dividend"], divin: ["\u795E\u6027\u3001\u5360\u535C", "\u7269", "divin"], divina: ["\u5360\u6D4B", "\u52A8", "divina"], divus: ["\u795E\u660E", "\u7269", "divus"], dix: ["\u8BF4\u3001\u547D\u4EE4", "\u52A8", "dix"], do: ["\u7ED9", "\u52A8", "do"], doc: ["\u6559", "\u7269", "doc"], doct: ["\u5B66\u95EE\u3001\u6559\u4E49", "\u7269", "doct"], doctus: ["\u535A\u5B66\u7684", "\u52A8", "doctus"], dok: ["\u7801\u5934", "\u7269", "dok"], dol: ["\u75BC\u75DB", "\u52A8", "dol"], dolabra: ["\u951B\u65A7", "\u7269", "dolabra"], doliar: ["\u6876\u5320", "\u52A8", "doliar"], dolo: ["\u524A\u5E73", "\u52A8", "dolo"], domin: ["\u6240\u6709\u6743", "\u52A8", "domin"], domina: ["\u5973\u4E3B\u4EBA", "\u7269", "domina"], dominor: ["\u4E3B\u5BB0", "\u52A8", "dominor"], dominus: ["\u4E3B\u4EBA\u3001\u5148\u751F", "\u7269", "dominus"], domit: ["\u9A6F\u670D", "\u52A8", "domit"], domus: ["\u5B85", "\u7269", "domus"], donativ: ["\u8D4F\u8D50", "\u7269", "donativ"], dormi: ["\u7761", "\u52A8", "dormi"], dormit: ["\u6253\u76F9", "\u52A8", "dormit"], dormitor: ["\u5367\u8005", "\u52A8", "dormitor"], dorsum: ["\u80CC", "\u7269", "dorsum"], dosis: ["\u5242\u91CF", "\u7269", "dosis"], dot: ["\u5AC1\u5986", "\u7269", "dot"], downp: ["\u503E\u76C6", "\u7269", "downp"], doxo: ["\u610F\u89C1", "\u6027", "doxo"], drach: ["\u8D27\u5E01\u5355\u4F4D", "\u52A8", "drach"], drachma: ["\u5FB7\u62C9\u514B\u9A6C", "\u7269", "drachma"], drainag: ["\u6392\u6C34", "\u7269", "drainag"], dread: ["\u754F\u60E7", "\u6027", "dread"], drizz: ["\u7EC6\u96E8", "\u7269", "drizz"], droug: ["\u5E72\u65F1", "\u7269", "droug"], du: ["\u4E8C", "\u6570", "du"], dual: ["\u4E8C\u5143", "\u6027", "dual"], dub: ["\u6000\u7591", "\u52A8", "dub"], dubit: ["\u8D28\u7591", "\u7269", "dubit"], duc: ["\u5F15\u5BFC\u3001\u5E26\u9886", "\u52A8", "duc"], duco: ["\u5F15", "\u52A8", "duco"], duet: ["\u4E8C\u91CD\u594F", "\u7269", "duet"], dulc: ["\u751C", "\u7269", "dulc"], dulcedo: ["\u7518\u5473", "\u6027", "dulcedo"], dulciar: ["\u751C\u98DF", "\u6027", "dulciar"], dune: ["\u6C99\u4E18", "\u7269", "dune"], duplus: ["\u53CC\u500D", "\u7269", "duplus"], dure: ["\u575A\u786C", "\u6027", "dure"], durit: ["\u575A\u786C\u611F", "\u6027", "durit"], dux: ["\u7EDF\u5E05", "\u52A8", "dux"], dyn: ["\u529B\u3001\u80FD\u91CF", "\u7269", "dyn"], dysent: ["\u75E2\u75BE", "\u7269", "dysent"], easel: ["\u753B\u67B6", "\u7269", "easel"], ebriet: ["\u9189\u9152", "\u52A8", "ebriet"], ebrios: ["\u55DC\u9152", "\u52A8", "ebrios"], ebur: ["\u8C61\u7259", "\u7269", "ebur"], eclip: ["\u8680", "\u7269", "eclip"], ecol: ["\u751F\u6001", "\u7269", "ecol"], ecos: ["\u751F\u6001", "\u7269", "ecos"], ecosys: ["\u751F\u6001\u7CFB\u7EDF", "\u7269", "ecosys"], ecsta: ["\u72C2\u559C", "\u6027", "ecsta"], ectom: ["\u5207\u9664", "\u6027", "ectom"], eculeus: ["\u62F7\u95EE\u67B6", "\u7269", "eculeus"], edic: ["\u9881\u5E03", "\u52A8", "edic"], edict: ["\u544A\u793A", "\u7269", "edict"], edisc: ["\u719F\u8BB0", "\u52A8", "edisc"], editor: ["\u7F16\u8F91", "\u7269", "editor"], edo: ["\u5403", "\u52A8", "edo"], educo: ["\u517B\u80B2", "\u52A8", "educo"], eff: ["\u7ED3\u679C", "\u6027", "eff"], effar: ["\u5BA3\u8BF4", "\u52A8", "effar"], effe: ["\u8D77\u6CE1", "\u52A8", "effe"], effetus: ["\u8870\u7AED", "\u6027", "effetus"], effigi: ["\u8096\u50CF", "\u52A8", "effigi"], effund: ["\u503E\u5012", "\u52A8", "effund"], egens: ["\u532E\u4E4F", "\u6027", "egens"], egenu: ["\u7A77\u56F0", "\u6027", "egenu"], egest: ["\u8D2B\u56F0", "\u6027", "egest"], ego: ["\u81EA\u6211", "\u6027", "ego"], egred: ["\u8D70\u51FA", "\u52A8", "egred"], eiul: ["\u54C0\u53F7", "\u52A8", "eiul"], elabor: ["\u7CBE\u4F5C", "\u52A8", "elabor"], elan: ["\u6D3B\u529B", "\u52A8", "elan"], elarg: ["\u6177\u6168\u8D60", "\u52A8", "elarg"], elast: ["\u5F39\u6027", "\u7269", "elast"], elat: ["\u5F97\u610F", "\u6027", "elat"], elector: ["\u9009\u6C11", "\u7269", "elector"], electr: ["\u7535", "\u7269", "electr"], electro: ["\u7535\u6781", "\u7269", "electro"], elegan: ["\u4F18\u96C5", "\u6027", "elegan"], elegy: ["\u633D\u6B4C", "\u7269", "elegy"], eleme: ["\u8981\u7D20", "\u6027", "eleme"], elench: ["\u53CD\u9A73\u6CD5", "\u7269", "elench"], elevat: ["\u63D0\u5347", "\u7269", "elevat"], elig: ["\u9009\u62E9", "\u52A8", "elig"], elite: ["\u7CBE\u82F1", "\u7269", "elite"], elix: ["\u71AC\u716E", "\u7269", "elix"], elogium: ["\u5893\u5FD7\u94ED", "\u7269", "elogium"], eloq: ["\u9648\u8BF4", "\u52A8", "eloq"], elucub: ["\u82E6\u7814", "\u52A8", "elucub"], elutri: ["\u6DD8\u51C0", "\u6027", "elutri"], elys: ["\u4E50\u571F", "\u7269", "elys"], emal: ["\u73D0\u7405", "\u52A8", "emal"], embarr: ["\u5C34\u5C2C", "\u6027", "embarr"], emblem: ["\u9576\u5D4C\u56FE", "\u7269", "emblem"], emboli: ["\u63D2\u66F2", "\u7269", "emboli"], emerg: ["\u6D6E\u51FA", "\u52A8", "emerg"], emia: ["\u8840\u75C7", "\u6027", "emia"], emig: ["\u8FC1\u51FA", "\u52A8", "emig"], emissar: ["\u6392\u6C34\u9053", "\u7269", "emissar"], emissi: ["\u653E\u51FA\u4E4B\u7269", "\u52A8", "emissi"], emitt: ["\u53D1\u5C04", "\u52A8", "emitt"], emo: ["\u4E70", "\u52A8", "emo"], emot: ["\u60C5\u7EEA", "\u6027", "emot"], empath: ["\u5171\u60C5", "\u6027", "empath"], emplast: ["\u818F\u836F", "\u52A8", "emplast"], empori: ["\u5546\u57E0", "\u7269", "empori"], empt: ["\u8D2D\u4E70", "\u52A8", "empt"], emptor: ["\u4E70\u4E3B", "\u52A8", "emptor"], enarr: ["\u8BE6\u8FF0", "\u52A8", "enarr"], encaust: ["\u8721\u753B", "\u7269", "encaust"], endang: ["\u6FD2\u5371", "\u7269", "endang"], ener: ["\u80FD\u91CF", "\u52A8", "ener"], enerv: ["\u65E0\u529B", "\u6027", "enerv"], engrav: ["\u7248\u753B", "\u7269", "engrav"], enne: ["\u4E5D", "\u6570", "enne"], enorm: ["\u5F02\u5E38\u5927", "\u6027", "enorm"], ensemble: ["\u5408\u594F", "\u7269", "ensemble"], ent: ["\u5B58\u5728\u8005\u3001\u5B9E\u4F53", "\u52A8", "ent"], entail: ["\u8574\u6DB5", "\u6027", "entail"], entero: ["\u80A0", "\u7269", "entero"], enthymem: ["\u7701\u7565\u63A8\u7406", "\u7269", "enthymem"], entropi: ["\u71B5", "\u7269", "entropi"], enzym: ["\u9176", "\u52A8", "enzym"], eo: ["\u53BB", "\u52A8", "eo"], ephemer: ["\u4F20\u5355", "\u7269", "ephemer"], ephipp: ["\u9A6C\u978D", "\u7269", "ephipp"], epic: ["\u53F2\u8BD7", "\u7269", "epic"], epilog: ["\u7ED3\u8BED", "\u52A8", "epilog"], episode: ["\u63D2\u66F2", "\u7269", "episode"], epist: ["\u4E66\u4FE1", "\u7269", "epist"], episty: ["\u67F1\u9876", "\u7269", "episty"], epitom: ["\u6458\u8981", "\u7269", "epitom"], epul: ["\u5BB4\u98E8", "\u52A8", "epul"], epulor: ["\u8D74\u5BB4", "\u52A8", "epulor"], equ: ["\u76F8\u7B49\u3001\u5747\u8861", "\u6027", "equ"], equator: ["\u8D64\u9053", "\u7269", "equator"], equester: ["\u9A91\u58EB\u9636", "\u7269", "equester"], equi: ["\u9A6C", "\u7269", "equi"], equil: ["\u5E73\u8861", "\u52A8", "equil"], equile: ["\u9A6C\u53A9", "\u7269", "equile"], equin: ["\u5206\u65E5", "\u7269", "equin"], equirr: ["\u8D5B\u9A6C\u8282", "\u7269", "equirr"], equiso: ["\u9A6C\u592B", "\u52A8", "equiso"], equit: ["\u9A91\u58EB", "\u7269", "equit"], equita: ["\u9A91\u5175", "\u52A8", "equita"], equival: ["\u7B49\u4EF7", "\u6027", "equival"], era: ["\u7EAA\u5143\u3001\u65F6\u671F", "\u7269", "era"], ergast: ["\u7262\u623F", "\u7269", "ergast"], ergo: ["\u529F", "\u7269", "ergo"], erigo: ["\u7AD6\u7ACB", "\u52A8", "erigo"], erip: ["\u62A2\u51FA", "\u52A8", "erip"], erogat: ["\u53D1\u653E", "\u7269", "erogat"], erosion: ["\u4FB5\u8680", "\u7269", "erosion"], err: ["\u9519\u8BEF\u3001\u8FF7\u8BEF", "\u52A8", "err"], errab: ["\u5F98\u5F8A", "\u52A8", "errab"], eru: ["\u535A\u5B66", "\u7269", "eru"], erudio: ["\u6559\u5BFC", "\u52A8", "erudio"], eruptio: ["\u55B7\u53D1", "\u7269", "eruptio"], esca: ["\u8BF1\u9975", "\u52A8", "esca"], esculent: ["\u98DF\u54C1", "\u6027", "esculent"], esoter: ["\u79D8\u6559", "\u52A8", "esoter"], essay: ["\u968F\u7B14", "\u7269", "essay"], essed: ["\u6218\u8F66", "\u7269", "essed"], essen: ["\u672C\u8D28", "\u6027", "essen"], est: ["\u5B58\u5728\u3001\u662F", "\u52A8", "est"], estheto: ["\u611F\u89C9", "\u6027", "estheto"], estivo: ["\u590F\u7720", "\u7269", "estivo"], estu: ["\u6FC0\u594B", "\u6027", "estu"], esurio: ["\u997F", "\u52A8", "esurio"], etch: ["\u8680\u523B", "\u7269", "etch"], ethno: ["\u6C11\u65CF", "\u7269", "ethno"], etho: ["\u4E60\u60EF", "\u6027", "etho"], etym: ["\u8BCD\u6E90", "\u7269", "etym"], euphor: ["\u6B23\u5FEB", "\u6027", "euphor"], evap: ["\u84B8\u53D1", "\u52A8", "evap"], eveh: ["\u8FD0\u51FA", "\u52A8", "eveh"], evell: ["\u62D4\u51FA", "\u52A8", "evell"], evert: ["\u63A8\u7FFB", "\u52A8", "evert"], evigil: ["\u9192\u6765", "\u52A8", "evigil"], evolo: ["\u6F14\u5316", "\u7269", "evolo"], evolut: ["\u8FDB\u5316", "\u7269", "evolut"], evolv: ["\u89E3\u5F00", "\u52A8", "evolv"], exact: ["\u50AC\u7F34", "\u52A8", "exact"], exaedi: ["\u5EFA\u6210", "\u52A8", "exaedi"], exam: ["\u8003\u67E5", "\u7269", "exam"], examen: ["\u8861\u5668", "\u7269", "examen"], examin: ["\u5BA1\u67E5", "\u7269", "examin"], exancl: ["\u7AED\u529B", "\u52A8", "exancl"], exanim: ["\u5931\u8272", "\u52A8", "exanim"], exaud: ["\u542C\u6E05", "\u52A8", "exaud"], excalc: ["\u8131\u978B", "\u52A8", "excalc"], excant: ["\u89E3\u5492", "\u52A8", "excant"], excarn: ["\u51CC\u8FDF", "\u7269", "excarn"], except: ["\u63A5\u5BA2", "\u52A8", "except"], excid: ["\u524A\u53BB", "\u52A8", "excid"], excip: ["\u63A5\u4F4F", "\u52A8", "excip"], excito: ["\u5524\u9192", "\u52A8", "excito"], exclam: ["\u60CA\u547C", "\u52A8", "exclam"], excogit: ["\u63A8\u6572", "\u7269", "excogit"], excol: ["\u683D\u57F9", "\u52A8", "excol"], excoqu: ["\u714E\u5E72", "\u52A8", "excoqu"], excor: ["\u65E0\u667A", "\u6027", "excor"], excubi: ["\u5C97\u54E8", "\u52A8", "excubi"], excud: ["\u953B\u523B", "\u52A8", "excud"], excut: ["\u6296\u51FA", "\u52A8", "excut"], exedr: ["\u5385", "\u7269", "exedr"], exege: ["\u758F\u89E3", "\u7269", "exege"], exem: ["\u4F8B\u5B50", "\u6027", "exem"], exeo: ["\u51FA\u53BB", "\u52A8", "exeo"], exercit: ["\u7EC3\u4E60", "\u7269", "exercit"], exhala: ["\u6563\u53D1", "\u52A8", "exhala"], exhalat: ["\u6563\u51FA", "\u7269", "exhalat"], exhaus: ["\u8017\u7AED", "\u6027", "exhaus"], exhib: ["\u5C55\u89C8", "\u7269", "exhib"], exhorres: ["\u609A\u7136", "\u6027", "exhorres"], exhorta: ["\u9F13\u52B1", "\u6027", "exhorta"], exigu: ["\u7A00\u5C11", "\u6027", "exigu"], exiguum: ["\u5C11\u8BB8", "\u6570", "exiguum"], exili: ["\u8D2B\u8584", "\u6027", "exili"], eximi: ["\u5353\u5F02", "\u6027", "eximi"], eximo: ["\u53D6\u51FA", "\u52A8", "eximo"], existim: ["\u4F30\u91CF", "\u52A8", "existim"], exodium: ["\u5E55\u95F4\u5267", "\u7269", "exodium"], exorc: ["\u9A71\u90AA", "\u7269", "exorc"], exoter: ["\u663E\u6559", "\u52A8", "exoter"], expect: ["\u671F\u5F85", "\u6027", "expect"], exped: ["\u8FDC\u5F81", "\u7269", "exped"], expel: ["\u9010\u51FA", "\u52A8", "expel"], expend: ["\u652F\u51FA", "\u52A8", "expend"], expensum: ["\u652F\u51FA\u8D26", "\u7269", "expensum"], exper: ["\u5B9E\u9A8C", "\u7269", "exper"], experg: ["\u82CF\u9192", "\u52A8", "experg"], expiat: ["\u8D4E\u51C0", "\u6027", "expiat"], expl: ["\u4FA6\u5BDF", "\u52A8", "expl"], explicit: ["\u5377\u672B\u9898", "\u7269", "explicit"], explorator: ["\u65A5\u5019", "\u7269", "explorator"], expon: ["\u9648\u8FF0", "\u52A8", "expon"], exprim: ["\u6324\u51FA", "\u52A8", "exprim"], exprobr: ["\u8D23\u96BE", "\u52A8", "exprobr"], exprom: ["\u4EE3\u8BFA", "\u52A8", "exprom"], expugn: ["\u5F3A\u653B", "\u52A8", "expugn"], expun: ["\u5254\u9664", "\u52A8", "expun"], exquir: ["\u7EC6\u7A76", "\u52A8", "exquir"], exscin: ["\u5937\u706D", "\u52A8", "exscin"], exscul: ["\u523B\u51FA", "\u52A8", "exscul"], exsecr: ["\u5492\u9010", "\u52A8", "exsecr"], exsecro: ["\u5492\u6068", "\u6027", "exsecro"], exsequ: ["\u5C65\u7EA6", "\u7269", "exsequ"], exsil: ["\u6D41\u653E", "\u52A8", "exsil"], exsolu: ["\u6E05\u507F", "\u7269", "exsolu"], exstinc: ["\u7184\u706D", "\u52A8", "exstinc"], exstru: ["\u7B51\u8D77", "\u52A8", "exstru"], exsug: ["\u542E", "\u52A8", "exsug"], exsult: ["\u96C0\u8DC3", "\u6027", "exsult"], extemp: ["\u7ACB\u523B", "\u6027", "extemp"], exter: ["\u5916\u90E8", "\u7269", "exter"], extinct: ["\u706D\u7EDD", "\u7269", "extinct"], extingu: ["\u7184\u706D", "\u52A8", "extingu"], extr: ["\u6781\u7AEF", "\u6027", "extr"], extra: ["\u5916\u4FA7", "\u7269", "extra"], extrad: ["\u5F15\u6E21", "\u7269", "extrad"], extraho: ["\u62D4\u51FA", "\u52A8", "extraho"], extund: ["\u9524\u51FA", "\u52A8", "extund"], exundat: ["\u6CDB\u6EE5", "\u52A8", "exundat"], exuo: ["\u8131\u4E0B", "\u52A8", "exuo"], exuro: ["\u70E7\u6389", "\u52A8", "exuro"], exuv: ["\u8715\u76AE", "\u52A8", "exuv"], exuvi: ["\u8715\u58F3", "\u52A8", "exuvi"], fabr: ["\u5236\u4F5C", "\u52A8", "fabr"], fabrica: ["\u5DE5\u574A", "\u52A8", "fabrica"], fabul: ["\u5BD3\u8A00", "\u7269", "fabul"], fabulat: ["\u7F16\u5267", "\u7269", "fabulat"], facet: ["\u8BD9\u8C10", "\u52A8", "facet"], faceti: ["\u5E7D\u9ED8", "\u6027", "faceti"], facies: ["\u9762\u8272", "\u52A8", "facies"], facil: ["\u5BB9\u6613", "\u6027", "facil"], faction: ["\u6D3E\u7CFB", "\u7269", "faction"], factios: ["\u7ED3\u515A", "\u52A8", "factios"], facund: ["\u96C4\u8FA9", "\u52A8", "facund"], faece: ["\u6E23\u6ED3\u7684", "\u6027", "faece"], faen: ["\u5229\u606F", "\u52A8", "faen"], faener: ["\u653E\u8D37", "\u52A8", "faener"], faex: ["\u9152\u6E23", "\u52A8", "faex"], fag: ["\u5C71\u6BDB\u6989", "\u7269", "fag"], fal: ["\u865A\u5047\u3001\u9519\u8BEF", "\u52A8", "fal"], falc: ["\u9570\u5200", "\u7269", "falc"], falcula: ["\u5C0F\u9570", "\u7269", "falcula"], faler: ["\u9A6C\u9970", "\u7269", "faler"], fall: ["\u6B3A\u8BC8", "\u6027", "fall"], fallac: ["\u8C2C\u8BEF", "\u6027", "fallac"], falsif: ["\u8BC1\u4F2A", "\u6027", "falsif"], fam: ["\u9965\u997F", "\u7269", "fam"], fama: ["\u540D\u58F0", "\u6027", "fama"], famil: ["\u5BB6\u5EAD", "\u7269", "famil"], familiar: ["\u4EB2\u8FD1", "\u52A8", "familiar"], famul: ["\u4F8D\u5949", "\u52A8", "famul"], famulus: ["\u4EC6\u4ECE", "\u7269", "famulus"], fan: ["\u5723\u6240", "\u7269", "fan"], far: ["\u9762\u7C89\u3001\u7CCA", "\u7269", "far"], farc: ["\u586B\u6599", "\u52A8", "farc"], farcio: ["\u586B\u585E", "\u52A8", "farcio"], fari: ["\u8A00\u8BF4", "\u52A8", "fari"], farinac: ["\u7C89\u8D28", "\u6027", "farinac"], farinari: ["\u78E8\u574A\u4E3B", "\u52A8", "farinari"], fasc: ["\u6346\u624E", "\u52A8", "fasc"], fasces: ["\u6743\u6807", "\u7269", "fasces"], fascic: ["\u675F", "\u7269", "fascic"], fasciola: ["\u5C0F\u5E26\u9970", "\u7269", "fasciola"], fast: ["\u538C\u6076", "\u52A8", "fast"], fastid: ["\u5ACC\u5473", "\u52A8", "fastid"], fastidios: ["\u5012\u80C3", "\u6027", "fastidios"], fastig: ["\u5C71\u5899", "\u7269", "fastig"], fastus: ["\u50B2\u6162\u4E4B\u8272", "\u52A8", "fastus"], fat: ["\u547D\u8FD0", "\u7269", "fat"], fatig: ["\u4F7F\u7D2F", "\u52A8", "fatig"], fatu: ["\u611A\u5984", "\u6027", "fatu"], fault: ["\u65AD\u5C42", "\u7269", "fault"], faun: ["\u517D\u7FA4", "\u7269", "faun"], fauto: ["\u8D5E\u52A9\u8005", "\u52A8", "fauto"], fave: ["\u504F\u7231", "\u6027", "fave"], favill: ["\u98DE\u7070", "\u52A8", "favill"], febr: ["\u53D1\u70ED", "\u52A8", "febr"], febri: ["\u70ED\u75C5", "\u52A8", "febri"], febricula: ["\u4F4E\u70ED", "\u7269", "febricula"], febrif: ["\u9000\u70ED", "\u52A8", "febrif"], fecund: ["\u7E41\u6B96\u529B", "\u7269", "fecund"], federo: ["\u8054\u90A6", "\u7269", "federo"], feli: ["\u732B", "\u7269", "feli"], felix: ["\u5E78\u8FD0", "\u6027", "felix"], femin: ["\u5973\u5B50", "\u7269", "femin"], fen: ["\u7A97", "\u7269", "fen"], fener: ["\u653E\u8D37", "\u52A8", "fener"], fenerat: ["\u653E\u8D37\u8005", "\u7269", "fenerat"], fenest: ["\u7A97\u7256", "\u7269", "fenest"], fenus: ["\u5229\u606F", "\u7269", "fenus"], fer: ["\u91CE\u517D", "\u7269", "fer"], ferculum: ["\u83DC\u80B4", "\u52A8", "ferculum"], feria: ["\u5E73\u65E5", "\u7269", "feria"], ferio: ["\u6253\u51FB", "\u52A8", "ferio"], ferm: ["\u53D1\u9175", "\u7269", "ferm"], fero: ["\u6301\u8FD0", "\u52A8", "fero"], ferox: ["\u51F6\u731B", "\u6027", "ferox"], ferr: ["\u94C1", "\u7269", "ferr"], ferrugin: ["\u94C1\u9508\u8272", "\u6027", "ferrugin"], fertil: ["\u80A5\u6C83", "\u7269", "fertil"], ferv: ["\u716E\u6CB8", "\u7269", "ferv"], fervid: ["\u70ED\u5FF1", "\u6027", "fervid"], fessus: ["\u75B2\u60EB", "\u6027", "fessus"], fest: ["\u8282\u5E86", "\u7269", "fest"], festin: ["\u8D76\u8DEF", "\u52A8", "festin"], fetus: ["\u4EA7\u4ED4", "\u52A8", "fetus"], feud: ["\u5C01\u5EFA", "\u7269", "feud"], fib: ["\u6263\u3001\u522B\u9488", "\u7269", "fib"], fic: ["\u65E0\u82B1\u679C", "\u7269", "fic"], fict: ["\u5851\u9020", "\u52A8", "fict"], fictor: ["\u5851\u5320", "\u7269", "fictor"], fid: ["\u4FE1\u4EFB\u3001\u4FE1\u4E49", "\u52A8", "fid"], fide: ["\u4FE1\u5FF5", "\u6027", "fide"], fideiu: ["\u4F5C\u4FDD", "\u52A8", "fideiu"], fideiuss: ["\u4FDD\u8BC1", "\u52A8", "fideiuss"], fideiussor: ["\u4FDD\u8BC1\u4EBA", "\u52A8", "fideiussor"], fidicen: ["\u7434\u624B", "\u7269", "fidicen"], fiducia: ["\u4FE1\u8D56", "\u6027", "fiducia"], fier: ["\u6210\u4E3A", "\u52A8", "fier"], figo: ["\u9489\u4F4F", "\u52A8", "figo"], figul: ["\u9676\u5DE5", "\u52A8", "figul"], figur: ["\u5F62\u72B6", "\u6570", "figur"], fil: ["\u5B50\u3001\u513F\u5973", "\u7269", "fil"], filic: ["\u8568", "\u7269", "filic"], filt: ["\u8FC7\u6EE4", "\u52A8", "filt"], filum: ["\u4E1D\u7EBF", "\u7269", "filum"], fim: ["\u53A9\u80A5", "\u7269", "fim"], fin: ["\u754C\u9650\u3001\u8FB9\u754C", "\u52A8", "fin"], findo: ["\u88C2\u5F00", "\u52A8", "findo"], finit: ["\u6709\u9650", "\u6027", "finit"], firm: ["\u575A\u56FA", "\u6027", "firm"], fisc: ["\u8D22\u5E93\u3001\u516C\u5E93", "\u52A8", "fisc"], fiscella: ["\u8349\u7F16\u98DF\u7BEE", "\u52A8", "fiscella"], fiscina: ["\u8349\u7BEE", "\u7269", "fiscina"], fissura: ["\u88C2\u7F1D", "\u7269", "fissura"], fistula: ["\u6C34\u7BA1", "\u7269", "fistula"], flagell: ["\u7EA4\u679D", "\u7269", "flagell"], flagella: ["\u97AD\u7B1E", "\u52A8", "flagella"], flagit: ["\u50AC\u8BA8", "\u52A8", "flagit"], flagran: ["\u6C14\u5473\u6D53\u70C8", "\u7269", "flagran"], flagro: ["\u71C3\u70BD", "\u52A8", "flagro"], flagrum: ["\u97AD", "\u7269", "flagrum"], flam: ["\u796D\u53F8", "\u7269", "flam"], flamen: ["\u6C14\u6D41", "\u7269", "flamen"], flatil: ["\u5439\u5236", "\u52A8", "flatil"], flatus: ["\u9635\u98CE", "\u7269", "flatus"], flav: ["\u9EC4", "\u6027", "flav"], flavedo: ["\u6A59\u9EC4", "\u6027", "flavedo"], flect: ["\u5C48\u66F2", "\u52A8", "flect"], flens: ["\u54ED\u6CE3\u7684", "\u52A8", "flens"], fleo: ["\u54ED\u6CE3", "\u52A8", "fleo"], fletus: ["\u54ED\u6CE3", "\u52A8", "fletus"], flexuos: ["\u66F2\u6298\u7684", "\u6027", "flexuos"], floccus: ["\u96EA\u7247", "\u7269", "floccus"], flor: ["\u82B1", "\u7269", "flor"], floral: ["\u82B1\u795E\u8282", "\u7269", "floral"], florens: ["\u7E41\u76DB", "\u6027", "florens"], florileg: ["\u82B1\u7D6E\u96C6", "\u7269", "florileg"], flosc: ["\u82B1\u51A0", "\u7269", "flosc"], fluc: ["\u6CE2\u52A8", "\u52A8", "fluc"], fluctus: ["\u6D6A\u5934", "\u7269", "fluctus"], fluid: ["\u6D41\u4F53", "\u7269", "fluid"], fluito: ["\u6F02\u6D6E", "\u52A8", "fluito"], flum: ["\u6CB3\u6D41", "\u7269", "flum"], fluv: ["\u6CB3\u6D41", "\u7269", "fluv"], flux: ["\u6D41\u53D8", "\u52A8", "flux"], foc: ["\u7089\u7076\u3001\u4E2D\u5FC3", "\u7269", "foc"], foculus: ["\u5C0F\u7089", "\u7269", "foculus"], fod: ["\u6316\u6398", "\u52A8", "fod"], foed: ["\u76DF\u7EA6", "\u7269", "foed"], foederat: ["\u7ED3\u76DF", "\u7269", "foederat"], foedit: ["\u6C61\u79FD", "\u6027", "foedit"], foete: ["\u6076\u81ED", "\u52A8", "foete"], foetor: ["\u6076\u81ED", "\u7269", "foetor"], fol: ["\u53F6", "\u7269", "fol"], foll: ["\u98CE\u7BB1", "\u52A8", "foll"], fomes: ["\u5F15\u706B\u7269", "\u52A8", "fomes"], font: ["\u6CC9", "\u7269", "font"], fontan: ["\u55B7\u6CC9", "\u7269", "fontan"], fontin: ["\u6CC9\u8282", "\u7269", "fontin"], forceps: ["\u94B3", "\u52A8", "forceps"], fordici: ["\u5B55\u725B\u796D", "\u7269", "fordici"], fores: ["\u53CC\u6249", "\u7269", "fores"], forfex: ["\u526A", "\u7269", "forfex"], forgi: ["\u953B\u9020", "\u52A8", "forgi"], form: ["\u5851\u9020\u3001\u5F62", "\u52A8", "form"], formica: ["\u9165\u75D2", "\u6027", "formica"], formicat: ["\u53D1\u9EBB", "\u6027", "formicat"], formido: ["\u60CA\u60F6", "\u6027", "formido"], formidol: ["\u53EF\u6015\u7684", "\u6027", "formidol"], formo: ["\u57F9\u517B", "\u52A8", "formo"], formos: ["\u4FCA\u7F8E", "\u6027", "formos"], formul: ["\u7A0B\u5F0F", "\u7269", "formul"], forn: ["\u7089", "\u7269", "forn"], fornac: ["\u7089\u819B", "\u7269", "fornac"], fornic: ["\u62F1", "\u7269", "fornic"], fortitud: ["\u52C7\u6562", "\u6027", "fortitud"], fortuna: ["\u5E78\u8FD0", "\u6027", "fortuna"], forum: ["\u5E7F\u573A", "\u7269", "forum"], foss: ["\u6C9F\u6E20", "\u7269", "foss"], fossil: ["\u5316\u77F3", "\u7269", "fossil"], fossor: ["\u6398\u571F\u8005", "\u7269", "fossor"], foundr: ["\u94F8\u9020\u5382", "\u7269", "foundr"], fovea: ["\u9677\u5751", "\u52A8", "fovea"], frac: ["\u6298\u3001\u788E", "\u52A8", "frac"], fragil: ["\u6613\u788E", "\u6027", "fragil"], fragr: ["\u82AC\u82B3", "\u6027", "fragr"], fragro: ["\u53D1\u9999", "\u52A8", "fragro"], frat: ["\u5144\u5F1F", "\u7269", "frat"], fraud: ["\u6B3A\u8BC8", "\u52A8", "fraud"], frax: ["\u68A3", "\u7269", "frax"], fremit: ["\u8F70\u9E23", "\u52A8", "fremit"], fremitus: ["\u54AC\u7259", "\u52A8", "fremitus"], fremor: ["\u4F4E\u6C89\u58F0", "\u6027", "fremor"], fren: ["\u9A6C\u56BC", "\u7269", "fren"], frend: ["\u5207\u9F7F", "\u52A8", "frend"], frequen: ["\u6324\u6EE1", "\u52A8", "frequen"], frequens: ["\u7A20\u5BC6", "\u6027", "frequens"], frequent: ["\u9891\u7387", "\u7269", "frequent"], fresco: ["\u6E7F\u58C1\u753B", "\u7269", "fresco"], fret: ["\u6D77\u5CE1", "\u7269", "fret"], friab: ["\u9165\u8106", "\u6027", "friab"], fric: ["\u6469\u64E6", "\u52A8", "fric"], fricat: ["\u63C9\u6413", "\u52A8", "fricat"], frictur: ["\u6CB9\u70B8", "\u52A8", "frictur"], frig: ["\u51B7", "\u7269", "frig"], frigid: ["\u51B7\u6F20", "\u6027", "frigid"], frigida: ["\u51B7\u85CF\u5BA4", "\u52A8", "frigida"], frigor: ["\u5BD2\u6C14", "\u7269", "frigor"], frit: ["\u91C9\u6599", "\u52A8", "frit"], fritill: ["\u9AB0\u7B52", "\u52A8", "fritill"], frivol: ["\u7410\u788E", "\u6027", "frivol"], frix: ["\u714E\u3001\u70B8", "\u7269", "frix"], frond: ["\u53F6\u4E1B", "\u7269", "frond"], frons: ["\u989D", "\u7269", "frons"], frontis: ["\u6249\u9875", "\u7269", "frontis"], fruct: ["\u679C", "\u7269", "fruct"], fructuar: ["\u6536\u76CA\u4EBA", "\u7269", "fructuar"], frug: ["\u6536\u6210", "\u7269", "frug"], frugal: ["\u4FED\u6734", "\u7269", "frugal"], frugi: ["\u6DE1\u6CCA", "\u6027", "frugi"], frum: ["\u8C37\u7269", "\u7269", "frum"], frument: ["\u5F81\u7CAE", "\u7269", "frument"], frustr: ["\u632B\u6298", "\u6027", "frustr"], frustum: ["\u5757", "\u52A8", "frustum"], frut: ["\u704C\u6728", "\u7269", "frut"], fuc: ["\u5986\u9970", "\u7269", "fuc"], fucat: ["\u865A\u4F2A", "\u6027", "fucat"], fug: ["\u9003\u9041", "\u52A8", "fug"], fuga: ["\u8D4B\u683C", "\u7269", "fuga"], fulcimen: ["\u652F\u67F1", "\u7269", "fulcimen"], fulg: ["\u95EA\u7535", "\u7269", "fulg"], fulgid: ["\u95EA\u8000", "\u6027", "fulgid"], fulgor: ["\u95EA\u5149", "\u7269", "fulgor"], fulig: ["\u70DF\u70B1", "\u52A8", "fulig"], fullon: ["\u6F02\u6D17\u5DE5", "\u52A8", "fullon"], fullonica: ["\u6F02\u6D17\u574A", "\u52A8", "fullonica"], fulmen: ["\u96F7\u51FB", "\u7269", "fulmen"], fulmin: ["\u6253\u96F7", "\u7269", "fulmin"], fulv: ["\u9EC4\u8910", "\u6027", "fulv"], fum: ["\u70DF", "\u7269", "fum"], fumarium: ["\u70DF\u56F1", "\u7269", "fumarium"], fumarol: ["\u55B7\u6C14\u5B54", "\u7269", "fumarol"], fumig: ["\u718F\u5236", "\u7269", "fumig"], fumo: ["\u5192\u70DF", "\u52A8", "fumo"], fumos: ["\u718F\u5236\u7684", "\u52A8", "fumos"], fun: ["\u7EF3", "\u7269", "fun"], funal: ["\u7EF3\u7D22\u7684", "\u52A8", "funal"], funamb: ["\u8D70\u7D22", "\u52A8", "funamb"], functio: ["\u51FD\u6570", "\u7269", "functio"], fund: ["\u57FA\u7840\u3001\u5E95", "\u7269", "fund"], funda: ["\u6295\u77F3\u7D22", "\u7269", "funda"], fundit: ["\u6295\u77F3\u624B", "\u52A8", "fundit"], fundo: ["\u503E\u6CFB", "\u52A8", "fundo"], funer: ["\u846C\u793C", "\u7269", "funer"], fung: ["\u83CC", "\u7269", "fung"], funicu: ["\u7EC6\u7EF3", "\u52A8", "funicu"], furca: ["\u53C9", "\u7269", "furca"], furfur: ["\u9EB8\u76AE", "\u7269", "furfur"], furia: ["\u72C2\u6012", "\u6027", "furia"], furibu: ["\u66B4\u6012\u7684", "\u6027", "furibu"], furn: ["\u70E4\u7089", "\u7269", "furn"], furo: ["\u72C2\u6012", "\u6027", "furo"], furor: ["\u72C2\u66B4", "\u6027", "furor"], furt: ["\u76D7\u7A83", "\u52A8", "furt"], fus: ["\u7194", "\u52A8", "fus"], fusc: ["\u8910\u8272", "\u6027", "fusc"], fusor: ["\u94F8\u5DE5", "\u52A8", "fusor"], fustis: ["\u77ED\u68CD", "\u7269", "fustis"], fusus: ["\u7EBA\u9524", "\u7269", "fusus"], galax: ["\u94F6\u6CB3", "\u7269", "galax"], galer: ["\u76AE\u5E3D", "\u7269", "galer"], gall: ["\u9E21", "\u7269", "gall"], gallery: ["\u753B\u5ECA", "\u7269", "gallery"], gallic: ["\u9E21\u9E23\u65F6", "\u7269", "gallic"], ganeo: ["\u9955\u5BA2", "\u52A8", "ganeo"], gangli: ["\u795E\u7ECF\u8282", "\u52A8", "gangli"], gangrae: ["\u574F\u75BD", "\u7269", "gangrae"], gar: ["\u9C7C\u9171", "\u7269", "gar"], garrul: ["\u9976\u820C", "\u52A8", "garrul"], gastro: ["\u80C3", "\u7269", "gastro"], gau: ["\u559C\u60A6", "\u52A8", "gau"], gausapa: ["\u7ED2\u9762", "\u52A8", "gausapa"], gaza: ["\u5B9D\u5E93", "\u6027", "gaza"], gel: ["\u971C\u3001\u51BB\u7ED3", "\u7269", "gel"], gelat: ["\u80F6\u51BB", "\u7269", "gelat"], gelatio: ["\u51BB\u7ED3", "\u52A8", "gelatio"], gelid: ["\u4E25\u5BD2", "\u7269", "gelid"], gem: ["\u547B\u541F", "\u52A8", "gem"], gemin: ["\u53F6\u82BD", "\u7269", "gemin"], gemisc: ["\u547B\u541F\u8D77", "\u52A8", "gemisc"], gemitus: ["\u53F9\u606F", "\u52A8", "gemitus"], gemm: ["\u5B9D\u77F3", "\u7269", "gemm"], gemma: ["\u82B1\u82BD", "\u7269", "gemma"], gen: ["\u65CF\u7FA4\u3001\u751F\u80B2", "\u7269", "gen"], gena: ["\u988A", "\u7269", "gena"], gene: ["\u57FA\u56E0", "\u7269", "gene"], gener: ["\u5973\u5A7F", "\u7269", "gener"], generator: ["\u53D1\u7535\u673A", "\u7269", "generator"], genet: ["\u751F\u80B2", "\u7269", "genet"], geni: ["\u5B88\u62A4\u7075", "\u7269", "geni"], gent: ["\u6C0F\u65CF", "\u52A8", "gent"], genu: ["\u8DEA", "\u52A8", "genu"], geo: ["\u5730", "\u7269", "geo"], geodes: ["\u6D4B\u5730", "\u7269", "geodes"], geogr: ["\u5730\u7406", "\u7269", "geogr"], geolo: ["\u5730\u8D28\u5B66", "\u7269", "geolo"], geom: ["\u51E0\u4F55", "\u7269", "geom"], germ: ["\u80DA\u82BD", "\u7269", "germ"], germin: ["\u53D1\u82BD", "\u7269", "germin"], gerrae: ["\u73A9\u610F\u513F", "\u7269", "gerrae"], gerula: ["\u80B2\u513F\u5AC2", "\u7269", "gerula"], gest: ["\u625B\u62AC", "\u52A8", "gest"], gestus: ["\u624B\u52BF", "\u52A8", "gestus"], gibber: ["\u9A7C\u80CC", "\u6027", "gibber"], gigan: ["\u5DE8\u4EBA\u7684", "\u6027", "gigan"], gingiva: ["\u9F88", "\u7269", "gingiva"], glab: ["\u5149\u6ED1", "\u6027", "glab"], glabri: ["\u65E0\u6BDB\u7684", "\u6027", "glabri"], glac: ["\u51B0", "\u7269", "glac"], glad: ["\u5251", "\u7269", "glad"], glandul: ["\u817A", "\u52A8", "glandul"], glans: ["\u6A61\u5B9E", "\u7269", "glans"], glare: ["\u783E\u77F3", "\u7269", "glare"], glastum: ["\u83D8\u84DD", "\u52A8", "glastum"], globos: ["\u7403\u72B6\u7684", "\u6027", "globos"], globus: ["\u56E2", "\u7269", "globus"], glome: ["\u7ED5\u7EBF", "\u52A8", "glome"], glor: ["\u8363\u8000", "\u6027", "glor"], gloss: ["\u7B3A\u6CE8", "\u7269", "gloss"], glosso: ["\u820C", "\u7269", "glosso"], glum: ["\u8C37\u58F3", "\u7269", "glum"], glut: ["\u541E\u54BD", "\u52A8", "glut"], glutin: ["\u80F6", "\u7269", "glutin"], glutinat: ["\u88F1\u7CCA\u5320", "\u7269", "glutinat"], glutino: ["\u80F6\u9ECF", "\u6027", "glutino"], glutt: ["\u541E", "\u52A8", "glutt"], glyph: ["\u523B\u7B26", "\u52A8", "glyph"], glypto: ["\u523B", "\u7269", "glypto"], gnar: ["\u901A\u6653", "\u6027", "gnar"], gnos: ["\u77E5\u8BC6", "\u6027", "gnos"], gnosia: ["\u8BA4\u77E5", "\u6027", "gnosia"], goet: ["\u5DEB\u672F", "\u52A8", "goet"], goni: ["\u89D2\u5EA6", "\u7269", "goni"], gracil: ["\u7EA4\u7EC6", "\u6027", "gracil"], grad: ["\u6B65\u3001\u7EA7", "\u7269", "grad"], grada: ["\u6E10\u53D8", "\u6027", "grada"], gradior: ["\u8FC8\u6B65", "\u52A8", "gradior"], graduat: ["\u6BD5\u4E1A", "\u7269", "graduat"], gramm: ["\u6587\u6CD5", "\u7269", "gramm"], gran: ["\u8C37\u7C92", "\u7269", "gran"], granar: ["\u8C37\u4ED3", "\u7269", "granar"], grand: ["\u5B8F\u5927", "\u6027", "grand"], grandae: ["\u9AD8\u9F84", "\u7269", "grandae"], grandil: ["\u8C6A\u8A00", "\u6027", "grandil"], grandin: ["\u4E0B\u96F9", "\u7269", "grandin"], granit: ["\u82B1\u5C97\u5CA9", "\u7269", "granit"], graph: ["\u56FE", "\u7269", "graph"], graphem: ["\u5B57\u7D20", "\u7269", "graphem"], grapho: ["\u4E66\u8BB0", "\u7269", "grapho"], grat: ["\u611F\u6FC0", "\u52A8", "grat"], gratios: ["\u627F\u6B22", "\u52A8", "gratios"], gratu: ["\u795D\u8D3A", "\u52A8", "gratu"], gratulor: ["\u81F4\u8D3A", "\u52A8", "gratulor"], grav: ["\u91CD", "\u6027", "grav"], graveo: ["\u6D53\u5473", "\u52A8", "graveo"], graveol: ["\u6D53\u81ED", "\u7269", "graveol"], gravit: ["\u5F15\u529B", "\u7269", "gravit"], greg: ["\u755C\u7FA4", "\u7269", "greg"], gregar: ["\u7FA4\u5C45", "\u7269", "gregar"], grem: ["\u884C\u4F1A", "\u7269", "grem"], gress: ["\u8FC8\u6B65", "\u52A8", "gress"], grex: ["\u7FA4", "\u7269", "grex"], grief: ["\u54C0\u75DB", "\u6027", "grief"], groma: ["\u6D4B\u89D2\u4EEA", "\u7269", "groma"], guardi: ["\u76D1\u62A4\u4EBA", "\u7269", "guardi"], guber: ["\u8235", "\u7269", "guber"], gubernator: ["\u8235\u624B", "\u7269", "gubernator"], guberno: ["\u6CBB\u7406", "\u52A8", "guberno"], guilt: ["\u5185\u759A", "\u6027", "guilt"], gur: ["\u6F29\u6DA1", "\u7269", "gur"], gust: ["\u5C1D\u3001\u5473\u89C9", "\u52A8", "gust"], gustam: ["\u54C1\u5473\u4E4B\u7269", "\u52A8", "gustam"], gustat: ["\u54C1\u5473", "\u52A8", "gustat"], gusto: ["\u54C1\u5C1D", "\u52A8", "gusto"], gutta: ["\u6EF4", "\u7269", "gutta"], guttur: ["\u5589", "\u7269", "guttur"], gym: ["\u4F53\u80B2\u573A", "\u7269", "gym"], gymnic: ["\u7ADE\u6280\u7684", "\u52A8", "gymnic"], gyps: ["\u77F3\u818F", "\u7269", "gyps"], habena: ["\u7F30\u7EF3", "\u7269", "habena"], habitat: ["\u6816\u606F\u5730", "\u7269", "habitat"], habitu: ["\u4E60\u60EF\u5316", "\u6027", "habitu"], habitus: ["\u4E3E\u6B62", "\u52A8", "habitus"], haem: ["\u8840", "\u7269", "haem"], haesit: ["\u72B9\u8C6B", "\u6027", "haesit"], halitu: ["\u547C\u6C14", "\u52A8", "halitu"], halitus: ["\u8584\u96FE", "\u7269", "halitus"], halluc: ["\u5E7B\u89C9", "\u6027", "halluc"], halo: ["\u6655", "\u7269", "halo"], halter: ["\u54D1\u94C3", "\u52A8", "halter"], ham: ["\u94A9", "\u7269", "ham"], hamatus: ["\u94A9\u72B6\u7684", "\u6027", "hamatus"], harm: ["\u548C\u8C10\u3001\u4E50", "\u7269", "harm"], harmo: ["\u5951\u5408", "\u7269", "harmo"], harmon: ["\u8C03\u548C", "\u6027", "harmon"], harmonia: ["\u548C\u58F0\u5B66", "\u7269", "harmonia"], harpast: ["\u62A2\u7403\u620F", "\u52A8", "harpast"], harpax: ["\u94A9\u951A", "\u7269", "harpax"], harpe: ["\u5F2F\u5200", "\u7269", "harpe"], harundo: ["\u82A6\u82C7", "\u7269", "harundo"], harus: ["\u80A0\u535C", "\u7269", "harus"], hast: ["\u957F\u77DB", "\u52A8", "hast"], haur: ["\u8200\u53D6", "\u52A8", "haur"], haurito: ["\u6C72\u6C34\u5904", "\u52A8", "haurito"], haust: ["\u6C72\u6C34", "\u7269", "haust"], heath: ["\u77F3\u5357\u8352\u539F", "\u7269", "heath"], hebdo: ["\u5468", "\u7269", "hebdo"], hebet: ["\u8FDF\u949D", "\u52A8", "hebet"], hebeto: ["\u5F04\u949D", "\u52A8", "hebeto"], hecat: ["\u767E", "\u6570", "hecat"], heder: ["\u5E38\u6625\u85E4", "\u7269", "heder"], hedono: ["\u5FEB\u4E50", "\u6027", "hedono"], heli: ["\u592A\u9633", "\u7269", "heli"], helio: ["\u65E5", "\u7269", "helio"], heluo: ["\u8D2A\u98DF\u8005", "\u52A8", "heluo"], hemin: ["\u534A\u5347", "\u7269", "hemin"], hepat: ["\u809D", "\u52A8", "hepat"], herb: ["\u8349", "\u7269", "herb"], herbari: ["\u8349\u836F\u56ED", "\u7269", "herbari"], herbic: ["\u9664\u8349", "\u7269", "herbic"], herbiv: ["\u98DF\u8349", "\u7269", "herbiv"], here: ["\u7EE7\u627F\u4EBA", "\u7269", "here"], hered: ["\u7EE7\u627F", "\u7269", "hered"], heredo: ["\u9057\u4F20", "\u7269", "heredo"], hexagon: ["\u516D\u89D2\u7684", "\u6027", "hexagon"], hiat: ["\u5F20\u53E3", "\u52A8", "hiat"], hibern: ["\u51AC\u7720", "\u7269", "hibern"], hiberna: ["\u8D8A\u51AC", "\u52A8", "hiberna"], hiem: ["\u4E25\u51AC", "\u7269", "hiem"], hierar: ["\u7B49\u7EA7\u5236", "\u7269", "hierar"], hierat: ["\u5723\u804C\u7684", "\u52A8", "hierat"], hiero: ["\u5723\u804C", "\u7269", "hiero"], hila: ["\u6B22\u6B23", "\u52A8", "hila"], hilarit: ["\u559C\u8272", "\u52A8", "hilarit"], hipp: ["\u9A6C", "\u7269", "hipp"], hippago: ["\u8FD0\u9A6C\u8239", "\u7269", "hippago"], hippoco: ["\u9A6C\u592B", "\u7269", "hippoco"], hippodro: ["\u8DD1\u9A6C\u573A", "\u7269", "hippodro"], hirc: ["\u516C\u7F8A", "\u7269", "hirc"], hispid: ["\u7C97\u7CD9\u591A\u6BDB", "\u6027", "hispid"], histo: ["\u5386\u53F2", "\u7269", "histo"], histri: ["\u6F14\u5458", "\u7269", "histri"], hom: ["\u4EBA\u3001\u4E2A\u4F53", "\u52A8", "hom"], homic: ["\u6740\u4EBA", "\u52A8", "homic"], honor: ["\u8363\u8A89", "\u6027", "honor"], hoplit: ["\u91CD\u88C5\u5175", "\u7269", "hoplit"], hor: ["\u65F6\u3001\u65F6\u8FB0", "\u7269", "hor"], hord: ["\u5927\u9EA6", "\u7269", "hord"], horia: ["\u6E14\u8239", "\u7269", "horia"], horizon: ["\u5730\u5E73", "\u7269", "horizon"], hormo: ["\u51B2\u52A8", "\u6027", "hormo"], hormon: ["\u6FC0\u7D20", "\u52A8", "hormon"], horr: ["\u6218\u6817", "\u6027", "horr"], horre: ["\u8C37\u4ED3", "\u7269", "horre"], horrid: ["\u7C97\u964B", "\u6027", "horrid"], horrip: ["\u8D77\u9E21\u76AE", "\u6027", "horrip"], horripi: ["\u6BDB\u9AA8\u609A\u7136", "\u6027", "horripi"], hort: ["\u56ED", "\u7269", "hort"], hortat: ["\u50AC\u6868\u8005", "\u7269", "hortat"], hortul: ["\u83DC\u5703", "\u7269", "hortul"], hospes: ["\u5BA2\u4EBA", "\u7269", "hospes"], hospit: ["\u5BBE\u5BA2", "\u52A8", "hospit"], hospita: ["\u5973\u4E3B\u4EBA", "\u7269", "hospita"], hospital: ["\u533B\u9662", "\u7269", "hospital"], hospitor: ["\u505A\u5BA2", "\u52A8", "hospitor"], host: ["\u654C\u4EBA\u3001\u5916\u4EBA", "\u7269", "host"], hosti: ["\u796D\u7272", "\u7269", "hosti"], hum: ["\u6E7F\u3001\u6F6E", "\u7269", "hum"], humif: ["\u8150\u6B96\u5316", "\u7269", "humif"], humil: ["\u8C26\u5351", "\u6027", "humil"], humu: ["\u571F\u58E4", "\u7269", "humu"], hyac: ["\u98CE\u4FE1\u5B50", "\u7269", "hyac"], hybr: ["\u50ED\u8D8A", "\u7269", "hybr"], hydraul: ["\u6C34\u529B\u673A\u68B0", "\u7269", "hydraul"], hydraulus: ["\u6C34\u529B\u98CE\u7434", "\u7269", "hydraulus"], hydro: ["\u6C34", "\u7269", "hydro"], hydrops: ["\u6C34\u80BF", "\u7269", "hydrops"], hygro: ["\u5438\u6E7F", "\u7269", "hygro"], hyl: ["\u7269\u8D28\u3001\u6750\u6599", "\u7269", "hyl"], hymn: ["\u9882\u6B4C", "\u7269", "hymn"], hypaeth: ["\u9732\u5929\u9876", "\u7269", "hypaeth"], hyperbol: ["\u5938\u5F20", "\u7269", "hyperbol"], hypno: ["\u7761\u610F", "\u52A8", "hypno"], hypoca: ["\u5730\u6696", "\u7269", "hypoca"], hypoth: ["\u5047\u8BBE", "\u6027", "hypoth"], hypothec: ["\u62B5\u62BC", "\u52A8", "hypothec"], hypsom: ["\u6D4B\u9AD8", "\u7269", "hypsom"], iac: ["\u6295\u77DB\u5668", "\u7269", "iac"], iact: ["\u629B\u63B7", "\u52A8", "iact"], iactant: ["\u5F97\u610F\u4E4B\u8272", "\u52A8", "iactant"], iaculor: ["\u629B\u5C04", "\u52A8", "iaculor"], iaculum: ["\u6807\u67AA", "\u52A8", "iaculum"], ianthin: ["\u7D2B\u7F57\u5170\u8272", "\u6027", "ianthin"], ianu: ["\u95E8\u3001\u51FA\u5165\u53E3", "\u52A8", "ianu"], iatro: ["\u533B\u5E08", "\u7269", "iatro"], icterus: ["\u9EC4\u75B8", "\u7269", "icterus"], ictus: ["\u89E6\u51FB", "\u6027", "ictus"], idea: ["\u7406\u5FF5", "\u6027", "idea"], iden: ["\u540C\u4E00", "\u6027", "iden"], identif: ["\u8FA8\u8BA4", "\u6027", "identif"], ideog: ["\u8868\u610F", "\u7269", "ideog"], idiom: ["\u4E60\u8BED", "\u7269", "idiom"], idiot: ["\u611A\u4EBA", "\u6027", "idiot"], idus: ["\u6708\u4E2D", "\u7269", "idus"], ieiunium: ["\u658B\u6212", "\u7269", "ieiunium"], ientac: ["\u65E9\u9910", "\u52A8", "ientac"], ign: ["\u706B\u3001\u71C3\u70E7", "\u7269", "ign"], ignar: ["\u4E0D\u77E5", "\u6027", "ignar"], ignav: ["\u602F\u61E6", "\u6027", "ignav"], ignavo: ["\u5077\u61D2", "\u52A8", "ignavo"], ignomin: ["\u7F9E\u8FB1", "\u6027", "ignomin"], ilic: ["\u51AC\u9752", "\u7269", "ilic"], illece: ["\u8BF1\u7269", "\u52A8", "illece"], illumin: ["\u7167\u4EAE", "\u52A8", "illumin"], illusion: ["\u9519\u89C9", "\u6027", "illusion"], imag: ["\u60F3\u8C61", "\u52A8", "imag"], imago: ["\u6210\u866B", "\u7269", "imago"], imbe: ["\u5B71\u5F31", "\u6027", "imbe"], imbri: ["\u7B52\u74E6", "\u7269", "imbri"], imbrif: ["\u591A\u96E8", "\u7269", "imbrif"], imbu: ["\u542F\u8499", "\u52A8", "imbu"], imman: ["\u5DE8\u5927", "\u6027", "imman"], immig: ["\u79FB\u5165", "\u52A8", "immig"], immit: ["\u4E25\u9177", "\u6027", "immit"], immun: ["\u514D\u75AB", "\u7269", "immun"], imp: ["\u7EDF\u6CBB\u3001\u547D\u4EE4", "\u52A8", "imp"], impa: ["\u5947\u6570", "\u6027", "impa"], impavid: ["\u65E0\u754F", "\u6027", "impavid"], imped: ["\u963B\u6320", "\u52A8", "imped"], impedi: ["\u59A8\u788D", "\u52A8", "impedi"], impell: ["\u9A71\u52A8", "\u52A8", "impell"], impensa: ["\u5F00\u9500", "\u7269", "impensa"], imperit: ["\u751F\u758F", "\u6027", "imperit"], impero: ["\u4E0B\u4EE4", "\u52A8", "impero"], impert: ["\u5206\u4E0E", "\u52A8", "impert"], implic: ["\u8574\u542B", "\u6027", "implic"], impluvi: ["\u5929\u4E95", "\u7269", "impluvi"], impoten: ["\u65E0\u529B", "\u6027", "impoten"], imprec: ["\u7948\u7978", "\u52A8", "imprec"], imprimo: ["\u538B\u5165", "\u52A8", "imprimo"], improbo: ["\u5426\u51B3", "\u52A8", "improbo"], improvis: ["\u5373\u5174", "\u7269", "improvis"], impul: ["\u51B2\u52A8", "\u52A8", "impul"], impuls: ["\u63A8\u52A8", "\u7269", "impuls"], impur: ["\u4E0D\u6D01", "\u6027", "impur"], inaedi: ["\u7B51\u5165", "\u52A8", "inaedi"], inan: ["\u7A7A\u865A", "\u52A8", "inan"], inass: ["\u5165\u7089\u70E4", "\u52A8", "inass"], inaud: ["\u542C\u95FB", "\u52A8", "inaud"], inaur: ["\u8033\u9970", "\u7269", "inaur"], incant: ["\u541F\u5531\u65BD\u6CD5", "\u52A8", "incant"], inced: ["\u8FC8\u6B65", "\u52A8", "inced"], incend: ["\u5927\u706B", "\u7269", "incend"], incens: ["\u711A\u9999", "\u7269", "incens"], incessus: ["\u6B65\u6001", "\u52A8", "incessus"], incid: ["\u5207\u5165", "\u52A8", "incid"], incile: ["\u5F15\u6C34\u6E20", "\u7269", "incile"], inciner: ["\u711A\u5316", "\u7269", "inciner"], incino: ["\u8D77\u5531", "\u52A8", "incino"], incipit: ["\u5377\u9996\u9898", "\u7269", "incipit"], incit: ["\u75BE\u884C", "\u6027", "incit"], inclino: ["\u503E\u659C", "\u52A8", "inclino"], incoqu: ["\u7096", "\u52A8", "incoqu"], increpit: ["\u65A5\u8D23", "\u52A8", "increpit"], incu: ["\u7A81\u88AD", "\u52A8", "incu"], incud: ["\u94C1\u7827", "\u52A8", "incud"], incumb: ["\u4FEF\u8EAB", "\u52A8", "incumb"], incunab: ["\u8941\u8913", "\u7269", "incunab"], indago: ["\u56F4\u730E", "\u52A8", "indago"], indic: ["\u6307\u6807", "\u6570", "indic"], indico: ["\u5BA3\u5E03", "\u52A8", "indico"], indig: ["\u975B\u84DD", "\u52A8", "indig"], indige: ["\u77ED\u7F3A", "\u6027", "indige"], indign: ["\u6124\u6168", "\u6027", "indign"], indo: ["\u6027\u60C5", "\u6027", "indo"], indoct: ["\u672A\u5B66", "\u52A8", "indoct"], induc: ["\u5F52\u7EB3", "\u6027", "induc"], induco: ["\u5F15\u5165", "\u52A8", "induco"], induct: ["\u611F\u5E94", "\u7269", "induct"], inductor: ["\u7535\u611F", "\u7269", "inductor"], indulg: ["\u5BBD\u5BB9", "\u6027", "indulg"], induo: ["\u7A7F\u4E0A", "\u52A8", "induo"], indus: ["\u52E4\u52C9", "\u6027", "indus"], indut: ["\u4F11\u6218", "\u52A8", "indut"], induv: ["\u5185\u8863", "\u52A8", "induv"], inedia: ["\u7EDD\u98DF", "\u52A8", "inedia"], ineo: ["\u8FDB\u5165", "\u52A8", "ineo"], inept: ["\u7B28\u62D9", "\u6027", "inept"], inepti: ["\u5B09\u95F9", "\u7269", "inepti"], inequ: ["\u4E0D\u5E73\u7B49", "\u7269", "inequ"], iners: ["\u65E0\u5473\u7684", "\u7269", "iners"], inert: ["\u60EF\u6027", "\u7269", "inert"], inf: ["\u4E0B\u3001\u4E0B\u65B9", "\u7269", "inf"], infa: ["\u803B\u8FB1", "\u6027", "infa"], infan: ["\u5E7C\u5E74", "\u7269", "infan"], infantil: ["\u5E7C\u513F\u7684", "\u7269", "infantil"], infe: ["\u51A5\u754C", "\u7269", "infe"], infer: ["\u63A8\u65AD", "\u6027", "infer"], inferiae: ["\u796D\u4EA1", "\u7269", "inferiae"], infern: ["\u5730\u72F1", "\u7269", "infern"], infigo: ["\u9489\u5165", "\u52A8", "infigo"], infim: ["\u6700\u4F4E", "\u7269", "infim"], infin: ["\u65E0\u7A77", "\u6027", "infin"], infirm: ["\u75C5\u5F31", "\u6027", "infirm"], infix: ["\u4E2D\u7F00", "\u7269", "infix"], inflam: ["\u708E\u75C7", "\u7269", "inflam"], inflation: ["\u901A\u80C0", "\u52A8", "inflation"], inform: ["\u8BAD\u5BFC", "\u52A8", "inform"], infrar: ["\u7EA2\u5916", "\u7269", "infrar"], infreq: ["\u7A00\u5C11", "\u6027", "infreq"], infula: ["\u7EF6\u5E26", "\u7269", "infula"], infund: ["\u503E\u6CE8", "\u52A8", "infund"], infusio: ["\u6D78\u6CE1", "\u52A8", "infusio"], inge: ["\u5929\u6027", "\u6027", "inge"], ingem: ["\u547B\u541F", "\u52A8", "ingem"], ingen: ["\u5E9E\u5927", "\u6027", "ingen"], ingred: ["\u8D70\u5165", "\u52A8", "ingred"], inhib: ["\u6291\u5236", "\u52A8", "inhib"], inicio: ["\u6295\u5165", "\u52A8", "inicio"], inim: ["\u4EC7\u6028", "\u52A8", "inim"], init: ["\u5F00\u59CB\u3001\u8D77\u521D", "\u7269", "init"], iniu: ["\u4FB5\u5BB3", "\u52A8", "iniu"], inmund: ["\u6C61\u79FD", "\u6027", "inmund"], innit: ["\u501A\u9760", "\u52A8", "innit"], innoc: ["\u65E0\u7F6A", "\u7269", "innoc"], innu: ["\u70B9\u5934\u793A\u610F", "\u52A8", "innu"], inopi: ["\u8D2B\u4E4F", "\u6027", "inopi"], inops: ["\u8D2B\u4E4F", "\u6027", "inops"], inquina: ["\u73B7\u6C61", "\u6027", "inquina"], inquis: ["\u67E5\u95EE", "\u52A8", "inquis"], insa: ["\u75AF\u72C2", "\u6027", "insa"], insci: ["\u65E0\u77E5", "\u52A8", "insci"], inscrib: ["\u9898\u5199", "\u52A8", "inscrib"], inscul: ["\u523B\u5165", "\u52A8", "inscul"], inse: ["\u6606\u866B", "\u7269", "inse"], insid: ["\u57CB\u4F0F", "\u52A8", "insid"], insign: ["\u975E\u51E1", "\u6027", "insign"], insigne: ["\u5FBD\u8BB0", "\u7269", "insigne"], insili: ["\u7ECF\u7EBF", "\u52A8", "insili"], insipidus: ["\u65E0\u5473", "\u6027", "insipidus"], insipie: ["\u65E0\u77E5", "\u6027", "insipie"], insit: ["\u5AC1\u63A5", "\u7269", "insit"], insomn: ["\u5931\u7720", "\u52A8", "insomn"], inspect: ["\u7EC6\u770B", "\u52A8", "inspect"], inspic: ["\u5BA1\u89C6", "\u52A8", "inspic"], instan: ["\u50AC\u903C", "\u52A8", "instan"], instil: ["\u704C\u8F93", "\u52A8", "instil"], instinct: ["\u672C\u80FD", "\u6027", "instinct"], instit: ["\u96F6\u552E\u5546", "\u52A8", "instit"], instita: ["\u7F18\u9970", "\u7269", "instita"], institu: ["\u8BBE\u6559", "\u52A8", "institu"], institut: ["\u6CD5\u5B66\u9636\u68AF", "\u52A8", "institut"], insto: ["\u903C\u8FD1", "\u52A8", "insto"], instr: ["\u5E03\u7F6E", "\u52A8", "instr"], instrument: ["\u5668\u5177", "\u52A8", "instrument"], insul: ["\u5C9B", "\u7269", "insul"], insuls: ["\u65E0\u5473", "\u6027", "insuls"], insuo: ["\u7F1D\u5165", "\u52A8", "insuo"], int: ["\u7406\u89E3", "\u52A8", "int"], inte: ["\u6BC1\u706D", "\u52A8", "inte"], integ: ["\u5B8C\u6574\u3001\u6574", "\u6570", "integ"], integral: ["\u79EF\u5206", "\u7269", "integral"], intell: ["\u667A\u529B", "\u6027", "intell"], intemp: ["\u653E\u7EB5", "\u6027", "intemp"], intercal: ["\u95F0\u6708", "\u7269", "intercal"], interced: ["\u8C03\u505C", "\u7269", "interced"], intercess: ["\u5F02\u8BAE", "\u52A8", "intercess"], interci: ["\u622A\u53D6", "\u52A8", "interci"], interdic: ["\u7981\u6B62", "\u52A8", "interdic"], interloq: ["\u63D2\u8BDD", "\u52A8", "interloq"], intern: ["\u5185\u90E8", "\u7269", "intern"], internunt: ["\u4E2D\u4ECB", "\u7269", "internunt"], interp: ["\u89E3\u91CA", "\u7269", "interp"], interpe: ["\u63D2\u95EE", "\u52A8", "interpe"], interro: ["\u8FFD\u95EE", "\u52A8", "interro"], intersec: ["\u622A\u65AD", "\u52A8", "intersec"], interst: ["\u5939\u5EFA", "\u52A8", "interst"], interstit: ["\u95F4\u9699", "\u7269", "interstit"], intervall: ["\u95F4\u9694", "\u7269", "intervall"], intestin: ["\u80A0", "\u52A8", "intestin"], inting: ["\u8638", "\u52A8", "inting"], intr: ["\u5185\u4FA7", "\u7269", "intr"], intu: ["\u76F4\u89C9", "\u52A8", "intu"], intue: ["\u51DD\u89C6", "\u52A8", "intue"], inundat: ["\u6CDB\u6EE5", "\u7269", "inundat"], inuro: ["\u70D9", "\u52A8", "inuro"], inust: ["\u70D9\u5370", "\u52A8", "inust"], invalid: ["\u65E0\u529B", "\u6027", "invalid"], inveh: ["\u8FD0\u5165", "\u52A8", "inveh"], inven: ["\u53D1\u73B0", "\u52A8", "inven"], invest: ["\u6295\u8D44", "\u52A8", "invest"], invi: ["\u5992\u5FCC", "\u6027", "invi"], invictus: ["\u4E0D\u8D25", "\u6027", "invictus"], invide: ["\u5AC9\u5992", "\u6027", "invide"], invidio: ["\u5992\u5FCC\u7684", "\u6027", "invidio"], invis: ["\u63A2\u770B", "\u52A8", "invis"], inviso: ["\u63A2\u8BBF", "\u52A8", "inviso"], invisus: ["\u88AB\u618E\u7684", "\u6027", "invisus"], invit: ["\u9080\u8BF7", "\u52A8", "invit"], involv: ["\u5305\u88F9", "\u52A8", "involv"], io: ["\u6B22\u547C", "\u52A8", "io"], ioc: ["\u73A9\u7B11", "\u7269", "ioc"], ion: ["\u79BB\u5B50", "\u7269", "ion"], ira: ["\u6012", "\u52A8", "ira"], irac: ["\u6613\u6012", "\u6027", "irac"], irasc: ["\u53D1\u6012", "\u6027", "irasc"], irid: ["\u8679", "\u7269", "irid"], iridesc: ["\u8679\u5F69", "\u6027", "iridesc"], ironia: ["\u53CD\u8BBD", "\u7269", "ironia"], irrep: ["\u6F5C\u5165", "\u52A8", "irrep"], irrid: ["\u5632\u7B11", "\u52A8", "irrid"], irrigu: ["\u704C\u533A", "\u52A8", "irrigu"], irrita: ["\u70E6\u8E81", "\u6027", "irrita"], isoth: ["\u7B49\u6E29\u7EBF", "\u7269", "isoth"], isthm: ["\u5730\u5CE1", "\u7269", "isthm"], itin: ["\u65C5\u7A0B", "\u7269", "itin"], itis: ["\u708E", "\u6027", "itis"], iub: ["\u9B03", "\u7269", "iub"], iube: ["\u547D\u4EE4", "\u52A8", "iube"], iucund: ["\u6109\u5FEB", "\u6027", "iucund"], iudico: ["\u5224\u65AD", "\u52A8", "iudico"], iug: ["\u5957\u8F6D", "\u52A8", "iug"], iuge: ["\u571F\u5730\u5355\u4F4D", "\u7269", "iuge"], iugum: ["\u8F6D", "\u7269", "iugum"], iument: ["\u5F79\u755C", "\u7269", "iument"], iun: ["\u8FDE\u63A5\u3001\u7ED3\u5408", "\u52A8", "iun"], iunior: ["\u665A\u8F88", "\u7269", "iunior"], iur: ["\u6743\u5229\u3001\u6CD5\u6743", "\u7269", "iur"], iura: ["\u7ACB\u8A93", "\u52A8", "iura"], iurat: ["\u5BA3\u8A93", "\u52A8", "iurat"], iurg: ["\u4E89\u5435", "\u52A8", "iurg"], iurisc: ["\u6CD5\u5B66\u5BB6", "\u52A8", "iurisc"], iurisd: ["\u7BA1\u8F96", "\u7269", "iurisd"], iuscul: ["\u8584\u6C64", "\u52A8", "iuscul"], iussio: ["\u547D\u4EE4", "\u52A8", "iussio"], iust: ["\u6B63\u4E49", "\u6027", "iust"], iusta: ["\u846C\u793C", "\u7269", "iusta"], iustit: ["\u56FD\u4E27", "\u7269", "iustit"], iuven: ["\u9752\u6625", "\u7269", "iuven"], iuvenis: ["\u9752\u5E74", "\u7269", "iuvenis"], iuvo: ["\u5E2E\u52A9", "\u52A8", "iuvo"], jejun: ["\u8D2B\u7620", "\u6027", "jejun"], jongl: ["\u6742\u800D", "\u7269", "jongl"], jubar: ["\u661F\u8F89", "\u7269", "jubar"], jud: ["\u5BA1\u5224", "\u7269", "jud"], juncus: ["\u706F\u82AF\u8349", "\u7269", "juncus"], jungle: ["\u4E1B\u6797", "\u7269", "jungle"], jus: ["\u6C64\u6C41", "\u7269", "jus"], kalen: ["\u6708\u521D", "\u7269", "kalen"], karma: ["\u4E1A", "\u7269", "karma"], karst: ["\u5580\u65AF\u7279", "\u7269", "karst"], kartel: ["\u5361\u7279\u5C14", "\u7269", "kartel"], kat: ["\u50AC\u5316", "\u7269", "kat"], kines: ["\u8FD0\u52A8", "\u7269", "kines"], kinest: ["\u52A8\u89C9", "\u6027", "kinest"], kineto: ["\u52A8", "\u7269", "kineto"], kredit: ["\u4FE1\u8D37", "\u7269", "kredit"], kris: ["\u5371\u673A", "\u6027", "kris"], lab: ["\u8F9B\u52B3", "\u7269", "lab"], labefa: ["\u52A8\u6447", "\u52A8", "labefa"], labes: ["\u5D29\u584C", "\u7269", "labes"], labium: ["\u5507", "\u7269", "labium"], labori: ["\u52E4\u52B3\u7684", "\u52A8", "labori"], labrum: ["\u6D17\u6DA4\u76C6", "\u7269", "labrum"], lac: ["\u6E56\u3001\u6C60", "\u7269", "lac"], lacero: ["\u6495\u88C2", "\u52A8", "lacero"], lacert: ["\u5065\u7855", "\u6027", "lacert"], lacrima: ["\u6CEA", "\u52A8", "lacrima"], lacrimo: ["\u6D41\u6CEA", "\u52A8", "lacrimo"], lact: ["\u5976", "\u7269", "lact"], lactens: ["\u4E73\u513F", "\u7269", "lactens"], lactuc: ["\u83B4\u82E3", "\u7269", "lactuc"], lacunar: ["\u85FB\u4E95", "\u7269", "lacunar"], lacus: ["\u9152\u6C60", "\u52A8", "lacus"], laet: ["\u5FEB\u4E50", "\u6027", "laet"], laevi: ["\u78E8\u5149", "\u52A8", "laevi"], laevis: ["\u5E73\u6ED1", "\u6027", "laevis"], lalia: ["\u8C08\u8BDD", "\u6027", "lalia"], lambo: ["\u8214", "\u52A8", "lambo"], lament: ["\u54C0\u53F9", "\u6027", "lament"], lamentu: ["\u54C0\u8BCD", "\u52A8", "lamentu"], lamina: ["\u70D9\u94C1", "\u7269", "lamina"], lamp: ["\u706F\u3001\u660E\u706B", "\u7269", "lamp"], lan: ["\u7F8A\u6BDB", "\u7269", "lan"], lanari: ["\u6BDB\u7EC7\u5DE5", "\u52A8", "lanari"], lancea: ["\u957F\u67AA", "\u7269", "lancea"], lancin: ["\u6495\u626F", "\u52A8", "lancin"], landscape: ["\u98CE\u666F", "\u7269", "landscape"], langu: ["\u5026\u6020", "\u6027", "langu"], languid: ["\u9893\u5510", "\u6027", "languid"], lanific: ["\u6BDB\u7EBA", "\u52A8", "lanific"], lantern: ["\u8DEF\u706F", "\u7269", "lantern"], lanug: ["\u7ED2\u9762", "\u6027", "lanug"], lapid: ["\u77F3\u6599", "\u7269", "lapid"], laps: ["\u6ED1\u843D", "\u52A8", "laps"], laqu: ["\u5957\u7D22", "\u7269", "laqu"], lar: ["\u5BB6\u795E", "\u7269", "lar"], larg: ["\u4E30\u76DB", "\u6027", "larg"], largi: ["\u65BD\u4E0E", "\u52A8", "largi"], largitio: ["\u8D4F\u8D49", "\u7269", "largitio"], larva: ["\u5E7C\u4F53", "\u7269", "larva"], larvo: ["\u5E7C\u866B", "\u7269", "larvo"], lassit: ["\u75B2\u4E4F", "\u52A8", "lassit"], lassus: ["\u75B2\u5026", "\u6027", "lassus"], lat: ["\u4FA7\u3001\u65C1", "\u7269", "lat"], later: ["\u7816", "\u7269", "later"], latera: ["\u8237\u4FA7", "\u7269", "latera"], laterar: ["\u7816\u5320", "\u7269", "laterar"], laterit: ["\u7EA2\u571F", "\u7269", "laterit"], lathe: ["\u8F66\u5E8A", "\u7269", "lathe"], latibu: ["\u517D\u7A74", "\u52A8", "latibu"], latifol: ["\u9614\u53F6", "\u7269", "latifol"], latitud: ["\u5BBD\u5EA6", "\u7269", "latitud"], latri: ["\u5395", "\u7269", "latri"], latrunc: ["\u8DF3\u68CB", "\u52A8", "latrunc"], laur: ["\u6708\u6842", "\u7269", "laur"], laurea: ["\u5B66\u4F4D", "\u7269", "laurea"], laus: ["\u79F0\u8D5E", "\u6027", "laus"], lautus: ["\u7CBE\u7F8E", "\u6027", "lautus"], lav: ["\u6D17", "\u52A8", "lav"], lava: ["\u7194\u5CA9", "\u7269", "lava"], lavacr: ["\u6D74\u6C60", "\u6027", "lavacr"], laxa: ["\u653E\u677E", "\u52A8", "laxa"], lect: ["\u8BF5\u8BFB", "\u7269", "lect"], lectic: ["\u80A9\u8206", "\u7269", "lectic"], lecticar: ["\u80A9\u8206\u5320", "\u7269", "lecticar"], lectulus: ["\u5367\u69BB", "\u7269", "lectulus"], lectura: ["\u8BB2\u5E2D", "\u7269", "lectura"], leg: ["\u8BFB\u3001\u6536\u96C6", "\u52A8", "leg"], lega: ["\u4F7F\u8282", "\u7269", "lega"], legio: ["\u519B\u56E2", "\u7269", "legio"], lego: ["\u59D4\u4EFB", "\u52A8", "lego"], legum: ["\u8C46", "\u7269", "legum"], lembus: ["\u8F7B\u821F", "\u7269", "lembus"], lemma: ["\u5F15\u7406", "\u7269", "lemma"], lemn: ["\u5F15\u7406", "\u7269", "lemn"], lemur: ["\u5E7D\u9B42", "\u7269", "lemur"], leni: ["\u67D4\u548C", "\u6027", "leni"], lente: ["\u7F13\u884C", "\u52A8", "lente"], lentor: ["\u9ECF\u6EDE", "\u6027", "lentor"], lentus: ["\u9ECF\u97E7", "\u6027", "lentus"], lep: ["\u5154", "\u7269", "lep"], lepid: ["\u98CE\u8DA3", "\u6027", "lepid"], lepor: ["\u98CE\u8DA3", "\u52A8", "lepor"], letarg: ["\u660F\u7761\u75C7", "\u52A8", "letarg"], letho: ["\u9057\u5FD8\u6C89\u7761", "\u6027", "letho"], lev: ["\u8F7B", "\u6027", "lev"], levat: ["\u4E3E\u8D77", "\u52A8", "levat"], levid: ["\u6D45\u8584", "\u6027", "levid"], levig: ["\u5149\u6ED1", "\u6027", "levig"], levigo: ["\u78E8\u5149", "\u52A8", "levigo"], levir: ["\u592B\u5144", "\u7269", "levir"], levor: ["\u5149\u6ED1\u5EA6", "\u6027", "levor"], lex: ["\u6210\u6587\u6CD5", "\u7269", "lex"], lexem: ["\u8BCD\u4F4D", "\u7269", "lexem"], lexic: ["\u8BCD\u6C47", "\u7269", "lexic"], lib: ["\u81EA\u7531", "\u7269", "lib"], libari: ["\u7CD5\u70B9", "\u6027", "libari"], libat: ["\u5960\u9152", "\u7269", "libat"], libell: ["\u5C0F\u518C", "\u7269", "libell"], liberal: ["\u6177\u6168", "\u6027", "liberal"], libertus: ["\u81EA\u7531\u6C11", "\u7269", "libertus"], libido: ["\u6B32\u529B", "\u6027", "libido"], libr: ["\u91CD\u5355\u4F4D", "\u7269", "libr"], libral: ["\u4E00\u78C5\u7684", "\u7269", "libral"], librator: ["\u6C34\u51C6\u6D4B\u91CF\u5458", "\u7269", "librator"], libum: ["\u7CD5", "\u7269", "libum"], liburna: ["\u8F7B\u5E06\u8239", "\u7269", "liburna"], liceor: ["\u7ADE\u4E70", "\u52A8", "liceor"], licitat: ["\u7ADE\u4EF7", "\u7269", "licitat"], licium: ["\u7EFC\u7EBF", "\u52A8", "licium"], lict: ["\u8214", "\u7269", "lict"], lictor: ["\u6248\u4ECE", "\u7269", "lictor"], lien: ["\u7559\u7F6E\u6743", "\u7269", "lien"], lig: ["\u7ED1\u3001\u7CFB", "\u52A8", "lig"], ligament: ["\u97E7\u5E26", "\u52A8", "ligament"], lign: ["\u6728\u3001\u6728\u6750", "\u7269", "lign"], lignar: ["\u6728\u5320", "\u7269", "lignar"], ligo: ["\u9E64\u5634\u9504", "\u7269", "ligo"], liguri: ["\u8D2A\u5403", "\u52A8", "liguri"], lili: ["\u767E\u5408", "\u7269", "lili"], lim: ["\u6CE5\u3001\u6CBC\u6CFD", "\u7269", "lim"], lima: ["\u9509", "\u52A8", "lima"], limat: ["\u9509\u5DE5", "\u7269", "limat"], limatu: ["\u9509\u5C51", "\u52A8", "limatu"], limbus: ["\u7F18\u5E26", "\u7269", "limbus"], limen: ["\u95E8\u69DB", "\u7269", "limen"], limes: ["\u6781\u9650", "\u7269", "limes"], limis: ["\u659C\u89C6", "\u52A8", "limis"], limit: ["\u6781\u9650", "\u7269", "limit"], limo: ["\u9509", "\u52A8", "limo"], limos: ["\u6DE4\u6CE5", "\u7269", "limos"], limpid: ["\u6E05\u6F88", "\u6027", "limpid"], lin: ["\u7EBF\u3001\u7EF3", "\u52A8", "lin"], lineo: ["\u52FE\u7EBF", "\u52A8", "lineo"], ling: ["\u820C", "\u7269", "ling"], lintr: ["\u5C0F\u8247", "\u7269", "lintr"], lipoth: ["\u660F\u53A5", "\u7269", "lipoth"], liqu: ["\u6DB2\u5316", "\u52A8", "liqu"], liquam: ["\u9C7C\u9171\u6C41", "\u52A8", "liquam"], lis: ["\u8BC9\u8BBC", "\u52A8", "lis"], lit: ["\u5CB8\u3001\u8FB9", "\u7269", "lit"], litania: ["\u8FDE\u7977", "\u7269", "litania"], literat: ["\u6587\u5B66", "\u7269", "literat"], litho: ["\u77F3\u8D28", "\u7269", "litho"], lithog: ["\u77F3\u7248", "\u7269", "lithog"], lithost: ["\u94FA\u77F3", "\u7269", "lithost"], litig: ["\u4E89\u8BBC", "\u7269", "litig"], litor: ["\u6D77\u6EE8", "\u7269", "litor"], litr: ["\u5347", "\u7269", "litr"], littera: ["\u535A\u6587", "\u6027", "littera"], livor: ["\u9752\u7D2B", "\u6027", "livor"], loam: ["\u58E4\u571F", "\u7269", "loam"], locar: ["\u51FA\u79DF", "\u52A8", "locar"], locator: ["\u51FA\u79DF\u4EBA", "\u7269", "locator"], locito: ["\u51FA\u79DF", "\u52A8", "locito"], locu: ["\u8757", "\u7269", "locu"], locupl: ["\u5BCC\u88D5", "\u6027", "locupl"], locus: ["\u4F4D\u7F6E", "\u7269", "locus"], loess: ["\u9EC4\u571F", "\u7269", "loess"], log: ["\u903B\u8F91\u3001\u7406", "\u7269", "log"], logarith: ["\u5BF9\u6570", "\u7269", "logarith"], logis: ["\u5BF9\u6570", "\u6027", "logis"], logo: ["\u7406\u6027", "\u6027", "logo"], lon: ["\u8FDC\u3001\u957F", "\u7269", "lon"], longa: ["\u6218\u8239", "\u7269", "longa"], longaev: ["\u957F\u5BFF", "\u7269", "longaev"], longitud: ["\u7EB5\u5411", "\u7269", "longitud"], loquac: ["\u591A\u8A00", "\u52A8", "loquac"], lora: ["\u6DE1\u9152", "\u7269", "lora"], loric: ["\u7532\u80C4", "\u52A8", "loric"], lotio: ["\u6D17\u6DA4", "\u52A8", "lotio"], lotura: ["\u6D17\u6DB2", "\u6027", "lotura"], loudn: ["\u54CD\u5EA6", "\u6027", "loudn"], lubric: ["\u6ED1\u7684", "\u6027", "lubric"], lubricus: ["\u6ED1\u6E9C", "\u6027", "lubricus"], lucellum: ["\u5C0F\u5229", "\u7269", "lucellum"], lucid: ["\u660E\u4EAE", "\u6027", "lucid"], lucifer: ["\u542F\u660E\u661F", "\u7269", "lucifer"], lucr: ["\u83B7\u5229", "\u52A8", "lucr"], lucrif: ["\u725F\u5229", "\u52A8", "lucrif"], luct: ["\u640F\u6597", "\u52A8", "luct"], luctam: ["\u89D2\u529B", "\u52A8", "luctam"], luctus: ["\u54C0\u6078", "\u6027", "luctus"], lucubr: ["\u591C\u8BFB", "\u52A8", "lucubr"], lud: ["\u6E38\u620F\u3001\u620F", "\u7269", "lud"], ludibrium: ["\u7B11\u67C4\u73A9\u7269", "\u7269", "ludibrium"], ludicrum: ["\u73A9\u7269", "\u7269", "ludicrum"], lug: ["\u60B2\u60BC", "\u6027", "lug"], lugubr: ["\u4E27\u670D", "\u7269", "lugubr"], lumbus: ["\u8170", "\u7269", "lumbus"], lumen: ["\u5FAE\u5149", "\u7269", "lumen"], luminar: ["\u5929\u7A97", "\u7269", "luminar"], luminesc: ["\u53D1\u5149", "\u6027", "luminesc"], luminos: ["\u5149\u5EA6", "\u7269", "luminos"], lun: ["\u6708\u4EAE", "\u7269", "lun"], lup: ["\u72FC", "\u7269", "lup"], lupatum: ["\u9A6C\u8854\u94C1", "\u7269", "lupatum"], luperca: ["\u7267\u795E\u8282", "\u7269", "luperca"], luscus: ["\u72EC\u773C", "\u6027", "luscus"], lustr: ["\u4E94\u5E74", "\u7269", "lustr"], lustra: ["\u7953\u51C0", "\u6027", "lustra"], lusus: ["\u6E38\u620F", "\u7269", "lusus"], lut: ["\u6CE5\u6D46", "\u7269", "lut"], lutulen: ["\u6CE5\u6CDE", "\u6027", "lutulen"], lux: ["\u5149\u4EAE\u3001\u7167\u660E", "\u7269", "lux"], luxa: ["\u8131\u81FC", "\u52A8", "luxa"], lyceum: ["\u5B66\u56ED", "\u7269", "lyceum"], lych: ["\u706F", "\u7269", "lych"], lymph: ["\u6DCB\u5DF4", "\u52A8", "lymph"], lynx: ["\u731E\u7301", "\u7269", "lynx"], lyr: ["\u7434", "\u7269", "lyr"], lyric: ["\u6292\u60C5\u8BD7", "\u7269", "lyric"], lyricus: ["\u6292\u60C5", "\u7269", "lyricus"], lys: ["\u6EB6\u89E3", "\u6027", "lys"], macell: ["\u5E02\u573A", "\u7269", "macell"], macer: ["\u7626\u7620", "\u6027", "macer"], macera: ["\u6D78\u6E0D", "\u52A8", "macera"], mach: ["\u8C0B\u7565\u3001\u673A\u5DE7", "\u52A8", "mach"], machin: ["\u673A\u68B0", "\u52A8", "machin"], machinor: ["\u8BBE\u8BA1\u5EFA\u9020", "\u52A8", "machinor"], macilent: ["\u7626\u524A", "\u6027", "macilent"], macul: ["\u6591\u70B9", "\u6027", "macul"], maculat: ["\u6CBE\u6C61", "\u6027", "maculat"], maculos: ["\u6591\u70B9\u7684", "\u6027", "maculos"], madefac: ["\u4F7F\u6E7F", "\u52A8", "madefac"], madeo: ["\u6D78\u6E7F", "\u52A8", "madeo"], madid: ["\u6E7F\u900F", "\u52A8", "madid"], maer: ["\u54C0\u4F24", "\u6027", "maer"], maestit: ["\u60B2\u621A", "\u52A8", "maestit"], mag: ["\u9B54\u6CD5\u3001\u672F", "\u52A8", "mag"], magir: ["\u6CD5\u672F", "\u52A8", "magir"], magis: ["\u66F4", "\u6570", "magis"], magist: ["\u957F\u5B98", "\u7269", "magist"], magistrat: ["\u5B98\u804C", "\u7269", "magistrat"], magma: ["\u5CA9\u6D46", "\u7269", "magma"], magn: ["\u5927", "\u6027", "magn"], magneto: ["\u78C1", "\u7269", "magneto"], magnif: ["\u5B8F\u4F1F", "\u6027", "magnif"], magnitud: ["\u5927\u5C0F", "\u7269", "magnitud"], maio: ["\u8F83\u5927", "\u6027", "maio"], maior: ["\u957F\u8F88", "\u7269", "maior"], mal: ["\u574F\u3001\u6076", "\u6027", "mal"], maledict: ["\u5492\u9A82", "\u52A8", "maledict"], malefic: ["\u90AA\u672F", "\u52A8", "malefic"], malevo: ["\u6076\u610F", "\u6027", "malevo"], mali: ["\u6076\u6BD2", "\u6027", "mali"], maligno: ["\u6076\u6027", "\u7269", "maligno"], malint: ["\u8BEF\u89E3", "\u7269", "malint"], malle: ["\u9524", "\u7269", "malle"], malum: ["\u82F9\u679C", "\u7269", "malum"], malus: ["\u6845", "\u7269", "malus"], mammula: ["\u513F\u8BED\u5988", "\u7269", "mammula"], man: ["\u4FDD\u6301\u3001\u6301\u7EED", "\u52A8", "man"], mana: ["\u739B\u90A3", "\u52A8", "mana"], manatio: ["\u6D8C\u6D41", "\u52A8", "manatio"], mancip: ["\u8981\u5F0F\u4E70\u5356", "\u52A8", "mancip"], mand: ["\u5480\u56BC", "\u7269", "mand"], mandat: ["\u547D\u4EE4\u4E66", "\u7269", "mandat"], mando: ["\u4EA4\u4ED8", "\u52A8", "mando"], mane: ["\u6E05\u6668", "\u7269", "mane"], manes: ["\u4EA1\u7075", "\u7269", "manes"], mania: ["\u8E81\u72C2", "\u6027", "mania"], manic: ["\u8896", "\u7269", "manic"], manicae: ["\u624B\u94D0", "\u7269", "manicae"], manip: ["\u628A\u3001\u675F", "\u7269", "manip"], maniple: ["\u5C0F\u961F", "\u7269", "maniple"], mans: ["\u5BBF\u7AD9", "\u7269", "mans"], mansue: ["\u9A6F\u5316", "\u52A8", "mansue"], mansuet: ["\u6E29\u9A6F", "\u6027", "mansuet"], mantra: ["\u771F\u8A00", "\u7269", "mantra"], manu: ["\u624B", "\u7269", "manu"], manubi: ["\u6218\u5229\u54C1", "\u7269", "manubi"], mappa: ["\u9910\u5DFE", "\u7269", "mappa"], marcid: ["\u840E\u5F31", "\u6027", "marcid"], marculus: ["\u5C0F\u9524", "\u7269", "marculus"], margar: ["\u73CD\u73E0", "\u7269", "margar"], margin: ["\u8FB9\u7F18\u4EBA", "\u7269", "margin"], marginal: ["\u9875\u8FB9\u6CE8", "\u7269", "marginal"], marl: ["\u6CE5\u7070", "\u7269", "marl"], marm: ["\u5927\u7406\u77F3", "\u7269", "marm"], marmor: ["\u7EB9\u5F69", "\u6027", "marmor"], marmorar: ["\u77F3\u5320", "\u7269", "marmorar"], marmorat: ["\u6591\u9A73", "\u6027", "marmorat"], marra: ["\u5927\u9504", "\u7269", "marra"], mas: ["\u7537\u5B50", "\u7269", "mas"], masque: ["\u5047\u9762\u5267", "\u7269", "masque"], mass: ["\u8D28\u91CF", "\u7269", "mass"], mastic: ["\u7EC6\u56BC", "\u52A8", "mastic"], mater: ["\u6BCD", "\u7269", "mater"], materi: ["\u6750\u6599", "\u52A8", "materi"], math: ["\u5B66\u3001\u6570\u5B66", "\u7269", "math"], matricul: ["\u6CE8\u518C", "\u7269", "matricul"], matrim: ["\u5A5A\u59FB", "\u7269", "matrim"], matrix: ["\u77E9\u9635", "\u7269", "matrix"], matteris: ["\u91CD\u77DB", "\u7269", "matteris"], matur: ["\u6210\u719F", "\u52A8", "matur"], matutin: ["\u6668\u65F6", "\u7269", "matutin"], maximu: ["\u6700\u591A", "\u6570", "maximu"], meat: ["\u7A7F\u884C\u3001\u7ECF\u8FC7", "\u52A8", "meat"], mech: ["\u529B\u5B66", "\u7269", "mech"], mechano: ["\u673A\u68B0", "\u7269", "mechano"], med: ["\u533B", "\u52A8", "med"], medall: ["\u50CF\u7AE0", "\u7269", "medall"], medi: ["\u4E2D\u95F4", "\u6027", "medi"], mediation: ["\u8C03\u89E3", "\u7269", "mediation"], medic: ["\u533B\u672F", "\u52A8", "medic"], medimn: ["\u6597\u91CF", "\u7269", "medimn"], mediocr: ["\u5E73\u5EB8", "\u6027", "mediocr"], medita: ["\u9ED8\u60F3\u7684", "\u52A8", "medita"], meditatio: ["\u51A5\u60F3", "\u7269", "meditatio"], mediterran: ["\u5730\u4E2D\u6D77", "\u7269", "mediterran"], meditor: ["\u7814\u4E60", "\u52A8", "meditor"], meditri: ["\u65B0\u9152\u8282", "\u7269", "meditri"], medull: ["\u9AA8\u9AD3", "\u52A8", "medull"], mel: ["\u871C", "\u7269", "mel"], melan: ["\u5FE7\u90C1", "\u6027", "melan"], melisma: ["\u82B1\u8154", "\u7269", "melisma"], mellif: ["\u917F\u871C", "\u52A8", "mellif"], mellitus: ["\u871C\u6E0D", "\u6027", "mellitus"], melo: ["\u65CB\u5F8B", "\u7269", "melo"], melos: ["\u66F2\u8C03", "\u7269", "melos"], membr: ["\u819C", "\u7269", "membr"], memini: ["\u8BB0\u5F97", "\u52A8", "memini"], memoir: ["\u56DE\u5FC6\u5F55", "\u7269", "memoir"], mendic: ["\u4E5E\u8BA8\u7684", "\u6027", "mendic"], mendici: ["\u884C\u4E5E", "\u6027", "mendici"], mens: ["\u6708", "\u7269", "mens"], mensa: ["\u9910\u684C", "\u7269", "mensa"], mensari: ["\u5151\u6362\u5546", "\u7269", "mensari"], mensula: ["\u5C0F\u684C", "\u7269", "mensula"], mentum: ["\u988F", "\u7269", "mentum"], mer: ["\u5546\u54C1\u3001\u8D38\u6613", "\u52A8", "mer"], merc: ["\u5546\u4EBA", "\u7269", "merc"], merca: ["\u5E02\u573A", "\u52A8", "merca"], mercim: ["\u8D27\u7269", "\u7269", "mercim"], merco: ["\u7ECF\u5546", "\u52A8", "merco"], merenda: ["\u5348\u540E\u70B9\u5FC3", "\u52A8", "merenda"], mereo: ["\u8D5A\u5F97", "\u52A8", "mereo"], merid: ["\u6B63\u5348", "\u7269", "merid"], merit: ["\u529F\u7EE9", "\u6027", "merit"], merso: ["\u6C89\u6CA1", "\u52A8", "merso"], mes: ["\u6536\u83B7\u3001\u79CB", "\u7269", "mes"], mess: ["\u6536\u5272", "\u52A8", "mess"], messor: ["\u6536\u5272\u8005", "\u7269", "messor"], met: ["\u6D4B\u91CF", "\u6027", "met"], meta: ["\u754C\u6807", "\u6570", "meta"], metabol: ["\u4EE3\u8C22", "\u7269", "metabol"], metall: ["\u91D1\u5C5E\u5149\u6CFD", "\u6027", "metall"], metallo: ["\u91D1\u5C5E", "\u7269", "metallo"], metallum: ["\u77FF\u5F79", "\u7269", "metallum"], metamorpho: ["\u53D8\u6001", "\u7269", "metamorpho"], metaphor: ["\u9690\u55BB", "\u7269", "metaphor"], meteor: ["\u6D41\u661F", "\u7269", "meteor"], meteorit: ["\u9668\u77F3", "\u7269", "meteorit"], meth: ["\u65B9\u6CD5", "\u6027", "meth"], meticul: ["\u80C6\u602F\u7684", "\u6027", "meticul"], metonym: ["\u8F6C\u55BB", "\u7269", "metonym"], metopa: ["\u95F4\u677F", "\u7269", "metopa"], metr: ["\u683C\u5F8B", "\u7269", "metr"], metric: ["\u5EA6\u91CF\u5B66", "\u7269", "metric"], metuo: ["\u754F\u60E7", "\u6027", "metuo"], mic: ["\u95EA\u8000", "\u7269", "mic"], micul: ["\u7C92", "\u7269", "micul"], migr: ["\u8FC1\u5F99", "\u7269", "migr"], mil: ["\u5175\u3001\u519B", "\u52A8", "mil"], mill: ["\u5343", "\u6570", "mill"], milli: ["\u5343\u6B65", "\u7269", "milli"], mim: ["\u4F36\u4EBA", "\u7269", "mim"], mina: ["\u5A01\u80C1", "\u52A8", "mina"], miner: ["\u77FF\u7269", "\u7269", "miner"], ming: ["\u6392\u5C3F", "\u52A8", "ming"], miniat: ["\u6731\u7EA2", "\u6027", "miniat"], minimu: ["\u6700\u5C11", "\u6570", "minimu"], minist: ["\u81E3\u4EC6", "\u7269", "minist"], ministro: ["\u4F8D\u5019", "\u52A8", "ministro"], minit: ["\u5A01\u80C1", "\u52A8", "minit"], minu: ["\u51CF\u3001\u5C11", "\u6027", "minu"], minus: ["\u54D1\u5267", "\u7269", "minus"], minut: ["\u7EC6\u5FAE", "\u6027", "minut"], mir: ["\u60CA\u5947", "\u52A8", "mir"], miser: ["\u601C\u60AF", "\u6027", "miser"], mit: ["\u9001\u3001\u6D3E\u9063", "\u52A8", "mit"], miti: ["\u6E29\u987A", "\u6027", "miti"], mitra: ["\u5934\u5DFE", "\u7269", "mitra"], mixt: ["\u6DF7\u5408", "\u52A8", "mixt"], mnemo: ["\u8BB0\u5FC6", "\u6027", "mnemo"], mnesia: ["\u8BB0\u5FC6", "\u6027", "mnesia"], mobil: ["\u6D41\u52A8", "\u7269", "mobil"], mod: ["\u5EA6\u91CF\u3001\u6837\u5F0F", "\u52A8", "mod"], modalis: ["\u8C03\u5F0F\u7684", "\u7269", "modalis"], mode: ["\u8C26\u900A", "\u6027", "mode"], moderam: ["\u6CBB\u672F", "\u52A8", "moderam"], moderor: ["\u8282\u5236", "\u52A8", "moderor"], modi: ["\u5BB9\u91CF\u5355\u4F4D", "\u7269", "modi"], modic: ["\u9002\u4E2D", "\u6027", "modic"], modiol: ["\u8F6E\u6BC2", "\u7269", "modiol"], modul: ["\u6A21\u6570", "\u7269", "modul"], modulam: ["\u66F2\u8C03", "\u6027", "modulam"], modulat: ["\u6291\u626C", "\u6027", "modulat"], modulor: ["\u6309\u8C03\u5531", "\u52A8", "modulor"], moen: ["\u57CE\u5899", "\u7269", "moen"], moeror: ["\u60B2\u6078", "\u6027", "moeror"], mol: ["\u78E8", "\u7269", "mol"], mola: ["\u78E8\u7C89", "\u7269", "mola"], molaaqu: ["\u6C34\u78E8", "\u7269", "molaaqu"], molar: ["\u5899\u77F3", "\u52A8", "molar"], mole: ["\u6469\u5C14", "\u7269", "mole"], molec: ["\u5206\u5B50", "\u7269", "molec"], molendi: ["\u78E8\u574A", "\u7269", "molendi"], moles: ["\u5DE8\u5CA9", "\u7269", "moles"], molest: ["\u70E6\u7D2F\u7684", "\u52A8", "molest"], molio: ["\u8425\u5EFA", "\u52A8", "molio"], molito: ["\u78E8\u574A\u4E3B", "\u52A8", "molito"], molitura: ["\u78E8\u7C89", "\u52A8", "molitura"], moll: ["\u67D4\u8F6F", "\u6027", "moll"], mollit: ["\u67D4\u8F6F\u611F", "\u6027", "mollit"], mom: ["\u7247\u523B", "\u7269", "mom"], monachus: ["\u4FEE\u58EB", "\u7269", "monachus"], monar: ["\u541B\u4E3B\u5236", "\u7269", "monar"], monaulus: ["\u5355\u7BA1", "\u7269", "monaulus"], moneo: ["\u544A\u8BEB", "\u52A8", "moneo"], monet: ["\u94F8\u5E01", "\u52A8", "monet"], monil: ["\u9879\u94FE", "\u7269", "monil"], monod: ["\u72EC\u594F", "\u7269", "monod"], monopol: ["\u5784\u65AD", "\u7269", "monopol"], monstro: ["\u6307\u6559", "\u52A8", "monstro"], monstros: ["\u602A\u5F02", "\u6027", "monstros"], monsun: ["\u5B63\u98CE", "\u7269", "monsun"], monument: ["\u7EAA\u5FF5\u7891", "\u7269", "monument"], moor: ["\u8352\u6CBC", "\u7269", "moor"], mor: ["\u6851", "\u7269", "mor"], morat: ["\u9017\u7559", "\u52A8", "morat"], morato: ["\u62D6\u5EF6\u8005", "\u6027", "morato"], morb: ["\u75BE\u75C5", "\u52A8", "morb"], morbill: ["\u9EBB\u75B9", "\u7269", "morbill"], mord: ["\u54AC", "\u7269", "mord"], mordant: ["\u5A92\u67D3", "\u52A8", "mordant"], mordic: ["\u523A\u75DB", "\u6027", "mordic"], morige: ["\u8FCE\u5408", "\u52A8", "morige"], moror: ["\u62D6\u5EF6\u963B", "\u52A8", "moror"], moros: ["\u4E56\u50FB", "\u6027", "moros"], moroso: ["\u611A\u54F2", "\u6027", "moroso"], morosus: ["\u62D6\u5EF6", "\u6027", "morosus"], morphem: ["\u8BCD\u7D20", "\u7269", "morphem"], morpho: ["\u5F62\u6001\u5B66", "\u7269", "morpho"], morsus: ["\u54AC\u75DB", "\u6027", "morsus"], mortu: ["\u6B7B\u8005", "\u7269", "mortu"], mos: ["\u4E60\u4FD7", "\u6027", "mos"], mosch: ["\u9E9D\u9999", "\u7269", "mosch"], motif: ["\u6BCD\u9898", "\u7269", "motif"], motiv: ["\u52A8\u56E0", "\u52A8", "motiv"], motri: ["\u539F\u52A8", "\u7269", "motri"], mucor: ["\u9709\u6ED1", "\u6027", "mucor"], mucus: ["\u9F3B\u6D95", "\u52A8", "mucus"], mugitu: ["\u4F4E\u9E23", "\u52A8", "mugitu"], mulc: ["\u629A\u6170", "\u52A8", "mulc"], mulcta: ["\u7F5A\u91D1", "\u7269", "mulcta"], mulctr: ["\u6324\u5976", "\u52A8", "mulctr"], mulsum: ["\u871C\u9152", "\u7269", "mulsum"], multa: ["\u7F5A\u91D1", "\u7269", "multa"], multat: ["\u7F5A\u6B3E", "\u7269", "multat"], multi: ["\u591A\u500D", "\u6027", "multi"], multip: ["\u7E41\u591A", "\u6027", "multip"], multiplica: ["\u8FDE\u4E58", "\u6027", "multiplica"], multitu: ["\u4F17\u591A", "\u6570", "multitu"], multum: ["\u591A", "\u6570", "multum"], mulus: ["\u9AA1", "\u7269", "mulus"], mund: ["\u6D01\u51C0", "\u6027", "mund"], mundu: ["\u4E16\u754C", "\u7269", "mundu"], muner: ["\u89D2\u6597\u8868\u6F14", "\u7269", "muner"], munerar: ["\u9988\u8D60", "\u52A8", "munerar"], muni: ["\u81EA\u6CBB\u5E02", "\u7269", "muni"], munio: ["\u7B51\u9632", "\u52A8", "munio"], mur: ["\u5899\u57A3", "\u7269", "mur"], mural: ["\u58C1\u753B", "\u7269", "mural"], murex: ["\u9AA8\u87BA\u7D2B", "\u52A8", "murex"], muria: ["\u54B8\u8165", "\u7269", "muria"], murmur: ["\u4F4E\u8BED\u58F0", "\u6027", "murmur"], musc: ["\u82D4", "\u7269", "musc"], muscul: ["\u808C\u8089", "\u52A8", "muscul"], musicus: ["\u4E50\u4EBA", "\u7269", "musicus"], musiv: ["\u9576\u5D4C", "\u7269", "musiv"], must: ["\u65B0\u9152", "\u7269", "must"], mustel: ["\u9F2C", "\u7269", "mustel"], mut: ["\u6539\u53D8\u3001\u8F6C\u5316", "\u52A8", "mut"], mutat: ["\u6362\u9A6C", "\u7269", "mutat"], mutu: ["\u4EA4\u4E92", "\u6027", "mutu"], mutulus: ["\u6A90\u4E0B\u6258\u5757", "\u7269", "mutulus"], mutuo: ["\u501F\u8D37", "\u52A8", "mutuo"], mutuum: ["\u8D4A\u6B20", "\u7269", "mutuum"], myo: ["\u808C", "\u7269", "myo"], myri: ["\u4E07", "\u6570", "myri"], myrm: ["\u8681", "\u7269", "myrm"], myrothe: ["\u9999\u6CB9\u76D2", "\u7269", "myrothe"], myrrha: ["\u6CA1\u836F", "\u7269", "myrrha"], myrt: ["\u6843\u91D1\u5A18", "\u7269", "myrt"], mys: ["\u9F20", "\u7269", "mys"], myst: ["\u5965\u79D8", "\u52A8", "myst"], myth: ["\u795E\u8BDD", "\u7269", "myth"], nablium: ["\u7AD6\u7434", "\u7269", "nablium"], nadir: ["\u5929\u5E95", "\u7269", "nadir"], naenia: ["\u633D\u6B4C", "\u7269", "naenia"], nancis: ["\u83B7\u5F97", "\u52A8", "nancis"], narc: ["\u6C34\u4ED9", "\u7269", "narc"], narco: ["\u9EBB\u9189\u6C14", "\u52A8", "narco"], nardus: ["\u7518\u677E\u9999", "\u7269", "nardus"], naris: ["\u9F3B\u5B54", "\u7269", "naris"], narr: ["\u53D9\u8FF0", "\u7269", "narr"], narthe: ["\u836F\u818F\u76D2", "\u7269", "narthe"], nas: ["\u51FA\u751F", "\u52A8", "nas"], nassa: ["\u9C7C\u7B3C", "\u52A8", "nassa"], natal: ["\u8BDE\u8FB0", "\u7269", "natal"], natu: ["\u5E74\u9F7F", "\u7269", "natu"], nauclerus: ["\u8239\u4E3B", "\u7269", "nauclerus"], naufrag: ["\u6D77\u96BE", "\u7269", "naufrag"], naulum: ["\u8FD0\u8D39", "\u7269", "naulum"], naumach: ["\u6D77\u6218\u8868\u6F14", "\u7269", "naumach"], nause: ["\u6076\u5FC3", "\u52A8", "nause"], nauseos: ["\u4EE4\u4EBA\u4F5C\u5455", "\u6027", "nauseos"], naut: ["\u6C34\u624B", "\u7269", "naut"], nautic: ["\u822A\u6D77\u672F", "\u7269", "nautic"], nav: ["\u821F\u3001\u822A\u884C", "\u7269", "nav"], navale: ["\u8239\u575E", "\u7269", "navale"], navarch: ["\u8230\u961F\u53F8\u4EE4", "\u7269", "navarch"], navig: ["\u822A\u884C", "\u7269", "navig"], navigi: ["\u901A\u822A", "\u7269", "navigi"], nebul: ["\u96FE\u3001\u4E91", "\u7269", "nebul"], neces: ["\u5FC5\u7136", "\u6027", "neces"], necr: ["\u4EA1\u8005\u672F", "\u7269", "necr"], necro: ["\u574F\u6B7B", "\u7269", "necro"], nect: ["\u7F16\u7EC7", "\u7269", "nect"], necto: ["\u7ED3", "\u52A8", "necto"], nefast: ["\u51F6\u65E5", "\u7269", "nefast"], neg: ["\u5426\u3001\u8D1F", "\u6570", "neg"], negation: ["\u5426\u5B9A", "\u6027", "negation"], negleg: ["\u5FFD\u7565", "\u52A8", "negleg"], neglig: ["\u8FC7\u5931", "\u7269", "neglig"], negoti: ["\u7ECF\u8425", "\u52A8", "negoti"], nem: ["\u6797\u3001\u6811\u4E1B", "\u7269", "nem"], nemes: ["\u62A5\u5E94", "\u7269", "nemes"], nemo: ["\u65E0\u4EBA", "\u7269", "nemo"], neo: ["\u7EBA", "\u52A8", "neo"], nephro: ["\u80BE", "\u7269", "nephro"], nepot: ["\u5B59\u8F88", "\u52A8", "nepot"], nerv: ["\u795E\u7ECF\u3001\u7B4B", "\u7269", "nerv"], nervos: ["\u6709\u529B", "\u6027", "nervos"], nesci: ["\u4E0D\u77E5", "\u52A8", "nesci"], netr: ["\u7EBA\u7EB1", "\u52A8", "netr"], netrix: ["\u7EBA\u5973", "\u52A8", "netrix"], neur: ["\u795E\u7ECF", "\u7269", "neur"], neuron: ["\u795E\u7ECF\u5143", "\u52A8", "neuron"], neutr: ["\u4E2D\u6027", "\u7269", "neutr"], nex: ["\u8054\u7ED3\u3001\u7ED3", "\u52A8", "nex"], nexum: ["\u503A\u52A1\u5974\u5F79", "\u52A8", "nexum"], niche: ["\u751F\u6001\u4F4D", "\u7269", "niche"], nict: ["\u7728\u773C", "\u52A8", "nict"], nid: ["\u5DE2", "\u7269", "nid"], nidor: ["\u6CB9\u70DF\u5473", "\u7269", "nidor"], nigr: ["\u9ED1", "\u6027", "nigr"], nigredo: ["\u9EDD\u9ED1", "\u6027", "nigredo"], nih: ["\u65E0\u3001\u96F6", "\u6570", "nih"], nihil: ["\u865A\u65E0", "\u6027", "nihil"], nim: ["\u96E8\u4E91", "\u7269", "nim"], nimbo: ["\u96E8\u5C42\u4E91", "\u7269", "nimbo"], nimbos: ["\u9634\u4E91", "\u7269", "nimbos"], nimis: ["\u8FC7\u5EA6", "\u6570", "nimis"], nimiu: ["\u592A\u591A", "\u6570", "nimiu"], ningo: ["\u4E0B\u96EA", "\u52A8", "ningo"], nitens: ["\u6DA6\u6CFD", "\u6027", "nitens"], nitid: ["\u5149\u6D01", "\u6027", "nitid"], nitor: ["\u5149\u6CFD", "\u6027", "nitor"], niv: ["\u96EA", "\u7269", "niv"], nival: ["\u964D\u96EA", "\u7269", "nival"], nive: ["\u96EA\u767D", "\u6027", "nive"], nix: ["\u501A\u9760", "\u52A8", "nix"], nixus: ["\u594B\u529B", "\u52A8", "nixus"], nob: ["\u663E\u8D35", "\u7269", "nob"], noc: ["\u4F24\u5BB3", "\u52A8", "noc"], nocice: ["\u75DB\u89C9", "\u6027", "nocice"], noctiluc: ["\u591C\u5149", "\u7269", "noctiluc"], noctur: ["\u591C\u95F4\u7684", "\u52A8", "noctur"], nocturn: ["\u591C\u65F6", "\u7269", "nocturn"], nodos: ["\u591A\u8282\u7684", "\u6027", "nodos"], nodus: ["\u7EBD\u7ED3", "\u7269", "nodus"], noe: ["\u5FC3\u667A\u3001\u7406\u6027", "\u52A8", "noe"], nom: ["\u540D\u3001\u540D\u79F0", "\u52A8", "nom"], nomencl: ["\u5531\u540D\u5B98", "\u7269", "nomencl"], nomism: ["\u901A\u8D27", "\u7269", "nomism"], nomo: ["\u4E60\u4FD7\u6CD5", "\u7269", "nomo"], nomos: ["\u6CD5\u5219", "\u6027", "nomos"], nonnih: ["\u4E0D\u5C11", "\u6570", "nonnih"], noo: ["\u5FC3\u667A", "\u6027", "noo"], noria: ["\u6C34\u8F66", "\u7269", "noria"], norm: ["\u89C4\u8303\u3001\u77E9", "\u52A8", "norm"], nosc: ["\u8BA4\u8BC6", "\u52A8", "nosc"], noscit: ["\u719F\u8BC6", "\u52A8", "noscit"], nostal: ["\u6000\u65E7", "\u6027", "nostal"], not: ["\u6807\u8BB0\u3001\u6CE8\u610F", "\u52A8", "not"], notar: ["\u901F\u8BB0", "\u7269", "notar"], notion: ["\u6982\u5FF5", "\u7269", "notion"], nov: ["\u65B0\u3001\u5D2D\u65B0", "\u52A8", "nov"], novacula: ["\u5243\u5200", "\u7269", "novacula"], noval: ["\u4F11\u8015\u5730", "\u7269", "noval"], novell: ["\u65B0\u6555", "\u52A8", "novell"], novendi: ["\u4E5D\u65E5\u796D", "\u7269", "novendi"], noverca: ["\u7EE7\u6BCD", "\u7269", "noverca"], novic: ["\u521D\u5B66\u751F", "\u7269", "novic"], nubil: ["\u5A5A\u9F84", "\u7269", "nubil"], nubilum: ["\u9634\u5929", "\u7269", "nubilum"], nubos: ["\u591A\u4E91", "\u7269", "nubos"], nuc: ["\u575A\u679C", "\u7269", "nuc"], nud: ["\u8D64\u8D2B", "\u6027", "nud"], nudo: ["\u4F7F\u88F8", "\u52A8", "nudo"], nugae: ["\u7410\u620F", "\u7269", "nugae"], nugax: ["\u7410\u5C51", "\u6027", "nugax"], num: ["\u6570", "\u6027", "num"], numella: ["\u8DB3\u67B7", "\u7269", "numella"], numer: ["\u8BA1\u6570", "\u6027", "numer"], numeri: ["\u8282\u62CD", "\u6027", "numeri"], numeros: ["\u4F17\u591A", "\u6027", "numeros"], numi: ["\u795E\u610F", "\u7269", "numi"], numm: ["\u94B1\u5E01", "\u52A8", "numm"], nummul: ["\u94B1\u5E84", "\u52A8", "nummul"], nummulari: ["\u94B1\u5546", "\u7269", "nummulari"], nundi: ["\u96C6\u65E5", "\u52A8", "nundi"], nundino: ["\u505A\u4E70\u5356", "\u52A8", "nundino"], nunt: ["\u6D88\u606F\u3001\u901A\u62A5", "\u52A8", "nunt"], nuntia: ["\u901A\u62A5", "\u7269", "nuntia"], nuntio: ["\u4F20\u4EE4", "\u52A8", "nuntio"], nupt: ["\u5A5A", "\u52A8", "nupt"], nurus: ["\u513F\u5AB3", "\u7269", "nurus"], nut: ["\u6446\u52A8", "\u52A8", "nut"], nutr: ["\u6ECB\u517B", "\u52A8", "nutr"], nutrien: ["\u517B\u5206", "\u7269", "nutrien"], nutrix: ["\u4E73\u6BCD", "\u7269", "nutrix"], nutus: ["\u9894\u9996", "\u52A8", "nutus"], nymph: ["\u82E5\u866B", "\u7269", "nymph"], oasi: ["\u7EFF\u6D32", "\u7269", "oasi"], obambul: ["\u8E31\u6B65", "\u52A8", "obambul"], obaud: ["\u542C\u4ECE", "\u52A8", "obaud"], obdorm: ["\u5165\u7761", "\u52A8", "obdorm"], obedientia: ["\u670D\u4ECE", "\u7269", "obedientia"], obesus: ["\u80A5\u80D6", "\u6027", "obesus"], obici: ["\u6295\u5411\u524D", "\u52A8", "obici"], obit: ["\u8F9E\u4E16", "\u7269", "obit"], oblat: ["\u4F9B\u7269", "\u7269", "oblat"], obli: ["\u5FD8\u5374", "\u52A8", "obli"], oblig: ["\u503A\u5238", "\u52A8", "oblig"], obliqu: ["\u659C\u5411", "\u7269", "obliqu"], oblongus: ["\u957F\u65B9\u7684", "\u6027", "oblongus"], obloq: ["\u53CD\u9A73", "\u52A8", "obloq"], obnox: ["\u8D1F\u503A", "\u52A8", "obnox"], oboed: ["\u542C\u547D", "\u52A8", "oboed"], obolus: ["\u5C0F\u5E01", "\u7269", "obolus"], obrepo: ["\u6F5C\u884C", "\u52A8", "obrepo"], obs: ["\u56F4\u56F0\u3001\u5C01\u9501", "\u52A8", "obs"], obsc: ["\u660F\u6697", "\u6027", "obsc"], obscur: ["\u4F7F\u6697\u3001\u853D", "\u52A8", "obscur"], obscurit: ["\u5E7D\u6697", "\u6027", "obscurit"], obse: ["\u89C2\u5BDF", "\u52A8", "obse"], obsecr: ["\u54C0\u6C42", "\u52A8", "obsecr"], obsequ: ["\u987A\u4ECE", "\u6027", "obsequ"], obsess: ["\u6267\u5FF5", "\u6027", "obsess"], obsid: ["\u56F4\u57CE", "\u52A8", "obsid"], obsoni: ["\u83DC\u80B4", "\u52A8", "obsoni"], obst: ["\u52A9\u4EA7", "\u52A8", "obst"], obstac: ["\u8BBE\u969C", "\u52A8", "obstac"], obstetric: ["\u4EA7\u79D1", "\u52A8", "obstetric"], obstip: ["\u4FBF\u79D8", "\u7269", "obstip"], obsto: ["\u963B\u788D", "\u52A8", "obsto"], obstr: ["\u5835\u585E", "\u52A8", "obstr"], obstre: ["\u5608\u6742", "\u6027", "obstre"], obstrin: ["\u675F\u4F4F", "\u52A8", "obstrin"], obsuo: ["\u5C01\u7F1D", "\u52A8", "obsuo"], obtemper: ["\u9075\u4ECE", "\u52A8", "obtemper"], obtero: ["\u538B\u788E", "\u52A8", "obtero"], obtest: ["\u6073\u6C42", "\u52A8", "obtest"], obtrect: ["\u8D2C\u635F", "\u52A8", "obtrect"], obtund: ["\u4F7F\u949D", "\u52A8", "obtund"], obtusus: ["\u95F7\u54CD", "\u6027", "obtusus"], obtut: ["\u51DD\u89C6", "\u52A8", "obtut"], obviam: ["\u8FCE\u5019", "\u52A8", "obviam"], obvolv: ["\u88F9\u4F4F", "\u52A8", "obvolv"], occasus: ["\u65E5\u843D", "\u7269", "occasus"], occator: ["\u8019\u5730\u8005", "\u7269", "occator"], occino: ["\u5BF9\u5531", "\u52A8", "occino"], occult: ["\u63A9\u661F", "\u7269", "occult"], occup: ["\u5360\u636E", "\u52A8", "occup"], occurro: ["\u8FCE\u4E0A", "\u52A8", "occurro"], ochr: ["\u8D6D\u77F3", "\u6027", "ochr"], ocior: ["\u66F4\u5FEB", "\u6027", "ocior"], ocrea: ["\u80EB\u7532", "\u7269", "ocrea"], oct: ["\u516B", "\u6570", "oct"], octava: ["\u516B\u5EA6", "\u7269", "octava"], ocu: ["\u773C", "\u7269", "ocu"], oculat: ["\u76EE\u51FB\u7684", "\u52A8", "oculat"], od: ["\u6068", "\u52A8", "od"], odios: ["\u53EF\u618E\u7684", "\u6027", "odios"], odomet: ["\u8BA1\u7A0B", "\u7269", "odomet"], odontal: ["\u7259\u75DB", "\u7269", "odontal"], odonto: ["\u7259", "\u7269", "odonto"], odor: ["\u6C14\u5473", "\u6027", "odor"], odoram: ["\u9999\u6599", "\u7269", "odoram"], odorat: ["\u55C5\u95FB", "\u52A8", "odorat"], odoro: ["\u95FB", "\u52A8", "odoro"], oeconomia: ["\u7ECF\u6D4E", "\u7269", "oeconomia"], oen: ["\u9152", "\u7269", "oen"], oenopho: ["\u9152\u5668", "\u52A8", "oenopho"], offe: ["\u5192\u72AF", "\u52A8", "offe"], offendo: ["\u649E\u89C1", "\u52A8", "offendo"], offic: ["\u4E49\u52A1", "\u6027", "offic"], offici: ["\u59A8\u788D", "\u52A8", "offici"], officin: ["\u5320\u4EBA", "\u7269", "officin"], officina: ["\u4F5C\u574A", "\u7269", "officina"], officios: ["\u6BB7\u52E4", "\u52A8", "officios"], offula: ["\u8089\u7247", "\u52A8", "offula"], ole: ["\u6CB9", "\u7269", "ole"], oleag: ["\u6CB9\u6DA6", "\u6027", "oleag"], oleari: ["\u6CB9\u5546", "\u52A8", "oleari"], oleif: ["\u69A8\u6CB9", "\u52A8", "oleif"], olens: ["\u6709\u6C14\u5473\u7684", "\u7269", "olens"], olent: ["\u9999\u6C14", "\u52A8", "olent"], oleo: ["\u53D1\u5473", "\u52A8", "oleo"], oler: ["\u852C\u83DC", "\u7269", "oler"], olf: ["\u55C5", "\u52A8", "olf"], olfact: ["\u55C5\u95FB", "\u52A8", "olfact"], oliga: ["\u5BE1\u5934", "\u7269", "oliga"], oligo: ["\u5BE1\u5934", "\u7269", "oligo"], oligopol: ["\u5BE1\u5934\u5784\u65AD", "\u7269", "oligopol"], oliv: ["\u6A44\u6984", "\u7269", "oliv"], olivet: ["\u6A44\u6984\u56ED", "\u7269", "olivet"], olla: ["\u9505", "\u7269", "olla"], oma: ["\u7624", "\u6027", "oma"], omen: ["\u5F81\u5146", "\u7269", "omen"], omitt: ["\u7565\u53BB", "\u52A8", "omitt"], omniv: ["\u6742\u98DF", "\u7269", "omniv"], onco: ["\u80BF\u7624", "\u7269", "onco"], oneiro: ["\u68A6", "\u6027", "oneiro"], onerari: ["\u5546\u8239", "\u7269", "onerari"], onycho: ["\u7532", "\u7269", "onycho"], opac: ["\u836B\u6697", "\u6027", "opac"], opacit: ["\u4E0D\u900F\u660E", "\u6027", "opacit"], opali: ["\u4E30\u4EA7\u8282", "\u7269", "opali"], oper: ["\u64CD\u4F5C", "\u7269", "oper"], opera: ["\u6B4C\u5267", "\u7269", "opera"], operet: ["\u8F7B\u6B4C\u5267", "\u7269", "operet"], operos: ["\u8D39\u529B\u7684", "\u52A8", "operos"], opert: ["\u906E\u853D", "\u6027", "opert"], ophthal: ["\u773C", "\u7269", "ophthal"], opia: ["\u89C6\u89C9", "\u6027", "opia"], opif: ["\u5DE5\u5320", "\u7269", "opif"], opilio: ["\u7267\u7F8A\u4EBA", "\u52A8", "opilio"], opim: ["\u4E30\u9976", "\u6027", "opim"], opin: ["\u770B\u6CD5\u3001\u610F\u89C1", "\u52A8", "opin"], opitu: ["\u6551\u52A9", "\u52A8", "opitu"], opp: ["\u653B\u57CE", "\u52A8", "opp"], oppe: ["\u7B49\u5F85", "\u52A8", "oppe"], oppo: ["\u5BF9\u7ACB", "\u6027", "oppo"], opprim: ["\u538B\u706D", "\u52A8", "opprim"], ops: ["\u8D22\u5BCC", "\u6027", "ops"], optic: ["\u5149\u5B66", "\u7269", "optic"], optim: ["\u6700\u4F18\u5316", "\u7269", "optim"], optimis: ["\u4E50\u89C2", "\u6027", "optimis"], optio: ["\u526F\u5B98", "\u7269", "optio"], opto: ["\u613F\u671B", "\u6027", "opto"], opulen: ["\u5BCC\u529B", "\u6027", "opulen"], opulens: ["\u5BCC\u88D5", "\u6027", "opulens"], opussect: ["\u9576\u5D4C\u77F3", "\u7269", "opussect"], ora: ["\u8BF7\u6C42", "\u52A8", "ora"], orac: ["\u795E\u8C15", "\u7269", "orac"], orat: ["\u6F14\u8BF4", "\u7269", "orat"], oratorium: ["\u7948\u7977\u5BA4", "\u7269", "oratorium"], orbita: ["\u8F68\u9053", "\u7269", "orbita"], orc: ["\u51A5\u5E9C", "\u7269", "orc"], orchestr: ["\u4E50\u6C60", "\u7269", "orchestr"], orchestra: ["\u4E50\u961F", "\u7269", "orchestra"], ordin: ["\u6B21\u5E8F", "\u6570", "ordin"], ordino: ["\u6574\u996C", "\u52A8", "ordino"], organ: ["\u5DE5\u5177", "\u52A8", "organ"], organo: ["\u5668\u5B98", "\u7269", "organo"], orient: ["\u5B9A\u5411", "\u6027", "orient"], orn: ["\u88C5\u9970", "\u52A8", "orn"], ornat: ["\u534E\u9970", "\u6027", "ornat"], orni: ["\u9E1F\u3001\u79BD", "\u7269", "orni"], orogen: ["\u9020\u5C71", "\u7269", "orogen"], orphan: ["\u5B64\u513F", "\u7269", "orphan"], orthogr: ["\u6B63\u5B57\u6CD5", "\u7269", "orthogr"], ortus: ["\u65E5\u51FA", "\u7269", "ortus"], oryz: ["\u7A3B\u3001\u7C73", "\u7269", "oryz"], oscill: ["\u5C0F\u9762\u5177", "\u7269", "oscill"], oscit: ["\u5475\u6B20", "\u52A8", "oscit"], oscul: ["\u543B", "\u52A8", "oscul"], osis: ["\u75C5\u53D8", "\u6027", "osis"], osmia: ["\u55C5\u89C9", "\u6027", "osmia"], osor: ["\u618E\u6068\u8005", "\u6027", "osor"], oss: ["\u9AA8", "\u7269", "oss"], oste: ["\u9AA8", "\u7269", "oste"], ostend: ["\u5C55\u793A", "\u52A8", "ostend"], ostiar: ["\u95E8\u5B98", "\u7269", "ostiar"], otio: ["\u95F2\u5C45", "\u52A8", "otio"], oto: ["\u8033", "\u7269", "oto"], otom: ["\u5207\u5F00", "\u6027", "otom"], ov: ["\u86CB", "\u7269", "ov"], ovatus: ["\u5375\u5F62\u7684", "\u6027", "ovatus"], overtura: ["\u5F00\u573A\u66F2", "\u7269", "overtura"], ovil: ["\u7F8A\u5708", "\u7269", "ovil"], ovio: ["\u5375", "\u7269", "ovio"], oxyd: ["\u6C27\u5316", "\u52A8", "oxyd"], pabulum: ["\u8349\u6599", "\u52A8", "pabulum"], pacat: ["\u7EE5\u9756\u7684", "\u52A8", "pacat"], pact: ["\u5951\u7EA6", "\u7269", "pact"], pacti: ["\u7EA6\u5B9A", "\u52A8", "pacti"], paed: ["\u587E\u5E08", "\u7269", "paed"], paegnium: ["\u73A9\u7269", "\u7269", "paegnium"], paenin: ["\u534A\u5C9B", "\u7269", "paenin"], paenit: ["\u540E\u6094", "\u6027", "paenit"], paenul: ["\u62AB\u98CE", "\u7269", "paenul"], pagan: ["\u5F02\u6559", "\u7269", "pagan"], pagella: ["\u4E66\u9875", "\u7269", "pagella"], pagin: ["\u9875", "\u7269", "pagin"], pagoda: ["\u4F5B\u5854", "\u7269", "pagoda"], paidei: ["\u6559\u5316", "\u7269", "paidei"], paideia: ["\u6559\u80B2", "\u7269", "paideia"], pala: ["\u94F2", "\u7269", "pala"], palaest: ["\u89D2\u529B\u573A", "\u52A8", "palaest"], palatium: ["\u5BAB\u6BBF", "\u7269", "palatium"], palatum: ["\u816D", "\u7269", "palatum"], palea: ["\u8C37\u58F3", "\u7269", "palea"], palette: ["\u8C03\u8272\u677F", "\u7269", "palette"], pall: ["\u62AB\u98CE", "\u7269", "pall"], pallens: ["\u82CD\u767D", "\u6027", "pallens"], pallid: ["\u82CD\u767D", "\u6027", "pallid"], pallor: ["\u82CD\u767D", "\u6027", "pallor"], palm: ["\u638C\u5BBD", "\u7269", "palm"], palma: ["\u638C", "\u7269", "palma"], palor: ["\u6E38\u8361", "\u52A8", "palor"], palp: ["\u8F7B\u629A", "\u52A8", "palp"], palpit: ["\u5FC3\u60B8", "\u52A8", "palpit"], palpo: ["\u629A", "\u6027", "palpo"], palud: ["\u6CBC\u6CFD", "\u7269", "palud"], paludam: ["\u5143\u5E05\u62AB\u98CE", "\u7269", "paludam"], pan: ["\u9762\u5305", "\u7269", "pan"], pancrat: ["\u5168\u80FD\u640F\u6597", "\u52A8", "pancrat"], pand: ["\u5C55\u5F00", "\u52A8", "pand"], pandect: ["\u6CD5\u5178", "\u52A8", "pandect"], pandura: ["\u4E09\u5F26", "\u7269", "pandura"], panic: ["\u6050\u614C", "\u6027", "panic"], panif: ["\u5236\u9762\u5305", "\u52A8", "panif"], pann: ["\u5E03", "\u7269", "pann"], pannic: ["\u886C\u91CC", "\u7269", "pannic"], pannicu: ["\u7834\u5E03", "\u52A8", "pannicu"], pantomim: ["\u54D1\u5267", "\u7269", "pantomim"], papi: ["\u8776", "\u7269", "papi"], papula: ["\u4E18\u75B9", "\u6027", "papula"], papyr: ["\u7EB8\u8349", "\u7269", "papyr"], par: ["\u6210\u5BF9\u3001\u540C\u7B49", "\u6027", "par"], para: ["\u6BB5\u843D", "\u7269", "para"], parade: ["\u6E38\u884C", "\u7269", "parade"], paradigm: ["\u8BCD\u5F62\u53D8\u5316", "\u7269", "paradigm"], paradox: ["\u6096\u8BBA", "\u6027", "paradox"], paral: ["\u5E73\u884C", "\u7269", "paral"], parall: ["\u89C6\u5DEE", "\u7269", "parall"], paralys: ["\u762B\u75EA", "\u7269", "paralys"], parasit: ["\u5BC4\u751F", "\u7269", "parasit"], parc: ["\u541D\u556C", "\u6027", "parc"], parce: ["\u8282\u7701\u5730", "\u6570", "parce"], parcim: ["\u8282\u7EA6", "\u7269", "parcim"], pardon: ["\u8D66\u514D", "\u7269", "pardon"], parental: ["\u796D\u7956\u8282", "\u7269", "parental"], pareo: ["\u670D\u4ECE", "\u52A8", "pareo"], parheli: ["\u5E7B\u65E5", "\u7269", "parheli"], parhipp: ["\u526F\u9A6C", "\u7269", "parhipp"], pariet: ["\u5899", "\u7269", "pariet"], parlia: ["\u56FD\u4F1A", "\u7269", "parlia"], parma: ["\u5706\u76FE", "\u7269", "parma"], paro: ["\u5907\u529E", "\u52A8", "paro"], parody: ["\u620F\u4EFF", "\u7269", "parody"], parti: ["\u5212\u5206", "\u6027", "parti"], particu: ["\u9010\u6761", "\u6570", "particu"], parum: ["\u592A\u5C11", "\u6570", "parum"], parv: ["\u5C0F", "\u6027", "parv"], parvul: ["\u5E7C\u7AE5", "\u7269", "parvul"], pasc: ["\u653E\u7267", "\u52A8", "pasc"], pascor: ["\u5403\u8349", "\u52A8", "pascor"], pass: ["\u6B65\u3001\u901A\u884C", "\u7269", "pass"], passion: ["\u6FC0\u60C5", "\u6027", "passion"], passum: ["\u679C\u5E72", "\u7269", "passum"], past: ["\u7267\u4EBA", "\u7269", "past"], patella: ["\u6D45\u9505", "\u52A8", "patella"], patho: ["\u75C5", "\u7269", "patho"], pati: ["\u5FCD\u8010", "\u6027", "pati"], patibu: ["\u5211\u67B6", "\u7269", "patibu"], patina: ["\u76D8", "\u7269", "patina"], patr: ["\u7236", "\u7269", "patr"], patri: ["\u7956\u56FD", "\u7269", "patri"], patricio: ["\u4E16\u5BB6", "\u7269", "patricio"], patro: ["\u5E87\u62A4", "\u52A8", "patro"], patronus: ["\u6069\u4E3B", "\u7269", "patronus"], patul: ["\u5F20\u5F00", "\u52A8", "patul"], paucit: ["\u5BE1\u5C11", "\u6570", "paucit"], paulum: ["\u5C11\u8BB8", "\u6570", "paulum"], paup: ["\u8D2B\u7A77", "\u6027", "paup"], paupertas: ["\u6E05\u8D2B", "\u7269", "paupertas"], pav: ["\u94FA\u5730", "\u7269", "pav"], paveo: ["\u60CA\u6050", "\u6027", "paveo"], pavid: ["\u60CA\u6050", "\u6027", "pavid"], paviment: ["\u94FA\u9762", "\u7269", "paviment"], pax: ["\u548C\u5E73", "\u52A8", "pax"], peat: ["\u6CE5\u70AD", "\u7269", "peat"], pecten: ["\u7B58", "\u7269", "pecten"], pectus: ["\u80F8", "\u7269", "pectus"], pecu: ["\u94B1\u8D22", "\u52A8", "pecu"], pecuaria: ["\u755C\u7267", "\u52A8", "pecuaria"], peculat: ["\u4FB5\u541E", "\u6027", "peculat"], peculi: ["\u79C1\u4EA7", "\u7269", "peculi"], ped: ["\u8DB3", "\u7269", "ped"], pedagog: ["\u6559\u5B66\u6CD5", "\u7269", "pedagog"], pedal: ["\u4E00\u5C3A\u7684", "\u7269", "pedal"], pedant: ["\u70AB\u5B66\u8005", "\u7269", "pedant"], pediat: ["\u513F\u79D1", "\u7269", "pediat"], pedica: ["\u6355\u517D\u5939", "\u52A8", "pedica"], pedit: ["\u6B65\u5175", "\u52A8", "pedit"], pell: ["\u76AE", "\u7269", "pell"], pellio: ["\u76AE\u5320", "\u52A8", "pellio"], pello: ["\u63A8\u52A8", "\u52A8", "pello"], pellu: ["\u900F\u660E", "\u6027", "pellu"], pelvis: ["\u76C6", "\u7269", "pelvis"], penat: ["\u5BB6\u795E", "\u7269", "penat"], pendo: ["\u507F\u4ED8", "\u52A8", "pendo"], pens: ["\u7EBA\u7EBF", "\u52A8", "pens"], pensa: ["\u79F0\u91CF", "\u52A8", "pensa"], pension: ["\u5E74\u91D1", "\u52A8", "pension"], pensita: ["\u644A\u8FD8", "\u7269", "pensita"], pensum: ["\u4E00\u65E5\u4E4B\u7EB1", "\u52A8", "pensum"], penumbra: ["\u534A\u5F71", "\u7269", "penumbra"], penuri: ["\u532E\u4E4F", "\u6027", "penuri"], penus: ["\u50A8\u7CAE", "\u52A8", "penus"], peraed: ["\u7AE3\u5DE5", "\u52A8", "peraed"], peramb: ["\u6D4B\u8DDD\u8F6E", "\u7269", "peramb"], peraud: ["\u542C\u904D", "\u52A8", "peraud"], perce: ["\u77E5\u89C9", "\u52A8", "perce"], percon: ["\u8BE6\u95EE", "\u52A8", "percon"], percoq: ["\u7096\u70C2", "\u52A8", "percoq"], percuti: ["\u6572\u51FB", "\u52A8", "percuti"], perd: ["\u5931\u53BB\u3001\u4E22\u5931", "\u52A8", "perd"], perdis: ["\u5B66\u900F", "\u52A8", "perdis"], perdue: ["\u53DB\u56FD\u8005", "\u52A8", "perdue"], pereg: ["\u5916\u90A6\u4EBA", "\u7269", "pereg"], peregr: ["\u8FDC\u6E38", "\u7269", "peregr"], pereo: ["\u6D88\u901D", "\u52A8", "pereo"], perf: ["\u80CC\u4FE1", "\u6027", "perf"], perfod: ["\u51FF\u7A7F", "\u52A8", "perfod"], perfor: ["\u7A7F\u5B54", "\u52A8", "perfor"], perfrin: ["\u51FB\u7A7F", "\u52A8", "perfrin"], perfund: ["\u6D47\u6DCB", "\u52A8", "perfund"], perg: ["\u524D\u884C", "\u52A8", "perg"], pergul: ["\u9732\u53F0", "\u7269", "pergul"], peri: ["\u5468\u8FB9", "\u7269", "peri"], peribol: ["\u56F4\u5899", "\u7269", "peribol"], peric: ["\u5371\u9669", "\u52A8", "peric"], perica: ["\u679C\u76AE", "\u7269", "perica"], perihe: ["\u8FD1\u65E5\u70B9", "\u7269", "perihe"], peristy: ["\u5217\u67F1\u4E2D\u5EAD", "\u7269", "peristy"], perit: ["\u719F\u7EC3", "\u6027", "perit"], periur: ["\u4F2A\u8A93", "\u52A8", "periur"], perizo: ["\u56F4\u88D9", "\u7269", "perizo"], perlucid: ["\u900F\u4EAE", "\u6027", "perlucid"], perlust: ["\u904D\u89C8", "\u52A8", "perlust"], perm: ["\u8BB8\u53EF", "\u52A8", "perm"], perma: ["\u6301\u4E45", "\u52A8", "perma"], permotio: ["\u60C5\u7EEA\u9707\u52A8", "\u6027", "permotio"], permut: ["\u6392\u5217", "\u7269", "permut"], pernici: ["\u8FC5\u75BE", "\u6027", "pernici"], pernix: ["\u654F\u6377", "\u6027", "pernix"], peror: ["\u9648\u8BCD", "\u52A8", "peror"], peros: ["\u6781\u6068", "\u6027", "peros"], perpens: ["\u6743\u8861", "\u7269", "perpens"], perpet: ["\u6C38\u7EED", "\u52A8", "perpet"], perscrut: ["\u7EC6\u5BDF", "\u52A8", "perscrut"], persent: ["\u89C9\u5BDF", "\u52A8", "persent"], persic: ["\u6843", "\u7269", "persic"], persol: ["\u4ED8\u6E05", "\u52A8", "persol"], person: ["\u89D2\u8272", "\u7269", "person"], persono: ["\u9E23\u54CD", "\u52A8", "persono"], perspe: ["\u900F\u89C6", "\u7269", "perspe"], perspic: ["\u660E\u5BDF", "\u52A8", "perspic"], perspicu: ["\u6D1E\u89C1", "\u7269", "perspicu"], perstrep: ["\u55A7\u817E", "\u6027", "perstrep"], perstrin: ["\u8F7B\u63A0", "\u6027", "perstrin"], pert: ["\u56FA\u6267", "\u6027", "pert"], perte: ["\u5C5E\u4E8E", "\u52A8", "perte"], pertime: ["\u6DF1\u60E7", "\u6027", "pertime"], perturb: ["\u70E6\u4E71", "\u6027", "perturb"], perurge: ["\u7D27\u8FEB", "\u52A8", "perurge"], perver: ["\u8D25\u574F", "\u52A8", "perver"], pervig: ["\u5B88\u591C", "\u52A8", "pervig"], pervigi: ["\u901A\u5BB5", "\u52A8", "pervigi"], pessim: ["\u60B2\u89C2", "\u6027", "pessim"], pest: ["\u761F\u75AB", "\u52A8", "pest"], pesti: ["\u75AB\u75C5", "\u52A8", "pesti"], pet: ["\u8D8B\u5411\u3001\u8FFD\u6C42", "\u52A8", "pet"], petal: ["\u82B1\u74E3", "\u7269", "petal"], petas: ["\u5E3D", "\u7269", "petas"], petaur: ["\u8DF3\u677F", "\u52A8", "petaur"], petition: ["\u8BF7\u613F", "\u7269", "petition"], petr: ["\u5CA9\u5757", "\u7269", "petr"], pex: ["\u56FA\u5B9A", "\u6027", "pex"], phaenom: ["\u73B0\u8C61", "\u52A8", "phaenom"], phalanx: ["\u65B9\u9635", "\u7269", "phalanx"], pharm: ["\u836F", "\u52A8", "pharm"], pharmac: ["\u836F\u8349", "\u52A8", "pharmac"], pharos: ["\u706F\u5854", "\u7269", "pharos"], pharynx: ["\u54BD", "\u7269", "pharynx"], phasel: ["\u5C0F\u821F", "\u7269", "phasel"], phasia: ["\u8A00\u8BED", "\u6027", "phasia"], philo: ["\u54F2\u4EBA", "\u7269", "philo"], philtrum: ["\u8FF7\u836F", "\u52A8", "philtrum"], phleb: ["\u9759\u8109", "\u52A8", "phleb"], phleg: ["\u75F0\u3001\u4F53\u6DB2", "\u52A8", "phleg"], phlogist: ["\u71C3\u7D20", "\u52A8", "phlogist"], phobia: ["\u6050\u60E7\u75C7", "\u6027", "phobia"], phobo: ["\u6050\u60E7", "\u6027", "phobo"], phon: ["\u97F3\u58F0", "\u7269", "phon"], phonem: ["\u97F3\u4F4D", "\u7269", "phonem"], phonet: ["\u8BED\u97F3\u5B66", "\u7269", "phonet"], phono: ["\u58F0", "\u7269", "phono"], phonol: ["\u97F3\u7CFB\u5B66", "\u7269", "phonol"], phosphor: ["\u78F7\u5149", "\u6027", "phosphor"], photo: ["\u5149", "\u7269", "photo"], photos: ["\u5149\u5408", "\u7269", "photos"], phreno: ["\u7CBE\u795E", "\u6027", "phreno"], phrone: ["\u5B9E\u8DF5\u667A", "\u6027", "phrone"], phylo: ["\u90E8\u65CF", "\u7269", "phylo"], physic: ["\u7269\u7406\u5B66", "\u7269", "physic"], physis: ["\u672C\u6027", "\u6027", "physis"], phyto: ["\u690D\u7269", "\u7269", "phyto"], piacul: ["\u8D4E\u7F6A", "\u7269", "piacul"], piatus: ["\u6DA4\u7F6A", "\u6027", "piatus"], pict: ["\u7ED8\u753B", "\u7269", "pict"], pictog: ["\u8C61\u5F62", "\u7269", "pictog"], pictor: ["\u753B\u5E08", "\u7269", "pictor"], piet: ["\u8654\u656C", "\u7269", "piet"], piger: ["\u6020\u60F0", "\u6027", "piger"], pigment: ["\u989C\u6599", "\u7269", "pigment"], pign: ["\u62B5\u62BC", "\u52A8", "pign"], pigr: ["\u61D2\u60F0", "\u6027", "pigr"], pigro: ["\u6020\u60F0", "\u52A8", "pigro"], pil: ["\u6295\u67AA", "\u52A8", "pil"], pila: ["\u73A9\u7403", "\u52A8", "pila"], pilula: ["\u5C0F\u7403", "\u7269", "pilula"], pin: ["\u677E", "\u7269", "pin"], ping: ["\u7ED8\u3001\u753B", "\u52A8", "ping"], pingo: ["\u7ED8\u753B", "\u52A8", "pingo"], pinna: ["\u9CCD", "\u7269", "pinna"], pins: ["\u6363\u997C", "\u7269", "pins"], pipe: ["\u80E1\u6912", "\u7269", "pipe"], pir: ["\u68A8", "\u7269", "pir"], pisc: ["\u9C7C", "\u7269", "pisc"], piscat: ["\u6E14\u4EBA", "\u7269", "piscat"], piscicul: ["\u517B\u9C7C", "\u7269", "piscicul"], piscin: ["\u6C34\u6C60", "\u7269", "piscin"], pistil: ["\u96CC\u854A", "\u7269", "pistil"], pistill: ["\u6775", "\u7269", "pistill"], pisto: ["\u9762\u5305\u5E08", "\u7269", "pisto"], piston: ["\u6D3B\u585E", "\u7269", "piston"], pistr: ["\u78E8\u574A", "\u7269", "pistr"], pistur: ["\u8202\u7C73", "\u52A8", "pistur"], pitch: ["\u97F3\u9AD8", "\u7269", "pitch"], plac: ["\u6E29\u548C", "\u6027", "plac"], placen: ["\u8584\u997C", "\u7269", "placen"], plaga: ["\u7F51\u7F57", "\u52A8", "plaga"], planctus: ["\u6376\u80F8\u54C0\u54ED", "\u7269", "planctus"], planet: ["\u884C\u661F", "\u7269", "planet"], planit: ["\u5E73\u539F", "\u7269", "planit"], plant: ["\u690D\u7269", "\u7269", "plant"], plantat: ["\u683D\u79CD", "\u52A8", "plantat"], planus: ["\u5E73\u7684", "\u6027", "planus"], plasia: ["\u589E\u751F", "\u6027", "plasia"], plasma: ["\u8840\u6D46", "\u52A8", "plasma"], plasto: ["\u5851", "\u7269", "plasto"], plat: ["\u5BBD\u3001\u5E73", "\u6027", "plat"], platea: ["\u8857\u9053", "\u7269", "platea"], plaud: ["\u62CD\u624B", "\u52A8", "plaud"], plausus: ["\u638C\u58F0", "\u6027", "plausus"], pleb: ["\u5E73\u6C11", "\u7269", "pleb"], plen: ["\u5145\u6EE1", "\u52A8", "plen"], pleriqu: ["\u591A\u6570", "\u6570", "pleriqu"], plerum: ["\u591A\u534A", "\u6570", "plerum"], plet: ["\u586B\u6EE1", "\u52A8", "plet"], plexus: ["\u4EA4\u7EC7", "\u52A8", "plexus"], plic: ["\u6298\u53E0", "\u52A8", "plic"], plor: ["\u54ED", "\u7269", "plor"], plot: ["\u60C5\u8282", "\u7269", "plot"], plum: ["\u7FBD\u6BDB", "\u7269", "plum"], plumag: ["\u7FBD\u8863", "\u7269", "plumag"], plumat: ["\u7FBD\u7EC7", "\u52A8", "plumat"], plumb: ["\u94C5", "\u7269", "plumb"], pluo: ["\u4E0B\u96E8", "\u52A8", "pluo"], plura: ["\u591A\u5143", "\u6027", "plura"], plurimu: ["\u6781\u591A", "\u6570", "plurimu"], plus: ["\u52A0\u3001\u591A", "\u6027", "plus"], pluteus: ["\u58C1\u67B6", "\u7269", "pluteus"], pluto: ["\u5BCC\u8C6A", "\u7269", "pluto"], pluv: ["\u96E8", "\u7269", "pluv"], pluvial: ["\u96E8\u5B63", "\u7269", "pluvial"], pneumato: ["\u6C14\u52A8", "\u7269", "pneumato"], pneumo: ["\u80BA", "\u7269", "pneumo"], pocul: ["\u676F", "\u7269", "pocul"], pod: ["\u53F0\u57FA", "\u7269", "pod"], podagra: ["\u75DB\u98CE", "\u7269", "podagra"], poem: ["\u8BD7", "\u7269", "poem"], poen: ["\u60E9\u7F5A", "\u7269", "poen"], poenal: ["\u5211\u7F5A\u7684", "\u52A8", "poenal"], poes: ["\u8BD7\u827A", "\u7269", "poes"], poet: ["\u8BD7\u4EBA", "\u7269", "poet"], polar: ["\u6781\u6027", "\u52A8", "polar"], poli: ["\u6253\u78E8", "\u52A8", "poli"], poliorket: ["\u653B\u57CE\u672F", "\u7269", "poliorket"], polis: ["\u57CE\u90A6", "\u7269", "polis"], polito: ["\u57CE\u90A6", "\u7269", "polito"], politor: ["\u78E8\u5DE5", "\u52A8", "politor"], pollin: ["\u82B1\u7C89", "\u7269", "pollin"], pollinat: ["\u6388\u7C89", "\u7269", "pollinat"], pollut: ["\u6C61\u67D3", "\u7269", "pollut"], polychr: ["\u5F69\u7ED8", "\u7269", "polychr"], polymita: ["\u591A\u8272\u7EC7\u7269", "\u52A8", "polymita"], polyp: ["\u7AE0\u9C7C", "\u7269", "polyp"], polypty: ["\u591A\u6298\u677F", "\u7269", "polypty"], pom: ["\u679C\u6811", "\u7269", "pom"], pomari: ["\u679C\u56ED", "\u7269", "pomari"], pompa: ["\u4EEA\u4ED7", "\u7269", "pompa"], pond: ["\u91CD\u91CF", "\u7269", "pond"], ponder: ["\u79F0\u91CD", "\u7269", "ponder"], pono: ["\u653E\u4E0B", "\u52A8", "pono"], pont: ["\u6865", "\u7269", "pont"], ponticus: ["\u9178\u6DA9", "\u6027", "ponticus"], ponto: ["\u5E73\u5E95\u8239", "\u7269", "ponto"], pontus: ["\u6DF1\u6D77", "\u7269", "pontus"], popul: ["\u6C11\u4F17", "\u7269", "popul"], porc: ["\u732A", "\u7269", "porc"], port: ["\u643A\u5E26", "\u52A8", "port"], porta: ["\u57CE\u95E8", "\u7269", "porta"], portic: ["\u67F1\u5ECA", "\u7269", "portic"], portio: ["\u4EFD\u989D", "\u7269", "portio"], portisc: ["\u6868\u624B\u6B4C\u8005", "\u7269", "portisc"], portitor: ["\u627F\u8FD0\u4EBA", "\u7269", "portitor"], portorium: ["\u5173\u7A0E", "\u7269", "portorium"], portra: ["\u8096\u50CF", "\u7269", "portra"], portu: ["\u6E2F\u6E7E", "\u7269", "portu"], posit: ["\u6B63\u3001\u7F6E", "\u6570", "posit"], poss: ["\u53EF\u80FD", "\u6027", "poss"], possess: ["\u5360\u6709", "\u52A8", "possess"], possi: ["\u62E5\u6709", "\u52A8", "possi"], posti: ["\u95E8\u67F1", "\u7269", "posti"], postul: ["\u8981\u6C42", "\u52A8", "postul"], postula: ["\u8BC9\u6C42", "\u52A8", "postula"], poten: ["\u5E42\u3001\u80FD", "\u6570", "poten"], potent: ["\u4E58\u65B9", "\u6027", "potent"], potio: ["\u636E\u6709", "\u52A8", "potio"], potito: ["\u5E38\u996E", "\u52A8", "potito"], poto: ["\u559D", "\u52A8", "poto"], potulent: ["\u996E\u54C1", "\u6027", "potulent"], praec: ["\u4F20\u4EE4", "\u7269", "praec"], praecep: ["\u6025\u4FC3", "\u6027", "praecep"], praecept: ["\u6559\u8BEB", "\u7269", "praecept"], praecid: ["\u5207\u65AD", "\u52A8", "praecid"], praecipi: ["\u5760\u5D16\u5211", "\u7269", "praecipi"], praecox: ["\u65E9\u719F", "\u6027", "praecox"], praed: ["\u52AB\u63A0", "\u52A8", "praed"], praedic: ["\u9884\u544A", "\u52A8", "praedic"], praefat: ["\u5E8F\u8A00", "\u7269", "praefat"], praefec: ["\u957F\u5B98\u7F72", "\u7269", "praefec"], praefect: ["\u957F\u5B98", "\u7269", "praefect"], praefic: ["\u4EFB\u4E3A\u957F\u5B98", "\u52A8", "praefic"], praegred: ["\u5148\u884C", "\u52A8", "praegred"], praelo: ["\u5F00\u573A\u767D", "\u52A8", "praelo"], praelud: ["\u5E8F\u66F2", "\u7269", "praelud"], praemiss: ["\u524D\u63D0", "\u7269", "praemiss"], praemitt: ["\u9884\u9063", "\u52A8", "praemitt"], praemon: ["\u9884\u8B66", "\u52A8", "praemon"], praepes: ["\u75BE\u98DE", "\u6027", "praepes"], praepot: ["\u81F3\u5F3A", "\u6027", "praepot"], praerip: ["\u62A2\u8D70", "\u52A8", "praerip"], praesag: ["\u9884\u5224", "\u7269", "praesag"], praesc: ["\u5904\u65B9", "\u7269", "praesc"], praescr: ["\u89C4\u5B9A", "\u52A8", "praescr"], praese: ["\u9972\u69FD", "\u52A8", "praese"], praesid: ["\u9A7B\u519B", "\u52A8", "praesid"], praesidi: ["\u5B88\u5907", "\u52A8", "praesidi"], praesidium: ["\u620D\u536B", "\u7269", "praesidium"], praest: ["\u5353\u8D8A", "\u6027", "praest"], praestig: ["\u5E7B\u672F", "\u52A8", "praestig"], praesuo: ["\u9884\u7F1D", "\u52A8", "praesuo"], praet: ["\u88C1\u5224\u5B98", "\u7269", "praet"], praeteri: ["\u7ECF\u8FC7", "\u52A8", "praeteri"], praetori: ["\u7981\u536B", "\u7269", "praetori"], praeust: ["\u70E7\u786C\u7684", "\u52A8", "praeust"], praeval: ["\u5360\u4F18", "\u6027", "praeval"], pragma: ["\u8BED\u7528", "\u7269", "pragma"], prana: ["\u6C14", "\u52A8", "prana"], prat: ["\u8349\u5730", "\u7269", "prat"], prav: ["\u9519\u8BEF\u3001\u6B6A\u659C", "\u6027", "prav"], praxia: ["\u884C\u4E3A", "\u6027", "praxia"], praxis: ["\u5B9E\u8DF5", "\u6027", "praxis"], prec: ["\u7948\u7977", "\u7269", "prec"], preced: ["\u5148\u4F8B", "\u7269", "preced"], preci: ["\u8D35\u91CD", "\u6027", "preci"], precip: ["\u6C89\u6DC0", "\u52A8", "precip"], predat: ["\u6355\u98DF", "\u7269", "predat"], predicat: ["\u8C13\u8BCD", "\u6027", "predicat"], prefix: ["\u524D\u7F00", "\u7269", "prefix"], preju: ["\u504F\u89C1", "\u6027", "preju"], prelude: ["\u524D\u594F", "\u7269", "prelude"], prelum: ["\u69A8\u673A", "\u52A8", "prelum"], prem: ["\u538B\u3001\u6309", "\u52A8", "prem"], premiss: ["\u524D\u63D0", "\u6027", "premiss"], premium: ["\u4FDD\u8D39", "\u52A8", "premium"], prend: ["\u6349", "\u52A8", "prend"], press: ["\u538B\u529B", "\u52A8", "press"], pression: ["\u538B\u52A8", "\u7269", "pression"], pressur: ["\u538B\u69A8", "\u52A8", "pressur"], presti: ["\u58F0\u671B", "\u7269", "presti"], pret: ["\u4EF7\u683C", "\u52A8", "pret"], preti: ["\u4F30\u4EF7", "\u52A8", "preti"], primaev: ["\u521D\u5E74", "\u7269", "primaev"], primav: ["\u65E9\u6625", "\u7269", "primav"], primo: ["\u8D77\u521D", "\u52A8", "primo"], princ: ["\u539F\u7406", "\u6027", "princ"], princeps: ["\u5143\u9996", "\u7269", "princeps"], prioris: ["\u5973\u9662\u957F", "\u7269", "prioris"], pris: ["\u65E7\u3001\u53E4\u8001", "\u52A8", "pris"], privig: ["\u7EE7\u5B50", "\u7269", "privig"], privileg: ["\u7279\u6743", "\u7269", "privileg"], proba: ["\u8BBA\u8BC1", "\u52A8", "proba"], probab: ["\u6982\u7387", "\u7269", "probab"], probato: ["\u8003\u8BD5", "\u7269", "probato"], probit: ["\u8BDA\u5B9E", "\u6027", "probit"], probl: ["\u96BE\u9898", "\u7269", "probl"], probo: ["\u8003\u6838", "\u52A8", "probo"], probrum: ["\u4E11\u884C", "\u6027", "probrum"], proce: ["\u8FC7\u7A0B", "\u6027", "proce"], procer: ["\u9AD8\u5927", "\u6027", "procer"], processi: ["\u4EEA\u4ED7\u6E38\u884C", "\u7269", "processi"], procl: ["\u516C\u544A", "\u7269", "procl"], proconsul: ["\u603B\u7763", "\u7269", "proconsul"], procumb: ["\u530D\u5310", "\u52A8", "procumb"], procurat: ["\u4EE3\u7406", "\u7269", "procurat"], procurator: ["\u4EE3\u8BC9\u4EBA", "\u52A8", "procurator"], procuro: ["\u7763\u529E", "\u52A8", "procuro"], prod: ["\u80CC\u53DB", "\u52A8", "prod"], prodig: ["\u62C6\u6563", "\u52A8", "prodig"], produ: ["\u79EF", "\u6027", "produ"], produc: ["\u5F15\u51FA", "\u52A8", "produc"], proel: ["\u4F1A\u6218", "\u52A8", "proel"], prof: ["\u51E1\u4FD7", "\u52A8", "prof"], profect: ["\u51FA\u53D1", "\u7269", "profect"], professor: ["\u6559\u6388", "\u7269", "professor"], profic: ["\u542F\u7A0B", "\u52A8", "profic"], profit: ["\u5BA3\u79F0", "\u52A8", "profit"], profluen: ["\u4E30\u6C9B", "\u6027", "profluen"], profluvi: ["\u6D41\u51FA", "\u52A8", "profluvi"], profund: ["\u6DF1\u5EA6", "\u7269", "profund"], profus: ["\u5145\u6C9B", "\u6027", "profus"], profusi: ["\u6325\u970D", "\u6027", "profusi"], prog: ["\u6570\u5217", "\u6027", "prog"], progno: ["\u9884\u540E", "\u7269", "progno"], program: ["\u7A0B\u5E8F", "\u7269", "program"], prohib: ["\u7981\u6B62", "\u52A8", "prohib"], proici: ["\u629B\u51FA", "\u52A8", "proici"], prol: ["\u540E\u4EE3", "\u7269", "prol"], prolet: ["\u65E0\u4EA7\u8005", "\u7269", "prolet"], prolix: ["\u5197\u957F", "\u6027", "prolix"], proloq: ["\u5410\u9732", "\u52A8", "proloq"], proluvi: ["\u51B2\u79EF", "\u52A8", "proluvi"], promitt: ["\u8BB8\u8BFA", "\u52A8", "promitt"], promo: ["\u53D6\u51FA", "\u52A8", "promo"], promon: ["\u6D77\u89D2", "\u7269", "promon"], promov: ["\u64E2\u5347", "\u52A8", "promov"], promptuar: ["\u8D27\u6808", "\u7269", "promptuar"], pronuba: ["\u4F34\u5A18", "\u7269", "pronuba"], pronun: ["\u5BA3\u544A", "\u52A8", "pronun"], prooemi: ["\u7EEA\u8BBA", "\u7269", "prooemi"], prop: ["\u8FD1\u3001\u90BB\u8FD1", "\u7269", "prop"], propag: ["\u6266\u63D2", "\u7269", "propag"], propel: ["\u63A8\u524D", "\u52A8", "propel"], proper: ["\u75BE\u884C", "\u52A8", "proper"], propera: ["\u4ED3\u4FC3", "\u6027", "propera"], proph: ["\u5148\u77E5\u9884\u8A00", "\u7269", "proph"], propin: ["\u656C\u9152", "\u52A8", "propin"], propola: ["\u96F6\u552E\u5546", "\u7269", "propola"], proposit: ["\u547D\u9898", "\u6027", "proposit"], propr: ["\u56FA\u6709", "\u6027", "propr"], proprio: ["\u672C\u4F53\u89C9", "\u6027", "proprio"], propugn: ["\u5B88\u5FA1", "\u52A8", "propugn"], propyl: ["\u95E8\u5ECA", "\u7269", "propyl"], prora: ["\u8239\u9996", "\u7269", "prora"], proreta: ["\u9886\u822A", "\u7269", "proreta"], proscr: ["\u516C\u654C\u5BA3\u544A", "\u7269", "proscr"], prose: ["\u6563\u6587", "\u7269", "prose"], prosequ: ["\u9001\u522B", "\u52A8", "prosequ"], prosequo: ["\u968F\u884C", "\u52A8", "prosequo"], prosper: ["\u987A\u9042", "\u6027", "prosper"], prospic: ["\u8FDC\u773A", "\u52A8", "prospic"], proste: ["\u5937\u5E73", "\u52A8", "proste"], prosthe: ["\u5047\u80A2", "\u7269", "prosthe"], prosum: ["\u6709\u76CA", "\u52A8", "prosum"], protago: ["\u4E3B\u89D2", "\u7269", "protago"], proteg: ["\u63A9\u62A4", "\u52A8", "proteg"], protes: ["\u58F0\u660E", "\u52A8", "protes"], protocol: ["\u534F\u8BAE", "\u7269", "protocol"], prov: ["\u884C\u7701", "\u7269", "prov"], provent: ["\u6536\u76CA", "\u6027", "provent"], proverb: ["\u8C1A\u8BED", "\u7269", "proverb"], provi: ["\u5929\u547D", "\u7269", "provi"], provide: ["\u9884\u89C1", "\u52A8", "provide"], provis: ["\u9884\u5BDF", "\u52A8", "provis"], provo: ["\u4E0A\u8BC9", "\u52A8", "provo"], prud: ["\u8C28\u614E", "\u6027", "prud"], pruin: ["\u7ED3\u971C", "\u7269", "pruin"], prun: ["\u674E", "\u7269", "prun"], pruna: ["\u70AD\u706B", "\u52A8", "pruna"], prurig: ["\u75D2\u75C7", "\u52A8", "prurig"], prurit: ["\u7619\u75D2", "\u52A8", "prurit"], psallo: ["\u629A\u7434", "\u52A8", "psallo"], psalmus: ["\u5723\u548F", "\u7269", "psalmus"], psalterium: ["\u745F", "\u7269", "psalterium"], psaltes: ["\u5F39\u745F\u8005", "\u7269", "psaltes"], psilot: ["\u8131\u6BDB\u836F", "\u7269", "psilot"], psycho: ["\u5FC3\u7075", "\u6027", "psycho"], ptos: ["\u4E0B\u5782", "\u6027", "ptos"], pub: ["\u516C\u4F17", "\u7269", "pub"], puber: ["\u6210\u4E01", "\u7269", "puber"], pubes: ["\u6210\u4E01\u671F", "\u7269", "pubes"], publis: ["\u51FA\u7248\u8005", "\u7269", "publis"], pud: ["\u7F9E\u803B", "\u52A8", "pud"], pudibund: ["\u7F9E\u602F", "\u6027", "pudibund"], puella: ["\u5973\u5B69", "\u7269", "puella"], puer: ["\u7AE5\u5E74", "\u7269", "puer"], puerilis: ["\u7A1A\u6C14", "\u7269", "puerilis"], pugilla: ["\u624B\u672D\u677F", "\u7269", "pugilla"], pugio: ["\u77ED\u5251", "\u7269", "pugio"], pulch: ["\u7F8E", "\u7269", "pulch"], pulchel: ["\u79C0\u7F8E", "\u6027", "pulchel"], pull: ["\u6DF1\u8272", "\u6027", "pull"], pulm: ["\u80BA", "\u52A8", "pulm"], pulment: ["\u7FB9", "\u7269", "pulment"], puls: ["\u63A8\u649E", "\u52A8", "puls"], pulsar: ["\u8109\u51B2\u661F", "\u7269", "pulsar"], pulsat: ["\u640F\u52A8", "\u6027", "pulsat"], pulso: ["\u6572\u51FB", "\u52A8", "pulso"], pulsus: ["\u8109\u640F", "\u52A8", "pulsus"], pult: ["\u7CA5", "\u7269", "pult"], pulv: ["\u6795", "\u7269", "pulv"], pulvis: ["\u7C89", "\u7269", "pulvis"], pumex: ["\u78E8\u7EB8\u77F3", "\u7269", "pumex"], pumilus: ["\u77EE\u5C0F", "\u6027", "pumilus"], puncil: ["\u5FAE\u5C0F\u70B9", "\u6027", "puncil"], punct: ["\u70B9", "\u6570", "punct"], punctur: ["\u523A\u75DB", "\u6027", "punctur"], pung: ["\u523A\u624E", "\u52A8", "pung"], punic: ["\u7EDB\u7EA2", "\u6027", "punic"], pupa: ["\u86F9", "\u7269", "pupa"], pupill: ["\u5B66\u7AE5", "\u7269", "pupill"], pupilla: ["\u77B3", "\u7269", "pupilla"], pupo: ["\u86F9", "\u7269", "pupo"], puppet: ["\u6728\u5076", "\u7269", "puppet"], puppis: ["\u8239\u5C3E", "\u7269", "puppis"], pur: ["\u7EAF\u51C0", "\u6027", "pur"], purg: ["\u6E05\u6CFB", "\u52A8", "purg"], purgam: ["\u6C61\u7269", "\u6027", "purgam"], purgat: ["\u6253\u626B", "\u52A8", "purgat"], purgati: ["\u6E05\u6D17", "\u6027", "purgati"], purific: ["\u51C0\u5316", "\u7269", "purific"], purit: ["\u7EAF\u5EA6", "\u7269", "purit"], purp: ["\u7D2B", "\u6027", "purp"], purpurar: ["\u67D3\u574A", "\u52A8", "purpurar"], purpuris: ["\u80ED\u8102", "\u7269", "purpuris"], pusa: ["\u5C0F\u5973\u5B69", "\u7269", "pusa"], pusill: ["\u5FAE\u5C0F", "\u6027", "pusill"], pusio: ["\u5C0F\u7537\u5B69", "\u7269", "pusio"], pustula: ["\u8113\u75B1", "\u6027", "pustula"], putamen: ["\u679C\u6838", "\u7269", "putamen"], putat: ["\u4FEE\u526A", "\u7269", "putat"], putator: ["\u4FEE\u526A\u8005", "\u7269", "putator"], puteal: ["\u4E95\u680F", "\u7269", "puteal"], puteo: ["\u53D1\u81ED", "\u52A8", "puteo"], puteus: ["\u6C34\u4E95", "\u7269", "puteus"], putid: ["\u6076\u81ED", "\u6027", "putid"], puto: ["\u4EE5\u4E3A", "\u52A8", "puto"], putor: ["\u8150\u81ED", "\u7269", "putor"], putr: ["\u8150\u574F", "\u7269", "putr"], pyo: ["\u8113", "\u7269", "pyo"], pyro: ["\u706B", "\u7269", "pyro"], quadr: ["\u56DB", "\u6570", "quadr"], quadratus: ["\u65B9\u7684", "\u6027", "quadratus"], quadriga: ["\u56DB\u9A6C\u6218\u8F66", "\u7269", "quadriga"], quadrupl: ["\u56DB\u500D", "\u7269", "quadrupl"], quaer: ["\u5BFB\u627E", "\u52A8", "quaer"], quaes: ["\u95EE\u9898", "\u7269", "quaes"], quaestor: ["\u8D22\u52A1\u5B98", "\u7269", "quaestor"], quaestu: ["\u8425\u5229", "\u6027", "quaestu"], quaestur: ["\u8D22\u52A1\u5B98\u7F72", "\u7269", "quaestur"], qual: ["\u6027\u8D28\u3001\u8D28", "\u6027", "qual"], qualus: ["\u7BD3", "\u7269", "qualus"], quant: ["\u91CF\u3001\u591A\u5C11", "\u6027", "quant"], quantif: ["\u91CF\u5316", "\u6027", "quantif"], quantul: ["\u5C11\u8BB8", "\u7269", "quantul"], quantum: ["\u591A\u5C11", "\u6570", "quantum"], quarr: ["\u91C7\u77F3\u573A", "\u7269", "quarr"], quartet: ["\u56DB\u91CD\u594F", "\u7269", "quartet"], quartz: ["\u77F3\u82F1", "\u7269", "quartz"], quasar: ["\u7C7B\u661F\u4F53", "\u7269", "quasar"], quass: ["\u9707\u8361", "\u52A8", "quass"], quat: ["\u6447\u52A8", "\u52A8", "quat"], quatern: ["\u4E66\u5E16", "\u7269", "quatern"], querc: ["\u6A61", "\u7269", "querc"], querimo: ["\u6028\u8BC9", "\u6027", "querimo"], querul: ["\u62B1\u6028", "\u52A8", "querul"], questu: ["\u54C0\u8BC9", "\u52A8", "questu"], quiesc: ["\u6B47\u606F", "\u52A8", "quiesc"], quiet: ["\u5B89\u5B81\u3001\u9759\u6B62", "\u52A8", "quiet"], quietus: ["\u5B89\u5B9A\u7684", "\u52A8", "quietus"], quinq: ["\u4E94", "\u6570", "quinq"], quinqueremis: ["\u4E94\u5217\u6868\u8239", "\u7269", "quinqueremis"], quinte: ["\u7B2C\u4E94\u5143\u7D20", "\u52A8", "quinte"], quirina: ["\u5E02\u6C11\u8282", "\u7269", "quirina"], quisqui: ["\u5783\u573E", "\u6027", "quisqui"], quota: ["\u914D\u989D", "\u52A8", "quota"], quoti: ["\u5546\u6570", "\u6027", "quoti"], quotus: ["\u7B2C\u51E0", "\u7269", "quotus"], rabi: ["\u66B4\u6012", "\u6027", "rabi"], rabid: ["\u72C2\u6012\u7684", "\u6027", "rabid"], rad: ["\u6839", "\u7269", "rad"], radiat: ["\u8F90\u5C04", "\u7269", "radiat"], radic: ["\u5F00\u65B9", "\u6027", "radic"], radicul: ["\u987B\u6839", "\u7269", "radicul"], radio: ["\u5C04\u7535", "\u7269", "radio"], rado: ["\u522E", "\u52A8", "rado"], raed: ["\u9A6C\u8F66", "\u7269", "raed"], ram: ["\u679D", "\u7269", "ram"], ramale: ["\u843D\u679D", "\u7269", "ramale"], rancor: ["\u54C8\u5587\u5473", "\u7269", "rancor"], rap: ["\u593A\u53D6\u3001\u6293", "\u52A8", "rap"], rapa: ["\u829C\u83C1", "\u7269", "rapa"], rapid: ["\u6025\u901F", "\u6027", "rapid"], rar: ["\u7A00", "\u6027", "rar"], rasilis: ["\u5149\u6ED1\u6613\u78E8", "\u6027", "rasilis"], raster: ["\u8019", "\u7269", "raster"], rasur: ["\u5228\u82B1", "\u52A8", "rasur"], rat: ["\u63A8\u7406", "\u52A8", "rat"], ratio: ["\u9884\u7B97", "\u7269", "ratio"], ratioci: ["\u6838\u7B97", "\u7269", "ratioci"], ratis: ["\u7B4F", "\u7269", "ratis"], raucit: ["\u6C99\u54D1", "\u6027", "raucit"], reac: ["\u53CD\u5E94", "\u52A8", "reac"], reagen: ["\u8BD5\u5242", "\u7269", "reagen"], rebell: ["\u53CD\u6297", "\u7269", "rebell"], rec: ["\u8FD1\u6765\u3001\u65B0\u9C9C", "\u7269", "rec"], recep: ["\u5BB9\u5668", "\u52A8", "recep"], recess: ["\u843D\u6F6E", "\u7269", "recess"], recid: ["\u524A\u53BB", "\u52A8", "recid"], recidiv: ["\u590D\u53D1", "\u7269", "recidiv"], recino: ["\u91CD\u5531", "\u52A8", "recino"], recip: ["\u76F8\u4E92", "\u6027", "recip"], recipi: ["\u63A5\u56DE", "\u52A8", "recipi"], recit: ["\u80CC\u8BF5", "\u52A8", "recit"], recitat: ["\u6717\u8BF5", "\u7269", "recitat"], reclam: ["\u6297\u8BAE", "\u7269", "reclam"], reco: ["\u56DE\u60F3", "\u52A8", "reco"], recogit: ["\u53CD\u601D", "\u7269", "recogit"], recogn: ["\u8BC6\u522B", "\u6027", "recogn"], recond: ["\u6536\u85CF", "\u52A8", "recond"], recrem: ["\u6E23\u6ED3", "\u6027", "recrem"], recreo: ["\u4F7F\u590D\u539F", "\u52A8", "recreo"], rect: ["\u6B63\u786E", "\u6027", "rect"], rector: ["\u9662\u957F", "\u7269", "rector"], recumb: ["\u659C\u501A", "\u52A8", "recumb"], recurs: ["\u9012\u5F52", "\u7269", "recurs"], recus: ["\u62D2\u7EDD", "\u52A8", "recus"], recycl: ["\u5FAA\u73AF", "\u7269", "recycl"], red: ["\u8FD4\u56DE", "\u52A8", "red"], redd: ["\u5F52\u8FD8", "\u52A8", "redd"], redempt: ["\u8D4E\u4E70", "\u7269", "redempt"], redemptor: ["\u627F\u5305\u4EBA", "\u7269", "redemptor"], redim: ["\u5934\u5DFE", "\u7269", "redim"], redit: ["\u5F52\u6765", "\u7269", "redit"], reditus: ["\u8FDB\u9879", "\u6027", "reditus"], redol: ["\u6563\u53D1\u9999\u6C14", "\u7269", "redol"], reduc: ["\u5F15\u56DE", "\u52A8", "reduc"], reduct: ["\u8FD8\u539F", "\u7269", "reduct"], redunda: ["\u6EA2\u51FA", "\u52A8", "redunda"], refer: ["\u8F6C\u8FF0", "\u52A8", "refer"], referc: ["\u585E\u6EE1", "\u52A8", "referc"], referen: ["\u594F\u4E8B\u5B98", "\u7269", "referen"], refici: ["\u4FEE\u590D", "\u52A8", "refici"], reflect: ["\u53CD\u5C04", "\u52A8", "reflect"], refoci: ["\u4F7F\u6062\u590D", "\u52A8", "refoci"], reforest: ["\u518D\u9020\u6797", "\u7269", "reforest"], refract: ["\u6298\u5C04", "\u52A8", "refract"], refrin: ["\u6298\u8FD4\u7834", "\u52A8", "refrin"], refulg: ["\u8FD4\u7167", "\u6027", "refulg"], refut: ["\u53CD\u9A73", "\u7269", "refut"], reg: ["\u738B\u3001\u7EDF\u6CBB", "\u7269", "reg"], regia: ["\u738B\u5BAB", "\u7269", "regia"], regifug: ["\u9010\u738B\u8282", "\u7269", "regifug"], regim: ["\u653F\u4F53", "\u7269", "regim"], rego: ["\u7EDF\u8F96", "\u52A8", "rego"], regred: ["\u9000\u56DE", "\u52A8", "regred"], regres: ["\u56DE\u5F52", "\u7269", "regres"], reici: ["\u63B7\u56DE", "\u52A8", "reici"], rela: ["\u5173\u7CFB", "\u6027", "rela"], relie: ["\u6D6E\u96D5", "\u7269", "relie"], relig: ["\u89E3\u5F00\u7CFB", "\u52A8", "relig"], relinq: ["\u7559\u4E0B", "\u52A8", "relinq"], rem: ["\u6868", "\u7269", "rem"], reman: ["\u4F59\u6570", "\u6027", "reman"], remed: ["\u7597\u6CD5", "\u52A8", "remed"], remex: ["\u6868\u624B", "\u7269", "remex"], remig: ["\u5212\u6868", "\u7269", "remig"], remigi: ["\u6868\u5217", "\u7269", "remigi"], remigr: ["\u8FC1\u56DE", "\u52A8", "remigr"], remin: ["\u8FFD\u5FC6", "\u52A8", "remin"], remiss: ["\u7F13\u89E3", "\u7269", "remiss"], remitt: ["\u9001\u56DE", "\u52A8", "remitt"], remora: ["\u8FDF\u5EF6", "\u6027", "remora"], remors: ["\u6094\u610F", "\u6027", "remors"], remot: ["\u9065\u8FDC", "\u7269", "remot"], remov: ["\u64A4\u804C", "\u52A8", "remov"], ren: ["\u80BE", "\u52A8", "ren"], renid: ["\u542B\u7B11", "\u52A8", "renid"], renov: ["\u66F4\u65B0", "\u52A8", "renov"], renu: ["\u6447\u5934\u62D2\u7EDD", "\u52A8", "renu"], renunt: ["\u56DE\u62A5", "\u52A8", "renunt"], renutus: ["\u6447\u5934", "\u52A8", "renutus"], reor: ["\u6599\u60F3", "\u52A8", "reor"], repar: ["\u4FEE\u8865", "\u52A8", "repar"], repel: ["\u63A8\u56DE", "\u52A8", "repel"], repend: ["\u507F\u8FD8", "\u52A8", "repend"], repens: ["\u7A81\u5140", "\u6027", "repens"], reper: ["\u53D1\u73B0", "\u52A8", "reper"], repetun: ["\u52D2\u7D22", "\u6027", "repetun"], repono: ["\u653E\u56DE", "\u52A8", "repono"], repraes: ["\u4ED8\u73B0", "\u52A8", "repraes"], reprim: ["\u6291\u5236", "\u52A8", "reprim"], rept: ["\u722C\u884C", "\u52A8", "rept"], republic: ["\u5171\u548C", "\u7269", "republic"], repudium: ["\u4F11\u5A5A", "\u7269", "repudium"], requie: ["\u5B89\u6B47", "\u52A8", "requie"], requir: ["\u7D22\u6C42", "\u52A8", "requir"], rescrib: ["\u56DE\u4FE1", "\u52A8", "rescrib"], rescript: ["\u6555\u7B54", "\u7269", "rescript"], resec: ["\u5207\u9664", "\u52A8", "resec"], resent: ["\u6028\u6068", "\u6027", "resent"], reserv: ["\u4FDD\u7559", "\u7269", "reserv"], resi: ["\u6811\u8102", "\u7269", "resi"], resipi: ["\u6E05\u9192", "\u52A8", "resipi"], resist: ["\u7535\u963B", "\u7269", "resist"], reson: ["\u5171\u632F", "\u7269", "reson"], resono: ["\u56DE\u54CD", "\u52A8", "resono"], resp: ["\u56DE\u7B54", "\u52A8", "resp"], respic: ["\u56DE\u770B", "\u52A8", "respic"], respons: ["\u8D23\u4EFB", "\u7269", "respons"], restaur: ["\u6062\u590D", "\u52A8", "restaur"], restin: ["\u7184\u706D", "\u52A8", "restin"], restit: ["\u5F52\u8FD8", "\u52A8", "restit"], result: ["\u8DC3\u8D77", "\u52A8", "result"], resuo: ["\u62C6\u7F1D", "\u52A8", "resuo"], ret: ["\u7F51", "\u7269", "ret"], retard: ["\u5EF6\u7F13", "\u52A8", "retard"], reteg: ["\u663E\u9732", "\u6027", "reteg"], retent: ["\u6263\u7559", "\u52A8", "retent"], retiac: ["\u5C0F\u7F51", "\u52A8", "retiac"], reticul: ["\u7ED3\u7F51", "\u52A8", "reticul"], retin: ["\u7559\u4F4F", "\u52A8", "retin"], retort: ["\u84B8\u998F\u5668", "\u7269", "retort"], retr: ["\u540E\u3001\u5411\u540E", "\u7269", "retr"], retrah: ["\u62C9\u56DE", "\u52A8", "retrah"], retros: ["\u56DE\u987E", "\u7269", "retros"], retund: ["\u632B\u949D", "\u52A8", "retund"], retusus: ["\u949D\u7684", "\u6027", "retusus"], reus: ["\u88AB\u544A", "\u7269", "reus"], reveh: ["\u8FD0\u56DE", "\u52A8", "reveh"], revell: ["\u626F\u4E0B", "\u52A8", "revell"], reven: ["\u6536\u5165", "\u52A8", "reven"], rever: ["\u656C\u4EF0", "\u6027", "rever"], reverb: ["\u6DF7\u54CD", "\u6027", "reverb"], revie: ["\u8BC4\u8BBA", "\u7269", "revie"], revinc: ["\u53CD\u7F1A", "\u52A8", "revinc"], revis: ["\u91CD\u8BBF", "\u52A8", "revis"], revoc: ["\u5524\u56DE", "\u52A8", "revoc"], rheda: ["\u56DB\u8F6E\u8F66", "\u7269", "rheda"], rhet: ["\u4FEE\u8F9E", "\u7269", "rhet"], rhino: ["\u9F3B", "\u7269", "rhino"], rhod: ["\u73AB\u7470", "\u7269", "rhod"], rhombus: ["\u9640\u87BA", "\u7269", "rhombus"], rhyth: ["\u8282\u594F", "\u7269", "rhyth"], rhythmus: ["\u8282\u5F8B", "\u7269", "rhythmus"], rid: ["\u7B11", "\u7269", "rid"], ridicu: ["\u53EF\u7B11\u7684", "\u52A8", "ridicu"], rig: ["\u50F5\u786C", "\u6027", "rig"], riga: ["\u704C\u6E89", "\u52A8", "riga"], rigid: ["\u803F\u76F4", "\u6027", "rigid"], rigor: ["\u5BD2\u6218", "\u52A8", "rigor"], rim: ["\u7AA5\u63A2", "\u52A8", "rim"], ripa: ["\u6CB3\u5CB8", "\u7269", "ripa"], risus: ["\u7B11\u58F0", "\u52A8", "risus"], rit: ["\u4EEA\u5F0F", "\u52A8", "rit"], riv: ["\u6EAA\u6D41", "\u7269", "riv"], rivet: ["\u94C6\u9489", "\u7269", "rivet"], rix: ["\u4E89\u6597", "\u52A8", "rix"], rob: ["\u5F3A\u58EE", "\u52A8", "rob"], robiga: ["\u795B\u9508\u8282", "\u7269", "robiga"], robust: ["\u5065\u58EE", "\u6027", "robust"], rog: ["\u8BE2\u95EE", "\u52A8", "rog"], rogo: ["\u95EE", "\u52A8", "rogo"], rogus: ["\u706B\u846C\u5806", "\u7269", "rogus"], roman: ["\u957F\u7BC7\u5C0F\u8BF4", "\u7269", "roman"], romance: ["\u4F20\u5947", "\u7269", "romance"], romphae: ["\u5DE8\u5251", "\u7269", "romphae"], ror: ["\u9732\u6C34\u3001\u6EF4", "\u7269", "ror"], roran: ["\u964D\u9732", "\u7269", "roran"], roro: ["\u964D\u9732", "\u52A8", "roro"], rosali: ["\u73AB\u7470\u8282", "\u7269", "rosali"], rosari: ["\u73AB\u7470\u56ED", "\u7269", "rosari"], roscid: ["\u5E26\u9732", "\u7269", "roscid"], rose: ["\u7C89\u8272", "\u6027", "rose"], rostr: ["\u5599", "\u7269", "rostr"], rot: ["\u8F6E\u3001\u8F6C", "\u52A8", "rot"], rotaqua: ["\u6C34\u8F66", "\u7269", "rotaqua"], rotat: ["\u65CB\u8F6C", "\u7269", "rotat"], roto: ["\u629B\u8F6C", "\u52A8", "roto"], rotundus: ["\u5706\u7684", "\u6027", "rotundus"], rrhag: ["\u51FA\u8840", "\u6027", "rrhag"], rrhoe: ["\u6EA2\u51FA", "\u6027", "rrhoe"], rub: ["\u7EA2", "\u6027", "rub"], rubedo: ["\u8D64\u7EA2", "\u6027", "rubedo"], rubens: ["\u7EA2\u6DA6", "\u6027", "rubens"], rubia: ["\u831C\u8349", "\u52A8", "rubia"], rubor: ["\u7EA2\u80BF", "\u52A8", "rubor"], rubrica: ["\u8D6D\u7EA2", "\u7269", "rubrica"], rudens: ["\u7F06\u7EF3", "\u7269", "rudens"], ruf: ["\u8D64\u8910", "\u6027", "ruf"], ruin: ["\u5D29\u6BC1", "\u52A8", "ruin"], ruinos: ["\u503E\u9893\u7684", "\u52A8", "ruinos"], rumin: ["\u53CD\u520D", "\u7269", "rumin"], rumo: ["\u4F20\u8A00", "\u52A8", "rumo"], rump: ["\u6298\u65AD", "\u52A8", "rump"], run: ["\u7B26\u6587", "\u52A8", "run"], runca: ["\u62D4\u8349", "\u52A8", "runca"], runcin: ["\u5228", "\u52A8", "runcin"], runco: ["\u9509\u5E73", "\u52A8", "runco"], rup: ["\u5CED\u58C1", "\u7269", "rup"], rust: ["\u4E61\u91CE", "\u7269", "rust"], rusticit: ["\u7C97\u9C81", "\u52A8", "rusticit"], rutellum: ["\u5C0F\u9539", "\u7269", "rutellum"], rutilus: ["\u7EA2\u8273", "\u6027", "rutilus"], rutrum: ["\u9539", "\u7269", "rutrum"], saburra: ["\u538B\u8231", "\u7269", "saburra"], sacc: ["\u888B", "\u7269", "sacc"], saccharif: ["\u5236\u7CD6", "\u52A8", "saccharif"], sacella: ["\u5E93\u5B98", "\u7269", "sacella"], sacr: ["\u795E\u5723", "\u52A8", "sacr"], sacram: ["\u8A93\u7EA6", "\u7269", "sacram"], saec: ["\u4E16\u4EE3", "\u7269", "saec"], saept: ["\u56F4\u680F", "\u7269", "saept"], saevi: ["\u66B4\u6012", "\u6027", "saevi"], sag: ["\u7BAD", "\u7269", "sag"], saga: ["\u777F\u667A", "\u6027", "saga"], sagena: ["\u62D6\u7F51", "\u52A8", "sagena"], sagin: ["\u80B2\u80A5", "\u52A8", "sagin"], sagitt: ["\u7BAD\u624B", "\u52A8", "sagitt"], sagitto: ["\u5C04\u7BAD", "\u52A8", "sagitto"], sagma: ["\u9A6E\u67B6", "\u7269", "sagma"], sagum: ["\u6597\u7BF7", "\u7269", "sagum"], sal: ["\u76D0", "\u7269", "sal"], salar: ["\u85AA\u4FF8", "\u52A8", "salar"], saldo: ["\u4F59\u989D", "\u7269", "saldo"], salic: ["\u67F3", "\u7269", "salic"], saliniz: ["\u76D0\u6E0D\u5316", "\u7269", "saliniz"], salit: ["\u814C\u6E0D", "\u7269", "salit"], salitur: ["\u814C\u85CF", "\u52A8", "salitur"], saliva: ["\u553E\u6DB2", "\u52A8", "saliva"], sallo: ["\u76D0\u6E0D", "\u52A8", "sallo"], sals: ["\u54B8", "\u7269", "sals"], salsam: ["\u814C\u9C7C", "\u52A8", "salsam"], salsamen: ["\u814C\u9C7C\u5320", "\u52A8", "salsamen"], salsedo: ["\u54B8\u5473", "\u6027", "salsedo"], salsur: ["\u76D0\u6E0D", "\u52A8", "salsur"], salt: ["\u8DF3\u8DC3", "\u52A8", "salt"], saltato: ["\u821E\u8005", "\u7269", "saltato"], saltu: ["\u6797\u5730", "\u7269", "saltu"], salugo: ["\u54B8\u5473", "\u52A8", "salugo"], salum: ["\u6D77\u6D8C", "\u7269", "salum"], salus: ["\u5B89\u5168", "\u52A8", "salus"], salut: ["\u95EE\u5019", "\u52A8", "salut"], salutat: ["\u671D\u8D3A", "\u7269", "salutat"], saluto: ["\u81F4\u610F", "\u52A8", "saluto"], sampl: ["\u6837\u672C", "\u7269", "sampl"], sanc: ["\u795E\u5723", "\u7269", "sanc"], sancis: ["\u94A6\u5B9A", "\u52A8", "sancis"], sanctuar: ["\u4FDD\u62A4\u533A", "\u7269", "sanctuar"], sandal: ["\u6A80\u9999", "\u7269", "sandal"], sandst: ["\u7802\u5CA9", "\u7269", "sandst"], sangha: ["\u50E7\u56E2", "\u7269", "sangha"], sanguin: ["\u8840", "\u7269", "sanguin"], sanit: ["\u536B\u751F", "\u52A8", "sanit"], sap: ["\u5473\u9053", "\u6027", "sap"], sapa: ["\u6D53\u6D46", "\u7269", "sapa"], sapid: ["\u6709\u5473", "\u6027", "sapid"], sapien: ["\u667A\u6167", "\u6027", "sapien"], sapio: ["\u6709\u89C1\u8BC6", "\u52A8", "sapio"], sapo: ["\u7682", "\u7269", "sapo"], saponar: ["\u5236\u7682\u5320", "\u7269", "saponar"], sapora: ["\u8C03\u5473\u54C1", "\u52A8", "sapora"], sapphir: ["\u5929\u84DD", "\u6027", "sapphir"], sarci: ["\u7F1D\u8865", "\u52A8", "sarci"], sarcin: ["\u884C\u56CA", "\u7269", "sarcin"], sarcinat: ["\u7F1D\u8865\u5320", "\u52A8", "sarcinat"], sarcio: ["\u7F1D\u7F00", "\u52A8", "sarcio"], sarcoph: ["\u77F3\u68FA", "\u7269", "sarcoph"], sarcul: ["\u9504", "\u7269", "sarcul"], sarissa: ["\u957F\u77DB", "\u7269", "sarissa"], sarment: ["\u67AF\u679D", "\u7269", "sarment"], sarri: ["\u9664\u8349", "\u52A8", "sarri"], sat: ["\u9971\u8DB3", "\u7269", "sat"], satellit: ["\u536B\u661F", "\u7269", "satellit"], satio: ["\u64AD\u79CD", "\u52A8", "satio"], satis: ["\u8DB3\u591F", "\u6570", "satis"], sator: ["\u64AD\u79CD\u8005", "\u7269", "sator"], satu: ["\u9971\u548C", "\u52A8", "satu"], saturit: ["\u9971\u817B", "\u6027", "saturit"], saturnal: ["\u519C\u795E\u8282", "\u7269", "saturnal"], savanna: ["\u7A00\u6811\u8349\u539F", "\u7269", "savanna"], sax: ["\u5CA9\u77F3", "\u7269", "sax"], scabellum: ["\u62CD\u677F", "\u7269", "scabellum"], scaber: ["\u7C97\u7CD9\u9762", "\u6027", "scaber"], scabies: ["\u75A5\u7663", "\u6027", "scabies"], scabri: ["\u51F9\u51F8", "\u6027", "scabri"], scabrit: ["\u7C97\u7CD9", "\u6027", "scabrit"], scacc: ["\u68CB\u5B50", "\u52A8", "scacc"], scae: ["\u821E\u53F0", "\u7269", "scae"], scal: ["\u68AF", "\u7269", "scal"], scala: ["\u97F3\u9636", "\u7269", "scala"], scalae: ["\u6807\u5C3A", "\u7269", "scalae"], scalar: ["\u6807\u91CF", "\u7269", "scalar"], scalis: ["\u9636\u68AF", "\u7269", "scalis"], scalmus: ["\u6868\u67B6", "\u7269", "scalmus"], scalpe: ["\u624B\u672F\u5200", "\u7269", "scalpe"], scalpo: ["\u522E\u523B", "\u52A8", "scalpo"], scalpor: ["\u523A\u75DB\u611F", "\u6027", "scalpor"], scalpr: ["\u523B\u5200", "\u52A8", "scalpr"], scalpt: ["\u6414", "\u52A8", "scalpt"], scamillus: ["\u67F1\u7840", "\u7269", "scamillus"], scamnum: ["\u957F\u51F3", "\u7269", "scamnum"], scand: ["\u6500\u722C", "\u52A8", "scand"], scapha: ["\u5C0F\u8247", "\u7269", "scapha"], scarlat: ["\u7329\u7EA2\u70ED", "\u7269", "scarlat"], scatebr: ["\u6CC9\u6E90", "\u7269", "scatebr"], scenogr: ["\u5E03\u666F\u5E08", "\u7269", "scenogr"], sceptrum: ["\u6743\u6756", "\u7269", "sceptrum"], schedia: ["\u7B4F", "\u7269", "schedia"], schedula: ["\u5C0F\u7B7E", "\u7269", "schedula"], schema: ["\u5F62", "\u7269", "schema"], scho: ["\u5B66\u6821", "\u7269", "scho"], scholar: ["\u5B66\u4EBA", "\u7269", "scholar"], scholarch: ["\u6821\u957F", "\u7269", "scholarch"], scholi: ["\u7B3A\u6CE8", "\u7269", "scholi"], scien: ["\u77E5\u60C5\u7684", "\u52A8", "scien"], scindo: ["\u5288\u5F00", "\u52A8", "scindo"], scintill: ["\u95EA\u70C1", "\u7269", "scintill"], sciscit: ["\u63A2\u95EE", "\u52A8", "sciscit"], scitor: ["\u63A2\u8BE2", "\u52A8", "scitor"], scitum: ["\u51B3\u8BAE", "\u52A8", "scitum"], sclero: ["\u786C\u5316", "\u7269", "sclero"], scob: ["\u6728\u5C51", "\u52A8", "scob"], scop: ["\u626B\u5E1A", "\u52A8", "scop"], scopo: ["\u89C2\u5BDF", "\u7269", "scopo"], scopul: ["\u7901\u5CA9", "\u7269", "scopul"], scorn: ["\u8511\u89C6", "\u6027", "scorn"], scotia: ["\u51F9\u5706\u7EBF", "\u7269", "scotia"], scrib: ["\u4E66\u5199", "\u52A8", "scrib"], scrini: ["\u6863\u6848\u5E93", "\u7269", "scrini"], scrinium: ["\u5377\u7BB1", "\u7269", "scrinium"], scriptit: ["\u5E38\u5199", "\u52A8", "scriptit"], scrut: ["\u63A2\u7A76", "\u52A8", "scrut"], sculp: ["\u96D5\u523B", "\u52A8", "sculp"], sculptor: ["\u96D5\u523B\u5E08", "\u7269", "sculptor"], scurr: ["\u4E11\u89D2", "\u7269", "scurr"], scurril: ["\u7C97\u4FD7", "\u6027", "scurril"], scut: ["\u76FE", "\u7269", "scut"], scutar: ["\u76FE\u5320", "\u7269", "scutar"], scutica: ["\u97AD", "\u7269", "scutica"], scutul: ["\u65B9\u683C\u7EB9", "\u52A8", "scutul"], scyll: ["\u7901\u5CA9", "\u7269", "scyll"], seb: ["\u8102", "\u7269", "seb"], sec: ["\u5207\u3001\u5272", "\u52A8", "sec"], secans: ["\u5272\u7EBF", "\u7269", "secans"], secess: ["\u5206\u79BB", "\u7269", "secess"], sectat: ["\u968F\u4ECE", "\u52A8", "sectat"], sectil: ["\u62FC\u82B1", "\u7269", "sectil"], secto: ["\u5207\u5272", "\u52A8", "secto"], sector: ["\u56E4\u79EF\u8005", "\u7269", "sector"], secula: ["\u9570\u5200", "\u7269", "secula"], secur: ["\u65A7", "\u7269", "secur"], sed: ["\u5750", "\u7269", "sed"], sedat: ["\u9547\u9759", "\u52A8", "sedat"], sedes: ["\u6816\u606F\u5730", "\u7269", "sedes"], sediment: ["\u6C89\u79EF", "\u7269", "sediment"], seditios: ["\u597D\u4E71", "\u52A8", "seditios"], sedo: ["\u4F7F\u9759", "\u52A8", "sedo"], seduco: ["\u5F15\u79BB", "\u52A8", "seduco"], sedul: ["\u52E4\u52C9", "\u52A8", "sedul"], seget: ["\u4F5C\u7269", "\u7269", "seget"], segmen: ["\u7247", "\u52A8", "segmen"], segnis: ["\u8FDF\u7F13", "\u6027", "segnis"], seism: ["\u5730\u9707", "\u7269", "seism"], select: ["\u53D6\u820D", "\u7269", "select"], seleno: ["\u6708", "\u7269", "seleno"], sell: ["\u5EA7\u6905", "\u7269", "sell"], sellacur: ["\u8C61\u7259\u6905", "\u7269", "sellacur"], sellular: ["\u6905\u5320", "\u7269", "sellular"], sema: ["\u8BED\u4E49", "\u7269", "sema"], semi: ["\u534A", "\u6027", "semi"], semico: ["\u534A\u5BFC\u4F53", "\u7269", "semico"], semiind: ["\u534A\u7A7F\u8863\u7684", "\u52A8", "semiind"], seminari: ["\u82D7\u5703", "\u7269", "seminari"], seminarium: ["\u7814\u8BA8\u8BFE", "\u7269", "seminarium"], semit: ["\u5C0F\u5F84", "\u7269", "semit"], semperv: ["\u5E38\u7EFF", "\u7269", "semperv"], sen: ["\u8870\u8001", "\u52A8", "sen"], sena: ["\u5143\u8001\u9662", "\u7269", "sena"], senato: ["\u5143\u8001", "\u7269", "senato"], seni: ["\u6BCF\u516D", "\u7269", "seni"], senil: ["\u8001\u6001\u7684", "\u7269", "senil"], senior: ["\u957F\u8005", "\u7269", "senior"], seniu: ["\u66AE\u5E74", "\u7269", "seniu"], sens: ["\u610F\u4E49\u3001\u611F\u89C9", "\u6027", "sens"], sensit: ["\u654F\u611F", "\u6027", "sensit"], sensor: ["\u4F20\u611F\u5668", "\u6027", "sensor"], sente: ["\u53E5\u5B50", "\u7269", "sente"], sentiment: ["\u60C5\u611F", "\u6027", "sentiment"], sentina: ["\u8231\u5E95\u6C61\u6C34", "\u7269", "sentina"], sentio: ["\u611F\u89C9", "\u52A8", "sentio"], sentisc: ["\u4F53\u5BDF", "\u7269", "sentisc"], sep: ["\u7BF1\u3001\u56F4", "\u7269", "sep"], sept: ["\u4E03", "\u6570", "sept"], septi: ["\u8150", "\u7269", "septi"], sepul: ["\u57CB\u846C", "\u7269", "sepul"], sequ: ["\u8DDF\u968F", "\u52A8", "sequ"], ser: ["\u6674\u6717", "\u7269", "ser"], sera: ["\u95E8\u95E9", "\u7269", "sera"], serenum: ["\u6674\u7A7A", "\u7269", "serenum"], seri: ["\u5E8F\u5217", "\u6570", "seri"], seric: ["\u4E1D", "\u7269", "seric"], sericar: ["\u8695\u5BA4", "\u52A8", "sericar"], sericu: ["\u517B\u8695", "\u52A8", "sericu"], serios: ["\u4E25\u8083", "\u6027", "serios"], serm: ["\u8C08\u8BDD", "\u7269", "serm"], sermocin: ["\u95F2\u8C08", "\u52A8", "sermocin"], seroti: ["\u8FDF\u6765", "\u6027", "seroti"], serp: ["\u86C7", "\u7269", "serp"], serpo: ["\u722C\u884C", "\u52A8", "serpo"], serr: ["\u952F", "\u7269", "serr"], serrar: ["\u952F\u5320", "\u7269", "serrar"], serratus: ["\u952F\u9F7F\u7684", "\u6027", "serratus"], serum: ["\u8840\u6E05", "\u52A8", "serum"], serv: ["\u670D\u4F8D\u3001\u4EC6", "\u7269", "serv"], servio: ["\u670D\u5F79", "\u52A8", "servio"], servitut: ["\u5730\u5F79", "\u52A8", "servitut"], sess: ["\u5750\u59FF", "\u52A8", "sess"], seve: ["\u4E25\u5389", "\u6027", "seve"], severit: ["\u4E25\u5389\u795E\u8272", "\u52A8", "severit"], sex: ["\u516D", "\u6570", "sex"], sextar: ["\u5347\u91CF", "\u7269", "sextar"], shock: ["\u9707\u60CA", "\u6027", "shock"], sibil: ["\u5439\u54E8", "\u52A8", "sibil"], sibilus: ["\u5636\u58F0", "\u6027", "sibilus"], sibyll: ["\u795E\u8C15\u96C6", "\u7269", "sibyll"], sic: ["\u5E72\u71E5", "\u7269", "sic"], sica: ["\u66F2\u5251", "\u7269", "sica"], siccat: ["\u98CE\u5E72", "\u7269", "siccat"], siccit: ["\u65F1\u5B63", "\u7269", "siccit"], sid: ["\u6C89\u964D", "\u52A8", "sid"], sidere: ["\u6052\u661F\u65F6", "\u7269", "sidere"], sig: ["\u7B26\u53F7\u3001\u8BB0\u53F7", "\u52A8", "sig"], sigil: ["\u5370\u8BB0\u3001\u7B26", "\u52A8", "sigil"], sigill: ["\u5C01\u7F04", "\u7269", "sigill"], signac: ["\u5C01\u5370", "\u7269", "signac"], signif: ["\u65D7\u624B", "\u52A8", "signif"], signifi: ["\u8868\u660E", "\u52A8", "signifi"], signinum: ["\u788E\u77F3\u5730", "\u7269", "signinum"], silen: ["\u6C89\u9ED8", "\u52A8", "silen"], silentia: ["\u9759\u9ED8\u5B98", "\u7269", "silentia"], silic: ["\u7845\u77F3", "\u7269", "silic"], silicer: ["\u4E27\u5BB4", "\u7269", "silicer"], silo: ["\u5730\u7A96\u4ED3", "\u52A8", "silo"], silt: ["\u7C89\u7802", "\u7269", "silt"], silv: ["\u68EE\u6797", "\u7269", "silv"], silvicul: ["\u80B2\u6797", "\u7269", "silvicul"], sim: ["\u76F8\u4F3C", "\u6027", "sim"], sima: ["\u6A90\u53E3", "\u7269", "sima"], simp: ["\u5355\u7EAF", "\u6027", "simp"], sin: ["\u5DE6", "\u7269", "sin"], sinc: ["\u771F\u8BDA", "\u6027", "sinc"], singuli: ["\u5404\u4E00", "\u7269", "singuli"], singult: ["\u62BD\u6CE3", "\u52A8", "singult"], sinistr: ["\u5DE6\u4FA7", "\u7269", "sinistr"], sinu: ["\u8863\u8936", "\u7269", "sinu"], sinuos: ["\u873F\u8712\u7684", "\u6027", "sinuos"], sinus: ["\u6B63\u5F26", "\u7269", "sinus"], sip: ["\u5E06", "\u7269", "sip"], siph: ["\u8679\u5438", "\u7269", "siph"], siphunc: ["\u5C0F\u7BA1", "\u7269", "siphunc"], sistrum: ["\u53C9\u94C3", "\u7269", "sistrum"], siti: ["\u6E34", "\u7269", "siti"], situla: ["\u6876", "\u7269", "situla"], sketch: ["\u901F\u5199", "\u7269", "sketch"], slate: ["\u677F\u5CA9", "\u7269", "slate"], sleet: ["\u96E8\u5939\u96EA", "\u7269", "sleet"], smaragd: ["\u7FE0\u7EFF", "\u6027", "smaragd"], smegma: ["\u64E6\u8EAB\u818F", "\u7269", "smegma"], soc: ["\u540C\u4F34\u3001\u793E\u7FA4", "\u7269", "soc"], socer: ["\u5CB3\u7236", "\u7269", "socer"], socie: ["\u793E\u56E2", "\u52A8", "socie"], socio: ["\u793E\u4F1A", "\u7269", "socio"], sociole: ["\u793E\u4F1A\u65B9\u8A00", "\u7269", "sociole"], socor: ["\u611A\u949D", "\u6027", "socor"], socord: ["\u6020\u60F0", "\u52A8", "socord"], socrus: ["\u5CB3\u6BCD", "\u7269", "socrus"], soda: ["\u540C\u4F34", "\u52A8", "soda"], sodal: ["\u534F\u4F1A", "\u7269", "sodal"], solac: ["\u6170\u85C9", "\u6027", "solac"], sold: ["\u948E\u710A", "\u7269", "sold"], solea: ["\u978B\u5E95", "\u7269", "solea"], soler: ["\u673A\u654F", "\u6027", "soler"], solid: ["\u7ACB\u4F53", "\u6570", "solid"], solit: ["\u5B64\u72EC", "\u52A8", "solit"], solium: ["\u5FA1\u5EA7", "\u7269", "solium"], sollemn: ["\u5E86\u5178", "\u7269", "sollemn"], solli: ["\u5FE7\u5FC3", "\u6027", "solli"], solo: ["\u72EC\u594F", "\u7269", "solo"], solsti: ["\u81F3\u65E5", "\u7269", "solsti"], solut: ["\u89E3\u7B54", "\u7269", "solut"], solute: ["\u6EB6\u8D28", "\u7269", "solute"], solv: ["\u89E3\u3001\u677E\u5F00", "\u52A8", "solv"], solvent: ["\u6EB6\u5242", "\u7269", "solvent"], somato: ["\u8EAF\u4F53\u611F\u89C9", "\u6027", "somato"], somn: ["\u7761\u7720\u3001\u68A6", "\u52A8", "somn"], somni: ["\u505A\u68A6", "\u52A8", "somni"], somnicu: ["\u55DC\u7761\u7684", "\u52A8", "somnicu"], somnif: ["\u50AC\u7720\u7684", "\u52A8", "somnif"], somnol: ["\u56F0\u5026", "\u52A8", "somnol"], son: ["\u58F0\u97F3", "\u6027", "son"], sonat: ["\u594F\u9E23", "\u7269", "sonat"], sonata: ["\u594F\u9E23\u66F2", "\u7269", "sonata"], sonipes: ["\u8E44\u58F0\u9A6C", "\u7269", "sonipes"], sonitus: ["\u8F70\u9E23", "\u7269", "sonitus"], sonnet: ["\u5341\u56DB\u884C\u8BD7", "\u7269", "sonnet"], sonor: ["\u6D2A\u4EAE", "\u6027", "sonor"], sonorit: ["\u54CD\u4EAE", "\u6027", "sonorit"], soph: ["\u667A\u6167", "\u7269", "soph"], sophism: ["\u8BE1\u8FA9", "\u6027", "sophism"], sopor: ["\u660F\u7761", "\u52A8", "sopor"], soporif: ["\u81F4\u7761\u7684", "\u52A8", "soporif"], soporo: ["\u4F7F\u7761", "\u52A8", "soporo"], sor: ["\u59D0\u59B9", "\u7269", "sor"], sorbeo: ["\u555C\u996E", "\u52A8", "sorbeo"], sorbill: ["\u555C", "\u52A8", "sorbill"], sorbitio: ["\u996E\u5242", "\u52A8", "sorbitio"], sord: ["\u6C61\u6D4A", "\u6027", "sord"], sordes: ["\u6C61\u57A2", "\u6027", "sordes"], sors: ["\u4EFD\u989D", "\u7269", "sors"], sort: ["\u547D\u8FD0\u3001\u673A\u8FD0", "\u7269", "sort"], sortil: ["\u62BD\u7B7E\u5360\u535C", "\u52A8", "sortil"], sortit: ["\u62BD\u7B7E\u5206\u914D", "\u7269", "sortit"], spargo: ["\u6492\u64AD", "\u52A8", "spargo"], spasm: ["\u75C9\u631B", "\u52A8", "spasm"], spat: ["\u7A7A\u95F4\u91CF", "\u7269", "spat"], spatha: ["\u957F\u5251", "\u7269", "spatha"], spatios: ["\u5BBD\u655E", "\u6027", "spatios"], spec: ["\u79CD\u3001\u7C7B", "\u6027", "spec"], specio: ["\u534E\u7F8E", "\u6027", "specio"], spect: ["\u89C2\u770B\u3001\u6F14\u51FA", "\u7269", "spect"], spectr: ["\u5149\u8C31", "\u7269", "spectr"], specul: ["\u955C", "\u7269", "specul"], speculator: ["\u63A2\u5B50", "\u7269", "speculator"], spelunc: ["\u5CA9\u6D1E", "\u7269", "spelunc"], sper: ["\u79CD\u5B50\u3001\u6839\u672C", "\u7269", "sper"], spes: ["\u5E0C\u671B", "\u52A8", "spes"], spha: ["\u7403\u4F53", "\u6570", "spha"], sphaeri: ["\u7403\u5BA4", "\u52A8", "sphaeri"], sphaeric: ["\u7403\u9762\u7684", "\u6027", "sphaeric"], sphygm: ["\u8109\u640F", "\u52A8", "sphygm"], spic: ["\u7A57", "\u7269", "spic"], spicu: ["\u77DB\u5C16", "\u52A8", "spicu"], spin: ["\u8346\u68D8\u523A", "\u7269", "spin"], spir: ["\u547C\u5438\u3001\u6C14\u606F", "\u7269", "spir"], spira: ["\u87BA\u65CB", "\u7269", "spira"], spiss: ["\u6D53\u7A20", "\u7269", "spiss"], splanchno: ["\u5185\u810F", "\u7269", "splanchno"], splen: ["\u813E", "\u52A8", "splen"], splend: ["\u8F89\u714C", "\u6027", "splend"], splendid: ["\u7480\u74A8", "\u6027", "splendid"], splint: ["\u5939\u677F", "\u7269", "splint"], spolium: ["\u730E\u7269\u76AE", "\u52A8", "spolium"], sponde: ["\u627F\u8BFA", "\u52A8", "sponde"], spons: ["\u62C5\u4FDD", "\u7269", "spons"], sporta: ["\u7BEE\u7B50", "\u7269", "sporta"], spuma: ["\u6CE1\u6CAB", "\u52A8", "spuma"], sput: ["\u5410\u553E", "\u52A8", "sput"], squal: ["\u6C61\u79FD", "\u6027", "squal"], squalor: ["\u8D2B\u964B", "\u6027", "squalor"], squam: ["\u9CDE", "\u7269", "squam"], sta: ["\u7ACB\u3001\u7AD9", "\u52A8", "sta"], stab: ["\u7A33\u5B9A", "\u52A8", "stab"], stabu: ["\u53A9\u820D", "\u7269", "stabu"], stabul: ["\u53A9\u517B", "\u52A8", "stabul"], stadi: ["\u8DDD\u79BB\u5355\u4F4D", "\u7269", "stadi"], stadio: ["\u7ADE\u8D70", "\u52A8", "stadio"], staff: ["\u8C31\u8868", "\u7269", "staff"], stalac: ["\u949F\u4E73\u77F3", "\u7269", "stalac"], stam: ["\u7EBF", "\u7269", "stam"], stamen: ["\u96C4\u854A", "\u7269", "stamen"], stamina: ["\u8010\u529B", "\u52A8", "stamina"], stann: ["\u9521", "\u7269", "stann"], stapes: ["\u9A6C\u956B", "\u7269", "stapes"], stat: ["\u72B6\u6001", "\u52A8", "stat"], stater: ["\u91D1\u5E01", "\u7269", "stater"], statik: ["\u9759\u529B\u5B66", "\u7269", "statik"], statio: ["\u9A7F\u7AD9", "\u7269", "statio"], statis: ["\u7EDF\u8BA1", "\u7269", "statis"], stato: ["\u9759", "\u7269", "stato"], statu: ["\u96D5\u50CF", "\u7269", "statu"], statura: ["\u8EAB\u6750", "\u6027", "statura"], statute: ["\u6210\u6587\u6CD5", "\u7269", "statute"], stel: ["\u661F", "\u7269", "stel"], stellat: ["\u661F\u5F62\u7684", "\u6027", "stellat"], stem: ["\u8BCD\u5E72", "\u7269", "stem"], steno: ["\u72ED\u7A84", "\u7269", "steno"], steppe: ["\u8349\u539F", "\u7269", "steppe"], ster: ["\u7CAA\u80A5", "\u7269", "ster"], stercor: ["\u65BD\u80A5", "\u7269", "stercor"], stereo: ["\u523B\u677F", "\u6027", "stereo"], steril: ["\u4E0D\u80B2", "\u7269", "steril"], sterilit: ["\u8D2B\u7620", "\u7269", "sterilit"], sterna: ["\u94FA\u5C55", "\u52A8", "sterna"], sternu: ["\u55B7\u568F", "\u52A8", "sternu"], sterto: ["\u6253\u9F3E", "\u52A8", "sterto"], stibi: ["\u9EDB", "\u7269", "stibi"], stigma: ["\u70D9\u5370", "\u6027", "stigma"], stil: ["\u7B14", "\u7269", "stil"], still: ["\u6EF4\u843D", "\u52A8", "still"], stilla: ["\u6C34\u73E0", "\u7269", "stilla"], stillici: ["\u6EF4\u6C34", "\u52A8", "stillici"], stimul: ["\u523A\u68D2", "\u52A8", "stimul"], stimulus: ["\u523A\u6FC0", "\u6027", "stimulus"], stip: ["\u519B\u9977", "\u52A8", "stip"], stipem: ["\u52DF\u6350", "\u7269", "stipem"], stipes: ["\u83CC\u67C4", "\u7269", "stipes"], stipo: ["\u585E\u6EE1", "\u52A8", "stipo"], stips: ["\u65BD\u820D", "\u52A8", "stips"], stipulat: ["\u8981\u5F0F", "\u52A8", "stipulat"], stiva: ["\u8F66\u8F95", "\u7269", "stiva"], stock: ["\u80A1\u4EFD", "\u52A8", "stock"], stolid: ["\u611A\u949D", "\u6027", "stolid"], stolo: ["\u6839\u8616", "\u7269", "stolo"], stomach: ["\u80C3", "\u52A8", "stomach"], stomacho: ["\u607C\u6012", "\u6027", "stomacho"], stomato: ["\u53E3", "\u7269", "stomato"], strag: ["\u88AB\u8925", "\u7269", "strag"], strangul: ["\u7EDE\u6740", "\u7269", "strangul"], strat: ["\u6218\u7565", "\u52A8", "strat"], strategema: ["\u8BA1\u8C0B", "\u7269", "strategema"], strategus: ["\u6218\u7565\u5BB6", "\u7269", "strategus"], strati: ["\u5C42\u4E91", "\u7269", "strati"], strator: ["\u9A6C\u592B", "\u7269", "strator"], stratum: ["\u5E8A\u94FA", "\u7269", "stratum"], strenuus: ["\u77EB\u5065", "\u6027", "strenuus"], strepi: ["\u55A7\u54CD", "\u52A8", "strepi"], striatus: ["\u6761\u7EB9\u7684", "\u6027", "striatus"], strict: ["\u6536\u7D27", "\u6027", "strict"], strid: ["\u523A\u8033", "\u6027", "strid"], stridor: ["\u54AC\u7259\u58F0", "\u52A8", "stridor"], stridul: ["\u5431\u5440", "\u6027", "stridul"], strigilis: ["\u522E\u8EAB\u5668", "\u7269", "strigilis"], string: ["\u52D2\u7D27", "\u52A8", "string"], strobil: ["\u67F1\u5934\u5377\u53F6", "\u7269", "strobil"], structu: ["\u8425\u9020", "\u52A8", "structu"], strues: ["\u5806", "\u7269", "strues"], struma: ["\u7630\u75AC", "\u7269", "struma"], stud: ["\u52E4\u5B66", "\u7269", "stud"], studeo: ["\u70ED\u8877", "\u6027", "studeo"], studi: ["\u70ED\u5FF1", "\u6027", "studi"], studios: ["\u52E4\u5B66\u8005", "\u7269", "studios"], stul: ["\u611A\u7B28", "\u6027", "stul"], stupa: ["\u5854\u5E99", "\u7269", "stupa"], stupe: ["\u60CA\u6115", "\u6027", "stupe"], stupor: ["\u5446\u6EDE", "\u52A8", "stupor"], stuppa: ["\u9EBB\u7D6E", "\u52A8", "stuppa"], stylob: ["\u53F0\u57FA", "\u7269", "stylob"], styx: ["\u51A5\u6CB3", "\u7269", "styx"], suavis: ["\u7518\u7F8E", "\u6027", "suavis"], subact: ["\u63C9\u9762", "\u52A8", "subact"], subaud: ["\u542C\u51FA", "\u52A8", "subaud"], subduc: ["\u5F15\u9000", "\u52A8", "subduc"], subfri: ["\u5FAE\u714E", "\u52A8", "subfri"], subici: ["\u4F7F\u81E3\u670D", "\u52A8", "subici"], subicio: ["\u6295\u4E0B", "\u52A8", "subicio"], subig: ["\u63C9\u9762", "\u7269", "subig"], subitus: ["\u7A81\u7136", "\u6027", "subitus"], subl: ["\u5347\u534E", "\u52A8", "subl"], subleg: ["\u5077\u542C", "\u52A8", "subleg"], sublig: ["\u4E0B\u7CFB", "\u52A8", "sublig"], sublim: ["\u767B\u9AD8", "\u52A8", "sublim"], submer: ["\u6EBA\u5211", "\u7269", "submer"], subpoe: ["\u4F20\u7968", "\u7269", "subpoe"], subrep: ["\u722C\u5165", "\u52A8", "subrep"], subrid: ["\u5FAE\u7B11", "\u52A8", "subrid"], subrip: ["\u5077\u53D6", "\u52A8", "subrip"], subrisus: ["\u6D45\u7B11", "\u52A8", "subrisus"], subsann: ["\u5632\u7B11", "\u52A8", "subsann"], subscri: ["\u5377\u672B\u7F72\u540D", "\u7269", "subscri"], subse: ["\u5B50\u96C6", "\u7269", "subse"], subsell: ["\u957F\u51F3", "\u7269", "subsell"], subsequ: ["\u968F\u884C", "\u52A8", "subsequ"], subsid: ["\u4E0B\u6C89", "\u52A8", "subsid"], subsidi: ["\u540E\u5907\u63F4", "\u52A8", "subsidi"], substit: ["\u9A7B\u8DB3", "\u52A8", "substit"], substruc: ["\u57FA\u5824", "\u7269", "substruc"], subteg: ["\u7EAC\u7EB1", "\u52A8", "subteg"], subtil: ["\u7CBE\u7EC6", "\u6027", "subtil"], subtra: ["\u51CF", "\u6027", "subtra"], subtro: ["\u4E9A\u70ED\u5E26", "\u7269", "subtro"], subulc: ["\u7267\u732A\u4EBA", "\u52A8", "subulc"], subveh: ["\u4E0A\u8FD0", "\u52A8", "subveh"], subven: ["\u63A5\u6D4E", "\u52A8", "subven"], subver: ["\u98A0\u8986", "\u52A8", "subver"], suc: ["\u6C41\u6DB2", "\u7269", "suc"], succ: ["\u6210\u529F", "\u52A8", "succ"], succend: ["\u70B9\u71C3", "\u52A8", "succend"], succens: ["\u607C\u6012", "\u6027", "succens"], succid: ["\u780D\u5012", "\u52A8", "succid"], succin: ["\u675F\u8170", "\u52A8", "succin"], succinc: ["\u675F\u8170\u7684", "\u52A8", "succinc"], succino: ["\u4F34\u5531", "\u52A8", "succino"], succulent: ["\u591A\u6C41", "\u6027", "succulent"], succur: ["\u9A70\u63F4", "\u52A8", "succur"], succut: ["\u4E0B\u64BC", "\u52A8", "succut"], sucr: ["\u7CD6", "\u7269", "sucr"], sucul: ["\u7EDE\u76D8", "\u7269", "sucul"], sudator: ["\u6C57\u6D74\u5BA4", "\u7269", "sudator"], sudor: ["\u6C57", "\u52A8", "sudor"], suffim: ["\u718F\u9999", "\u7269", "suffim"], suffit: ["\u718F\u70DF", "\u52A8", "suffit"], suffix: ["\u540E\u7F00", "\u7269", "suffix"], suffl: ["\u5439\u6C14", "\u52A8", "suffl"], suffr: ["\u6295\u7968", "\u7269", "suffr"], sug: ["\u542E\u5438", "\u52A8", "sug"], suggest: ["\u8BB2\u575B", "\u7269", "suggest"], suggill: ["\u8BA5\u8BBD", "\u52A8", "suggill"], sulc: ["\u7281\u6C9F", "\u7269", "sulc"], sulf: ["\u786B\u5473", "\u7269", "sulf"], summ: ["\u548C\u3001\u603B", "\u6570", "summ"], summa: ["\u603B\u91CF", "\u6570", "summa"], summati: ["\u6982\u62EC\u5730", "\u6570", "summati"], summitt: ["\u5448\u9001", "\u52A8", "summitt"], summov: ["\u65A5\u9000", "\u52A8", "summov"], sumo: ["\u62FF\u8D77", "\u52A8", "sumo"], sumptu: ["\u5962\u534E", "\u6027", "sumptu"], sumptus: ["\u8D39\u7528", "\u7269", "sumptus"], supell: ["\u5BB6\u5177", "\u52A8", "supell"], super: ["\u4E0A\u3001\u8D85\u8D8A", "\u7269", "super"], superan: ["\u8D85\u8D8A", "\u6027", "superan"], superb: ["\u9A84\u50B2", "\u6027", "superb"], superci: ["\u7709", "\u7269", "superci"], superf: ["\u4E0A\u8868\u9762", "\u7269", "superf"], supern: ["\u8D85\u65B0\u661F", "\u7269", "supern"], superst: ["\u8FF7\u4FE1", "\u7269", "superst"], superstes: ["\u9057\u5B58", "\u7269", "superstes"], suppet: ["\u589E\u63F4", "\u52A8", "suppet"], suppl: ["\u4F9B\u7ED9", "\u52A8", "suppl"], supplic: ["\u8BF7\u613F", "\u52A8", "supplic"], supplicium: ["\u6781\u5211", "\u7269", "supplicium"], supprim: ["\u538B\u4E0B", "\u52A8", "supprim"], surculus: ["\u65B0\u679D", "\u7269", "surculus"], surdit: ["\u8033\u804B", "\u7269", "surdit"], surplus: ["\u76C8\u4F59", "\u52A8", "surplus"], surpr: ["\u60CA\u8BB6", "\u6027", "surpr"], surrip: ["\u7A83\u53D6", "\u52A8", "surrip"], suscit: ["\u5524\u9192", "\u52A8", "suscit"], susp: ["\u731C\u7591", "\u6027", "susp"], suspend: ["\u60AC\u6302", "\u52A8", "suspend"], suspic: ["\u591A\u7591", "\u6027", "suspic"], suspir: ["\u957F\u53F9", "\u52A8", "suspir"], sustent: ["\u7EF4\u7CFB", "\u7269", "sustent"], sustin: ["\u6258\u4F4F", "\u52A8", "sustin"], susurr: ["\u7AB8\u7AA3", "\u6027", "susurr"], sut: ["\u7F1D", "\u7269", "sut"], suto: ["\u978B\u5320", "\u7269", "suto"], sutra: ["\u7ECF", "\u7269", "sutra"], sutrin: ["\u978B\u5320\u94FA", "\u52A8", "sutrin"], sutur: ["\u7F1D\u7EBF", "\u7269", "sutur"], syll: ["\u97F3\u8282", "\u7269", "syll"], syllabus: ["\u6559\u5B66\u5927\u7EB2", "\u7269", "syllabus"], syllog: ["\u4E09\u6BB5\u8BBA", "\u6027", "syllog"], symb: ["\u8C61\u5F81", "\u6027", "symb"], symbio: ["\u5171\u751F", "\u7269", "symbio"], symbola: ["\u5206\u644A", "\u7269", "symbola"], symmetry: ["\u5BF9\u79F0", "\u7269", "symmetry"], sympath: ["\u540C\u60C5", "\u6027", "sympath"], sympho: ["\u4EA4\u54CD\u4E50", "\u7269", "sympho"], symphon: ["\u4E50\u5E08", "\u7269", "symphon"], symposium: ["\u5B66\u672F\u4F1A\u8BAE", "\u7269", "symposium"], sympt: ["\u75C7\u72B6", "\u52A8", "sympt"], sympto: ["\u75C7", "\u7269", "sympto"], synaps: ["\u7A81\u89E6", "\u52A8", "synaps"], syncop: ["\u6655\u53A5", "\u52A8", "syncop"], syndicat: ["\u8F9B\u8FEA\u52A0", "\u7269", "syndicat"], syndrome: ["\u7EFC\u5408\u5F81", "\u7269", "syndrome"], synecdoch: ["\u63D0\u55BB", "\u7269", "synecdoch"], synest: ["\u901A\u611F", "\u6027", "synest"], syngraf: ["\u5951\u7EA6", "\u7269", "syngraf"], syngraph: ["\u501F\u636E", "\u7269", "syngraph"], synt: ["\u53E5\u6CD5", "\u7269", "synt"], synthes: ["\u7EFC\u5408", "\u6027", "synthes"], syntheto: ["\u5408\u6210", "\u7269", "syntheto"], syrinx: ["\u6392\u7BAB", "\u7269", "syrinx"], syrtic: ["\u6697\u6C99", "\u7269", "syrtic"], syst: ["\u4F53\u7CFB", "\u6027", "syst"], tabell: ["\u4FE1\u4F7F", "\u7269", "tabell"], tabern: ["\u5E97\u94FA", "\u52A8", "tabern"], taberno: ["\u5F00\u5E97", "\u52A8", "taberno"], tabid: ["\u6D88\u8017", "\u6027", "tabid"], tabl: ["\u684C\u3001\u677F", "\u7269", "tabl"], tabul: ["\u6848\u5377", "\u7269", "tabul"], tabulat: ["\u9601\u697C", "\u7269", "tabulat"], taciturn: ["\u5BE1\u8A00", "\u52A8", "taciturn"], tact: ["\u89E6\u3001\u6478", "\u52A8", "tact"], tactica: ["\u6218\u672F", "\u7269", "tactica"], tactil: ["\u89E6\u611F", "\u52A8", "tactil"], taed: ["\u538C\u5026", "\u6027", "taed"], taeda: ["\u5A5A\u70AC", "\u7269", "taeda"], taeter: ["\u4E11\u6076", "\u6027", "taeter"], takt: ["\u6218\u672F", "\u52A8", "takt"], tale: ["\u6545\u4E8B", "\u7269", "tale"], talen: ["\u5927\u989D\u8D27\u5E01", "\u52A8", "talen"], talentum: ["\u5854\u5170\u7279", "\u7269", "talentum"], talio: ["\u540C\u6001\u590D\u4EC7", "\u7269", "talio"], talisman: ["\u6CD5\u5B9D", "\u52A8", "talisman"], talus: ["\u8E1D", "\u7269", "talus"], tangens: ["\u5207\u7EBF", "\u7269", "tangens"], tango: ["\u89E6", "\u6027", "tango"], tant: ["\u5982\u6B64\u591A", "\u6027", "tant"], tantil: ["\u4E9B\u5FAE", "\u7269", "tantil"], tantul: ["\u5FAE\u5C0F\u91CF", "\u6570", "tantul"], tantun: ["\u540C\u91CF", "\u7269", "tantun"], tard: ["\u8FDF\u3001\u7F13", "\u7269", "tard"], tardig: ["\u7F13\u6B65", "\u52A8", "tardig"], tarif: ["\u5173\u7A0E", "\u52A8", "tarif"], tartar: ["\u51A5\u6E0A", "\u7269", "tartar"], tau: ["\u725B", "\u7269", "tau"], tautolog: ["\u91CD\u8A00", "\u6027", "tautolog"], taxiarch: ["\u652F\u961F\u957F", "\u7269", "taxiarch"], taxis: ["\u6392\u5217", "\u7269", "taxis"], techne: ["\u6280\u827A", "\u6027", "techne"], tect: ["\u5C4B\u9876", "\u7269", "tect"], tecton: ["\u677F\u5757", "\u7269", "tecton"], tectorium: ["\u7070\u6CE5", "\u7269", "tectorium"], teg: ["\u74E6", "\u7269", "teg"], tegular: ["\u74E6\u5320", "\u7269", "tegular"], tel: ["\u76EE\u7684\u3001\u8D8B\u5411", "\u7269", "tel"], tela: ["\u7EC7\u5E03", "\u7269", "tela"], teleo: ["\u8FDC", "\u7269", "teleo"], telesm: ["\u6CD5\u5668", "\u52A8", "telesm"], telet: ["\u5165\u6559\u793C", "\u52A8", "telet"], telo: ["\u7A0E\u9879", "\u7269", "telo"], teloni: ["\u6D77\u5173", "\u7269", "teloni"], teme: ["\u9C81\u83BD", "\u6027", "teme"], temer: ["\u81C6\u65AD", "\u7269", "temer"], temo: ["\u8F66\u8F95", "\u7269", "temo"], temper: ["\u56DE\u706B", "\u52A8", "temper"], tempero: ["\u8C03\u548C", "\u52A8", "tempero"], tempes: ["\u98CE\u66B4", "\u7269", "tempes"], templ: ["\u795E\u5E99", "\u7269", "templ"], tempo: ["\u6682\u65F6", "\u52A8", "tempo"], tempt: ["\u5C1D\u8BD5", "\u52A8", "tempt"], temulen: ["\u9189\u7684", "\u52A8", "temulen"], ten: ["\u6301\u3001\u63E1", "\u52A8", "ten"], tenac: ["\u575A\u97E7", "\u6027", "tenac"], tenax: ["\u9ECF\u97E7", "\u6027", "tenax"], tend: ["\u4F38\u5C55", "\u52A8", "tend"], tende: ["\u8D8B\u5411", "\u52A8", "tende"], tendic: ["\u7ECA\u7D22", "\u52A8", "tendic"], tendin: ["\u808C\u8171", "\u52A8", "tendin"], tenebr: ["\u5E7D\u6697", "\u6027", "tenebr"], tenellus: ["\u5A07\u5F31", "\u6027", "tenellus"], tener: ["\u67D4\u5AE9", "\u6027", "tener"], tens: ["\u62C9\u7D27", "\u52A8", "tens"], tensor: ["\u5F20\u91CF", "\u7269", "tensor"], tent: ["\u8BD5\u63A2", "\u52A8", "tent"], tenu: ["\u7A00\u8584", "\u7269", "tenu"], tepid: ["\u5FAE\u6E29", "\u6027", "tepid"], tepidar: ["\u6E29\u5BA4", "\u7269", "tepidar"], tepidarium: ["\u6E29\u6D74\u5BA4", "\u7269", "tepidarium"], tepor: ["\u5FAE\u6E29", "\u7269", "tepor"], ter: ["\u5927\u5730\u3001\u9646\u5730", "\u7269", "ter"], tereb: ["\u94BB", "\u7269", "tereb"], teres: ["\u5706\u6ED1\u7684", "\u6027", "teres"], terminal: ["\u754C\u77F3\u8282", "\u7269", "terminal"], terni: ["\u6BCF\u4E09", "\u7269", "terni"], tero: ["\u78E8\u64E6", "\u52A8", "tero"], terr: ["\u6050\u6016", "\u6027", "terr"], terraem: ["\u5730\u9707", "\u7269", "terraem"], terreo: ["\u4F7F\u60E7", "\u6027", "terreo"], ters: ["\u64E6\u62ED", "\u52A8", "ters"], tersus: ["\u6D01\u51C0\u7684", "\u6027", "tersus"], tessera: ["\u7B26\u724C", "\u52A8", "tessera"], test: ["\u8BC1\u660E\u3001\u89C1\u8BC1", "\u52A8", "test"], testa: ["\u58F3", "\u7269", "testa"], testac: ["\u79CD\u76AE", "\u7269", "testac"], testam: ["\u9057\u5631", "\u7269", "testam"], testari: ["\u4F5C\u8BC1", "\u52A8", "testari"], testi: ["\u8BC1\u4EBA", "\u7269", "testi"], testimon: ["\u8BC1\u8A00", "\u52A8", "testimon"], tetan: ["\u5F3A\u76F4", "\u52A8", "tetan"], texo: ["\u7EC7", "\u52A8", "texo"], text: ["\u6587\u672C\u3001\u7EC7\u4F53", "\u52A8", "text"], textrin: ["\u7EC7\u574A", "\u52A8", "textrin"], textus: ["\u7EC4\u7EC7", "\u7269", "textus"], thalamus: ["\u5A5A\u623F", "\u7269", "thalamus"], thanat: ["\u6B7B\u4EA1", "\u7269", "thanat"], thea: ["\u8336", "\u7269", "thea"], theat: ["\u5267\u573A", "\u7269", "theat"], thema: ["\u4E3B\u9898", "\u7269", "thema"], theme: ["\u4E3B\u9898", "\u7269", "theme"], theo: ["\u795E", "\u7269", "theo"], theol: ["\u795E\u5B66", "\u7269", "theol"], theor: ["\u7406\u8BBA", "\u6027", "theor"], theore: ["\u5B9A\u7406", "\u7269", "theore"], ther: ["\u91CE\u517D", "\u7269", "ther"], thera: ["\u6CBB\u7597", "\u52A8", "thera"], therap: ["\u7597", "\u7269", "therap"], theriac: ["\u4E07\u7075\u836F", "\u52A8", "theriac"], therm: ["\u70ED\u6E29", "\u7269", "therm"], thermae: ["\u6D74\u573A", "\u7269", "thermae"], thermo: ["\u6E29\u89C9", "\u6027", "thermo"], thermom: ["\u6E29\u5EA6\u8BA1", "\u7269", "thermom"], thes: ["\u8BBA\u9898", "\u7269", "thes"], thesaur: ["\u5B9D\u5E93", "\u6027", "thesaur"], thesis: ["\u8BBA\u6587", "\u7269", "thesis"], thorax: ["\u80F8\u7532", "\u7269", "thorax"], threshold: ["\u9608", "\u6027", "threshold"], thronus: ["\u738B\u5EA7", "\u7269", "thronus"], thurib: ["\u9999\u7089", "\u7269", "thurib"], thymia: ["\u9999\u85B0", "\u52A8", "thymia"], thymo: ["\u60C5\u7EEA", "\u6027", "thymo"], tib: ["\u7B1B", "\u7269", "tib"], tibial: ["\u80EB\u8863\u3001\u889C", "\u7269", "tibial"], tibicen: ["\u7B1B\u624B", "\u7269", "tibicen"], tibicin: ["\u5439\u7B1B", "\u52A8", "tibicin"], tili: ["\u6934", "\u7269", "tili"], tim: ["\u6050\u60E7", "\u52A8", "tim"], timbr: ["\u97F3\u8272", "\u7269", "timbr"], timeo: ["\u5BB3\u6015", "\u6027", "timeo"], timid: ["\u602F\u61E6", "\u6027", "timid"], tinct: ["\u6DE1\u8272", "\u7269", "tinct"], tinctor: ["\u67D3\u5DE5", "\u52A8", "tinctor"], tinctur: ["\u6D78\u6DB2", "\u52A8", "tinctur"], ting: ["\u67D3\u8272", "\u52A8", "ting"], tinnio: ["\u4E01\u5F53", "\u52A8", "tinnio"], tinnit: ["\u8033\u9E23", "\u6027", "tinnit"], tintin: ["\u94C3", "\u7269", "tintin"], titan: ["\u5DE8\u64D8", "\u6027", "titan"], titill: ["\u9165\u75D2", "\u52A8", "titill"], titrat: ["\u6EF4\u5B9A", "\u7269", "titrat"], titub: ["\u8E09\u8DC4", "\u52A8", "titub"], titul: ["\u6807\u9898", "\u7269", "titul"], toga: ["\u957F\u888D", "\u7269", "toga"], togavir: ["\u6210\u5E74\u888D", "\u7269", "togavir"], toll: ["\u4E3E\u8D77", "\u52A8", "toll"], tom: ["\u5377", "\u7269", "tom"], toment: ["\u586B\u7D6E", "\u52A8", "toment"], tomo: ["\u5207", "\u7269", "tomo"], ton: ["\u96F7", "\u7269", "ton"], tonalis: ["\u8C03\u6027\u7684", "\u7269", "tonalis"], tonia: ["\u808C\u5F20\u529B", "\u6027", "tonia"], tons: ["\u7406\u53D1\u5E08", "\u7269", "tons"], tonsa: ["\u6868\u53F6", "\u7269", "tonsa"], tonstrin: ["\u5243\u53D1\u94FA", "\u7269", "tonstrin"], tonsur: ["\u526A\u6BDB", "\u52A8", "tonsur"], tonus: ["\u8C03", "\u7269", "tonus"], topo: ["\u4F4D\u7F6E", "\u7269", "topo"], topol: ["\u62D3\u6251", "\u7269", "topol"], torcul: ["\u538B\u69A8\u673A", "\u52A8", "torcul"], torcular: ["\u69A8\u9152", "\u52A8", "torcular"], toreum: ["\u933E\u523B\u54C1", "\u52A8", "toreum"], tormentum: ["\u5F29\u70AE", "\u7269", "tormentum"], tormina: ["\u7EDE\u75DB", "\u6027", "tormina"], torn: ["\u65CB\u524A", "\u52A8", "torn"], tornad: ["\u9F99\u5377", "\u7269", "tornad"], tornat: ["\u65CB\u5DE5", "\u7269", "tornat"], torno: ["\u65CB\u523B", "\u52A8", "torno"], torosus: ["\u808C\u8089\u53D1\u8FBE", "\u6027", "torosus"], torpor: ["\u9EBB\u6728", "\u52A8", "torpor"], torqu: ["\u626D\u8F6C", "\u52A8", "torqu"], torque: ["\u637B", "\u52A8", "torque"], torrefa: ["\u7119\u7092", "\u52A8", "torrefa"], torren: ["\u6025\u6D41", "\u7269", "torren"], torreo: ["\u7119", "\u52A8", "torreo"], torridus: ["\u707C\u70ED", "\u6027", "torridus"], torture: ["\u9177\u5211", "\u7269", "torture"], torvi: ["\u51F6\u76F8", "\u52A8", "torvi"], tost: ["\u70D8\u70E4", "\u7269", "tost"], tox: ["\u5F13", "\u7269", "tox"], toxo: ["\u6BD2", "\u7269", "toxo"], tractab: ["\u53EF\u89E6\u7684", "\u6027", "tractab"], tracto: ["\u6446\u5F04", "\u6027", "tracto"], trado: ["\u4EA4\u4ED8", "\u52A8", "trado"], trago: ["\u60B2\u5267", "\u7269", "trago"], tragula: ["\u8F7B\u6807\u67AA", "\u7269", "tragula"], trah: ["\u62C9\u3001\u62D6", "\u52A8", "trah"], traici: ["\u63B7\u8FC7", "\u52A8", "traici"], tram: ["\u5C94\u8DEF", "\u7269", "tram"], trama: ["\u7EAC\u7EBF", "\u52A8", "trama"], tran: ["\u7A7F\u8FC7", "\u7269", "tran"], tranquil: ["\u5B89\u5B81", "\u6027", "tranquil"], transact: ["\u548C\u89E3", "\u52A8", "transact"], transcr: ["\u8F6C\u5199", "\u7269", "transcr"], transfer: ["\u8F6C\u8FBE", "\u7269", "transfer"], transfu: ["\u8F93\u8840", "\u7269", "transfu"], transgr: ["\u8D8A\u8FC7", "\u52A8", "transgr"], transistor: ["\u6676\u4F53\u7BA1", "\u7269", "transistor"], transit: ["\u8FC7\u5883", "\u7269", "transit"], transla: ["\u7FFB\u8BD1", "\u7269", "transla"], translit: ["\u97F3\u8BD1", "\u7269", "translit"], transluc: ["\u534A\u900F", "\u6027", "transluc"], transmitt: ["\u8F6C\u9001", "\u52A8", "transmitt"], transmut: ["\u5B17\u53D8", "\u52A8", "transmut"], transpl: ["\u79FB\u690D", "\u7269", "transpl"], transve: ["\u8F6C\u8FD0", "\u52A8", "transve"], transvers: ["\u6A2A\u5411", "\u7269", "transvers"], trapez: ["\u94F6\u884C\u5BB6", "\u7269", "trapez"], trapezit: ["\u94B1\u5546", "\u7269", "trapezit"], trauma: ["\u521B\u4F24", "\u6027", "trauma"], trem: ["\u98A4\u6296", "\u52A8", "trem"], tremor: ["\u9707\u54CD", "\u7269", "tremor"], trepid: ["\u614C\u4E71", "\u6027", "trepid"], trepido: ["\u60F6\u6025", "\u6027", "trepido"], trespass: ["\u4FB5\u5165", "\u7269", "trespass"], tri: ["\u4E09", "\u6570", "tri"], triangul: ["\u4E09\u89D2\u7684", "\u6027", "triangul"], trib: ["\u7A0E\u3001\u8D21", "\u52A8", "trib"], tribel: ["\u8131\u7C92\u5668", "\u7269", "tribel"], tribu: ["\u6388\u4E88", "\u52A8", "tribu"], tribul: ["\u90E8\u65CF", "\u7269", "tribul"], tribunat: ["\u62A4\u6C11\u5B98\u804C", "\u7269", "tribunat"], tribunic: ["\u5426\u51B3\u6743", "\u52A8", "tribunic"], tribunus: ["\u62A4\u6C11\u5B98", "\u7269", "tribunus"], tricho: ["\u6BDB", "\u7269", "tricho"], triens: ["\u4E09\u5206\u4E4B\u4E00", "\u7269", "triens"], trigly: ["\u4E09\u8054\u69FD", "\u7269", "trigly"], trigon: ["\u4E09\u89D2\u7403\u620F", "\u52A8", "trigon"], trilix: ["\u4E09\u80A1\u7EBF", "\u52A8", "trilix"], triplus: ["\u4E09\u500D", "\u7269", "triplus"], tripty: ["\u4E09\u6298\u677F", "\u7269", "tripty"], tripud: ["\u8E0F\u821E", "\u7269", "tripud"], triremis: ["\u4E09\u5217\u6868\u8239", "\u7269", "triremis"], tris: ["\u60B2\u4F24", "\u52A8", "tris"], tristit: ["\u6101\u5BB9", "\u52A8", "tristit"], trit: ["\u78E8\u3001\u78BE", "\u52A8", "trit"], tritic: ["\u9EA6", "\u7269", "tritic"], tritur: ["\u8131\u7C92", "\u52A8", "tritur"], trium: ["\u51EF\u65CB", "\u52A8", "trium"], troch: ["\u6ED1\u8F6E", "\u7269", "troch"], trocho: ["\u8F6E", "\u7269", "trocho"], trochus: ["\u94C1\u73AF", "\u7269", "trochus"], troph: ["\u8425\u517B", "\u6027", "troph"], trophae: ["\u730E\u83B7\u7EAA\u5FF5", "\u52A8", "trophae"], tropic: ["\u56DE\u5F52\u7EBF", "\u7269", "tropic"], truc: ["\u51F6\u731B\u3001\u6B8B\u66B4", "\u52A8", "truc"], trucul: ["\u51F6\u6A2A", "\u6027", "trucul"], trud: ["\u63A8\u6324", "\u52A8", "trud"], trunc: ["\u6811\u5E72", "\u7269", "trunc"], tub: ["\u53F7\u89D2", "\u7269", "tub"], tuber: ["\u5757\u830E", "\u7269", "tuber"], tubic: ["\u53F7\u624B", "\u52A8", "tubic"], tubul: ["\u7BA1\u9053", "\u7269", "tubul"], tueri: ["\u5B88\u62A4\u770B", "\u52A8", "tueri"], tuit: ["\u6CE8\u89C6", "\u52A8", "tuit"], tum: ["\u80BF", "\u52A8", "tum"], tumul: ["\u575F\u51A2", "\u7269", "tumul"], tumult: ["\u9A9A\u52A8", "\u7269", "tumult"], tunde: ["\u6376\u6253", "\u52A8", "tunde"], tundit: ["\u6376\u6253", "\u52A8", "tundit"], tundr: ["\u51BB\u539F", "\u7269", "tundr"], tunic: ["\u675F\u8170\u8863", "\u7269", "tunic"], turb: ["\u6405\u52A8\u3001\u6DA1\u65CB", "\u7269", "turb"], turba: ["\u4EBA\u7FA4", "\u7269", "turba"], turbatio: ["\u70E6\u4E71", "\u6027", "turbatio"], turben: ["\u9640\u87BA", "\u7269", "turben"], turbid: ["\u6D51\u6D4A", "\u6027", "turbid"], turbine: ["\u6DA1\u8F6E", "\u7269", "turbine"], turbo: ["\u65CB\u98CE", "\u7269", "turbo"], turio: ["\u5AE9\u82BD", "\u7269", "turio"], turma: ["\u9A91\u5175\u961F", "\u52A8", "turma"], turna: ["\u9A91\u5175\u961F", "\u7269", "turna"], turp: ["\u4E11\u3001\u53EF\u803B", "\u6027", "turp"], turpitu: ["\u4E11\u884C", "\u6027", "turpitu"], turr: ["\u5854", "\u7269", "turr"], tus: ["\u4E73\u9999", "\u7269", "tus"], tuss: ["\u54B3", "\u52A8", "tuss"], tute: ["\u4FDD\u62A4", "\u52A8", "tute"], tutela: ["\u5BFC\u5E08", "\u7269", "tutela"], tutor: ["\u76D1\u62A4\u4EBA", "\u7269", "tutor"], tymp: ["\u9F13", "\u7269", "tymp"], typ: ["\u7C7B\u578B", "\u6027", "typ"], typh: ["\u53F0\u98CE", "\u7269", "typh"], typo: ["\u5370", "\u7269", "typo"], tyrann: ["\u66B4\u541B", "\u7269", "tyrann"], tyranno: ["\u50ED\u4E3B", "\u7269", "tyranno"], uber: ["\u591A\u4EA7", "\u6027", "uber"], udus: ["\u6F6E\u6E7F", "\u52A8", "udus"], ulc: ["\u6E83\u75A1", "\u52A8", "ulc"], uligo: ["\u6E7F\u5730", "\u7269", "uligo"], ulm: ["\u6986", "\u7269", "ulm"], ult: ["\u8D8A\u3001\u5F7C\u7AEF", "\u7269", "ult"], ultrav: ["\u7D2B\u5916", "\u7269", "ultrav"], ululat: ["\u568E\u58F0", "\u6027", "ululat"], ulva: ["\u6C34\u8349", "\u7269", "ulva"], umb: ["\u5F71\u3001\u9634\u5F71", "\u7269", "umb"], umbracul: ["\u65E5\u6677", "\u7269", "umbracul"], umbrat: ["\u836B\u51C9", "\u7269", "umbrat"], umecto: ["\u6DA6\u6E7F", "\u52A8", "umecto"], umerus: ["\u80A9", "\u7269", "umerus"], un: ["\u5355\u4E00\u3001\u4E00", "\u52A8", "un"], unci: ["\u5C0F\u5355\u4F4D", "\u7269", "unci"], uncial: ["\u4E00\u5BF8\u7684", "\u7269", "uncial"], und: ["\u6CE2\u6D6A", "\u7269", "und"], undulata: ["\u6CE2\u7EB9", "\u52A8", "undulata"], ung: ["\u6D82\u6CB9\u3001\u818F", "\u7269", "ung"], ungu: ["\u722A", "\u52A8", "ungu"], unguent: ["\u9999\u818F", "\u7269", "unguent"], unguentar: ["\u9999\u818F\u5320", "\u7269", "unguentar"], ungul: ["\u8E44", "\u7269", "ungul"], ungula: ["\u94B3\u70D9", "\u7269", "ungula"], union: ["\u8054\u76DF", "\u7269", "union"], univ: ["\u56E2\u4F53", "\u7269", "univ"], urbanit: ["\u6587\u96C5", "\u52A8", "urbanit"], urceus: ["\u58F6", "\u7269", "urceus"], ureter: ["\u8F93\u5C3F\u7BA1", "\u52A8", "ureter"], urgeo: ["\u50AC\u903C", "\u52A8", "urgeo"], uria: ["\u5C3F\u75C7", "\u6027", "uria"], urina: ["\u5C3F", "\u52A8", "urina"], uro: ["\u70E7", "\u52A8", "uro"], urs: ["\u718A", "\u7269", "urs"], ust: ["\u7145\u70E7", "\u52A8", "ust"], ustio: ["\u70D9", "\u52A8", "ustio"], ustion: ["\u706B\u5211", "\u7269", "ustion"], usucap: ["\u65F6\u6548\u53D6\u5F97", "\u52A8", "usucap"], usur: ["\u9AD8\u5229", "\u52A8", "usur"], usura: ["\u9AD8\u5229\u8D37", "\u7269", "usura"], usurp: ["\u7BE1\u53D6", "\u52A8", "usurp"], ut: ["\u4F7F\u7528", "\u52A8", "ut"], utens: ["\u7528\u5177", "\u52A8", "utens"], utricul: ["\u76AE\u7B4F", "\u7269", "utricul"], uv: ["\u8461\u8404", "\u7269", "uv"], vac: ["\u6447\u6446", "\u52A8", "vac"], vaccine: ["\u75AB\u82D7", "\u7269", "vaccine"], vaco: ["\u7A7A\u95F2", "\u52A8", "vaco"], vacu: ["\u7A7A", "\u6027", "vacu"], vacuum: ["\u771F\u7A7A", "\u7269", "vacuum"], vad: ["\u6D89\u6E21", "\u7269", "vad"], vadio: ["\u62B5\u62BC\u7269", "\u52A8", "vadio"], vado: ["\u884C\u8D70", "\u52A8", "vado"], vados: ["\u6D45", "\u6027", "vados"], vafer: ["\u72E1\u9EE0", "\u6027", "vafer"], vag: ["\u6E38\u8361", "\u52A8", "vag"], vagio: ["\u5A74\u557C", "\u52A8", "vagio"], vagitus: ["\u5A74\u513F\u557C", "\u7269", "vagitus"], val: ["\u8C37\u5730", "\u7269", "val"], vale: ["\u5065\u5EB7", "\u52A8", "vale"], valed: ["\u544A\u522B", "\u52A8", "valed"], valent: ["\u5316\u5408\u4EF7", "\u7269", "valent"], valetu: ["\u7597\u517B\u9662", "\u52A8", "valetu"], valetud: ["\u591A\u75C5", "\u6027", "valetud"], valid: ["\u5F3A\u58EE", "\u6027", "valid"], vall: ["\u58C1\u5792", "\u52A8", "vall"], valo: ["\u4EF7\u503C", "\u6027", "valo"], valv: ["\u9600\u95E8", "\u7269", "valv"], vannus: ["\u7C38\u7B95", "\u7269", "vannus"], vapidus: ["\u8D70\u5473", "\u6027", "vapidus"], varia: ["\u53D8\u91CF", "\u7269", "varia"], varian: ["\u65B9\u5DEE", "\u7269", "varian"], varieg: ["\u6742\u8272", "\u6027", "varieg"], variola: ["\u5929\u82B1", "\u7269", "variola"], vas: ["\u5BB9\u5668", "\u7269", "vas"], vast: ["\u8352\u829C\u3001\u7A7A\u65F7", "\u7269", "vast"], vasto: ["\u8E42\u8E8F", "\u52A8", "vasto"], vat: ["\u5148\u77E5", "\u7269", "vat"], vaticin: ["\u795E\u8C15\u5BA3\u793A", "\u7269", "vaticin"], vecor: ["\u660F\u8069", "\u6027", "vecor"], vect: ["\u6760\u6746", "\u7269", "vect"], vecti: ["\u4F20\u52A8", "\u7269", "vecti"], vecto: ["\u5411\u91CF", "\u7269", "vecto"], vectura: ["\u8FD0\u8F93", "\u7269", "vectura"], veh: ["\u8FD0\u9001", "\u52A8", "veh"], vehem: ["\u731B\u70C8", "\u6027", "vehem"], vehicul: ["\u8F66\u8F86", "\u7269", "vehicul"], vein: ["\u77FF\u8109", "\u7269", "vein"], velam: ["\u9762\u7EB1", "\u7269", "velam"], velific: ["\u626C\u5E06", "\u7269", "velific"], vell: ["\u6BDB\u76AE", "\u7269", "vell"], veller: ["\u7F8A\u6BDB", "\u7269", "veller"], vellic: ["\u62E7\u634F", "\u52A8", "vellic"], vello: ["\u62D4", "\u52A8", "vello"], velo: ["\u906E\u76D6", "\u52A8", "velo"], veloc: ["\u901F\u5EA6", "\u7269", "veloc"], velox: ["\u8FC5\u6377", "\u6027", "velox"], velum: ["\u5E06", "\u7269", "velum"], veluti: ["\u5929\u9E45\u7ED2\u7684", "\u6027", "veluti"], venabu: ["\u730E\u77DB", "\u52A8", "venabu"], venalic: ["\u8D29\u5356", "\u7269", "venalic"], venat: ["\u730E\u4EBA", "\u7269", "venat"], venatric: ["\u5973\u730E\u624B", "\u52A8", "venatric"], vend: ["\u51FA\u552E", "\u52A8", "vend"], vendit: ["\u5356\u4E3B", "\u52A8", "vendit"], vendo: ["\u5356", "\u52A8", "vendo"], venefic: ["\u65BD\u6BD2", "\u52A8", "venefic"], venen: ["\u6BD2", "\u52A8", "venen"], veneni: ["\u6BD2\u7269", "\u52A8", "veneni"], vener: ["\u77BB\u4EF0", "\u52A8", "vener"], venet: ["\u9752\u8272", "\u6027", "venet"], venia: ["\u5BBD\u6055", "\u52A8", "venia"], vent: ["\u98CE", "\u7269", "vent"], ventil: ["\u626C\u8C37", "\u52A8", "ventil"], ventos: ["\u591A\u98CE", "\u7269", "ventos"], ventr: ["\u8179", "\u52A8", "ventr"], ventulus: ["\u5FAE\u98CE", "\u7269", "ventulus"], venus: ["\u4F18\u96C5", "\u7269", "venus"], vepres: ["\u8346\u68D8", "\u7269", "vepres"], ver: ["\u771F\u5B9E\u3001\u786E\u5B9E", "\u52A8", "ver"], verb: ["\u8BCD\u3001\u8A00\u8F9E", "\u52A8", "verb"], verber: ["\u7B1E\u6253", "\u7269", "verber"], verbero: ["\u97AD\u6253", "\u52A8", "verbero"], verbos: ["\u5197\u8A00", "\u52A8", "verbos"], verdict: ["\u88C1\u51B3", "\u7269", "verdict"], verecun: ["\u8D67\u8272", "\u52A8", "verecun"], veredus: ["\u9A7F\u9A6C", "\u7269", "veredus"], vereor: ["\u656C\u754F", "\u6027", "vereor"], verif: ["\u9A8C\u8BC1", "\u6027", "verif"], verm: ["\u866B", "\u7269", "verm"], vern: ["\u6625", "\u7269", "vern"], verna: ["\u5BB6\u751F\u5974", "\u7269", "verna"], vernal: ["\u6625\u4EE4", "\u7269", "vernal"], vernan: ["\u6625\u610F", "\u6027", "vernan"], verr: ["\u516C\u732A", "\u7269", "verr"], verrit: ["\u6E05\u626B", "\u52A8", "verrit"], vers: ["\u8F6C\u3001\u671D\u5411", "\u7269", "vers"], versific: ["\u4F5C\u8BD7", "\u7269", "versific"], versio: ["\u8BD1\u672C", "\u7269", "versio"], verso: ["\u7FFB\u52A8", "\u52A8", "verso"], versut: ["\u5706\u6ED1", "\u6027", "versut"], vertic: ["\u5782\u76F4", "\u7269", "vertic"], vertig: ["\u7729\u6655", "\u52A8", "vertig"], verutum: ["\u91CD\u6807\u67AA", "\u7269", "verutum"], vescor: ["\u8FDB\u98DF", "\u52A8", "vescor"], vesic: ["\u8180\u80F1", "\u52A8", "vesic"], vesp: ["\u508D\u665A", "\u7269", "vesp"], vest: ["\u8863\u3001\u7740\u88C5", "\u7269", "vest"], vestal: ["\u7076\u795E\u8282", "\u7269", "vestal"], vestibu: ["\u95E8\u5385", "\u7269", "vestibu"], vestibul: ["\u524D\u5EAD\u89C9", "\u6027", "vestibul"], vestig: ["\u8FFD\u8E2A", "\u52A8", "vestig"], vestio: ["\u7ED9\u7A7F", "\u52A8", "vestio"], veto: ["\u5426\u51B3", "\u52A8", "veto"], vetul: ["\u5C0F\u8001\u5934", "\u7269", "vetul"], vexill: ["\u519B\u65D7", "\u52A8", "vexill"], viat: ["\u65C5\u4EBA", "\u7269", "viat"], viatic: ["\u65C5\u8D39", "\u7269", "viatic"], vibex: ["\u97AD\u75D5", "\u6027", "vibex"], vibr: ["\u632F\u52A8", "\u7269", "vibr"], vic: ["\u90BB\u3001\u4EA4\u66FF", "\u7269", "vic"], viceni: ["\u6BCF\u4E8C\u5341", "\u7269", "viceni"], vicensi: ["\u4E8C\u5341\u5206\u7A0E", "\u7269", "vicensi"], vicin: ["\u90BB\u91CC", "\u7269", "vicin"], vict: ["\u796D\u54C1", "\u7269", "vict"], victo: ["\u80DC\u5229", "\u52A8", "victo"], vidu: ["\u5BE1\u5C45", "\u7269", "vidu"], vig: ["\u8B66\u9192\u3001\u6D3B\u529B", "\u52A8", "vig"], vigilia: ["\u5B88\u591C\u793C", "\u52A8", "vigilia"], vigilo: ["\u5B88\u591C", "\u52A8", "vigilo"], vigor: ["\u7CBE\u529B", "\u52A8", "vigor"], vil: ["\u4F4E\u8D31", "\u6027", "vil"], vill: ["\u5E84\u56ED", "\u7269", "vill"], villosus: ["\u7ED2\u6BDB\u7684", "\u6027", "villosus"], vin: ["\u80DC\u5229\u3001\u5F81\u670D", "\u52A8", "vin"], vinace: ["\u8461\u8404\u6E23", "\u52A8", "vinace"], vinali: ["\u9152\u8282", "\u7269", "vinali"], vinari: ["\u9152\u5546", "\u52A8", "vinari"], vincio: ["\u7F1A", "\u52A8", "vincio"], vincl: ["\u675F\u7F1A", "\u7269", "vincl"], vind: ["\u590D\u4EC7", "\u7269", "vind"], vindemia: ["\u91C7\u8461\u8404", "\u52A8", "vindemia"], vindex: ["\u62C5\u4FDD\u4EBA", "\u52A8", "vindex"], vine: ["\u8461\u8404\u56ED", "\u7269", "vine"], vinif: ["\u917F\u9152", "\u52A8", "vinif"], viol: ["\u7D2B\u7F57\u5170", "\u7269", "viol"], vir: ["\u7EFF", "\u6027", "vir"], virga: ["\u6756", "\u7269", "virga"], virgini: ["\u7AE5\u8D1E", "\u7269", "virgini"], viridari: ["\u82B1\u56ED", "\u7269", "viridari"], viridit: ["\u7FE0\u7EFF", "\u6027", "viridit"], viripo: ["\u53CA\u7B04", "\u7269", "viripo"], viro: ["\u75C5\u6BD2", "\u7269", "viro"], virt: ["\u6548\u529B\u3001\u5FB7\u80FD", "\u52A8", "virt"], virtu: ["\u5FB7\u80FD", "\u52A8", "virtu"], virtuos: ["\u540D\u5BB6", "\u7269", "virtuos"], virtuose: ["\u540D\u624B", "\u7269", "virtuose"], virus: ["\u75C5\u6BD2", "\u7269", "virus"], visc: ["\u5185\u810F", "\u7269", "visc"], viscam: ["\u9ECF\u7A20", "\u6027", "viscam"], viscer: ["\u810F\u8151", "\u7269", "viscer"], visci: ["\u7C98\u9E1F\u80F6", "\u52A8", "visci"], viscos: ["\u9ECF\u6027", "\u7269", "viscos"], visere: ["\u9020\u8BBF\u770B", "\u52A8", "visere"], vision: ["\u89C6\u89C9", "\u6027", "vision"], visito: ["\u62DC\u8BBF", "\u52A8", "visito"], vit: ["\u751F\u547D", "\u7269", "vit"], vitamin: ["\u7EF4\u751F\u7D20", "\u52A8", "vitamin"], viti: ["\u8461\u8404\u85E4", "\u7269", "viti"], viticul: ["\u85E4\u8513", "\u7269", "viticul"], vitio: ["\u6076\u4E60", "\u6027", "vitio"], vitr: ["\u73BB\u7483", "\u7269", "vitr"], vitrar: ["\u73BB\u7483\u5320", "\u7269", "vitrar"], vitre: ["\u73BB\u7483\u5149\u6CFD", "\u6027", "vitre"], vitricus: ["\u7EE7\u7236", "\u7269", "vitricus"], vitrif: ["\u6210\u73BB\u7483", "\u52A8", "vitrif"], vitu: ["\u65A5\u9A82", "\u52A8", "vitu"], vivarium: ["\u517B\u6B96\u573A", "\u7269", "vivarium"], voc: ["\u55D3\u97F3", "\u7269", "voc"], volat: ["\u98DE\u884C", "\u52A8", "volat"], volatil: ["\u6325\u53D1\u6027", "\u7269", "volatil"], volitio: ["\u610F\u5FD7", "\u6027", "volitio"], volsella: ["\u954A", "\u7269", "volsella"], voltag: ["\u7535\u538B", "\u7269", "voltag"], volum: ["\u4F53\u79EF", "\u7269", "volum"], volun: ["\u610F\u5FD7", "\u6027", "volun"], volup: ["\u4EAB\u4E50", "\u6027", "volup"], volut: ["\u7FFB\u6EDA", "\u52A8", "volut"], voluta: ["\u6DA1\u5377", "\u7269", "voluta"], volv: ["\u5377\u8D77", "\u52A8", "volv"], volva: ["\u83CC\u6258", "\u7269", "volva"], volvo: ["\u7F20\u7ED5", "\u52A8", "volvo"], vom: ["\u5455\u5410", "\u52A8", "vom"], vomer: ["\u7281\u94E7", "\u7269", "vomer"], vor: ["\u541E\u98DF", "\u7269", "vor"], vorago: ["\u6DF1\u6E0A\u6F29\u6DA1", "\u7269", "vorago"], vorax: ["\u8D2A\u98DF", "\u52A8", "vorax"], vortex: ["\u6F29\u6DA1", "\u7269", "vortex"], vot: ["\u8A93\u613F", "\u7269", "vot"], vove: ["\u8BB8\u613F", "\u6027", "vove"], vulcan: ["\u706B\u5C71", "\u7269", "vulcan"], vuln: ["\u4F24\u3001\u521B", "\u52A8", "vuln"], vulp: ["\u72D0", "\u7269", "vulp"], vult: ["\u9762\u5BB9", "\u7269", "vult"], warrant: ["\u4EE4\u72B6", "\u7269", "warrant"], weld: ["\u710A\u63A5", "\u7269", "weld"], woodcu: ["\u6728\u523B", "\u7269", "woodcu"], wrath: ["\u76DB\u6012", "\u6027", "wrath"], xyst: ["\u6797\u836B\u9053", "\u7269", "xyst"], yogi: ["\u745C\u4F3D\u58EB", "\u7269", "yogi"], zel: ["\u5992\u7FA1", "\u6027", "zel"], zeloty: ["\u5992\u5FCC", "\u6027", "zeloty"], zenith: ["\u5929\u9876", "\u7269", "zenith"], zingib: ["\u59DC", "\u7269", "zingib"], zodi: ["\u9EC4\u9053", "\u7269", "zodi"], zoo: ["\u52A8\u7269", "\u7269", "zoo"], zoolo: ["\u52A8\u7269\u5B66", "\u7269", "zoolo"], zophor: ["\u9970\u5E26", "\u7269", "zophor"] }, schemaVersion: 1, units: { annus: ["annus", "\u65F6\u95F4", "\u5E74"], cubitus: ["cubitus", "\u957F\u5EA6\uFF08\u65E7\u5236\uFF09", "\u8098"], dies: ["dies", "\u65F6\u95F4", "\u65E5"], digitus: ["digitus", "\u957F\u5EA6\uFF08\u65E7\u5236\uFF09", "\u6307\u5BBD"], eu: ["EU", "\u80FD\u91CF\u5355\u4F4D", "\u5143\u7D20\u541E\u5410\uFF08\u80FD\u91CF\uFF09\uFF1B\u5199\u5B83\u5373\u4E3A\u9501\u5B58\uFF08\u89E6\u53D1\u5F0F\u672F\u5F0F\uFF09"], euw: ["EUW", "\u80FD\u91CF\u5355\u4F4D", "\u5143\u7D20\u541E\u5410\u529F\u7387\uFF1B\u529F\u7387\u53E3\u5F84\uFF0C\u4E0D\u5F97\u914D luss\uFF08\u6301\u7EED\u53D1\u52A8\uFF09"], hora: ["hora", "\u65F6\u95F4", "\u65F6"], kigrama: ["kigrama", "\u8D28\u91CF", "\u5343\u514B"], minas: ["minas", "\u65F6\u95F4", "\u5206"], miteas: ["miteas", "\u957F\u5EA6", "\u7C73"], mu: ["MU", "\u80FD\u91CF\u5355\u4F4D", "\u9B54\u529B\uFF08\u80FD\u91CF\uFF09\uFF1B\u5199\u5B83\u5373\u4E3A\u9501\u5B58\uFF08\u89E6\u53D1\u5F0F\u672F\u5F0F\uFF09"], muw: ["MUW", "\u80FD\u91CF\u5355\u4F4D", "\u9B54\u529B\u529F\u7387\uFF1B\u529F\u7387\u53E3\u5F84\uFF0C\u4E0D\u5F97\u914D luss\uFF08\u6301\u7EED\u53D1\u52A8\uFF09"], passus: ["passus", "\u957F\u5EA6\uFF08\u65E7\u5236\uFF09", "\u6B65"], sands: ["sands", "\u65F6\u95F4", "\u79D2"] } };
  }
});

// src/adapter/plugin.js
var require_plugin = __commonJS({
  "src/adapter/plugin.js"(exports2, module2) {
    "use strict";
    var { Plugin: Plugin2, TFile, TFolder, Notice, MarkdownView, requestUrl } = require("obsidian");
    var { extractEpXsCBlocks } = require_markdown_blocks();
    var { loadBuiltinLexicon } = require_lexicon();
    var { RefreshScheduler } = require_refresh_scheduler();
    var { buildLexiconSnapshot } = require_lexicon_service();
    var { normalizeSettings } = require_settings();
    var { EpXsSettingsTab } = require_settings_tab();
    var { createOpenAICompatibleProvider } = require_openai_compatible();
    var { createTranslationService } = require_translation_service();
    var { normalizeProviderConfig, validateProviderConfig } = require_request();
    var { markSpellRefs, markVarUse, bracketKinds, parseVarTypes, markDictKeys, markBracketDepth } = require_markup();
    var { TYPES, MODIFIERS, makeGrammar, BASE_LISTS } = require_grammar();
    var { tokenizeText } = require_tokenizer();
    var { collectSpells } = require_spells();
    var { lintSource } = require_lint_service();
    var { renderEpXsC } = require_epxsc_renderer();
    var { parseOrdBlocks } = require_ord_renderer();
    var { LintModal } = require_lint_modal();
    var { diagnose, selfCheck } = require_diagnostics();
    var { FALLBACK, SECTIONS, ELEMENTS, splitSections, parseEntries, parseRanks, parseFilterKeys, parseUnits, parseRoots, wordsFrom } = require_parsers();
    var LANG_KEYS = ["EpXsC", "epxsc", "EPXSC"];
    var CODE_SELECTOR = 'code[class*="language-EpXsC" i]';
    var { DICT_PATH, RANK_PATH, SYNTAX_PATH, ROOTS_DIR, SPELL_DIR, MAX_HIGHLIGHT_LINES } = require_config();
    var BUILD = "2.1.0";
    var { SECTION_POS, EXTRA_WORDS, SYMBOL_INFO, pickClass, bracketTip, variableTip, negScopeText, coordTip, rankDef, rankSpan, buildTip } = require_tooltip();
    var FALLBACK_CSS = '/* EpXsC Syntax \u5185\u7F6E\u515C\u5E95\u6837\u5F0F\uFF08\u4E0E styles.css \u7B2C 1\uFF0F2\uFF0F3\uFF0F5\uFF0F6 \u8282\u4E00\u81F4\uFF09 */\nbody{--epx-comment:var(--text-faint);--epx-pretium:var(--color-red);--epx-keyword:var(--color-purple);--epx-judge:var(--color-purple);--epx-clause:var(--color-red);--epx-verb:var(--color-blue);--epx-decl:var(--color-yellow);--epx-element:var(--color-cyan);--epx-type:var(--color-cyan);--epx-unit:var(--color-orange);--epx-number:var(--color-orange);--epx-degree:var(--color-pink);--epx-axis:var(--color-green);--epx-pointer:var(--text-accent);--epx-operator:var(--text-muted);--epx-punct:var(--text-muted);--epx-paren:var(--text-muted);--epx-bracket:var(--text-muted);--epx-brace:var(--text-muted);--epx-rank:var(--color-orange);--epx-b2:var(--text-muted);--epx-b3:var(--text-muted);--epx-variable:var(--color-pink);--epx-modifier:var(--color-red)}\npre.epx-pre{position:relative;padding:1.1em 1.15em 1.15em;background:var(--code-background);border:1px solid var(--background-modifier-border);border-left:3px solid var(--text-accent);border-radius:var(--radius-m)}\npre.epx-pre::before{content:"EpXsC";position:absolute;inset:0 0 auto auto;padding:0 .7em;font-family:var(--font-interface);font-size:.62em;font-weight:600;letter-spacing:.09em;line-height:1.8;color:var(--text-on-accent);background:var(--text-accent);border-radius:0 var(--radius-m) 0 var(--radius-s);opacity:.85;pointer-events:none;user-select:none}\n:is(code[class*="language-EpXsC" i], .epx-ord){font-family:var(--font-monospace);font-size:.9em;line-height:1.65;tab-size:4;color:var(--code-normal,var(--text-normal));background:none;padding:0;text-shadow:none}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.comment{color:var(--epx-comment);font-style:italic}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.pretium{color:var(--epx-pretium);font-weight:700}:is(code[class*="language-EpXsC" i], .epx-ord) .token.clause{color:var(--epx-clause);font-weight:700}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.keyword{color:var(--epx-keyword);font-weight:600}:is(code[class*="language-EpXsC" i], .epx-ord) .token.judge{color:var(--epx-judge);font-weight:700}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.negPrefix{color:var(--epx-keyword);font-weight:700}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.function{color:var(--epx-verb)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.spellRef{color:var(--epx-verb);font-weight:700}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.predicate{color:var(--epx-verb)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.declaration{color:var(--epx-decl);font-weight:700}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.element{color:var(--epx-element);font-weight:600}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.type{color:var(--epx-type)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.variable{color:var(--epx-variable);font-weight:600}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.unit{color:var(--epx-unit);font-style:italic}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.number{color:var(--epx-number)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.rankRange{color:var(--epx-rank);font-weight:700}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.degree{color:var(--epx-degree);font-style:italic}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.axis{color:var(--epx-axis)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.pointer{color:var(--epx-pointer);font-weight:700}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.coordRun{color:var(--text-muted);font-weight:600}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.modifier{color:var(--epx-modifier);font-style:italic;font-weight:600}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.declTarget{color:var(--epx-variable);font-weight:600}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.varUse{color:var(--epx-variable)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.operator{color:var(--epx-operator)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.bracket{color:var(--epx-bracket);color:color-mix(in srgb,var(--color-cyan) 40%,var(--text-muted));font-weight:600}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.paren{color:var(--epx-paren)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.brace{color:var(--epx-brace)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.punctuation{color:var(--epx-punct)}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.epx-d2{color:var(--epx-b2);color:color-mix(in srgb,var(--color-pink) 35%,var(--text-muted))}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.epx-d3{color:var(--epx-b3);color:color-mix(in srgb,var(--color-green) 35%,var(--text-muted))}\nbody.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.declaration{color:#7e691f;color:color-mix(in srgb,var(--color-yellow) 45%,var(--text-normal))}\nbody.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.element,body.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.type{color:#17797a;color:color-mix(in srgb,var(--color-cyan) 50%,var(--text-normal))}\nbody.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.unit,body.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.number,body.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.rankRange{color:#a05b16;color:color-mix(in srgb,var(--color-orange) 60%,var(--text-normal))}\nbody.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.axis{color:#197d44;color:color-mix(in srgb,var(--color-green) 55%,var(--text-normal))}\nbody.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.degree,body.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.variable,body.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.declTarget,body.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.varUse{color:#c4387c;color:color-mix(in srgb,var(--color-pink) 90%,var(--text-normal))}\nbody.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.pretium,body.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.clause,body.theme-light :is(code[class*="language-EpXsC" i], .epx-ord) .token.modifier{color:#cd3145;color:color-mix(in srgb,var(--color-red) 85%,var(--text-normal))}\n:is(code[class*="language-EpXsC" i], .epx-ord) .token.epx-unknown{text-decoration:underline dotted var(--color-orange);text-underline-offset:.2em}\n.epx-tip{position:fixed;z-index:9999;max-width:340px;padding:7px 11px;border:1px solid var(--background-modifier-border);border-radius:var(--radius-s);background:var(--background-secondary);color:var(--text-normal);font-family:var(--font-interface);font-size:12px;line-height:1.5;box-shadow:var(--shadow-s);pointer-events:none;opacity:0}\n.epx-tip.is-visible{opacity:1}\n.epx-tip .epx-tip-head{font-weight:600;color:var(--text-accent)}\n.epx-tip .epx-tip-body{color:var(--text-muted)}\n/* \u666E\u901A\u53E5\u5757\uFF1A\u5916\u6846 + \u53F3\u4E0A\u89D2\u8BED\u8A00\u7B7E\uFF0C\u8DDF\u672F\u5F0F\u5757\u540C\u5F62\uFF0C\u53EA\u6309\u6A21\u5F0F\u6362\u8272\uFF08G \u9752 \xB7 T \u6A59\uFF09\n   \u5916\u5C42\u662F code.language-EpXsC\uFF1Atoken \u914D\u8272\u4E0E\u60AC\u505C\u6CBF\u7528\u672F\u5F0F\u90A3\u5957\u9009\u62E9\u5668\uFF0C\u8FD9\u91CC\u53EA\u7BA1\u7248\u9762\u3002 */\n.epx-ord {\n  --epx-ord-tint: var(--color-cyan);\n  display: block;\n  position: relative;\n  line-height: 1.9;\n  padding: 1.1em 1.15em 1.15em;\n  background: var(--code-background);\n  border: 1px solid var(--background-modifier-border);\n  border-left: 3px solid var(--epx-ord-tint);\n  border-radius: var(--radius-m);\n  box-shadow: 0 1px 2px rgb(0 0 0 / 6%);\n}\n.epx-ord-T { --epx-ord-tint: var(--color-orange); }\n.epx-ord::before {\n  content: "EpXsG";\n  position: absolute;\n  inset: 0 0 auto auto;\n  padding: 0 0.7em;\n  font-family: var(--font-interface);\n  font-size: 0.62em;\n  font-weight: 600;\n  letter-spacing: 0.09em;\n  line-height: 1.8;\n  color: var(--epx-ord-tint);\n  background: var(--background-secondary);\n  background: color-mix(in srgb, var(--epx-ord-tint) 22%, var(--background-primary));\n  border-radius: 0 var(--radius-m) 0 var(--radius-s);\n  opacity: 0.95;\n  pointer-events: none;\n  user-select: none;\n}\n.epx-ord-T::before { content: "EpXsT"; }\n/* \u8BCD\u4E0E\u8BCD\u6CE8\u90FD\u662F inline-block\uFF1A\u5FC5\u987B top \u5BF9\u9F50\uFF0C\u5426\u5219\u6709\u8BCD\u6CE8\u7684\u8BCD\u88AB\u9876\u9AD8\u3001\u6574\u884C\u5B57\u4E0A\u4E0B\u8DF3\u3002 */\n.epx-oline { display: block; margin: .18em 0; }\n.epx-gs { display: block; }\n.epx-gw { display: inline-block; text-align: center; margin: 0 .16em; vertical-align: top; }\n.epx-gsrc { display: block; line-height: 1.3; }\n.epx-ggl { display: block; font-size: .74em; line-height: 1.2; opacity: .7; font-family: var(--font-text); }\n.epx-tsrc { display: block; }\n.epx-tzh { display: block; font-family: var(--font-text); opacity: .78; font-size: .92em; }\n.epx-gap { display: block; height: .45em; }\n.epx-ord-wrap { display: block; }\n/* \u6709\u4E9B\u4E3B\u9898\u4F1A\u7ED9\u5757\u7EA7\u5143\u7D20\u7EE7\u627F\u9996\u884C\u7F29\u8FDB\uFF1BT/G \u662F\u4EE3\u7801\u5757\uFF0C\u9996\u884C\u5FC5\u987B\u8D34\u5DE6 */\n.epx-ord, .epx-ord .epx-oline, .epx-ord .epx-tsrc, .epx-ord .epx-tzh { text-indent: 0; }\n.epx-ord { padding: 1.1em 1.15em 1.15em !important; }\n@media (max-width: 640px) { .epx-ord { padding: 0 0.9em 0.9em !important; } }\n.epx-ord > .epx-oline:first-child { margin-top: 0; }\n.epx-ord { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }\n@media (max-width:640px){.epx-ord,pre.epx-pre{white-space:pre-wrap;overflow-wrap:break-word;padding:0 .9em .9em}.epx-ord{line-height:1.8}.epx-ord::before,pre.epx-pre::before{position:static;display:block;margin:0 -.9em .75em;padding:.22em .9em;text-align:right;line-height:1.7;border-radius:var(--radius-m) var(--radius-m) 0 0;opacity:1}.epx-ggl{line-height:1.25}.epx-tzh{margin-top:.15em}}';
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
      const tip = buildTip(cls, text, info, ranks, { spells: spellRegistry, sectionPos: SECTION_POS });
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
    var { renderOrdBlock, renderOrdBlockInner } = require_ord_dom();
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
    function detectLanguage(app) {
      try {
        if (app && typeof app.getLocale === "function") {
          const loc = app.getLocale();
          if (loc) return loc;
        }
      } catch (e) {
      }
      try {
        if (window.moment && typeof window.moment.locale === "function") {
          const loc = window.moment.locale();
          if (loc) return loc;
        }
      } catch (e) {
      }
      try {
        const loc = window.localStorage && window.localStorage.getItem("language");
        if (loc) return loc;
      } catch (e) {
      }
      return typeof navigator !== "undefined" && navigator.language || "zh-CN";
    }
    var EpXsCSyntaxPlugin = class extends Plugin2 {
      onload() {
        const self = this;
        this.grammar = makeGrammar(BASE_LISTS);
        this.info = /* @__PURE__ */ new Map();
        this.translationLanguage = detectLanguage(this.app);
        this.settings = normalizeSettings(null);
        this.lexiconConflicts = [];
        this.customDictionaryErrors = [];
        this.ranks = /* @__PURE__ */ new Map();
        for (const w in EXTRA_WORDS) this.info.set(w, EXTRA_WORDS[w]);
        this.install();
        this.addSettingTab(new EpXsSettingsTab(this.app, this));
        this.addRibbonIcon("languages", "EpXsC \u8BBE\u7F6E", function() {
          self.openSettings();
        });
        this.addCommand({
          id: "open-settings",
          name: "\u6253\u5F00 EpXsC \u8BBE\u7F6E",
          callback: function() {
            self.openSettings();
          }
        });
        this.loadData().then(function(data) {
          self.settings = normalizeSettings(data);
          self.translationLanguage = self.settings.display.language !== "auto" ? self.settings.display.language : detectLanguage(self.app);
          self.configureTranslation();
          self.refresh();
        }).catch(function(err) {
          console.warn("[EpXsC Syntax] \u8BBE\u7F6E\u8BFB\u53D6\u5931\u8D25\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u503C\uFF1A", err);
        });
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
          el.__epxOrd = { source, mode, ctx };
          renderOrdBlock(el, source, mode, self.grammar, self.info, self.getTranslationRenderOptions());
          bindClickToSource(el, self.app, el, ctx);
        };
        const ordG = (source, el, ctx) => ord(source, el, ctx, "G");
        const ordT = (source, el, ctx) => ord(source, el, ctx, "T");
        for (const lang of ["EpXsG", "epxsg", "EPXSG"]) this.registerMarkdownCodeBlockProcessor(lang, ordG);
        for (const lang of ["EpXsT", "epxst", "EPXST"]) this.registerMarkdownCodeBlockProcessor(lang, ordT);
        const isDataFile = function(file) {
          if (!file || !file.path) return false;
          const customPaths = self.settings && self.settings.lexicon && self.settings.lexicon.customPaths || [];
          return file.path === DICT_PATH || file.path === SYNTAX_PATH || file.path === RANK_PATH || file.path.indexOf(ROOTS_DIR) === 0 || file.path.indexOf(SPELL_DIR) === 0 || customPaths.indexOf(file.path) >= 0;
        };
        const refreshScheduler = new RefreshScheduler(function() {
          self.refresh();
        }, 300);
        const scheduleRefresh = function() {
          refreshScheduler.request();
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
          refreshScheduler.cancel();
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
      getRequestedLanguage() {
        const set = this.settings && this.settings.display && this.settings.display.language;
        return set && set !== "auto" ? set : this.translationLanguage;
      }
      getFallbackLanguage() {
        return this.settings && this.settings.display && this.settings.display.fallbackLanguage || "";
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
          this.translationConfigError = "";
          return false;
        }
        const cfg = normalizeProviderConfig(tr.provider);
        const check = validateProviderConfig(cfg);
        if (!check.ok) {
          this.translationService = null;
          this.translationConfigError = check.message;
          return false;
        }
        const self = this;
        const provider = createOpenAICompatibleProvider({
          config: cfg,
          request: async function(req) {
            const res = await requestUrl({ url: req.url, method: req.method, headers: req.headers, body: req.body, throw: false });
            return { status: res.status, json: res.json, text: res.text };
          }
        });
        this.translationService = createTranslationService({ provider, timeoutMs: cfg.timeoutMs });
        this.translationConfigError = "";
        return true;
      }
      getTranslationRenderOptions() {
        return {
          requestedLanguage: this.getRequestedLanguage(),
          fallbackLanguage: this.getFallbackLanguage(),
          autoTranslate: !!(this.settings && this.settings.translation && this.settings.translation.enabled),
          translationService: this.translationService || null,
          lexiconVersion: this.lexiconVersion || ""
        };
      }
      async testTranslation() {
        if (!this.configureTranslation() || !this.translationService) {
          return { ok: false, error: { code: "NOT_CONFIGURED", message: this.translationConfigError || "\u7FFB\u8BD1\u672A\u542F\u7528\u6216\u914D\u7F6E\u4E0D\u5B8C\u6574" } };
        }
        return await this.translationService.translate({ text: "Plur Aqua", sourceLang: "epxsc", targetLanguage: this.getRequestedLanguage() || "zh-CN", lexiconVersion: this.lexiconVersion || "" });
      }
      async openSettings() {
        try {
          const setting = this.app.setting;
          if (!setting) {
            new Notice("\u8BF7\u6253\u5F00 \u8BBE\u7F6E \u2192 \u7B2C\u4E09\u65B9\u63D2\u4EF6 \u2192 EpXsC Syntax\u3002");
            return;
          }
          if (typeof setting.open === "function") {
            const opening = setting.open();
            if (opening && typeof opening.then === "function") await opening;
          }
          if (typeof setting.openTabById !== "function") {
            new Notice("\u5DF2\u6253\u5F00\u8BBE\u7F6E\uFF0C\u8BF7\u5728 \u7B2C\u4E09\u65B9\u63D2\u4EF6 \u4E2D\u627E\u5230 EpXsC Syntax\u3002");
            return;
          }
          const tab = setting.openTabById(this.manifest.id);
          if (!tab) {
            window.setTimeout(() => {
              try {
                setting.openTabById(this.manifest.id);
              } catch (e) {
              }
            }, 50);
          }
        } catch (err) {
          console.warn("[EpXsC Syntax] \u65E0\u6CD5\u76F4\u63A5\u6253\u5F00\u8BBE\u7F6E\u9875\uFF1A", err);
          new Notice("\u8BF7\u6253\u5F00 \u8BBE\u7F6E \u2192 \u7B2C\u4E09\u65B9\u63D2\u4EF6 \u2192 EpXsC Syntax\u3002");
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
        const snapshot = await buildLexiconSnapshot({
          readFile: async (path) => {
            const file = this.app.vault.getAbstractFileByPath(path);
            if (file instanceof TFile) return await this.app.vault.cachedRead(file);
            try {
              if (this.app.vault.adapter && typeof this.app.vault.adapter.read === "function") {
                return await this.app.vault.adapter.read(path);
              }
            } catch (e) {
            }
            return null;
          },
          listMarkdown: (dir) => this.mdFilesUnder(dir).map(function(file) {
            return file.path;
          }),
          warn: function(err) {
            console.warn("[EpXsC Syntax] \u8BFB\u53D6\u5E93\u5185\u8BCD\u5E93\u5931\u8D25\uFF0C\u6539\u7528\u5185\u7F6E\u5FEB\u7167\uFF1A", err);
          }
        }, { DICT_PATH, RANK_PATH, SYNTAX_PATH, ROOTS_DIR, SPELL_DIR }, BUILTIN_LEXICON, EXTRA_WORDS, { customDictPaths: this.settings.lexicon.customPaths });
        if (gen !== this._refreshGen) return;
        this.spells = snapshot.spells;
        spellRegistry = snapshot.spells;
        this.lexiconVersion = snapshot.lexiconVersion || "";
        this.info = snapshot.info;
        this.ranks = snapshot.ranks;
        this.roots = snapshot.roots;
        this.units = snapshot.units;
        this.keys = snapshot.keys;
        this.lexiconConflicts = snapshot.dictionaryConflicts || [];
        this.customDictionaryErrors = snapshot.customDictionaryErrors || [];
        this.grammar = makeGrammar(snapshot.lists, Array.from(snapshot.keyWords));
        this.install();
        if (window.__epxscDebug) console.log("[EpXsC Syntax] \u8BCD\u6761 " + this.info.size + " \xB7 \u8BCD\u6839 " + this.roots.size + " \xB7 \u79E9 " + this.ranks.size + "\uFF08" + snapshot.lists.predicate.length + " \u4E2A\u8C13\u8BCD\uFF09");
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
        return diagnose(this, BUILD);
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
        return selfCheck(this, BUILD);
      }
      rehighlight() {
        this.highlightIn(document);
        const wraps = document.querySelectorAll(".epx-ord-wrap");
        for (let i = 0; i < wraps.length; i++) {
          const wrap = wraps[i];
          const el = wrap.parentElement;
          const rec = el && el.__epxOrd;
          if (!rec) continue;
          try {
            renderOrdBlockInner(el, rec.source, rec.mode, this.grammar, this.info, this.getTranslationRenderOptions());
            bindClickToSource(el, this.app, el, rec.ctx);
          } catch (e) {
          }
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
          const found = /language-(\w+)/.exec(code.className || "");
          if (!found && code.classList) code.classList.add("language-EpXsC");
          const rendered = renderEpXsC(text, this.grammar, this.info, MAX_HIGHLIGHT_LINES);
          if (rendered.skip) return;
          varTypesOf.set(code, rendered.vars);
          code.innerHTML = rendered.html;
          this.markUnknown(code);
          this.markNegation(code);
        } catch (err) {
          console.warn("[EpXsC Syntax]", err);
        }
      }
    };
    var BUILTIN_LEXICON_RAW = require_builtin_lexicon();
    var BUILTIN_LEXICON = function() {
      const loaded = loadBuiltinLexicon(BUILTIN_LEXICON_RAW);
      if (!loaded.ok) console.warn("[EpXsC Syntax] \u5185\u7F6E\u8BCD\u5E93\u5FEB\u7167\u4E0D\u53EF\u7528\uFF1A" + loaded.reason);
      return loaded.data;
    }();
    module2.exports = EpXsCSyntaxPlugin;
  }
});

// src/main.js
var Plugin = require_plugin();
module.exports = Plugin;
