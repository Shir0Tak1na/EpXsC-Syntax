'use strict';

/* Pure spell declaration / parameter parsing. */

const MOD_WORDS = 'priv|tut|publ|consta';
function parseParamList(text) {
  const out = [];
  const s = String(text || '');
  const parts = [];
  let depth = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '[' || ch === '(' || ch === '{') depth += 1;
    else if (ch === ']' || ch === ')' || ch === '}') depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  const mods = '(?:(?:' + MOD_WORDS + ')[ \\t]+)*';
  const simple = new RegExp('^(' + mods + ')([A-Za-z_][A-Za-z0-9_]*)[ \\t]*:[ \\t]*(' + mods + ')([A-Za-z_][A-Za-z0-9_]*)$');
  const boxed = new RegExp('^(' + mods + ')([A-Za-z_][A-Za-z0-9_]*)[ \\t]*:[ \\t]*\\[[^\\]]*?([A-Za-z_][A-Za-z0-9_]*)[ \\t]*\\]$');
  const bare = new RegExp('^(' + mods + ')([A-Za-z_][A-Za-z0-9_]*)$');
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].trim();
    if (!p) continue;
    let m = simple.exec(p);
    if (m) {
      const list = ((m[1] || '') + ' ' + (m[3] || '')).trim().toLowerCase().split(/[ \t]+/).filter(Boolean);
      out.push({ type: m[2], name: m[4], modifiers: list });
      continue;
    }
    m = boxed.exec(p);
    if (m) {
      const list = (m[1] || '').trim().toLowerCase().split(/[ \t]+/).filter(Boolean);
      out.push({ type: m[2], name: m[3], container: true, modifiers: list });
      continue;
    }
    m = bare.exec(p);
    if (m) out.push({ name: m[2], modifiers: (m[1] || '').trim().toLowerCase().split(/[ \t]+/).filter(Boolean) });
    else out.push({ name: p, modifiers: [] });
  }
  return out;
}
function collectSpells(text, out, file) {
  const lines = String(text || '').split('\n');
  const decl = new RegExp('^(?:De\\b[^{;]*?)?\\s*((?:(?:' + MOD_WORDS + ')[ \\t]+)*)([A-Z][A-Za-z0-9_]*)\\s*\\(([^)]*)\\)[ \\t]*\\{');
  for (let i = 0; i < lines.length; i++) {
    const m = decl.exec(lines[i]);
    if (!m) continue;
    /* 花括号配对，取本术式的块范围 */
    let depth = 0, end = i, opened = false;
    for (let j = i; j < lines.length; j++) {
      const t = lines[j];
      for (let k = 0; k < t.length; k++) {
        if (t[k] === '{') { depth += 1; opened = true; }
        else if (t[k] === '}') depth -= 1;
      }
      if (opened && depth <= 0) { end = j; break; }
    }
    const mods = (m[1] || '').trim().toLowerCase().split(/[ \t]+/).filter(Boolean);
    const name = m[2];
    const rec = { name: name, visibility: mods.length ? mods[mods.length - 1] : '', modifiers: mods, params: parseParamList(m[3]), file: file, line: i + 1, endLine: end + 1 };
    if (out.has(name)) { const old = out.get(name); if (!old.duplicates) old.duplicates = []; old.duplicates.push(rec); }
    else out.set(name, rec);
  }
  return out;
}


module.exports = { MOD_WORDS, parseParamList, collectSpells };
