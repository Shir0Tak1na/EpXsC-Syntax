'use strict';

/* Pure EpXsC data parsers. No Obsidian / DOM dependencies. */

const FALLBACK = {
  /* 词典读不到时的兜底；in / om 这类词性易漏，一并钉死 */
  keyword: ['in', 'de', 'pro', 'om', 'post', 'nec'],
  judge: ['keal', 'keol', 'tam', 'dum', 'nisi', 'quan', 'vero', 'es', 'exo', 'lic', 're', 'ren', 'rea', 'kon', 'aut', 'dis', 'ergo', 'kaus', 'ske', 'aude', 'rase', 'fas', 'nefas'],
  clause: ['pretium', 'limit', 'luss', 'solum', 'hauri', 'vita', 'memoria', 'sensus', 'voluntas', 'anima', 'vis', 'diu', 'celer', 'metos'],
  degree: ['max', 'min', 'valde', 'magis', 'minus', 'parum', 'paulum', 'nimis'],
  predicate: ['plur', 'navis', 'apolus', 'expual', 'aepaus', 'movis', 'venis', 'retase'],
  unit: ['MUW', 'EUW', 'MU', 'miteas', 'kigrama', 'm', 's', 'kg']
};

/* 词典小节 → 词类 */
const SECTIONS = {
  /* 功能词（介词·助动词·限定词·代词·疑问词·连接词）：紫 */
  keyword: ['介词', '助动词', '限定词', '时间限定', '数量与范围限定', '指称限定', '顺序限定', '代词（人称）', '疑问词', '连接词与从句标记'],
  /* 判断词（if／elif／else 一族）：单独一色 */
  judge: ['判断词'],
  /* 术式关键词（块内条款与术式专用词）：单独一色 */
  clause: ['术式关键词'],
  degree: ['程度限定'],
  predicate: ['动词'],
  unit: ['单位']
};

const ELEMENTS = ['Ert', 'Aqu', 'Flm', 'Wnd', 'Nut', 'Elc', 'Lum', 'Duk', 'Sar', 'Qen'];

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


/* 词典表格 → 词条表：词性取所在小节，释义取第二列，缩写取第三列 */
function parseEntries(text) {
  const out = new Map();
  let section = '';
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const h = /^#{1,6}\s*(.+?)\s*$/.exec(lines[i]);
    if (h) { section = h[1]; continue; }
    const m = /^\|\s*([A-Za-z][A-Za-z0-9_-]{0,30})\s*\|(.*)$/.exec(lines[i]);
    if (!m) {
      /* 另一类表：首列中文名、次列码（如《词典》附表「元素固定缩写」）——把码也登记成词条 */
      const c2 = /^\|\s*([^|]{1,14}?)\s*\|\s*([A-Za-z][A-Za-z0-9]{0,6})\s*\|/.exec(lines[i]);
      if (c2) {
        const code = c2[2];
        const cn = c2[1].trim();
        const k = code.toLowerCase();
        if (cn && !out.has(k)) out.set(k, { word: code, pos: '元素码', meaning: cn, abbr: code });
        /* 元素码以大小写与普通词区分（Sar 初元素 vs sar 开始）：原样再登记一份 */
        if (cn) out.set(code, { word: code, pos: '元素码', meaning: cn, abbr: code });
      }
      continue;
    }
    const cells = m[2].split('|');
    const meaning = (cells[0] || '').trim();
    if (!meaning || meaning === 'meaning' || meaning === '义' || meaning === '释义') continue;
    const key = m[1].toLowerCase();
    if (!out.has(key)) out.set(key, { word: m[1], pos: section, meaning: meaning, abbr: (cells[1] || '').trim() });
    /* 缩写反查：登记 Abbr → 词条，使缩写也能悬停 */
    const abbr = (cells[1] || '').trim();
    if (/^[A-Za-z][A-Za-z0-9]{1,6}$/.test(abbr) && !out.has(abbr.toLowerCase())) {
      out.set(abbr.toLowerCase(), { word: abbr, pos: ELEMENTS.indexOf(abbr) >= 0 ? '元素码' : (section + '·缩写'), meaning: meaning, abbr: abbr });
    }
  }
  return out;
}


/* 秩表里的分量列带 LaTeX，洗成人能读的样子 */
const GREEK = { theta: 'θ', lambda: 'λ', sigma: 'σ', Delta: 'Δ', varphi: 'φ', eta: 'η', omega: 'ω', mu: 'μ', pi: 'π', alpha: 'α', beta: 'β', gamma: 'γ', tau: 'τ', rho: 'ρ' };

function cleanMath(s) {
  let t = String(s);
  t = t.replace(/\$([^$]*)\$/g, '$1');
  t = t.replace(/\\mathrm\{([^}]*)\}/g, '$1');
  t = t.replace(/\\text\{([^}]*)\}/g, '$1');
  t = t.replace(/\\([a-zA-Z]+)/g, function (all, name) { return GREEK[name] || name; });
  t = t.replace(/\\[,;!]/g, ' ');
  t = t.replace(/[{}]/g, '');
  t = t.replace(/\\/g, '');
  return t.replace(/\s+/g, ' ').trim();
}


function parseRanks(text) {
  const out = new Map();
  const lines = text.split(/\r?\n/);
  let started = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!started) {
      if (/九个秩与维度的对应/.test(line)) started = true;
      continue;
    }
    if (!/^\s*\|/.test(line)) { if (out.size) break; else continue; }
    const m = /^\s*\|\s*(\d{1,2}(?:[–-]\d{1,2})?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/.exec(line);
    if (!m) continue;
    const rank = m[1].replace('-', '–');
    const parts = [];
    const comp = cleanMath(m[2]);
    if (comp) parts.push(comp);
    if (m[3].trim()) parts.push(m[3].trim());
    if (parts.length) out.set(rank, parts.join(' · '));
  }
  return out;
}

/* 术式语法「筛选键」表 → 悬停释义 */
function parseFilterKeys(text) {
  const out = new Map();
  const lines = text.split(/\r?\n/);
  let started = false;
  let rows = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!started) { if (/^#{2,6}\s*筛选键\s*$/.test(line)) started = true; continue; }
    if (!/^\s*\|/.test(line)) { if (rows) break; else continue; }
    const m = /^\s*\|\s*\x60?\s*([A-Za-z][A-Za-z0-9_-]{0,30})\s*\x60?\s*\|\s*([^|]*?)\s*\|/.exec(line);
    if (!m) continue;
    rows += 1;
    out.set(m[1].toLowerCase(), { word: m[1], pos: '筛选键', meaning: m[2].replace(/\x60/g, '').trim(), abbr: '' });
  }
  return out;
}


function cleanCell(s) {
  return String(s).replace(/\*\*/g, '').replace(/\x60/g, '').trim();
}


/* 术式语法「六、单位」两张表 → MU / EU / MUW / EUW 与 passus · sands 等 */
function parseUnits(text) {
  const out = new Map();
  const lines = text.split(/\r?\n/);
  let started = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!started) { if (/^#{2,6}\s*六、单位/.test(line)) started = true; continue; }
    if (/^#{2,6}\s/.test(line) && !/其他单位/.test(line)) break;
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.split('|').map(cleanCell);
    if (cells.length < 5) continue;
    const energy = /^[?？]?\s*([A-Z]{2,4})$/.exec(cells[1]);
    if (energy) {
      const luss = cells[4] || '';
      const note = /锁存/.test(luss) ? '写它即为锁存（触发式术式）' : (/不得/.test(luss) ? '功率口径，不得配 luss（持续发动）' : '');
      const ekey = energy[1].toLowerCase();
      if (!out.has(ekey)) out.set(ekey, { word: energy[1], pos: '能量单位', meaning: cells[2] + (note ? '；' + note : ''), abbr: '' });
      continue;
    }
    const amount = cells[1];
    const names = (cells[3] || '').match(/[A-Za-z][A-Za-z0-9]*/g) || [];
    const labels = (cells[2] || '').split('·').map(function (s) { return s.trim(); });
    for (let j = 0; j < names.length; j++) {
      const key = names[j].toLowerCase();
      if (out.has(key)) continue;
      const label = labels.length === names.length ? labels[j] : (names.length === 1 ? labels[0] : '');
      out.set(key, { word: names[j], pos: amount, meaning: label || cells[2], abbr: '' });
    }
  }
  return out;
}

/* 词根表分册 → 词根释义（根类：动／物／性／数） */

function parseRoots(text) {
  const out = new Map();
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^\|\s*([A-Za-z][A-Za-z0-9-]{0,20})\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/.exec(lines[i]);
    if (!m || /^(根|word|词根)$/.test(m[1])) continue;
    const key = m[1].toLowerCase();
    if (!out.has(key)) out.set(key, { word: m[1], pos: '词根·' + m[5].trim(), meaning: m[2].trim(), kind: m[5].trim() });
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



module.exports = {
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
