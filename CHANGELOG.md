# Changelog

## 1.31.0

- 重构目录：`src/core`（纯语言逻辑）、`src/data`（解析）、`src/adapter`（Obsidian 适配）、`src/main.js` + esbuild 构建产物。
- 修复 T/G 在词典载入前用兜底 grammar 渲染且不重绘的问题：refresh 后重新渲染 `.epx-ord` 块。
- 修复 hover 常量、C 块 `pre.epx-pre` 选择器权重问题。
- 移除全部临时诊断命令/写入。
- 引入 `src/` + esbuild：`main.js` 改为构建产物，`src/core/` 开始承载可测试纯逻辑。
- 代码围栏提取器抽到 `src/core/markdown-blocks.js`，插件与测试共用。
- 词典 / 词根 / 秩 / 筛选键 / 单位 parser 抽到 `src/data/parsers.js`。
- 术式登记与 Lint 纯逻辑抽到 `src/core/spells.js` / `src/core/lint.js`。
- 语法构造与 tokenizer 抽到 `src/core/grammar.js` / `src/core/tokenizer.js`。
- 括号深度、变量分析、字典键等 token 后处理抽到 `src/core/markup.js`。
- CI 增加 `npm ci` / `npm run build`；测试覆盖 CLI 构建链。
- 运行时行为不变。
- `src/legacy/plugin.js` 更名为 `src/adapter/plugin.js`；新增 `src/core/index.js` 聚合导出；运行时诊断写入已移除。

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
