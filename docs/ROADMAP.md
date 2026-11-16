# EpXsC Roadmap

> Source review: architecture review task book (2026-11-16).
> Rules: verify before fixing, test before refactoring, one verifiable boundary at a time.
> Current release: **1.31.0**（2026-11-16）. At most **one GitHub Release per Asia/Shanghai calendar day**.

## A. Current baseline

- [x] data events: dictionary / syntax / rank / `ROOTS_DIR` / `SPELL_DIR`, `modify/create/delete/rename`, 300ms debounce.
- [x] priv/tut scope compares file path + line range.
- [x] language aliases shared by processors, linter and diagnostics; case/CRLF tested.
- [x] refresh race: `_refreshGen` generation guard; new snapshot built before swap.
- [x] build boundary: `src/` + esbuild; `main.js` is generated.
- [x] Core / Data / Adapter split: `src/core`, `src/data`, `src/adapter`.
- [x] CI + release assets + provenance attestation.
- [x] README / CHANGELOG / ARCHITECTURE / RELEASING updated for 1.31.0.

## B. Remaining work

### T0 — test baseline (first)

- [x] T0.1 Tokenizer golden fixtures (13 fixtures, scripts/fixture-runner.mjs) (`tests/fixtures/tokenizer/`): keywords, types, modifiers, predicates, elements, units, numbers, rank ranges, nested brackets, comments, annotations, coord runs, negPrefix, empty, very long, unknown words.
- [x] T0.2 Parser / Lint / Markup golden fixtures (8 parser + 7 lint + 6 markup): dictionary normal/empty/missing/duplicate; root merge; ranks/units/filter keys; spells/params/scope/impo/const rewrite; bracket depth/variable analysis/dict keys.
- [x] T0.3 Historical-bug regression list (static regression section in `scripts/test.mjs`) from CHANGELOG/Git: T/G old grammar, lost hover constants, C border specificity, `SPELL_DIR`/`MAX_HIGHLIGHT_LINES`, `CLASS_ORDER`/`SYMBOL_INFO`.
- [x] T0.4 Fixture runner wired into `npm test` + CI; prints fixture name and expected/actual diff.

### T1 — data layer

- [ ] T1.1 Move `BUILTIN_LEXICON` to `data/builtin-lexicon.json`; add deterministic `scripts/generate-lexicon.mjs`; no local paths.
- [ ] T1.2 Add `schemaVersion` / `lexiconVersion` / `generatedAt`; loader compatibility check.
- [ ] T1.3 Tests for Vault priority, missing/empty/malformed/deleted files, duplicate merge, builtin fallback.
- [ ] T1.4 Centralize data-source paths in one config module.

### T2 — services / adapter

- [ ] T2.1 `RefreshScheduler`: requestRefresh / cancelPending / execute; keep debounce, dedupe, generation guard.
- [ ] T2.2 `LexiconService` / `SpellRegistry` / `LintService`: Vault read + parse + merge + snapshot; Node-testable.
- [ ] T2.3 Adapter only lifecycle, Vault events, commands, processors; no tokenize/lint/render rules.

### T3 — renderer / UI

- [ ] T3.1 `epxsc-renderer` / `epxst-renderer` / `epxsg-renderer`; pure token → HTML/DOM structure; adapter mounts.
- [ ] T3.2 Tooltip / lint panel / diagnostics modules; shared `CODE_SELECTOR` and aliases.
- [ ] T3.3 Render golden tests for C/T/G, long-block guard, empty and malformed input.
- [ ] T3.4 Keep `refresh()` → T/G re-render invariant and test it.

### T4 — performance / stability

- [ ] T4.1 Benchmarks: large dictionary parse, spell index, single/multi block tokenize, `ensureRendered()` scan.
- [ ] T4.2 Watchdog optimization: event-first, hidden-window skip, lower frequency or active view only; measurements required.
- [ ] T4.3 Bounded caches only with invalidation tests.

### T5 — build / CI / release

- [ ] T5.1 CI: golden fixtures, snapshot freshness, clean-build bundle diff, CSS equality, manifest/versions/BUILD consistency.
- [ ] T5.2 Release asset validation: 3 assets, version match, no tests/local data.
- [ ] T5.3 One release per day; update current release assets instead of creating another.

### T6 — external core (last)

- [ ] T6.1 `@epxsc/core` or standalone CJS/ESM entry; CLI example + Obsidian adapter consume same core.

## C. Order

```text
T0.1 → T0.2 → T0.3 → T0.4
T1.1 → T1.2 → T1.3 → T1.4
T2.1 → T2.2 → T2.3
T3.1 → T3.2 → T3.3 → T3.4
T4.x
T5.x
T6.x
```

Do not start T1/T2 migration before T0 is complete.

## D. Status board

| ID | Status | Notes |
| :-- | :-- | :-- |
| T0.1 | DONE | 13 tokenizer fixtures + runner |
| T0.2 | DONE | 21 fixtures + runner sections |
| T0.3 | DONE | history-regression in test.mjs |
| T0.4 | DONE | runner + CI + diff output |
| T1.1 | TODO | next action |
| T1.2 | TODO | |
| T1.3 | TODO | |
| T1.4 | TODO | |
| T2.1 | TODO | |
| T2.2 | TODO | |
| T2.3 | TODO | |
| T3.1 | TODO | |
| T3.2 | TODO | |
| T3.3 | TODO | |
| T3.4 | TODO | |
| T4.x | TODO | |
| T5.x | PARTIAL | CI exists; missing golden/snapshot/bundle freshness |
| T6.1 | TODO | |

## E. Definition of done per task

1. Independent test/fixture; `npm test` passes.
2. `npm run build && npm run check` passes.
3. No language semantics, dictionary priority, highlight output, lint rules or interaction changes.
4. Vault smoke test: C / T / G / hover.
5. Failure paths log, no swallowed exceptions.
6. Docs + CHANGELOG updated.
7. No new runtime dependency.
8. No writes to real user notes.

## F. Risks

- **Extraction boundary drops constants** — happened with `SPELL_DIR`, `MAX_HIGHLIGHT_LINES`, `CLASS_ORDER`, `SYMBOL_INFO`. Mitigation: T0 fixtures + full reference scan + Vault smoke.
- **T/G timing** — T/G can render before the dictionary loads and stay on `BASE_LISTS`. Mitigation: keep refresh → `.epx-ord` re-render and test it.
- **CSS specificity** — class replacement lost to theme `pre` rules. Mitigation: `pre.epx-pre` + smoke test.
- **Release assets drift** — docs/metadata edits after release. Mitigation: rebuild all three assets before upload.
- **One release/day** — no new release if today already has one.

## G. Next single action

**T1.1 — move the built-in lexicon to `data/builtin-lexicon.json`.**

T0.3/T0.4 are done: historical regressions are asserted in `scripts/test.mjs`; all fixture categories and CI are wired.

T1.1 deliverable:

- `data/builtin-lexicon.json`;
- adapter loads JSON, same fallback behavior;
- deterministic generation/validation for the snapshot;
- test that JSON structure and fallback maps are intact;
- build output still contains no vault paths or private data.
