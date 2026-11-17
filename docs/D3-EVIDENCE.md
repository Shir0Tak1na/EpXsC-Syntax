# D3 Evidence Log

> Status: evidence collection in progress. Do not mark the incident root cause as confirmed until R0–R3 are complete.
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

Status: **observed, console evidence incomplete**. Obsidian 1.15.1; main vault; popup only showed “打开失败”; all notes were inaccessible. The DevTools console was not captured at the time.

Protocol:

1. Create an isolated vault with only the incident plugin build.
2. Open 2–3 notes containing EpXsC blocks.
3. Record the first console error and stack verbatim below.
4. If it cannot be reproduced, record that honestly; do not mark the hypothesis confirmed.

```text
Observed: “打开失败” modal; no console text captured.
Obsidian: 1.15.1 (current installed build).
Vault: main vault (not isolated during the incident).
```

### Isolated reproduction package

Prepared at `E:\ObsidianPulgins\test-vault-d3-incident`:

- incident build `b89caed` installed;
- `epxsc-syntax` is the only enabled community plugin;
- `D3 incident repro.md` contains EpXsC/T samples.

Attempted `obsidian://open?vault=test-vault-d3-incident`; Obsidian opened the registered original `test-vault` instead, so the copy is not registered as a vault. It must be opened once via **Open folder as vault** before console capture.

## R2 — error signature

Status: **pending** (depends on R0).

Expected signature if the hypothesis is right: an extension-set/instance error mentioning CodeMirror state/view classes.

```text
(signature)
```

## R3 — external build evidence

Status: **pending**.

Required:

- an isolated build that externalizes `@codemirror/*` and `@lezer/*`;
- `main.js` contains zero CM6/Lezer runtimes;
- record how the host is expected to provide the module;
- CI check `check-no-codemirror` passes.

## R4 — fix verification

Status: **pending** (depends on R0/R3).

- same isolated-vault operation set;
- no crash; notes open;
- separate from the root-cause conclusion.

## Next action

Run R0 in an isolated vault and attach the console text. Until then, the D3 plan must keep the root cause labeled unconfirmed.
