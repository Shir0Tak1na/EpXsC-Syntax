import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const nodeRequire = createRequire(import.meta.url);
const blockCore = nodeRequire('../src/core/markdown-blocks.js');
const parserCore = nodeRequire('../src/data/parsers.js');
const spellsCore = nodeRequire('../src/core/spells.js');
const lintCore = nodeRequire('../src/core/lint.js');
const grammarCore = nodeRequire('../src/core/grammar.js');
const tokenizerCore = nodeRequire('../src/core/tokenizer.js');
const markupCore = nodeRequire('../src/core/markup.js');
const coreIndex = nodeRequire('../src/core/index.js');
const builtinLexicon = nodeRequire('../data/builtin-lexicon.json');
const lexiconCore = nodeRequire('../src/data/lexicon.js');
const { RefreshScheduler } = nodeRequire('../src/services/refresh-scheduler.js');
const { buildLexiconSnapshot, builtinLists: serviceBuiltinLists } = nodeRequire('../src/services/lexicon-service.js');
const { buildSpellRegistry } = nodeRequire('../src/services/spell-registry.js');
const { lintSource } = nodeRequire('../src/services/lint-service.js');
const { renderEpXsC } = nodeRequire('../src/renderers/epxsc-renderer.js');
const tooltipCore = nodeRequire('../src/ui/tooltip.js');
const { parseOrdBlocks } = nodeRequire('../src/renderers/ord-renderer.js');
const settingsCore = nodeRequire('../src/core/settings.js');
const mergeCore = nodeRequire('../src/core/lexicon/merge.js');
const translationCore = nodeRequire('../src/core/translation/request.js');
const translationPrompt = nodeRequire('../src/core/translation/prompt.js');
const { createOpenAICompatibleProvider } = nodeRequire('../src/providers/openai-compatible.js');
const { createTranslationService } = nodeRequire('../src/services/translation-service.js');
const referenceCore = nodeRequire('../src/core/translation/reference.js');
const redactCore = nodeRequire('../src/core/translation/redact.js');
const explainCore = nodeRequire('../src/core/assistance/explain.js');
const { createAssistanceService } = nodeRequire('../src/services/assistance-service.js');
const completionCore = nodeRequire('../src/core/completion.js');
const { createReferenceService } = nodeRequire('../src/services/reference-service.js');
const ordParse = nodeRequire('../src/core/ord/parse.js');

const source = fs.readFileSync('src/adapter/plugin.js', 'utf8');
const adapterConfig = fs.readFileSync('src/adapter/config.js', 'utf8');
const adapterConfigModule = nodeRequire('../src/adapter/config.js');
const obsidianStub = {
  Plugin: class {}, TFile: class {}, TFolder: class {}, MarkdownView: class {},
  Notice: class {}, Modal: class {}
};
const sandbox = {
  require: (name) => {
    if (name === 'obsidian') return obsidianStub;
    if (String(name).includes('markdown-blocks')) return blockCore;
    if (String(name).includes('data/parsers')) return parserCore;
    if (String(name).includes('core/spells')) return spellsCore;
    if (String(name).includes('core/lint')) return lintCore;
    if (String(name).includes('core/grammar')) return grammarCore;
    if (String(name).includes('core/tokenizer')) return tokenizerCore;
    if (String(name).includes('core/markup')) return markupCore;
    if (String(name).includes('builtin-lexicon')) return builtinLexicon;
    if (String(name).includes('data/lexicon')) return lexiconCore;
    if (String(name).includes('services/lexicon-service')) return nodeRequire('../src/services/lexicon-service.js');
    if (String(name).includes('ui/lint-modal')) return { LintModal: class {} };
    if (String(name).includes('ui/diagnostics')) return { diagnose: async () => '', selfCheck: () => {} };
    if (String(name).includes('ui/tooltip')) return tooltipCore;
    if (String(name).includes('renderers/ord-dom')) return nodeRequire('../src/renderers/ord-dom.js');
    return {};
  },
  module: { exports: {} },
  exports: {},
  console,
  window: { setTimeout, clearTimeout, setInterval, clearInterval },
  document: { hidden: false },
  setTimeout, clearTimeout, setInterval, clearInterval
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'main.js' });

const { tipForElement } = sandbox;
const builtinLists = (verbRoots) => serviceBuiltinLists(builtinLexicon, verbRoots);
const { makeGrammar } = grammarCore;
const { tokenizeText } = tokenizerCore;
const { parseVarTypes, bracketKinds, markBracketDepth } = markupCore;
const { collectSpells } = spellsCore;
const { lintText } = lintCore;
const { parseEntries, parseRoots, parseFilterKeys } = parserCore;
const { extractEpXsCBlocks } = blockCore;

// 1) 代码围栏别名 + CRLF + 前导空格
const blocks = extractEpXsCBlocks('x\n```epxsc\r\nA()\r\n```\r\n\n```EPXSC\nB()\n```\n');
assert.equal(blocks.length, 2, 'should find both alias blocks');
assert.equal(blocks[0].line, 2, 'fence line should be 2');
assert.equal(blocks[0].source.trim(), 'A()');

// 2) 术式声明记录文件/范围
const spells = new Map();
collectSpells('priv PrivA(locus: zone) {\n\tluss 1 MU;\n}\n', spells, 'a.md');
const rec = spells.get('PrivA');
assert.ok(rec, 'spell should be collected');
assert.equal(rec.file, 'a.md');
assert.equal(rec.visibility, 'priv');
assert.equal(rec.line, 1);
assert.equal(rec.endLine, 3);

// 3) 同一文件、同一范围：不报越权
const ctxA = { info: new Map(), units: new Set(), keys: new Set(), spells, path: 'a.md' };
const issuesA = lintText('PrivA();', ctxA);
assert.ok(!issuesA.some(x => String(x.message).includes('priv')), 'same-file call must not warn');

// 4) 不同文件、相同行号：必须报越权
const ctxB = { info: new Map(), units: new Set(), keys: new Set(), spells, path: 'b.md' };
const issuesB = lintText('PrivA();', ctxB);
assert.ok(issuesB.some(x => String(x.message).includes('私') || String(x.message).includes('priv')), 'cross-file call must warn');

// 5) Tokenizer golden：关键词 / 单位
const grammar = makeGrammar(builtinLists([]), []);
const html = tokenizeText('1 MU', grammar);
assert.ok(html.includes('token number'), '1 should tokenize as number');
assert.ok(html.includes('token unit'), 'MU should tokenize as unit');

// 6) Linter 括号错误
const bracketIssues = lintText('Foo() {', { info: new Map(), units: new Set(), keys: new Set(), spells: new Map() });
assert.ok(bracketIssues.some(x => x.level === 'error'), 'unclosed brace must be an error');
const rangeIssue = bracketIssues.find(x => x.message.includes('没有闭合'));
assert.ok(rangeIssue && rangeIssue.start === 6 && rangeIssue.end === 7, 'unclosed brace range must point at {');
const extraBracket = lintText(')', { info: new Map(), units: new Set(), keys: new Set(), spells: new Map() });
assert.ok(extraBracket.length >= 1 && extraBracket[0].start === 0 && extraBracket[0].end === 1, 'extra bracket range must point at )');

// 7) 数据 parser 冒烟
const entries = parseEntries('## 介词\n| de | 在……之内 | dex |\n');
assert.equal(entries.get('de').meaning, '在……之内');
const roots = parseRoots('| agr | 田地 | agr | 物 | 物 |\n');
assert.equal(roots.get('agr').kind, '物');
const keys = parseFilterKeys('## 筛选键\n| genus | 类别 |\n');
assert.ok(keys.has('genus'));

// 8) 悬停路径冒烟：CLASS_ORDER / pickClass 必须存在
const fakeToken = {
  classList: { contains: (c) => c === 'word' },
  textContent: 'test',
  getAttribute: () => null,
  closest: () => null
};
const hoverTip = tipForElement(fakeToken, new Map(), new Map());
assert.ok(hoverTip && hoverTip.label, 'hover must return a tip for a known token class');
const knownTip = tipForElement({
  classList: { contains: (c) => c === 'word' },
  textContent: 'de',
  getAttribute: () => null,
  closest: () => null
}, new Map([['de', { pos: '介词', meaning: '在……之内', abbr: 'dex' }]]), new Map());
assert.ok(knownTip && knownTip.label, 'hover must return a glossary tip for a known word');

// 9) markup 纯函数
const vars = parseVarTypes('Foo(locus: a) {\n}', new Map());
assert.equal(vars.get('a').type, 'locus');
const kinds = bracketKinds('Foo(a)');
assert.equal(kinds[0], '参数表');
assert.ok(markBracketDepth('<span class="token paren">(</span>', []).includes('epx-d1'));

// 10a) 内置词库快照独立 JSON
assert.equal(builtinLexicon.schemaVersion, 1, 'builtin schemaVersion');
assert.ok(builtinLexicon.entries && Object.keys(builtinLexicon.entries).length > 400, 'builtin entries snapshot');
assert.ok(builtinLexicon.roots && Object.keys(builtinLexicon.roots).length > 5000, 'builtin roots snapshot');
assert.ok(builtinLexicon.units && Object.keys(builtinLexicon.units).length > 0, 'builtin units snapshot');
assert.ok(builtinLexicon.ranks && Object.keys(builtinLexicon.ranks).length > 0, 'builtin ranks snapshot');

// 10b) 快照 schema gate：不兼容版本/缺 section 必须回退为空表，不抛错
const okSnap = lexiconCore.loadBuiltinLexicon(builtinLexicon);
assert.equal(okSnap.ok, true, 'valid snapshot should load');
const badSchema = lexiconCore.loadBuiltinLexicon(Object.assign({}, builtinLexicon, { schemaVersion: 999 }));
assert.equal(badSchema.ok, false, 'unknown schema must be rejected');
assert.equal(Object.keys(badSchema.data.entries).length, 0, 'rejected snapshot must fall back to empty maps');
const missingSection = lexiconCore.loadBuiltinLexicon({ schemaVersion: 1, entries: {}, roots: {}, units: {}, ranks: {} });
assert.equal(missingSection.ok, false, 'missing section must be rejected');
const missingMeta = lexiconCore.loadBuiltinLexicon(Object.assign({}, builtinLexicon, { lexiconVersion: '' }));
assert.equal(missingMeta.ok, false, 'missing lexiconVersion must be rejected');
const missingDate = lexiconCore.loadBuiltinLexicon(Object.assign({}, builtinLexicon, { generatedAt: '' }));
assert.equal(missingDate.ok, false, 'missing generatedAt must be rejected');
assert.ok(source.includes('loadBuiltinLexicon'), 'adapter must use schema gate');

// 10) public core aliases
assert.equal(typeof coreIndex.extractBlocks, 'function');
assert.equal(typeof coreIndex.parseDictionary, 'function');
assert.equal(typeof coreIndex.buildGrammar, 'function');
assert.equal(typeof coreIndex.tokenize, 'function');
assert.equal(typeof coreIndex.lint, 'function');

// 11) 历史 bug 静态回归（由真实事故固化）
const tokenizerSrc = fs.readFileSync('src/core/tokenizer.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');
const snippetCss = fs.readFileSync('snippets/EpXsC-Highlight.css', 'utf8');
assert.ok(source.includes('__epxOrd'), 'T/G refresh regression: ordinal source marker must exist');
assert.ok(source.includes("querySelectorAll('.epx-ord-wrap')"), 'T/G refresh regression: rehighlight must revisit ordinal blocks');
assert.ok(source.includes("classList.add('epx-pre')"), 'C border regression: plugin must add epx-pre class');
assert.ok(css.includes('pre.epx-pre'), 'C border regression: epx-pre selector must outrank theme pre');
assert.ok(!/pre:has\(/.test(css), 'C border regression: do not reintroduce pre:has');
assert.ok(css.includes('border-left: 3px solid var(--text-accent)'), 'C border regression: left accent border must exist');
assert.equal(css, snippetCss, 'styles.css and snippet must stay byte-identical');
const tooltipSrc = fs.readFileSync('src/ui/tooltip.js', 'utf8');
assert.ok(tooltipSrc.includes('const CLASS_ORDER'), 'hover regression: CLASS_ORDER must stay in tooltip module');
assert.ok(tooltipSrc.includes('const EXTRA_WORDS'), 'onload regression: EXTRA_WORDS must stay in tooltip data module');
assert.ok(tooltipSrc.includes('const SECTION_POS'), 'hover regression: SECTION_POS must stay in tooltip module');
assert.ok(tooltipSrc.includes('const TYPE_NOTES'), 'hover regression: TYPE_NOTES must stay in tooltip module');
assert.ok(tooltipSrc.includes('const SYMBOL_INFO'), 'hover regression: SYMBOL_INFO must stay in tooltip module');
assert.ok(adapterConfig.includes('const SPELL_DIR'), 'extraction regression: SPELL_DIR must stay in adapter config');
assert.ok(adapterConfig.includes('const MAX_HIGHLIGHT_LINES'), 'extraction regression: MAX_HIGHLIGHT_LINES must stay in adapter config');
assert.equal(adapterConfigModule.SPELL_DIR, '世界设定集/设定概念集合/魔法');
assert.equal(adapterConfigModule.MAX_HIGHLIGHT_LINES, 50);
assert.ok(!tokenizerSrc.includes('CLASS_ORDER'), 'tokenizer must not own CLASS_ORDER');
assert.ok(!tokenizerSrc.includes('SYMBOL_INFO'), 'tokenizer must not own SYMBOL_INFO');
assert.ok(!tokenizerSrc.includes('SPELL_DIR'), 'tokenizer must not own SPELL_DIR');

// 12) RefreshScheduler debounce / cancel（注入假定时器）
{
  let calls = 0;
  const timers = new Map();
  let id = 0;
  const scheduler = new RefreshScheduler(() => { calls += 1; }, 300, {
    setTimeout: (fn) => { id += 1; timers.set(id, fn); return id; },
    clearTimeout: (timer) => { timers.delete(timer); }
  });
  scheduler.request();
  scheduler.request();
  assert.equal(timers.size, 1, 'rescheduling must keep only one timer');
  const only = Array.from(timers.values())[0];
  timers.clear();
  only();
  assert.equal(calls, 1, 'one debounced run');
  scheduler.request();
  scheduler.cancel();
  assert.equal(timers.size, 0, 'cancel must clear timer');
  assert.equal(scheduler.pending(), false);
  assert.ok(source.includes('RefreshScheduler'), 'adapter must use RefreshScheduler');
}

// 13) LexiconService：完整来源 + 全缺回退
{
  const cfg = { DICT_PATH: 'dict.md', SYNTAX_PATH: 'syntax.md', RANK_PATH: 'rank.md', ROOTS_DIR: 'roots/', SPELL_DIR: 'spells/' };
  const files = {
    'dict.md': '## 介词\n| de | 在……之内 | dex |\n## 单位\n| MU | 魔力 | MU |\n',
    'syntax.md': '## 筛选键\n| genus | 类别 |\n## 六、单位\n| MU | 魔力 | MU | 锁存 |\n',
    'rank.md': '## 九个秩与维度的对应\n| 1 | 存在 | 位置 |\n',
    'roots/a.md': '| agr | 田地 | agr | 名 | 名 |\n',
    'spells/a.md': 'PublA(publ locus: a) {\n}\n'
  };
  const io = {
    readFile: async (p) => Object.prototype.hasOwnProperty.call(files, p) ? files[p] : null,
    listMarkdown: async (dir) => Object.keys(files).filter((p) => p.indexOf(dir) === 0)
  };
  const snap = await buildLexiconSnapshot(io, cfg, builtinLexicon, {});
  assert.equal(snap.info.get('de').meaning, '在……之内');
  assert.ok(snap.keys.has('genus'));
  assert.ok(snap.units.has('mu'));
  assert.equal(snap.ranks.size, 1);
  assert.ok(snap.roots.has('agr'));
  assert.ok(snap.spells.has('PublA'));
  assert.ok(snap.lists.keyword.includes('de'));

  const missing = await buildLexiconSnapshot({
    readFile: async () => null,
    listMarkdown: async () => []
  }, cfg, builtinLexicon, {});
  assert.ok(missing.info.size > 400, 'missing sources must use builtin snapshot');
  assert.ok(missing.roots.size > 5000, 'missing roots must use builtin snapshot');
  assert.ok(missing.lists.unit.length > 0, 'missing units must use builtin lists');
}

// 13b) F7 settings normalization and custom dictionary merge
{
  const defaults = settingsCore.normalizeSettings(undefined);
  assert.deepEqual(defaults.lexicon.customPaths, []);
  assert.equal(defaults.display.language, 'auto');
  assert.equal(defaults.diagnostics.enabled, true);
  assert.equal(defaults.diagnostics.editorDecorations, false);
  assert.equal(defaults.assistance.enabled, false);
  const diagOff = settingsCore.normalizeSettings({ diagnostics: { enabled: false, editorDecorations: true } });
  assert.equal(diagOff.diagnostics.enabled, false);
  assert.equal(diagOff.diagnostics.editorDecorations, true);
  const normalized = settingsCore.normalizeSettings({
    lexicon: { customPaths: ['  a.md ', 'a.md', '', 'b.md'] },
    display: { language: 'zh-cn', fallbackLanguage: ' en ' }
  });
  assert.deepEqual(normalized.lexicon.customPaths, ['a.md', 'b.md']);
  assert.equal(normalized.display.language, 'zh-cn');
  assert.equal(normalized.display.fallbackLanguage, 'en');

  const base = new Map([['de', { word: 'de', pos: '介词', meaning: '在……之内', abbr: 'dex' }]]);
  const merged = mergeCore.mergeDictionaries(base, [
    { name: 'custom.md', entries: new Map([['de', { word: 'de', pos: '介词', meaning: '自定义', abbr: 'dex' }]]) }
  ]);
  assert.equal(merged.dictionary.get('de').meaning, '自定义');
  assert.equal(merged.conflicts.length, 1);
  assert.equal(merged.conflicts[0].source, 'custom.md');

  const cfg = { DICT_PATH: 'dict.md', SYNTAX_PATH: 'syntax.md', RANK_PATH: 'rank.md', ROOTS_DIR: 'roots/', SPELL_DIR: 'spells/' };
  const files = {
    'dict.md': '## 介词\n| de | 在……之内 | dex |\n',
    'syntax.md': '## 筛选键\n| genus | 类别 |\n',
    'rank.md': '## 九个秩与维度的对应\n| 1 | 存在 | 位置 |\n',
    'custom.md': '## 介词\n| de | 自定义 | dex |\n'
  };
  const io = {
    readFile: async (p) => Object.prototype.hasOwnProperty.call(files, p) ? files[p] : null,
    listMarkdown: async (dir) => Object.keys(files).filter((p) => p.indexOf(dir) === 0)
  };
  const snap = await buildLexiconSnapshot(io, cfg, builtinLexicon, {}, { customDictPaths: ['custom.md', 'missing.md'] });
  assert.equal(snap.info.get('de').meaning, '自定义');
  assert.ok(snap.dictionaryConflicts.some((c) => c.word === 'de'));
  assert.ok(snap.dictionaryConflicts.length >= 1);
  assert.equal(snap.customDictionaryErrors.length, 1);
}

// 13c) 2.2.0 translation core: endpoint, provider, service, cache
{
  const endpoint = translationCore.resolveEndpoint('http://127.0.0.1:11434/v1/', '/chat/completions');
  assert.equal(endpoint, 'http://127.0.0.1:11434/v1/chat/completions');
  const full = translationCore.resolveEndpoint('http://127.0.0.1:11434/v1', 'http://127.0.0.1:1234/v1/chat/completions');
  assert.ok(full.includes(':1234'));
  assert.throws(() => translationCore.resolveEndpoint('http://127.0.0.1:11434/v1', '/v1/chat/completions'));

  const valid = translationCore.validateProviderConfig({ baseUrl: 'http://127.0.0.1:11434/v1', endpoint: '/chat/completions', model: 'x' });
  assert.equal(valid.ok, true);
  const remote = translationCore.validateProviderConfig({ baseUrl: 'http://example.com/v1', endpoint: '/chat/completions', model: 'x' });
  assert.equal(remote.ok, false);
  assert.equal(remote.code, 'HTTPS_REQUIRED');

  let calls = 0;
  const provider = createOpenAICompatibleProvider({
    config: { baseUrl: 'http://127.0.0.1:11434/v1', endpoint: '/chat/completions', model: 'mock' },
    request: async () => { calls += 1; return { status: 200, json: { choices: [{ message: { content: '译文' } }] } }; }
  });
  const service = createTranslationService({ provider: provider, timeoutMs: 1000 });
  const a = await service.translate({ text: 'A', targetLanguage: 'zh-CN' });
  assert.equal(a.ok, true);
  assert.equal(a.text, '译文');
  const b = await service.translate({ text: 'A', targetLanguage: 'zh-CN' });
  assert.equal(b.cached, true);
  assert.equal(calls, 1, 'cache must avoid second provider call');

  const dedupe = createTranslationService({ provider: provider, timeoutMs: 1000 });
  await Promise.all([dedupe.translate({ text: 'B', targetLanguage: 'zh-CN' }), dedupe.translate({ text: 'B', targetLanguage: 'zh-CN' })]);
  assert.equal(calls, 2, 'concurrent same request must be deduped');

  const slow = createOpenAICompatibleProvider({
    config: { baseUrl: 'http://127.0.0.1:11434/v1', endpoint: '/chat/completions', model: 'slow' },
    request: async () => { await new Promise((r) => setTimeout(r, 50)); return { status: 200, json: { choices: [{ message: { content: 'late' } }] } }; }
  });
  const timeoutService = createTranslationService({ provider: slow, timeoutMs: 5 });
  const timed = await timeoutService.translate({ text: 'C', targetLanguage: 'zh-CN' });
  assert.equal(timed.ok, false);
  assert.equal(timed.error.code, 'TIMEOUT');
}

// 13d) 2.2.0 F6 reference generation: JSON parsing and service analysis
{
  const parsed = referenceCore.parseReferenceResponse('{"reference":"Plur Aqua","backTranslation":"净水","notes":["n"]}');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.reference, 'Plur Aqua');
  assert.equal(parsed.data.notes.length, 1);
  const fenced = referenceCore.parseReferenceResponse('\x60\x60\x60json\n{"reference":"A"}\n\x60\x60\x60');
  assert.equal(fenced.ok, true);
  const bad = referenceCore.parseReferenceResponse('not json');
  assert.equal(bad.ok, false);
  const refService = createReferenceService({
    provider: { chat: async () => ({ ok: true, text: '{"reference":"Plur Aqua","backTranslation":"净水"}' }) }
  });
  const out = await refService.generate({
    chinese: '净水',
    analyze: async () => ({ wordBreakdown: [{ text: 'Plur', gloss: '净化' }], unknownWords: [], lint: [] })
  });
  assert.equal(out.ok, true);
  assert.equal(out.reference, 'Plur Aqua');
  assert.equal(out.wordBreakdown.length, 1);
  assert.equal(out.backTranslation, '净水');
}

// 13e) 2.2.0 privacy, cache limit and logical cancellation
{
  const headers = redactCore.redactHeaders({ Authorization: 'Bearer secret', 'X-Api-Key': 'secret', 'X-Trace': 'ok' });
  assert.equal(headers.Authorization, '***');
  assert.equal(headers['X-Api-Key'], '***');
  assert.equal(headers['X-Trace'], 'ok');
  const redacted = redactCore.redactUrl('http://127.0.0.1:11434/v1?token=secret');
  assert.ok(redacted.includes('token=%2A%2A%2A') || redacted.includes('token=***'));

  let calls = 0;
  const provider = createOpenAICompatibleProvider({
    config: { baseUrl: 'http://127.0.0.1:11434/v1', endpoint: '/chat/completions', model: 'lru' },
    request: async () => { calls += 1; return { status: 200, json: { choices: [{ message: { content: 'v' } }] } }; }
  });
  const service = createTranslationService({ provider: provider, timeoutMs: 1000, cacheLimit: 2 });
  await service.translate({ text: 'A', targetLanguage: 'zh-CN' });
  await service.translate({ text: 'B', targetLanguage: 'zh-CN' });
  await service.translate({ text: 'C', targetLanguage: 'zh-CN' });
  assert.equal(service.cacheSize, 2);
  await service.translate({ text: 'A', targetLanguage: 'zh-CN' });
  assert.equal(calls, 4, 'evicted entry must call provider again');

  const slow = createOpenAICompatibleProvider({
    config: { baseUrl: 'http://127.0.0.1:11434/v1', endpoint: '/chat/completions', model: 'slow2' },
    request: async () => { await new Promise((r) => setTimeout(r, 50)); return { status: 200, json: { choices: [{ message: { content: 'late' } }] } }; }
  });
  const cancelService = createTranslationService({ provider: slow, timeoutMs: 1000 });
  const pending = cancelService.translate({ text: 'D', targetLanguage: 'zh-CN' });
  cancelService.cancelAll();
  const stopped = await pending;
  assert.equal(stopped.ok, false);
  assert.equal(stopped.error.code, 'CANCELLED');
}

// 13f) D4.1 offline completion
{
  const span = completionCore.wordAt('Foo Aqua', 6);
  assert.equal(span.prefix, 'Aq');
  assert.equal(span.start, 4);
  const info = new Map([
    ['aqua', { pos: '名词', meaning: '水元素', abbr: 'Aqu' }],
    ['avis', { pos: '名词', meaning: '鸟', abbr: '' }]
  ]);
  const words = completionCore.wordCandidates(info, 'aq', 10);
  assert.ok(words.some((x) => x.word === 'aqua'));
  assert.ok(!words.some((x) => x.word === 'avis'), 'prefix must be honored');
  const grammar = { lists: { keyword: ['de'], predicate: ['plur'], unit: ['MU'] } };
  const gr = completionCore.grammarCandidates(grammar, 'p', 10);
  assert.ok(gr.some((x) => x.word === 'plur'));
}

// 13h) D4.2 read-only explanation
{
  const messages = explainCore.buildExplainMessages({ text: 'Plur Aqua', dictionaryContext: 'plur = 净化', grammarContext: 'VSO' });
  assert.equal(messages.length, 2);
  assert.ok(messages[1].content.indexOf('Plur Aqua') >= 0);
  const svc = createAssistanceService({ provider: { chat: async () => ({ ok: true, text: '解释文本' }) } });
  const out = await svc.explain({ text: 'Plur Aqua' });
  assert.equal(out.ok, true);
  assert.equal(out.text, '解释文本');
}

// 14) SpellRegistry / LintService 薄服务
{
  const registry = buildSpellRegistry([
    { path: 'a.md', text: 'PrivA(locus: a) {\n}\n' }
  ]);
  assert.ok(registry.has('PrivA'), 'spell registry must collect declarations');
  const issues = lintSource('PrivA(1, 2);', { info: new Map(), units: new Set(), keys: new Set(), spells: registry }, 'a.md');
  assert.ok(Array.isArray(issues), 'lint service must return issues');
  assert.ok(source.includes('lintSource'), 'adapter must use lint service');
}

// 15) EpXsC renderer pipeline
{
  const rendered = renderEpXsC('Foo(locus: a) {\n\tluss 1 MU;\n}', makeGrammar(builtinLists([]), []), new Map(), 50);
  assert.equal(rendered.skip, false);
  assert.ok(rendered.html.includes('token declaration'));
  assert.ok(rendered.vars.has('a'));
  const long = renderEpXsC(Array.from({ length: 60 }, () => 'a').join('\n'), makeGrammar(builtinLists([]), []), new Map(), 50);
  assert.equal(long.skip, true, 'long blocks must skip tokenization');
  assert.ok(source.includes('renderEpXsC'), 'adapter must use renderer');
assert.ok(source.includes('renderOrdBlockInner'), 'rehighlight must import the T/G inner renderer');
}

// 16) T/G renderer data parser
{
  const g = makeGrammar(builtinLists([]), []);
  const tRecs = parseOrdBlocks('A\n> B\n\nC', 'T', g, new Map(), {});
  const tLines = tRecs.filter((x) => x.kind === 'line');
  assert.equal(tLines.length, 2);
  assert.equal(tLines[0].zh, 'B');
  assert.equal(tLines[1].src, 'C');
  assert.ok(tLines[0].html.includes('token word'));
  assert.ok(tRecs.some((x) => x.kind === 'gap'));
  const info = new Map([['de', { pos: '介词', meaning: '在……之内' }]]);
  const gRecs = parseOrdBlocks('de', 'G', g, info, {});
  assert.equal(gRecs[0].tokens[0].gloss, '介词');
  assert.ok(source.includes('parseOrdBlocks'), 'adapter must use ord renderer');
  const langRecs = parseOrdBlocks('A\n> (zh-CN) 甲\n> (en) Alpha', 'T', g, new Map(), {}, { requestedLanguage: 'en' });
  assert.equal(langRecs[0].zh, 'Alpha');
  const missingRecs = parseOrdBlocks('A', 'T', g, new Map(), {}, { requestedLanguage: 'en' });
  assert.equal(missingRecs[0].zh, '');
  assert.equal(missingRecs[0].translationState, 'untranslated');
}

// 16b) F2/F3 ordinal translations: language tags, legacy default, selection
{
  assert.equal(ordParse.normalizeLang('zh-cn'), 'zh-CN');
  assert.equal(ordParse.normalizeLang('zh-Hans'), 'zh-Hans');
  assert.equal(ordParse.normalizeLang('EN-us'), 'en-US');
  assert.equal(ordParse.normalizeLang('it'), 'it');
  assert.equal(ordParse.normalizeLang('(他笑了)'), null);

  const doc = ordParse.parseOrdLines('A\n> (zh-CN) 甲\n> (en) Alpha\n\nB');
  assert.equal(doc.records.filter((x) => x.kind === 'line').length, 2);
  const a = doc.records[0];
  assert.equal(a.src, 'A');
  assert.equal(a.translations.length, 2);
  assert.equal(a.translations[0].lang, 'zh-CN');
  assert.equal(a.translations[1].text, 'Alpha');
  assert.ok(a.sourceHash, 'source hash must exist');

  const legacy = ordParse.parseOrdLines('A\n> B');
  assert.equal(legacy.records[0].defaultTranslation, 'B');
  assert.equal(legacy.records[0].translations.length, 0);

  const parenthetical = ordParse.parseOrdLines('A\n> (他笑了) 你来了。');
  assert.equal(parenthetical.records[0].defaultTranslation, '(他笑了) 你来了。');
  assert.equal(parenthetical.records[0].translations.length, 0);

  const escaped = ordParse.parseOrdLines('A\n> \\(it) 默认译文');
  assert.equal(escaped.records[0].defaultTranslation, '(it) 默认译文');

  const dup = ordParse.parseOrdLines('A\n> (en) one\n> (en) two');
  assert.equal(dup.records[0].translations.length, 1);
  assert.equal(dup.records[0].translations[0].text, 'two');
  assert.ok(dup.warnings.some((w) => w.code === 'DUPLICATE_LANGUAGE'));

  const trans = [
    { lang: 'zh-CN', text: '中文' },
    { lang: 'en', text: 'English' }
  ];
  assert.equal(ordParse.pickTranslation({ translations: trans, requestedLanguage: 'zh-cn' }).text, '中文');
  assert.equal(ordParse.pickTranslation({ translations: trans, requestedLanguage: 'zh-Hans' }).text, '中文');
  assert.equal(ordParse.pickTranslation({ translations: trans, requestedLanguage: 'fr', fallbackLanguage: 'en' }).text, 'English');
  assert.equal(ordParse.pickTranslation({ translations: trans, requestedLanguage: 'fr', defaultTranslation: '默认' }).kind, 'default');
  assert.equal(ordParse.pickTranslation({ translations: trans, requestedLanguage: 'fr' }).kind, 'untranslated');
  assert.equal(coreIndex.parseOrdLines, ordParse.parseOrdLines);
  assert.equal(coreIndex.pickTranslation, ordParse.pickTranslation);
}

// 17) tooltip data module
{
  assert.equal(tooltipCore.pickClass({ contains: (c) => c === 'keyword' }), 'keyword');
  const tip = tooltipCore.buildTip('word', 'siro', new Map([['siro', { pos: '名词', meaning: '虚空', abbr: '' }]]), new Map(), { spells: new Map(), sectionPos: {} });
  assert.ok(tip && tip.label, 'buildTip known word');
  assert.ok(tooltipCore.coordTip('~ 1 ~ 2').label.indexOf('相对坐标') >= 0);
}

// 18) F7 settings tab wiring / zero network in 2.1
{
  assert.ok(source.includes('addSettingTab'), 'adapter must register settings tab');
  assert.ok(source.includes('addRibbonIcon'), 'adapter must add settings ribbon icon');
  assert.ok(source.includes('async openSettings()'), 'adapter must define the settings opener');
  assert.ok(source.includes('getRequestedLanguage()'), 'adapter must define language resolution methods');
  assert.ok(source.includes('getRequestedLanguage'), 'adapter must resolve settings language');
  const settingsTabSrc = fs.readFileSync('src/ui/settings-tab.js', 'utf8');
  assert.ok(settingsTabSrc.includes('PluginSettingTab'), 'settings tab must extend PluginSettingTab');
  assert.ok(!/\bfetch\s*\(|requestUrl/.test(settingsTabSrc), '2.1 settings must not make network requests');
}

console.log('OK: block aliases, line mapping, spell file/scope, tokenizer, bracket, parsers, hover, markup, core-api, history-regression, scheduler, lexicon-service, lint-service, renderer, ord-renderer, tooltip');
