#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../src/core/index.js');

const USAGE = `EpXsC CLI (Obsidian-free core)

Usage:
  epxsc tokenize <file> [--json]
  epxsc lint <file> [--json] [--dictionary <md>] [--syntax <md>]
  epxsc --help

Options:
  --json               print machine-readable JSON
  --dictionary <file>  parse a dictionary markdown for hover/lint context
  --syntax <file>      parse grammar filter keys / units for lint context
`;

function fail(message) {
  console.error('epxsc: ' + message);
  process.exitCode = 1;
}

function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch (e) { throw new Error('cannot read ' + file + ': ' + e.message); }
}

function parseArgs(argv) {
  const opts = { json: false, dict: null, syntax: null, file: null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--dictionary') opts.dict = argv[++i];
    else if (a === '--syntax') opts.syntax = argv[++i];
    else if (a === '--help' || a === '-h') opts.help = true;
    else rest.push(a);
  }
  opts.command = rest[0] || '';
  opts.file = rest[1] || '';
  return opts;
}

function listsFromDictionary(dictText) {
  const map = core.splitSections(dictText);
  return {
    keyword: core.wordsFrom(map, core.SECTIONS.keyword, core.FALLBACK.keyword),
    judge: core.wordsFrom(map, core.SECTIONS.judge, core.FALLBACK.judge),
    clause: core.wordsFrom(map, core.SECTIONS.clause, core.FALLBACK.clause),
    degree: core.wordsFrom(map, core.SECTIONS.degree, core.FALLBACK.degree),
    predicate: core.wordsFrom(map, core.SECTIONS.predicate, core.FALLBACK.predicate),
    unit: core.wordsFrom(map, core.SECTIONS.unit, core.FALLBACK.unit)
  };
}

function tokenizeCommand(opts) {
  if (!opts.file) return fail('tokenize needs a file');
  const text = read(opts.file);
  const blocks = core.extractBlocks(text);
  const list = blocks.length ? blocks : [{ line: 1, source: text }];
  const lists = opts.dict ? listsFromDictionary(read(opts.dict)) : core.BASE_LISTS;
  const grammar = core.buildGrammar(lists, []);
  const out = list.map((block) => ({ line: block.line, html: core.tokenize(block.source, grammar) }));
  if (opts.json) console.log(JSON.stringify({ file: opts.file, blocks: out }, null, 2));
  else {
    for (const block of out) {
      console.log('<!-- line ' + block.line + ' -->');
      console.log(block.html);
    }
  }
}

function buildContext(opts, blocks) {
  const info = new Map();
  const units = new Set(core.BASE_LISTS.unit.map(function (u) { return String(u).toLowerCase(); }));
  const keys = new Set();
  const spells = new Map();
  if (opts.dict) {
    core.parseDictionary(read(opts.dict)).forEach(function (v, k) { info.set(k, v); });
  }
  if (opts.syntax) {
    const syntax = read(opts.syntax);
    core.parseFilterKeys(syntax).forEach(function (v, k) { keys.add(String(k).toLowerCase()); info.set(k, v); });
    core.parseUnits(syntax).forEach(function (v, k) { units.add(String(k).toLowerCase()); info.set(k, v); });
  }
  for (const block of blocks) core.collectSpells(block.source, spells, opts.file);
  return { info, units, keys, spells, path: opts.file };
}

function lintCommand(opts) {
  if (!opts.file) return fail('lint needs a file');
  const text = read(opts.file);
  const blocks = core.extractBlocks(text);
  if (!blocks.length) return fail('no EpXsC fenced blocks found in ' + opts.file);
  const ctx = buildContext(opts, blocks);
  const issues = [];
  for (const block of blocks) {
    for (const issue of core.lint(block.source, ctx)) issues.push({ level: issue.level, line: block.line + issue.line, message: issue.message });
  }
  if (opts.json) console.log(JSON.stringify({ file: opts.file, blocks: blocks.length, issues }, null, 2));
  else if (!issues.length) console.log('OK: ' + blocks.length + ' EpXsC block(s), no issues');
  else for (const it of issues) console.log(it.level + ' line ' + it.line + ': ' + it.message);
  if (issues.some((i) => i.level === 'error')) process.exitCode = 1;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help || !opts.command) {
  console.log(USAGE);
  process.exitCode = opts.help ? 0 : 1;
} else if (opts.command === 'tokenize') {
  tokenizeCommand(opts);
} else if (opts.command === 'lint') {
  lintCommand(opts);
} else {
  fail('unknown command: ' + opts.command);
  console.log(USAGE);
}
