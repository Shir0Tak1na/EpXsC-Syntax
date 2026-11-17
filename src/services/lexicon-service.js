'use strict';

/* Vault lexicon loading + merge + fallback. Pure service: file I/O is injected. */

const { FALLBACK, SECTIONS, splitSections, parseEntries, parseRanks, parseFilterKeys, parseUnits, parseRoots, wordsFrom } = require('../data/parsers.js');
const { buildSpellRegistry } = require('./spell-registry.js');
const { mergeDictionaries } = require('../core/lexicon/merge.js');

function parseJsonDictionary(text) {
  const obj = JSON.parse(text);
  const root = (obj && (obj.entries || obj.words)) || obj || {};
  const out = new Map();
  for (const key in root) {
    if (!Object.prototype.hasOwnProperty.call(root, key)) continue;
    const v = root[key];
    const word = (v && typeof v === 'object' && v.word) ? String(v.word) : String(key);
    const entry = (v && typeof v === 'object')
      ? { word: word, pos: String(v.pos || v.posName || ''), meaning: String(v.meaning || v.definition || ''), abbr: String(v.abbr || '') }
      : { word: word, pos: '', meaning: String(v || ''), abbr: '' };
    if (entry.meaning) out.set(String(key).toLowerCase(), entry);
  }
  return out;
}

function builtinMap(builtin, part) {
  const out = new Map();
  const source = (builtin[part] || {});
  for (const key in source) {
    const v = source[key];
    out.set(key, { word: v[0], pos: v[1], meaning: v[2], abbr: v[3] || '' });
  }
  return out;
}

function builtinRanks(builtin) {
  const out = new Map();
  const source = (builtin.ranks || {});
  for (const key in source) out.set(key, source[key]);
  return out;
}

function builtinRoots(builtin) {
  const out = new Map();
  const source = (builtin.roots || {});
  for (const key in source) out.set(key, { word: source[key][2] || key, pos: '词根·' + source[key][1], meaning: source[key][0], kind: source[key][1] });
  return out;
}

function builtinLists(builtin, verbRoots) {
  const bySection = {};
  const e = (builtin.entries || {});
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
  map.forEach(function (value, key) { if (!target.has(key)) target.set(key, value); });
}

async function buildLexiconSnapshot(io, config, builtin, extraWords, options) {
  const info = new Map();
  for (const w in extraWords) info.set(w, extraWords[w]);
  const roots = new Map();
  const extraUnits = [];
  const keyWords = new Set();
  let lists = null;
  let ranks = new Map();

  try {
    const dictText = await io.readFile(config.DICT_PATH);
    if (dictText !== null && dictText !== undefined) {
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
      mergeInto(info, builtinMap(builtin, 'entries'));
    }

    const syntaxText = await io.readFile(config.SYNTAX_PATH);
    if (syntaxText !== null && syntaxText !== undefined) {
      const keyMap = parseFilterKeys(syntaxText);
      mergeInto(info, keyMap);
      keyMap.forEach(function (v, k) { keyWords.add(String(k).toLowerCase()); });
      const unitMap = parseUnits(syntaxText);
      mergeInto(info, unitMap);
      unitMap.forEach(function (v) { extraUnits.push(v.word); });
    } else {
      const keyMap = builtinMap(builtin, 'keys');
      mergeInto(info, keyMap);
      keyMap.forEach(function (v, k) { keyWords.add(String(k).toLowerCase()); });
      mergeInto(info, builtinMap(builtin, 'units'));
    }

    const rankText = await io.readFile(config.RANK_PATH);
    ranks = rankText !== null && rankText !== undefined ? parseRanks(rankText) : builtinRanks(builtin);

    const rootFiles = await io.listMarkdown(config.ROOTS_DIR);
    if (rootFiles && rootFiles.length) {
      for (let i = 0; i < rootFiles.length; i++) {
        mergeInto(roots, parseRoots(await io.readFile(rootFiles[i])));
      }
    } else {
      mergeInto(roots, builtinRoots(builtin));
    }
    roots.forEach(function (v, k) { if (v.kind === '动' || !info.has(k)) info.set(k, v); });
  } catch (err) {
    if (io.warn) io.warn(err);
    mergeInto(info, builtinMap(builtin, 'entries'));
    mergeInto(info, builtinMap(builtin, 'keys'));
    mergeInto(info, builtinMap(builtin, 'units'));
    mergeInto(roots, builtinRoots(builtin));
    roots.forEach(function (v, k) { if (v.kind === '动' || !info.has(k)) info.set(k, v); });
    if (!ranks.size) ranks = builtinRanks(builtin);
  }

  /* 2.1.0: custom dictionaries override default/builtin, whole-entry, with conflict report. */
  const customPaths = (options && Array.isArray(options.customDictPaths))
    ? options.customDictPaths
    : ((config && Array.isArray(config.CUSTOM_DICT_PATHS)) ? config.CUSTOM_DICT_PATHS : []);
  const customLayers = [];
  const customErrors = [];
  const customSectionWords = { keyword: [], judge: [], clause: [], degree: [], predicate: [], unit: [] };
  for (let ci = 0; ci < customPaths.length; ci++) {
    const cpath = customPaths[ci];
    try {
      const ctext = await io.readFile(cpath);
      if (ctext === null || ctext === undefined) {
        customErrors.push({ path: cpath, code: 'MISSING', message: '自定义词库不存在' });
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
      unitMap.forEach(function (v) { extraUnits.push(v.word); customSectionWords.unit.push(v.word); });
    } catch (e) {
      customErrors.push({ path: cpath, code: 'READ_ERROR', message: String(e && e.message || e) });
      if (io.warn) io.warn(e);
    }
  }
  const merged = mergeDictionaries(info, customLayers);
  info.clear();
  merged.dictionary.forEach(function (v, k) { info.set(k, v); });


  const verbRoots = [];
  roots.forEach(function (v) { if (v.kind === '动') verbRoots.push(v.word); });
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

  let spells = new Map();
  try {
    const spellFiles = (await io.listMarkdown(config.SPELL_DIR)) || [];
    const syntaxText = await io.readFile(config.SYNTAX_PATH);
    if (syntaxText !== null && syntaxText !== undefined) spellFiles.push(config.SYNTAX_PATH);
    const sources = [];
    for (let i = 0; i < spellFiles.length; i++) {
      sources.push({ path: spellFiles[i], text: await io.readFile(spellFiles[i]) });
    }
    spells = buildSpellRegistry(sources);
  } catch (err) {
    if (io.warn) io.warn(err);
  }

  const units = new Set();
  for (let i = 0; i < lists.unit.length; i++) units.add(String(lists.unit[i]).toLowerCase());
  const keys = new Set();
  keyWords.forEach(function (k) { keys.add(String(k).toLowerCase()); });
  info.forEach(function (v, k) { if (v.pos === '筛选键') keys.add(String(k).toLowerCase()); });

  return { info, roots, ranks, units, keys, lists, spells, keyWords, lexiconVersion: (builtin && builtin.lexiconVersion) || '', dictionaryConflicts: merged.conflicts, customDictionaryErrors: customErrors };
}

module.exports = { buildLexiconSnapshot, builtinLists };
