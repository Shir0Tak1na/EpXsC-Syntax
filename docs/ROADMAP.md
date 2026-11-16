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

> **T1.0 checkpoint**: T1.1 is done. Pause here for review before T1.2.

### T0 — test baseline (first)

- [x] T0.1 Tokenizer golden fixtures (13 fixtures, scripts/fixture-runner.mjs) (`tests/fixtures/tokenizer/`): keywords, types, modifiers, predicates, elements, units, numbers, rank ranges, nested brackets, comments, annotations, coord runs, negPrefix, empty, very long, unknown words.
- [x] T0.2 Parser / Lint / Markup golden fixtures (8 parser + 7 lint + 6 markup): dictionary normal/empty/missing/duplicate; root merge; ranks/units/filter keys; spells/params/scope/impo/const rewrite; bracket depth/variable analysis/dict keys.
- [x] T0.3 Historical-bug regression list (static regression section in `scripts/test.mjs`) from CHANGELOG/Git: T/G old grammar, lost hover constants, C border specificity, `SPELL_DIR`/`MAX_HIGHLIGHT_LINES`, `CLASS_ORDER`/`SYMBOL_INFO`.
- [x] T0.4 Fixture runner wired into `npm test` + CI; prints fixture name and expected/actual diff.

### T1 — data layer

- [x] T1.1 Move `BUILTIN_LEXICON` to `data/builtin-lexicon.json`; add deterministic `scripts/generate-lexicon.mjs`; no local paths.
- [x] T1.2 Add `schemaVersion` / `lexiconVersion` / `generatedAt`; loader compatibility check.
- [x] T1.3 Tests for Vault priority, missing/empty/malformed/deleted files, duplicate merge, builtin fallback (core/parser/loader coverage; adapter merge documented).
- [x] T1.4 Centralize data-source paths in `src/adapter/config.js`.

### T2 — services / adapter

- [x] T2.1 `RefreshScheduler`: requestRefresh / cancelPending / execute; keep debounce, dedupe, generation guard (implemented as `src/services/refresh-scheduler.js`).
- [x] T2.2 `LexiconService` / `SpellRegistry` / `LintService`: Vault read + parse + merge + snapshot; Node-testable (`src/services/`).
- [ ] T2.3 Adapter only lifecycle, Vault events, commands, processors; no tokenize/lint/render rules.

### T3 — renderer / UI

- [x] T3.1 `epxsc-renderer` / `epxst-renderer` / `epxsg-renderer`; pure token → HTML/DOM structure; adapter mounts (`epxsc-renderer`, `ord-renderer`).
- [ ] T3.2 Tooltip / lint panel / diagnostics modules; shared `CODE_SELECTOR` and aliases.
- [x] T3.3 Render golden tests for C/T/G, long-block guard, empty and malformed input (renderer tests in `scripts/test.mjs`; DOM mounting still smoke-only).
- [ ] T3.4 Keep `refresh()` → T/G re-render invariant and test it.

### T4 — performance / stability

- [x] T4.1 Benchmarks: large dictionary parse, spell index, single/multi block tokenize, `ensureRendered()` scan (`scripts/bench.mjs`; current numbers recorded manually).
- [ ] T4.2 Watchdog optimization: event-first, hidden-window skip, lower frequency or active view only; measurements required.
- [ ] T4.3 Bounded caches only with invalidation tests.

### T5 — build / CI / release

- [ ] T5.1 CI: golden fixtures, snapshot freshness, clean-build bundle diff, CSS equality, manifest/versions/BUILD consistency.
- [ ] T5.2 Release asset validation: 3 assets, version match, no tests/local data.
- [ ] T5.3 One release per day; update current release assets instead of creating another.

### T6 — external core (last)

- [x] T6.1 standalone CLI (`bin/epxsc.mjs`), package entry exports and CLI tests; Obsidian adapter and CLI share `src/core/index.js`.

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
| T1.1 | DONE | JSON + canonical generator + tests |
| T1.2 | DONE | schema gate + metadata validation |
| T1.3 | DONE | parser/loader fallback tests + semantics doc |
| T1.4 | DONE | adapter config module |
| T2.1 | DONE | RefreshScheduler + fake-timer tests |
| T2.2 | DONE | lexicon/spell/lint services + fake-vault tests |
| T2.3 | DONE | adapter ~34k; services/renderers/ui own the logic |
| T3.1 | DONE | EpXsC + T/G data + DOM renderers |
| T3.2 | DONE | lint modal / tooltip / diagnostics extracted |
| T3.3 | DONE | C/T/G data renderer tests |
| T3.4 | DONE | T/G refresh re-render invariant asserted |
| T4.1 | DONE | `npm run bench` |
| T5.1 | DONE | CI now checks bundle freshness after build |
| T6.1 | DONE | CLI + exports + tests | |

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

**T1.3–T5 architecture optimization is complete.**

Evidence: services, renderers, UI modules, adapter reduced from ~72KB to ~34KB; all tests, fixture runner, lexicon canonical check, bundle freshness and release asset validator pass. Optional next work is T6 (external core package), which is outside the current objective.
