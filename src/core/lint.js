'use strict';

/* Pure EpXsC linter. Context: { info, units, keys, spells, path }. */

const BRANCH_WORDS = ['keal', 'keol', 'tam', 'dum', 'nisi', 'quan'];

/* 逐块检查；返回 [{ level, line, message }]。ctx 需要 info / units / keys */
function lintText(text, ctx) {
  const issues = [];
  text = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');
  const push = function (level, line, message, start, end) {
    const content = String(lines[line - 1] || '');
    let s = Number.isInteger(start) ? start : 0;
    let e = Number.isInteger(end) ? end : content.length;
    if (s < 0) s = 0;
    if (s > content.length) s = content.length;
    if (e < s) e = s;
    if (e > content.length) e = content.length;
    const issue = { level: level, line: line, column: s, start: s, end: e, message: message };
    if (!Number.isInteger(start) || !Number.isInteger(end)) issue.approximate = true;
    issues.push(issue);
  };
  const units = (ctx && ctx.units) || new Set();
  const keys = (ctx && ctx.keys) || new Set();

  /* 日常句与术式的分界：句号「.」不参与术式（它是日常句的句号）。
     含句号行的块按日常句对待：只查括号，不套术式的规矩。 */
  let prose = false;
  for (let i = 0; i < lines.length; i++) {
    if (/\.\s*(\/\*.*)?$/.test(lines[i].replace(/[ \t]+$/, ""))) { prose = true; break; }
  }

  /* ① 括号：配对、交叉、闭合（顺带跳过注释） */
  const stack = [];
  const pairOf = { ')': '(', ']': '[', '}': '{' };
  let inComment = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let clean = '';
    for (let c = 0; c < line.length; c++) {
      const ch = line.charAt(c);
      if (inComment) { if (ch === '*' && line.charAt(c + 1) === '/') { inComment = false; c += 1; } continue; }
      if (ch === '/' && line.charAt(c + 1) === '*') { inComment = true; c += 1; continue; }
      clean += ch;
    }
    for (let c = 0; c < clean.length; c++) {
      const ch = clean.charAt(c);
      if (ch === '(' || ch === '[' || ch === '{') stack.push({ ch: ch, line: i + 1, column: c });
      else if (ch === ')' || ch === ']' || ch === '}') {
        const top = stack.pop();
        if (!top) push('error', i + 1, '多出一个「' + ch + '」，前面没有与之对应的「' + pairOf[ch] + '」', c, c + 1);
        else if (top.ch !== pairOf[ch]) push('error', i + 1, '括号对不上：这里是「' + ch + '」，但最近未闭合的是「' + top.ch + '」（第 ' + top.line + ' 行）', c, c + 1);
      }
    }
    /* ② 块头：行尾是冒号，下一行必须缩进更深（日常句不套这条） */
    if (!prose && /:$/.test(clean.replace(/[ \t]+$/, '')) && clean.trim()) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j += 1;
      if (j >= lines.length) push('error', i + 1, '冒号开的块没有块体');
      else {
        const base = (lines[i].match(/^[ \t]*/) || [''])[0].length;
        const next = (lines[j].match(/^[ \t]*/) || [''])[0].length;
        if (next <= base) push('error', j + 1, '块体没有缩进：冒号开的块，这一行要比块头更深');
      }
    }
  }
  for (let i = 0; i < stack.length; i++) push('error', stack[i].line, '「' + stack[i].ch + '」没有闭合', stack[i].column, stack[i].column + 1);
  if (prose) return issues;

  /* 条款次序：载体制 → 对象 → 限制 → 代价 → 触发 → 效果 → 能量 */
  const lead = function (s) { return (s.match(/^[ \t]*/) || [''])[0].length; };
  const clauseRank = function (line) {
    const t = line.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!t || t === '}' || t === '{') return 0;
    if (/^impo\b/.test(t)) return 0;                              /* 导入行不属于条款序列 */
    /* 协议条款及其四个条目：排在能量与特性标记之后（第十五章） */
    if (/^protocol\b/.test(t)) return 8;
    if (/^(?:(?:priv|tut|publ|consta)[	 ]+)?(clav|eRk|frequent)[	 ]*:/.test(t)) return 8;
    if (/\{$/.test(t)) return 1;                                   /* 头行：载体制 ＋ 术式名 ＋ 对象 */
    if (/^limit\s*:/.test(t)) return 2;
    if (/^pretium\s*:/.test(t)) return 3;
    if (/^(keal|keol|tam|dum|nisi|quan)\b/.test(t)) return 4;
    if (/^(luss\b|[?(]|\d)/.test(t) && /\b(MUW|EUW|MU|EU)\b/.test(t)) return 6;
    if (/^(solum|hauri)\b/.test(t)) return 7;
    return 5;                                                      /* 效果 */
  };
  /* 只查「真术式」：首行是头行（… { 或 De …）的块才检查顺序。
     文档里常把一个代码块用来并列对比几种写法，那种片段块没有头行，不查，免得误报。 */
  let firstLine = '';
  for (let k = 0; k < lines.length; k++) { if (lines[k].trim()) { firstLine = lines[k].trim(); break; } }
  const isSpell = !/^\s*class\b/.test(firstLine) && (/\{$/.test(firstLine) || /^De\b/.test(firstLine));   /* class 体不是术式的条款序列 */
  let lastRank = 0;
  let lastRankLine = 0;
  let li = 0;
  while (isSpell && li < lines.length) {
    const l = lines[li];
    if (!l.trim()) { li += 1; continue; }
    const r = clauseRank(l);
    if (r === 0) { li += 1; continue; }
    /* 新的头行（术式声明）—— 一个代码块里写两条术式时，次序序列各自从新开始 */
    if (r === 1 && lastRank >= 1) { lastRank = 1; lastRankLine = li + 1; li += 1; continue; }
    if (r < lastRank) {
      push('warn', li + 1, '条款次序：应为 载体制 → 对象 → 限制 → 代价 → 触发 → 效果 → 能量 → 协议（第 ' + lastRankLine + ' 行之后再出现更靠前的条款）');
      break;
    }
    lastRank = r;
    lastRankLine = li + 1;
    /* 只有以冒号开块的条款（limit : ／ keal … : ／ pretium :）才跳过它的缩进体；
       头行（… {）不跳 —— 块内的条款正是要检查的对象 */
    const opensBlock = /:[ \t]*$/.test(l.replace(/\/\*[\s\S]*?\*\//g, '').trim());
    const indent = lead(l);
    li += 1;
    while (opensBlock && li < lines.length) {
      const l2 = lines[li];
      if (!l2.trim()) { li += 1; continue; }
      if (lead(l2) > indent) { li += 1; continue; }
      if (/^[ \t]*[{}][ \t]*$/.test(l2)) { li += 1; continue; }
      break;
    }
  }

  /* 限制条款（limit）：写在块首的准入条件，每条都应当是比较式 */
  for (let i = 0; i < lines.length; i++) {
    const lm = /^([ \t]*)limit[ \t]*:(.*)$/.exec(lines[i]);
    if (!lm) continue;
    const base = lm[1].length;
    const items = [{ text: lm[2], line: i + 1 }];
    let j = i + 1;
    while (j < lines.length) {
      const l = lines[j];
      if (!l.trim()) { j += 1; continue; }
      const ind = (l.match(/^[ \t]*/) || [''])[0].length;
      if (ind <= base) break;
      items.push({ text: l, line: j + 1 });
      j += 1;
    }
    for (let k = 0; k < items.length; k++) {
      const body = items[k].text.replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!body) continue;
      /* 判定式有两种：符号比较式，或第三章定义的词形判定（aude／kon／aut／dis／ne 等） */
      const symbolCmp = /(<=|>=|==|!=|<|>)/.test(body);
      const wordCmp = /(^|[^A-Za-z_])(aude|kon|aut|dis|ne|vero|re|exo)([^A-Za-z_]|$)/.test(body);
      if (!symbolCmp && !wordCmp) {
        push('warn', items[k].line, '限制条款（limit）里的每一条都应当是判定式 —— 比较式（如 <= 66 miteas）或词形判定（aude 相等／kon 合取／aut 包含或／dis 互斥或／ne 否定）');
      }
    }
  }

  /* solum：不带意志谱，不得以施术者意志（voluntas）作连接条件 */
  for (let i = 0; i < lines.length; i++) {
    if (!/(^|[^A-Za-z_])solum([^A-Za-z_]|$)/.test(lines[i])) continue;
    /* 向上找最近的块开头，向下找配对的收尾 */
    let top = i;
    for (let j = i; j >= 0; j--) { if (/\{[ \t]*$/.test(lines[j].replace(/\/\*[\s\S]*?\*\//g, '').trimEnd())) { top = j; break; } }
    let depth = 0, bottom = lines.length - 1;
    for (let j = top; j < lines.length; j++) {
      const t = lines[j];
      for (let c = 0; c < t.length; c++) { if (t.charAt(c) === '{') depth += 1; else if (t.charAt(c) === '}') depth -= 1; }
      if (depth <= 0 && j >= top) { bottom = j; break; }
    }
    for (let j = top; j <= bottom; j++) {
      if (/^[ \t]*limit[ \t]*:/.test(lines[j]) && /(^|[^A-Za-z_])voluntas([^A-Za-z_]|$)/.test(lines[j])) {
        push('warn', j + 1, '声明了 solum 的术式不带意志谱：不能以施术者意志（voluntas）作为连接条件（代价在制作时付出，不受此限）');
      }
    }
  }

  /* 常数：写入后不可再赋值 */
  const constDecl = /(^|[;\n])[ \t]*(?:(?:priv|tut|publ)[ \t]+)?consta[ \t]+([A-Za-z_][A-Za-z0-9_]*)[ \t]*=(?!=)/g;
  const consts = [];
  let cdecl;
  while ((cdecl = constDecl.exec(text))) consts.push({ name: cdecl[2], line: text.slice(0, cdecl.index + (cdecl[1] || '').length).split('\n').length });
  for (let i = 0; i < consts.length; i++) {
    const again = new RegExp('(^|[;\\n])[ \\t]*(?:(?:priv|tut|publ|consta|om|tot)[ \\t]+)?' + consts[i].name + '[ \\t]*=(?!=)', 'g');
    let m2;
    while ((m2 = again.exec(text))) {
      const line = text.slice(0, m2.index + (m2[1] || '').length).split('\n').length;
      if (line > consts[i].line) {
        push('error', line, '常量「' + consts[i].name + '」在第 ' + consts[i].line + ' 行以 consta 声明，写入后不可再赋值');
        break;
      }
    }
  }

  /* 坐标串：~ 至少两轴（X、Z），^ 必须三轴 */
  const coordRe = /(?:~(?:[ \t]*[-+]?\d+(?:\.\d+)?)?)(?:[ \t]+~(?:[ \t]*[-+]?\d+(?:\.\d+)?)?)+|(?:\^(?:[ \t]*[-+]?\d+(?:\.\d+)?)?)(?:[ \t]+\^(?:[ \t]*[-+]?\d+(?:\.\d+)?)?)+/g;
  let cd;
  while ((cd = coordRe.exec(text))) {
    const line = text.slice(0, cd.index).split('\n').length;
    const c = parseCoord(cd[0]);
    if (c.values.length > 3) push('warn', line, '坐标最多三轴，这里写了 ' + c.values.length + ' 个');
    else if (c.sign === '^' && c.values.length !== 3) push('error', line, '局部坐标必须写全三轴（左／上／前），这里只有 ' + c.values.length + ' 个');
  }

  /* ③ 判断词要带块 */
  for (let i = 0; i < lines.length; i++) {
    const m = /^[ \t]*([A-Za-z_][A-Za-z0-9_]*)/.exec(lines[i]);
    if (!m || BRANCH_WORDS.indexOf(m[1].toLowerCase()) < 0) continue;
    if (lines[i].indexOf(':') < 0 && lines[i].indexOf('{') < 0) {
      push('warn', i + 1, '判断词「' + m[1] + '」要带块：行尾写冒号加缩进，或用花括号');
    }
  }

  /* ④ 数字后面跟的必须是登记过的单位 */
  for (let i = 0; i < lines.length; i++) {
    const re = /(\d)[ \t]*([A-Za-z_][A-Za-z0-9_]*)/g;
    let m;
    while ((m = re.exec(lines[i]))) {
      if (units.has(m[2].toLowerCase())) continue;
      const unitStart = m.index + m[0].length - m[2].length;
      push('warn', i + 1, '「' + m[1] + ' ' + m[2] + '」——' + m[2] + ' 不是登记过的单位', unitStart, unitStart + m[2].length);
    }
  }

  /* ⑤ 功率口径不得写锁存 */
  for (let i = 0; i < lines.length; i++) {
    const bare = lines[i].replace(/\/\*[\s\S]*?\*\//g, '');   /* 先去注释：注释里提「不写 luss」不算写 */
    if (/\bluss\b/i.test(bare) && /\b(MUW|EUW)\b/.test(bare)) {
      push('error', i + 1, '写 MUW／EUW 即持续发动（功率口径），不得再写 luss（锁存）');
    }
  }

  /* ⑥ 量约束说说明的是「?」声明的量 */
  for (let i = 0; i < lines.length; i++) {
    if (/\blic\s+(magis|minus)\b/i.test(lines[i]) && lines[i].indexOf('?') < 0) {
      push('warn', i + 1, '「lic magis／lic minus」用来说明由「?」声明的量可增／可减，这一行没有「?」');
    }
  }

  /* ⑦ 筛选键要登记；下标（秩）要在 1–9；筛选值不按秩解释 */
  const sq = /\[([^\]\n]*)\]/g;
  let b;
  while ((b = sq.exec(text))) {
    const before = text.slice(0, b.index);
    const line = before.split('\n').length;
    const inner = b[1];
    let back = b.index - 1;
    while (back >= 0 && /[ \t]/.test(text.charAt(back))) back -= 1;
    if (text.charAt(back) === '=') continue;
    const kind = classifySquare(inner);
    if (kind === '筛选键表') {
      const kr = /([A-Za-z_][A-Za-z0-9_]*)\s*=/g;
      let k;
      while ((k = kr.exec(inner))) {
        if (!keys.has(k[1].toLowerCase())) push('warn', line, '筛选键「' + k[1] + '」不在登记表里');
      }
    } else if (kind === '下标 · 秩') {
      const nums = inner.match(/\d+/g) || [];
      for (let n = 0; n < nums.length; n++) {
        const v = parseInt(nums[n], 10);
        if (v < 1 || v > 9) push('warn', line, '秩只有 1–9，这里的「' + nums[n] + '」超出范围');
      }
    }
  }
  /* ⑨ 术式引用：未登记 / 越权 / 形参不符 / consta 被改写 */
  /* 本块的 impo 名单：写进去的名字视为「他处定义」，不再报未登记 */
  const imported = [];
  for (let i = 0; i < lines.length; i++) {
    const im = /^[ \t]*impo[ \t]+([^;\n]*)/.exec(lines[i]);
    if (!im) continue;
    const names = im[1].split(',');
    for (let k = 0; k < names.length; k++) {
      const nm = names[k].trim();
      if (nm) imported.push(nm);
    }
  }
  const spells = (ctx && ctx.spells) || null;
  if (spells && spells.size) {
    const splitTop = function (s) {
      const out = [];
      let depth = 0, cur = '';
      for (let i = 0; i < s.length; i++) {
        const ch = s.charAt(i);
        if (ch === '(' || ch === '[' || ch === '{') depth += 1;
        else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
        if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
        cur += ch;
      }
      if (cur.trim()) out.push(cur);
      return out.map(function (x) { return x.trim(); }).filter(Boolean);
    };
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (/\{[ \t]*$/.test(trimmed)) continue;              /* 声明行（收在 { 上）不是引用 */
      if (/^\|/.test(trimmed) || /^\/\//.test(trimmed)) continue;  /* 表格行、注释行 */
      const callRe = /\b([A-Z][A-Za-z0-9_]*)[ \t]*\(/g;
      let m;
      while ((m = callRe.exec(raw))) {
        const name = m[1];
        if (raw.slice(Math.max(0, m.index - 2), m.index) === '::') continue;   /* 类成员调用，不是术式引用 */
        const rec = spells.get(name);
        if (!rec) {
          /* impo 声明过的：他处定义，本处只借签名（第十二章规则 12.6），不算未登记 */
          if (imported.indexOf(name) >= 0) continue;
          push('warn', i + 1, '引用了未登记的术式「' + name + '」—— 若它定义在他处，请在块首写 impo ' + name + ';');
          continue;
        }
        if (rec.visibility === 'priv' || rec.visibility === 'tut') {
          const sameFile = !ctx || !ctx.path || !rec.file || ctx.path === rec.file;
          const inside = sameFile && i + 1 >= rec.line && i + 1 <= rec.endLine;
          if (!inside) push('warn', i + 1, '「' + name + '」是 ' + rec.visibility + '，只允许在自己文件的语块内引用');
        }
        /* 取这次调用的实参 */
        const open = m.index + m[0].length - 1;
        let depth = 0, close = -1;
        for (let c = open; c < raw.length; c++) {
          const ch = raw.charAt(c);
          if (ch === '(') depth += 1;
          else if (ch === ')') { depth -= 1; if (depth === 0) { close = c; break; } }
        }
        if (close < 0) continue;
        const args = splitTop(raw.slice(open + 1, close));
        const params = rec.params || [];
        /* 只有显式 publ／consta 的形参才算「必须由调用方给出」；不写限定词的形参不苛求 */
        const required = params.filter(function (p) {
          const m = p.modifiers || [];
          return m.indexOf('publ') >= 0 || m.indexOf('consta') >= 0;
        }).length;
        if (args.length > params.length) push('warn', i + 1, '「' + name + '」形参 ' + params.length + ' 个，这里给了 ' + args.length + ' 个');
        else if (required > 0 && args.length < required) push('warn', i + 1, '「' + name + '」有必须给出的 publ／consta 形参（应 ' + required + ' 个，这里 ' + args.length + ' 个）');
        for (let a = 0; a < args.length; a++) {
          const lbl = /^([A-Za-z_][A-Za-z0-9_]*)[ \t]*:/.exec(args[a]);
          if (!lbl) continue;
          const hit = params.filter(function (p) { return p.name === lbl[1] && (p.modifiers || []).indexOf('priv') >= 0; })[0];
          if (hit) push('warn', i + 1, '「' + hit.name + '」是内部形参（priv），不该由调用方给出');
        }
      }
    }
    spells.forEach(function (rec, name) {
      if (rec.visibility === 'consta' && rec.duplicates && rec.duplicates.length) {
        push('warn', rec.line, '「' + name + '」是 consta，不能重复声明（另见第 ' +
          rec.duplicates.map(function (d) { return d.line; }).join('、') + ' 行）');
      }
    });
  }

  return issues;
}



module.exports = { BRANCH_WORDS, lintText };
