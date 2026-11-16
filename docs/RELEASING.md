# 发布节奏

## 一天最多一个 Release

- 以 **Asia/Shanghai** 的日历日为准，每天最多发布一个公开 GitHub Release。
- 当天所有修复、重构、文档改动合并进同一个 Release；不要一修一发。
- 如果当天已有 Release，后续提交只推 **main**，不改版本、不发新 Release。
- 需要发布时，先检查当天是否已有 Release；有则等到下一天。
- 已发布当天唯一 Release 后，如果需要补资产，应**更新该 Release 的 assets**，而不是再建一个 Release。

## 发布前检查

1. `manifest.json` / `package.json` / `BUILD` 版本一致；
2. `npm run build && npm run check && npm test` 通过；
3. 库内实机重载验证 C / T / G 三模式与悬停；
4. CI 成功；
5. 当天没有其他 Release。

## 资产

每个 Release 必须包含：

- `main.js`
- `manifest.json`
- `styles.css`
