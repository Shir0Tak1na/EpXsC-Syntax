# Security / Architecture Audit — 2.3.2 candidate

> Scope: `2.3.2-dev` / `2.3.x-ghost` integration candidate. Not a substitute for runtime D3 smoke.
> Date: 2026-11-18.

## 1. Architecture

| Layer | Responsibility | Obsidian/DOM/network |
| :--- | :--- | :--- |
| `src/core/` | parser, lint, completion, translation prompts, settings | none (a comment mentions `window.Prism`; no executable DOM use) |
| `src/services/` | pure orchestration; provider injected | no direct Obsidian/network |
| `src/editor/` | CM6 adapters; external `@codemirror/*` | host CM6, DOM widget |
| `src/renderers/` | HTML/DOM rendering | DOM by design |
| `src/ui/` | Obsidian modals/settings | Obsidian by design |
| `src/adapter/` | lifecycle, commands, vault I/O, requestUrl | Obsidian/network by design |

**Result:** the core remains portable; editor integration is isolated in `src/editor` and the adapter. The old fatal duplicate-CM6 defect is addressed by externalizing CM6 and the metafile CI check.

## 2. Findings

### Critical / high

| ID | Finding | Status |
| :--- | :--- | :--- |
| H1 | Prior D3 bundled a second CM6 runtime and blocked all notes. Root cause confirmed by isolated-vault console error. | Fixed: external CM6; no CM6 inputs in metafile; external host registration passed. |
| H2 | D3 enabling marker could be cleared after a circuit-breaker failure; a later settings save could re-enable decoration work. | Fixed: only explicit disable/re-enable path clears/re-arms; `disabled-on-crash` is honored at startup. |
| H3 | Whole-word ghost used a replace decoration and hid typed input. | Fixed: suffix widget; typed prefix remains visible; Tab appends. |
| H4 | API key is still stored in plaintext in `data.json`. | **Accepted unresolved by owner on 2026-11-18**; Secret Storage is not available in the current target. Use a low-privilege key. |
| H5 | External CM6 requires a host-provided module; tested on Obsidian 1.15.1. | Accepted/gated: `minAppVersion` 1.15.1; D3 defaults off; no runtime guarantee for older hosts. |

### Medium

| ID | Finding | Status |
| :--- | :--- | :--- |
| M1 | D3 circuit breaker counts unique signatures; a persistent identical error does not trip the threshold. | **Fixed:** counts occurrences; signatures still dedupe logging. |
| M2 | D3 marker save is asynchronous and can be lost on a hard crash. | Accepted: startup detects `enabling`; normal unload clears. |
| M3 | `lintText` treats a block containing a period as prose and returns before unit/keyword warnings. | **Fixed for code-like lines:** semicolon/brace/spell-keyword lines still warn on unknown units. Natural-sentence lint remains future work. |
| M4 | Source unknown-word marks use a length >= 4 heuristic and skip `>` lines. | Accepted; mirrors renderer. |
| M5 | D4.2 confirmation shows source/dictionary/endpoint, but not a full raw JSON payload or adjacent-sentence switch. | Partial; current scope is current block + dictionary only. |
| M6 | D3 line decorations use native `title` in source editor, while rendered view uses custom tooltip. | Cosmetic inconsistency; no data exposure. |

### Low

- No automatic Markdown writes: insertions require Tab/button/command confirmation.
- No full-vault transmission: D4.2 sends current block + relevant dictionary only.
- Provider errors and headers are redacted in F8 paths.
- Ghost prediction is dictionary-only and never sends network requests.
- `noop-extension.js` removed from integration candidate.

## 3. Checks run

- `npm run build`
- `npm test` (including 8 lint fixtures, completion, explanation, D3 controller, jsdom editor smoke)
- `npm run check` (includes metafile no-CM check)
- `npm run release:check`

## 4. Release blockers

1. D3-SMOKE manual record (registration, toggle, source/Live Preview, disable/enable, crash marker).
2. Confirm main-vault install is not done before isolated smoke.
3. H4 is explicitly accepted unresolved; H5 is gated by `minAppVersion` 1.15.1.
4. One GitHub Release per Asia/Shanghai day; 2.3.2 cannot be published on the same day as 2.3.0.

## 5. Verdict

No new fatal architecture defect found in the current candidate after H1–H3 fixes. The remaining high items are deployment/privacy constraints, not code paths that silently modify notes. **Do not release until D3-SMOKE is recorded and the next-day release window opens.**
