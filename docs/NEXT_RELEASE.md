# Next release checklist

> Current release: **2.3.0**（2026-11-18，语法诊断层）.
> Next planned: **2.3.1**（D3.0 evidence + D3.1 safe lifecycle, no decorations）. At most one public GitHub Release per Asia/Shanghai calendar day. At most one public GitHub Release per Asia/Shanghai calendar day.

## Candidate

- Next version: **2.3.1**（D3.0 evidence + D3.1 safe lifecycle, no decorations）.
- Status: external-CM6 no-op spike passed in isolated vault; lifecycle/error injection pending.
- Base: current `main` at 2.3.0.

## Steps

1. Decide patch vs minor and bump `manifest.json`, `package.json`, `package-lock.json`, `versions.json`, and `src/adapter/plugin.js` `BUILD` together.
2. Update CHANGELOG from `Unreleased`.
3. `npm run build && npm run check && npm test && npm run release:check && npm run bench`.
4. Sync `main.js` / `manifest.json` / `styles.css` to the vault and manually test C/T/G, hover and lint.
5. Commit/push; wait for CI success.
6. Verify today has no other Release.
7. Create the Release with exactly those three assets.
8. Verify attestation and asset names.

## Release policy

- At most one Release per calendar day.
- Missing assets or metadata after publishing: update the same Release's assets rather than creating another.
- No language semantic changes without an explicit decision.
