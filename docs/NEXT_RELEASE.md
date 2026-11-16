# Next release checklist

> Do **not** publish while today's release exists. Current day rule: one public GitHub
> Release per Asia/Shanghai calendar day.

## Candidate

- Version: **1.32.0** (minor: architecture refactor + CLI + docs)
- Base: current `main` after `e57c32c`
- Previous release: 1.31.0 (already published; do not create another today)

## Included since 1.31.0

- Core/Data/Services/Renderers/UI split:
  - `src/services/` (lexicon, spells, lint, refresh scheduler)
  - `src/renderers/` (EpXsC + T/G data and DOM)
  - `src/ui/` (tooltip, lint modal, diagnostics)
  - `src/adapter/config.js`
- Built-in lexicon in `data/builtin-lexicon.json` with schema gate.
- T1.3–T5 tests/CI: golden fixtures, history regression, bundle freshness, release asset check, benchmark.
- English README primary + `README.zh-CN.md`; bilingual manifest description.
- CLI: `bin/epxsc.mjs`, package exports, `docs/CLI.md`.

## Steps (next calendar day)

1. Bump `manifest.json`, `package.json`, and `src/adapter/plugin.js` `BUILD` to **1.32.0**.
2. Add `versions.json` entry `"1.32.0": "1.4.0"`.
3. Update CHANGELOG: move Unreleased to `## 1.32.0` with date.
4. `npm run build && npm run check && npm test && npm run release:check && npm run bench`.
5. Sync `main.js` / `manifest.json` / `styles.css` to the vault and run a manual C/T/G/hover/lint check.
6. Commit and push; wait for CI success.
7. Verify today has no other Release.
8. Create GitHub Release 1.32.0 with exactly `main.js`, `manifest.json`, `styles.css`.
9. Verify attestation workflow success and release asset names.

## Not included

- No new language semantics.
- No new runtime dependencies.
- T6 external package publication beyond the repo-local CLI/exports remains optional.
