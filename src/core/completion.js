'use strict';

/* Pure offline completion candidates. No Obsidian, no model. */

function normalizePrefix(prefix) {
  return String(prefix || '').trim().toLowerCase();
}

function wordCandidates(info, prefix, limit) {
  const p = normalizePrefix(prefix);
  const max = Number(limit) > 0 ? Number(limit) : 40;
  const out = [];
  if (!info || typeof info.forEach !== 'function') return out;
  info.forEach(function (entry, word) {
    if (!word) return;
    if (p && String(word).toLowerCase().indexOf(p) !== 0) return;
    out.push({
      kind: 'word',
      word: String(word),
      pos: entry && entry.pos ? String(entry.pos) : '',
      meaning: entry && entry.meaning ? String(entry.meaning) : '',
      abbr: entry && entry.abbr ? String(entry.abbr) : ''
    });
  });
  out.sort(function (a, b) {
    if (a.word.length !== b.word.length) return a.word.length - b.word.length;
    return a.word < b.word ? -1 : a.word > b.word ? 1 : 0;
  });
  return out.slice(0, max);
}

function grammarCandidates(grammar, prefix, limit) {
  const p = normalizePrefix(prefix);
  const max = Number(limit) > 0 ? Number(limit) : 20;
  const out = [];
  if (!grammar) return out;
  const lists = grammar.lists || grammar;
  const keys = ['keyword', 'judge', 'predicate', 'function', 'unit', 'element', 'modifier', 'degree', 'axis'];
  for (let i = 0; i < keys.length; i++) {
    const list = lists[keys[i]] || [];
    for (let j = 0; j < list.length; j++) {
      const w = String(list[j] || '');
      if (!w) continue;
      if (p && w.toLowerCase().indexOf(p) !== 0) continue;
      out.push({ kind: 'grammar', word: w, pos: keys[i], meaning: '', abbr: '' });
    }
  }
  return out.slice(0, max);
}

function wordAt(text, cursorColumn) {
  const line = String(text || '');
  const col = Math.max(0, Math.min(Number(cursorColumn) || 0, line.length));
  let start = col;
  while (start > 0 && /[A-Za-z0-9_-]/.test(line.charAt(start - 1))) start -= 1;
  let end = col;
  while (end < line.length && /[A-Za-z0-9_-]/.test(line.charAt(end))) end += 1;
  return { start: start, end: end, prefix: line.slice(start, col) };
}

module.exports = { wordCandidates, grammarCandidates, wordAt };
