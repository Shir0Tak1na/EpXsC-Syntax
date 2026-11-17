# D3 external-CM6 spike

> Branch: `2.3.x-d3-spike`
> Purpose: test whether Obsidian can provide the host CM6 module to a plugin without bundling a second runtime.
> This build is **not** a release candidate and must never be installed in the main vault.

## What changed

- `scripts/build.mjs` externalizes `@codemirror/view`, `@codemirror/state`, `@lezer/common`, `@lezer/lr`.
- `src/editor/noop-extension.js` requires the host CM6 module and returns a no-op ViewPlugin.
- Plugin registers it only when `diagnostics.editorDecorations` is true.
- No decoration, no lint range mapping yet.

## Expected outcomes

1. **Host module available**: console logs `[EpXsC D3 spike] host CM6 extension registered`; notes open; no CM6 duplicate error.
2. **Host module unavailable**: console logs the require error and `extension not registered`; notes still open because registration is guarded.

## Test vault

`E:\ObsidianPulgins\test-vault-d3-incident`

- incident build replaced by this spike;
- `diagnostics.editorDecorations = true`;
- only `epxsc-syntax` enabled;
- `D3 incident repro.md` present.

## Result

- Host CM6 registration: **success**
- Notice: `D3 spike：宿主 CM6 扩展注册成功`
- Notes open: yes
- Duplicate CM6 error: no
- Finding: registration must run **after `loadData()`**; doing it in `onload()` skipped it because `editorDecorations` was still default false.

R3/R4 satisfied for the no-op spike; D3.1 lifecycle/error gates are next.
