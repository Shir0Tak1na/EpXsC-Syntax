'use strict';

/* Built-in lexicon snapshot loader / schema gate. Pure: no Obsidian, no DOM. */

const SCHEMA_VERSION = 1;
const SECTIONS = ['entries', 'roots', 'units', 'ranks', 'keys'];

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function emptyLexicon() {
  return { entries: {}, roots: {}, units: {}, ranks: {}, keys: {} };
}

function loadBuiltinLexicon(raw) {
  if (!isObject(raw)) return { ok: false, reason: 'snapshot is not an object', data: emptyLexicon() };
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, reason: 'unsupported schemaVersion: ' + String(raw.schemaVersion), data: emptyLexicon() };
  }
  if (typeof raw.lexiconVersion !== 'string' || !raw.lexiconVersion) {
    return { ok: false, reason: 'missing lexiconVersion', data: emptyLexicon() };
  }
  if (typeof raw.generatedAt !== 'string' || !raw.generatedAt) {
    return { ok: false, reason: 'missing generatedAt', data: emptyLexicon() };
  }
  for (let i = 0; i < SECTIONS.length; i++) {
    const name = SECTIONS[i];
    if (!isObject(raw[name])) {
      return { ok: false, reason: 'missing object section: ' + name, data: emptyLexicon() };
    }
  }
  return { ok: true, reason: '', data: raw };
}

module.exports = { SCHEMA_VERSION, SECTIONS, emptyLexicon, loadBuiltinLexicon };
