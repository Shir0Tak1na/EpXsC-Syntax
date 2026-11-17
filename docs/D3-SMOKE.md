# D3 SMOKE — executable acceptance

> Companion to `docs/2.3.x-D3-D4-PLAN.md`.
> A release gate is not passed until this file has a completed record with evidence.
> Never test an experimental editor extension in the main vault first.

## Run metadata

| Field | Value |
| :--- | :--- |
| Date | |
| Build / commit | |
| Version under test | |
| Obsidian version | |
| CM6 source (host/external) | |
| Platform | Windows / macOS / Linux / iOS / Android |
| Vault | isolated / main |
| Feature flags | D3 off / D3 on, no decorations / D3 on with decorations |
| Tester | |

## A. D3.0 — root cause evidence

Do not mark “confirmed” merely because the error disappeared after externalization.

- [ ] A1. Isolated vault recreated with the incident build.
- [ ] A2. Incident observed; console error text copied verbatim below.
- [ ] A3. Incident bundle inspected; CM6/Lezer dependency source recorded.
- [ ] A4. Build metafile / dependency diff before vs after externalization saved.
- [ ] A5. External build verified to contain no bundled CM6/Lezer (`npm run check`).
- [ ] A6. Isolated-vault smoke passed after externalization.
- [ ] A7. Conclusion classified: confirmed / partially confirmed / not confirmed.

Incident console text:

```text

```

Dependency evidence location:

```text

```

Conclusion:

```text

```

**Fail conditions:** no reproduction and no honest “not confirmed” note; externalization success presented as root-cause proof; any CM6 in `main.js`.

## B. D3.1 — safe registration and lifecycle (no decorations)

This stage must not draw underlines. It only proves that an extension can register, update, disable and unload without blocking the editor.

### B1. Registration and first editor

- [ ] Plugin loads with D3 enabled.
- [ ] Open a note: editor is usable; no exception in console.
- [ ] Open a second note; no duplicate registration.
- [ ] Open a note with no EpXsC block; no error.

### B2. Update and failure injection

- [ ] Type, undo and redo; no editor freeze.
- [ ] Error injection in constructor produces fail-open, one log, no crash.
- [ ] Error injection in update produces empty decorations, no crash.
- [ ] Error injection in build produces empty decorations, no crash.
- [ ] Same error signature is logged once, not every update.

### B3. Circuit breaker

- [ ] Three distinct signatures disable D3 for the session.
- [ ] Existing decorations are cleared after disable.
- [ ] Re-enable requires an explicit user action.
- [ ] Persistent same error does not spam the log.

### B4. Disable / unload

- [ ] Turn D3 off in settings: no build/update calls afterward.
- [ ] No decoration, timer or marker remains after off.
- [ ] Disable/re-enable plugin; editor remains usable.
- [ ] Normal Obsidian quit clears the enabling marker.

### B5. Crash-loop guard

- [ ] Simulated crash while `enabling`: next start auto-disables D3 and reports it.
- [ ] Simulated crash after `active`: next start follows documented behavior.
- [ ] No editor opened, normal quit: marker cleared; next start not falsely disabled.
- [ ] Plugin update/uninstall with marker present: state is documented and recoverable.
- [ ] User manually disables: state returns to disabled and marker is cleared.

### B6. State machine

- [ ] `disabled -> enabling -> active` recorded.
- [ ] `enabling -> disabled-on-crash` recorded.
- [ ] `active -> disabled-on-crash` recorded.
- [ ] `disabled-on-crash -> disabled` via explicit user action recorded.
- [ ] No undocumented transition observed.

## C. D3.2 — decorations (only after B passes)

- [ ] Multi-line block maps line/column correctly.
- [ ] Visible-range boundary issues are clipped or skipped safely.
- [ ] Document edit invalidates stale decorations.
- [ ] Empty block, one-line block, over-limit block handled.
- [ ] Error and warning line styles are distinct without color only.
- [ ] Turning D3 off clears all decorations without restart.

## D. Result

| Section | Pass / fail | Notes |
| :--- | :--- | :--- |
| A. D3.0 evidence | | |
| B. D3.1 lifecycle | | |
| C. D3.2 decorations | | |
| Overall | | |

Release rule: **D3.0 must not be reported as confirmed without A1–A4; D3.1 must pass B before C; C does not compensate for failed B.**
