# Next release checklist

> Current release: **2.0.0**（2026-11-16，架构稳定版）.
> 2.0.0 was an explicitly authorized exception to the normal one-release-per-day rule.
> From now on: at most one public GitHub Release per Asia/Shanghai calendar day.

## Candidate

- Next version: **2.0.1** or **2.1.0** depending on whether the next batch is fix-only or includes new behavior.
- Base: current `main` after 2.0.0.

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
