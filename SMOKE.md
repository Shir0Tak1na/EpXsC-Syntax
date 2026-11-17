# EpXsC Syntax — runtime smoke

> Required before a release that changes diagnostics/editor integration.
> Record one row per test run. Unrecorded = not passed.

## Build under test

- Version:
- Build hash / commit:
- Obsidian version:
- Platform: Windows / macOS / Linux / iOS / Android
- Vault: isolated / main
- diagnostics.enabled: on / off
- editorDecorations: on / off (2.3.x only)

## Checks

- [ ] Plugin loads; no "Unrecognized extension value in extension set" in console.
- [ ] Every note in the vault opens.
- [ ] Reading view: error line has red dashed underline; warning has orange wavy underline.
- [ ] Hover/tap on a diagnostic line shows the larger custom tooltip.
- [ ] T/G unknown word has a dotted mark and diagnostic tooltip.
- [ ] Live Preview: code block renders when cursor is outside; entering source does not freeze the editor.
- [ ] Source mode: no crash; diagnostics do not block typing/undo.
- [ ] Switch notes repeatedly; no stale decoration or cross-note issue.
- [ ] Disable/re-enable plugin; notes still open.
- [ ] Toggle diagnostics.enabled; status bar and decorations disappear/reappear after refresh.
- [ ] Status bar count matches the lint panel for a sample note.
- [ ] Large note (>50-line EpXsC block) does not freeze.
- [ ] Mobile/narrow window: tap diagnostic line shows tooltip; no hover-only requirement.
- [ ] Translation remains off by default; no model request is made.

## Result

- Pass / fail:
- Notes:
