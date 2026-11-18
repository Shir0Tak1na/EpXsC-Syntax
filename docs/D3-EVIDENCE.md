# D3 Evidence Log

> Status: root cause confirmed by R0+R1+R2; external-build and runtime fix verification (R3/R4) still pending.
> Incident commit: `b89caed` (D3 initial, reverted).
> Safe baseline: `main` after `1cecc1b` / current 2.3.0 candidate.

## R1 — bundle dependency evidence

Collected 2026-11-17 from git objects:

| Build | Size | `@codemirror/` refs | `ViewPlugin` refs | `registerEditorExtension` refs |
| :--- | ---: | ---: | ---: | ---: |
| Incident `b89caed:main.js` | 1,064,804 B | 5 | 22 | 1 |
| Safe `main:main.js` | 492,381 B | 0 | 0 | 0 |

Incident `package.json` devDependencies included:

```json
{
  "@codemirror/state": "^6.7.6",
  "@codemirror/view": "^6.43.15",
  "esbuild": "^0.25.0"
}
```

**Conclusion for R1:** the incident bundle did contain a bundled CodeMirror runtime; the safe main bundle does not.
**This does not alone prove the crash root cause.** It proves the dependency difference that must be tested against R0/R2/R4.

## R0 — crash reproduction

Status: **confirmed** in the isolated vault.

- Obsidian: 1.15.1
- Build: incident `b89caed`
- Vault: `E:\ObsidianPulgins\test-vault-d3-incident`
- Only community plugin: `epxsc-syntax`

Observed on opening a note:

- “打开失败” modal;
- repeated console errors on `loadFile`.

Exact console error:

```text
Error: Unrecognized extension value in extension set ([object Object]).
This sometimes happens because multiple instances of @codemirror/state are loaded,
breaking instanceof checks.
    at n (app.js:5:18216)
    at n (app.js:5:17714)
    at n (app.js:5:18394)
    at n (app.js:5:17714)
    at n (app.js:5:17896)
    at n (app.js:5:17714)
    at Jle (app.js:5:18409)
    at o.resolve (app.js:5:16844)
    at o.create (app.js:5:26053)
    at Nx.set (app.js:521:2886)
loadFile @ app.js:269
```

### Isolated reproduction package

Prepared at `E:\ObsidianPulgins\test-vault-d3-incident`:

- incident build `b89caed` installed;
- `epxsc-syntax` is the only enabled community plugin;
- `D3 incident repro.md` contains EpXsC/T samples.

Attempted `obsidian://open?vault=test-vault-d3-incident`; Obsidian opened the registered original `test-vault` instead, so the copy is not registered as a vault. It must be opened once via **Open folder as vault** before console capture.

## R2 — error signature

Status: **confirmed**. Error explicitly names multiple `@codemirror/state` instances and broken `instanceof` checks.

Expected signature if the hypothesis is right: an extension-set/instance error mentioning CodeMirror state/view classes.

```text
Unrecognized extension value in extension set ([object Object]).
This sometimes happens because multiple instances of @codemirror/state are loaded,
breaking instanceof checks.
```

## Root cause conclusion

**Confirmed (R0+R1+R2):** the incident build bundled a second CodeMirror runtime; Obsidian loaded that extension set into its host editor and rejected it because `@codemirror/state` class identity differed. The error names multiple state instances and broken `instanceof` checks.

This is now a root-cause conclusion, not just a hypothesis.

R3/R4 remain **fix verification**: an externalized CM6 build still must prove it loads safely. The root cause does not authorize shipping D3 without that verification; the no-op spike now passes registration, but decorations/lifecycle gates remain.

## R3 — external build evidence

Status: **confirmed**.

External build:

- `@codemirror/view` / `@codemirror/state` are external in esbuild;
- `main.js` contains the external `require("@codemirror/view")` but no bundled CM6 implementation;
- isolated vault `test-vault-d3-incident` loaded the plugin;
- the no-op extension registered successfully after `loadData()`.

Important timing finding: registering during `onload()` before `loadData()` skipped the extension because `editorDecorations` was still at its default. Registration must happen after settings are normalized.

Required:

- an isolated build that externalizes `@codemirror/*` and `@lezer/*`;
- `main.js` contains zero CM6/Lezer runtimes;
- record how the host is expected to provide the module;
- CI check `check-no-codemirror` passes.

## R4 — fix verification

Status: **confirmed** in the isolated vault.

- same isolated-vault operation set;
- no crash; notes open;
- separate from the root-cause conclusion.

## Next action

Run R0 in an isolated vault and attach the console text. Until then, the D3 plan must keep the root cause labeled unconfirmed.
