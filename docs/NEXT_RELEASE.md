# Next release checklist

> Current release: **2.1.0**（2026-11-17，无网络阅读层）.
> Next planned: **2.3.0**（语法诊断层；并入未单独发布的 2.2.0）. Planned 2026-11-18. At most one public GitHub Release per Asia/Shanghai calendar day.

## Candidate

- Next version: **2.3.0**（D1/D2 + 2.2 翻译层；D3 推迟到 2.3.x）.
- Status: release gates pass; runtime smoke pending in SMOKE.md.
- Base: current `main` after 2.1.0.

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
