# Changelog

## Unreleased

- T0.2：新增 8 个 parser、7 个 lint、6 个 markup golden fixtures；fixture-runner 接入 parser / lint / markup 目录。
- 文档：README.md 改为英文主文档，中文完整保留在 README.zh-CN.md；manifest 描述改为中英双语，响应 Obsidian Community 对英文 README 的要求。
- T1.2：内置快照加入 `schemaVersion` / `lexiconVersion` / `generatedAt`，adapter 通过 `src/data/lexicon.js` 做 schema gate；不兼容或缺字段时回退空表，Vault 数据仍可用。
- T1.1：内置词库从 adapter 迁到 `data/builtin-lexicon.json`；新增 `scripts/generate-lexicon.mjs --check` 保证规范化，`npm test` 覆盖快照结构。
- T0.3/T0.4：历史 Bug 静态回归（T/G 重渲染、hover 常量、C 框线权重、抽离漏常量）与四类 fixture runner/CI 收口。
- T0.1：新增 13 个 tokenizer golden fixtures（tests/fixtures/tokenizer/）与 scripts/fixture-runner.mjs，接入 npm test；覆盖关键字、类型、单位、数字、秩区间、括号、注释/注解、坐标串、否定、空输入、CRLF、转义与长输入。

## 1.31.0

发布日期：2026-11-16

### 架构

- 建立构建边界：源码在 `src/`，根目录 `main.js` 由 esbuild 生成，不再手改。
- 拆出 `src/core/`（grammar、tokenizer、markup、lint、spells、代码围栏提取）与 `src/data/parsers.js`（词典 / 词根 / 秩 / 筛选键 / 单位）。
- 新增 `src/core/index.js` 聚合导出与稳定别名：`extractBlocks`、`parseDictionary`、`buildGrammar`、`tokenize`、`lint`。
- Obsidian 相关代码收口到 `src/adapter/plugin.js`；删除 `src/legacy/`。
- 新增 `docs/ARCHITECTURE.md` 实际分层与 API 合同、`docs/RELEASING.md` 发布节奏。

### 修复

- 修复 T/G 在词典载入前使用兜底 grammar 渲染、之后不再重绘的问题：`refresh()` 完成后重新渲染所有 `.epx-ord` 块。
- 修复三模式悬停失效：`CLASS_ORDER` / `CLASS_LABEL` / `SYMBOL_INFO` 被错误移入 tokenizer 模块，已放回悬停区并加回归测试。
- 修复 C 模式左侧框线消失：`.epx-pre` 选择器权重不足，改为 `pre.epx-pre`。
- 移除全部临时诊断命令与运行时写入（`epxsc-runtime-*`、token dump）。

### 构建与测试

- `npm run build` / `npm run check` / `npm test` 全部通过。
- 测试覆盖：代码围栏别名、CRLF、行号映射、术式作用域、tokenizer、括号、parser、hover、markup。
- CI 增加构建 / 校验 / 测试；Release provenance attestation 成功。
- Release 资产：`main.js`、`manifest.json`、`styles.css`。

---

## 1.30.0

- 数据源监听覆盖 `create` / `delete` / `rename`，并纳入 `ROOTS_DIR`；300ms debounce 合并连续保存。
- `refresh()` 增加 generation guard，慢任务不再覆盖新数据。
- Linter 代码块提取抽成 `extractEpXsCBlocks`，统一 `EpXsC` 大小写别名，并修正围栏行号映射。
- `priv` / `tut` 越权检查同时比较文件路径与行范围。
- 看门狗在窗口隐藏时跳过扫描。
- 新增 `scripts/test.mjs` 行为测试（别名、CRLF、作用域）。

## 1.29.1

- 处理 CSS lint warning：`text-decoration` 拆成长属性、去掉 `:has` 已完成的遗留、移除 color/background 的重复 fallback、用 `page-break-inside` 替代 `break-inside`。
- README 底部加 powered by dsh 徽章。

## 1.29.0

- 收窄词典查找：不再 `vault.getFiles()` 全库枚举，只遍历词典所在目录与《魔法》目录。
- `self-check` / 诊断报告现在也统计 EpXsT / EpXsG 块。
- 去掉 `pre:has()`：由插件给 `<pre>` 加 `.epx-pre` 类，减少宽泛选择器与 CSS lint warning。
- 新增 `npm run check`、GitHub Actions 校验与 Release provenance attestation。

## 1.28.14

- 修复 T/G 代码块 token 悬停：阅读模式改用 `.epx-ord` 容器后，悬停选择器没有同步。
- 窄屏下 T/G 的内边距保持 `0 0.9em 0.9em`，不被桌面端 `!important` 覆盖。
- 词表刷新日志改为仅在 `window.__epxscDebug` 时输出。

## 1.28.13

- T/G 外框恢复与术式块一致的 `1.1em / 1.15em` 内边距。

## 1.28.12

- T/G 首行 `text-indent`、`margin-top` 归零。

## 1.28.11

- T/G 外层由 `<code>` 改为 `<div>`，避免阅读视图把它当普通代码块重新“注水”。
- token 配色选择器扩展为 `:is(code[class*="language-EpXsC"], .epx-ord)`。

## 1.28.10

- 补回 `renderOrdBlockInner` 丢失的 `pending` 声明。
- EpXsT 改用 DOM 节点渲染，阅读模式恢复着色、悬停与逐行译文。

## 1.28.7

- EpXsT 的原文/译文行改用块级结构，修复阅读视图里译文挤成一段。

## 1.28.4

- 悬停限定在 EpXsC / EpXsT / EpXsG 代码块。
- EpXsT / EpXsG 的阅读视图与窄屏版面加固。
