'use strict';

/*
 * Pure EpXsT / EpXsG parsing. No Obsidian, DOM or network.
 *
 * 2026-11-17: F2/F3/F4 foundation.
 * - translations are language-tagged lines: > (zh-CN) text
 * - legacy > text becomes the default translation
 * - a parenthetical that is not a valid BCP-47 subset is default text, not a tag
 */

const CJK_RE = /[\u3400-\u9fff]/;
const LANG_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|[0-9]{3}))?(?:-[A-Za-z0-9]{5,8})*$/;

function baseLang(tag) {
  const n = normalizeLang(tag);
  return n ? n.split('-')[0].toLowerCase() : '';
}

/* BCP-47 subset: language[-script][-region][-variant...] */
function normalizeLang(tag) {
  if (typeof tag !== 'string') return null;
  const raw = tag.trim();
  if (!raw || !LANG_RE.test(raw)) return null;
  const parts = raw.split('-').map(function (p) { return p.toLowerCase(); });
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
  while (i < parts.length) { out.push(parts[i]); i += 1; }
  return out.join('-');
}

/* Stable non-cryptographic hash for sentence cache keys. */
function stableHash(text) {
  const s = String(text || '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

function normalizeSource(text) {
  return String(text || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
}

function sourceHash(text) {
  return stableHash(normalizeSource(text));
}

function parseTranslationLine(raw) {
  let body = String(raw || '').replace(/^\s*>?\s?/, '');
  body = body.replace(/^\s+/, '');
  if (!body) return { lang: null, text: '', empty: true };
  /* -> \(it) is the escape for a default line that starts like a tag. */
  if (body.slice(0, 2) === '\\(') {
    return { lang: null, text: body.slice(1) };
  }
  const m = /^\(([^()]*)\)(?:\s+)?([\s\S]*)$/.exec(body);
  if (m) {
    const lang = normalizeLang(m[1]);
    if (lang) return { lang: lang, text: m[2] };
    /* Not a tag: keep the whole line as default text, do not discard it. */
    return { lang: null, text: body };
  }
  return { lang: null, text: body };
}

function parseTranslations(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = String(lines[i] || '');
    if (!/^\s*>/.test(raw)) continue;
    const t = parseTranslationLine(raw);
    if (t.empty) continue;
    out.push({ lang: t.lang, text: t.text, line: i + 1 });
  }
  return out;
}

function parseOrdLines(source) {
  const lines = String(source || '').replace(/\r/g, '').split('\n');
  const records = [];
  const warnings = [];
  let pending = null;

  function addTranslation(record, t) {
    if (!t.text) {
      warnings.push({ code: 'EMPTY_TRANSLATION', line: record.line, message: '空译文已忽略' });
      return;
    }
    if (t.lang === null) {
      if (record.defaultTranslation) warnings.push({ code: 'DUPLICATE_DEFAULT', line: record.line, message: '默认译文重复，最后一条生效' });
      record.defaultTranslation = t.text;
      return;
    }
    const old = record.translations.filter(function (x) { return x.lang === t.lang; })[0];
    if (old) warnings.push({ code: 'DUPLICATE_LANGUAGE', line: record.line, message: '语言 ' + t.lang + ' 的译文重复，最后一条生效' });
    record.translations = record.translations.filter(function (x) { return x.lang !== t.lang; });
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
      records.push({ kind: 'gap', line: i + 1 });
      continue;
    }
    if (t.charAt(0) === '>') {
      if (!pending) {
        warnings.push({ code: 'ORPHAN_TRANSLATION', line: i + 1, message: '译文行前面没有源句' });
        const orphan = {
          kind: 'line', line: i + 1, sourceLine: null, src: '', sourceHash: '',
          translations: [], defaultTranslation: ''
        };
        addTranslation(orphan, parseTranslationLine(raw));
        records.push(orphan);
        continue;
      }
      addTranslation(pending, parseTranslationLine(raw));
      continue;
    }
    /* Legacy: a CJK line directly after a source is a default translation. */
    if (pending && !pending.defaultTranslation && !pending.translations.length && CJK_RE.test(t)) {
      pending.defaultTranslation = t;
      continue;
    }
    flush();
    pending = {
      kind: 'line',
      line: i + 1,
      sourceLine: i + 1,
      src: t,
      sourceHash: sourceHash(t),
      translations: [],
      defaultTranslation: ''
    };
  }
  flush();
  return { records: records, warnings: warnings };
}

function matchTranslation(translations, lang) {
  if (!lang) return null;
  const exact = translations.filter(function (t) { return t.lang === lang; })[0];
  if (exact) return exact;
  const base = baseLang(lang);
  const sameBase = translations.filter(function (t) { return t.lang === base; })[0];
  if (sameBase) return sameBase;
  return translations.filter(function (t) { return baseLang(t.lang) === base; })[0] || null;
}

function pickTranslation(input) {
  const opts = input || {};
  const translations = opts.translations || [];
  const requested = normalizeLang(opts.requestedLanguage) || '';
  const fallback = normalizeLang(opts.fallbackLanguage) || '';
  const tryOrder = [];
  if (requested) { tryOrder.push(requested); if (baseLang(requested)) tryOrder.push(baseLang(requested)); }
  if (fallback) { tryOrder.push(fallback); if (baseLang(fallback)) tryOrder.push(baseLang(fallback)); }
  const seen = new Set();
  for (let i = 0; i < tryOrder.length; i++) {
    const lang = tryOrder[i];
    if (!lang || seen.has(lang)) continue;
    seen.add(lang);
    const hit = matchTranslation(translations, lang);
    if (hit) return { kind: 'human', lang: hit.lang, text: hit.text };
  }
  if (opts.defaultTranslation) return { kind: 'default', lang: null, text: opts.defaultTranslation };
  return { kind: 'untranslated', lang: null, text: '' };
}

module.exports = {
  normalizeLang, baseLang, parseTranslationLine, parseTranslations,
  parseOrdLines, pickTranslation, stableHash, sourceHash
};
