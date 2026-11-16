# EpXsC Core Architecture

> Status: **Phase 3 complete** — the plugin ships a generated `main.js`; pure language logic lives in `src/core` + `src/data`, and Obsidian lifecycle lives in `src/adapter`.
> Current version: **1.31.0**（2026-11-16）.

## 1. Why a core

The plugin does four jobs:

1. parse language data (dictionary, roots, ranks, spell declarations);
2. tokenize / colorize EpXsC text;
3. lint and scope-check it;
4. embed it in Obsidian (lifecycle, DOM, tooltip, commands).

Jobs 1–3 are not Obsidian-specific. A translation project should be able to reuse them without loading Obsidian:

- CLI checker for EpXsC text;
- VS Code / web editor diagnostics;
- corpus import and glossary validation;
- other conlang / translation tooling.

## 2. Actual layers

```text
src/main.js                 build entry; only requires the adapter
        |
        v
src/adapter/plugin.js       Obsidian lifecycle, DOM, hover, commands, processors
        |
        +----> src/core/    pure language logic (no obsidian / document / window / vault)
        |
        +----> src/data/    parsers and built-in fallback snapshot
```

| Path | Responsibility |
| :-- | :-- |
| `src/main.js` | esbuild entry; no language logic |
| `src/adapter/plugin.js` | plugin lifecycle, markdown processors, DOM rendering, hover UI, commands, data listeners |
| `src/core/grammar.js` | `AXES` / `TYPES` / `MODIFIERS`, `makeGrammar`, `BASE_LISTS` |
| `src/core/tokenizer.js` | `tokenizeText` / `asGlobalRe` / `escHtml` |
| `src/core/markup.js` | bracket depth, variable analysis, dict keys, spell refs |
| `src/core/spells.js` | `collectSpells` / `parseParamList` |
| `src/core/lint.js` | `lintText` |
| `src/core/markdown-blocks.js` | fenced-block extraction |
| `src/core/index.js` | public aggregate + stable aliases |
| `data/builtin-lexicon.json` | built-in snapshot (entries/roots/units/ranks/keys) |
| `src/data/parsers.js` | dictionary / roots / ranks / filter keys / units |

Rules:

- `src/core/` must not import `obsidian`, `document`, `window` or `app.vault`.
- `src/data/` only parses strings/files; no rendering or UI.
- Only `src/adapter/` registers lifecycle, commands and markdown processors.
- Renderers consume analysis results; they do not re-implement tokenization or scope rules.

## 3. Public core API

```js
const core = require('./src/core');

// data
core.parseDictionary(text) // parseEntries alias -> Map<word, entry>
core.parseRoots(text)      // Map<root, { word, kind, meaning }>
core.parseRanks(text)      // Map<rank, { line, components }>
core.parseUnits(text)      // Map<unit, ...>
core.parseFilterKeys(text) // Map<key, ...>

// language
core.buildGrammar(lists, filterKeys) // makeGrammar alias
core.tokenize(text, grammar)         // tokenizeText alias -> escaped HTML
core.extractBlocks(markdown, aliases) // extractEpXsCBlocks alias

// analysis
core.collectSpells(text, map, file)
core.lint(text, context)             // lintText alias
```

`lint` context:

```js
{
  info, units, keys, spells, path,  // path required for priv/tut scope
  ranks                              // optional rank definitions for messages
}
```

The adapter and external tools share the same modules; there is no duplicate grammar.

## 4. Data model and fallback

Priority is preserved:

1. vault dictionary / syntax / rank / root files;
2. built-in snapshot when a source is missing or unreadable;
3. partial failures fall back per source, never silently mix incompatible schemas.

The built-in snapshot lives in `data/builtin-lexicon.json`; the adapter loads it and `scripts/generate-lexicon.mjs --check` enforces canonical form. A future generated
`snapshot.json` should carry:

```json
{
  "schemaVersion": 1,
  "sourceRevision": "<date or hash>",
  "entries": {},
  "roots": {},
  "units": {},
  "ranks": {}
}
```

It must be deterministic, sorted, and contain no local paths or private vault content.

## 5. Lifecycle and refresh invariants

These are load-bearing; keep them when changing the adapter:

- data events (`create` / `delete` / `rename`) are debounced;
- `refresh()` has a generation guard so a slow load cannot overwrite a newer one;
- after `refresh()` installs the new grammar, C blocks are re-highlighted **and T/G `.epx-ord` blocks are re-rendered**;
  T/G may have rendered before the dictionary finished loading, so skipping this leaves them on `BASE_LISTS`;
- `pre.epx-pre` is added by the plugin; do not reintroduce `:has()`;
- hover constants (`CLASS_ORDER`, `CLASS_LABEL`, `SYMBOL_INFO`) must stay in the adapter/hover layer, not tokenizer.

## 6. Migration phases

### Phase 1 — baseline (done)

- data-event coverage, refresh race, linter alias/line mapping, priv/tut file scope;
- `scripts/test.mjs` for block aliases, CRLF, scope and tokenizer smoke tests;
- CI runs check + test.

### Phase 2 — pure modules (done)

- `extractEpXsCBlocks` → `src/core/markdown-blocks.js`;
- parsers → `src/data/parsers.js`;
- spells/lint → `src/core/spells.js` + `src/core/lint.js`;
- grammar/tokenizer → `src/core/grammar.js` + `src/core/tokenizer.js`;
- token post-processing → `src/core/markup.js`;
- tests cover parser, tokenizer, bracket, hover and markup paths.

### Phase 3 — build boundary (done)

- esbuild with `src/main.js` as entry;
- `main.js` is generated, still the only release entry;
- CI builds from a clean checkout, runs `check` and `test`;
- release assets: `main.js`, `manifest.json`, `styles.css`;
- release provenance attestation passes.

### Phase 4 — external package (next)

Execution tracking: [ROADMAP.md](ROADMAP.md).

- publish or expose `@epxsc/core` as a pure ESM/CJS package;
- adapter imports it; no duplicate language rules;
- golden fixtures for tokenizer and linter output;
- acceptance: a CLI sample and the Obsidian plugin consume the same core version.

## 7. Non-goals

- No language semantic changes during refactor work.
- No removal of built-in fallback or diagnostics commands.
- No TypeScript/framework migration unless separately decided.
- No rewrite of the working adapter in one step.
