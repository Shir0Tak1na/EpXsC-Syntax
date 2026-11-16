# Changelog

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
