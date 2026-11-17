# EpXsC Syntax — runtime smoke

> Required before a release that changes diagnostics/editor integration.
> Record one row per test run. Unrecorded = not passed.

## Build under test

- Version: 2.3.0
- Build hash / commit: c031731
- Obsidian version: current installed build (user smoke, 2026-11-17)
- Platform: Windows
- Vault: main (user-confirmed)
- diagnostics.enabled: on
- editorDecorations: off (2.3.x only)

## Checks

- [x] Plugin loads; no "Unrecognized extension value in extension set" in console.
- [x] Every note in the vault opens.
- [x] Reading view: error line has red dashed underline; warning has orange wavy underline.
- [x] Hover/tap on a diagnostic line shows the larger custom tooltip.
- [x] T/G unknown word has a dotted mark and diagnostic tooltip.
- [x] Live Preview: code block renders when cursor is outside; entering source does not freeze the editor.
- [x] Source mode: no crash; diagnostics do not block typing/undo.
- [x] Switch notes repeatedly; no stale decoration or cross-note issue.
- [x] Disable/re-enable plugin; notes still open.
- [x] Toggle diagnostics.enabled; status bar and decorations disappear/reappear after refresh.
- [x] Status bar count matches the lint panel for a sample note.
- [x] Large note (>50-line EpXsC block) does not freeze.
- [x] Mobile/narrow window: tap diagnostic line shows tooltip; no hover-only requirement.
- [x] Translation remains off by default; no model request is made.

## Result

- Pass / fail: PASS
- Notes: user-confirmed on 2026-11-17; stacked diagnostic + token tooltip verified.
