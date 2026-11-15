# EpXsC Syntax

![GitHub release](https://img.shields.io/github/v/release/Shir0Tak1na/EpXsC-Syntax-Highlight) ![License](https://img.shields.io/github/license/Shir0Tak1na/EpXsC-Syntax-Highlight) ![Obsidian](https://img.shields.io/badge/Obsidian-1.4.0%2B-7c3aed)

为 **EpXsC（述无空语构造记号 / Expaulxsirian Construct）** 代码块提供语法高亮、词义悬停与语法检查的 Obsidian 插件。

Syntax highlighting, hover tooltips, and linting for EpXsC fenced code blocks.

```EpXsC
Expaste(METOS: a, METOS: b) {
	intervall(a, b) <= 66 miteas;
	luss (15 + 35 * intervall(a, b)) MU;
}
```

## Features / 功能

- **语法高亮** —— 为 `EpXsC`、`EpXsT`、`EpXsG` 三种代码块着色；语言名大小写不敏感。
- **词义悬停** —— 停在 token 上显示类别与释义；数据来自库内词典，改词典即改提示。
- **语法检查** —— 一条命令检查当前笔记：括号配对、条款次序、单位搭配、常量改写、坐标轴数等。
- **词典即配置** —— 自动读取库内的《述无空语词典》《术式语法》《维度模型》；读不到时退回内置快照。
- **阅读视图 + 实时预览** —— 两个视图都渲染；点一下渲染块即落回源码继续编辑。
- **移动端可用** —— 窄屏下外框、译文与词注不会挤成正文。
- **可选 CSS 片段** —— 不想开插件、只要配色的场合，可单独使用 `snippets/EpXsC-Highlight.css`。

## Installation / 安装

### 社区插件市场

1. 打开 Obsidian → **设置 → 第三方插件（Community plugins）**，关闭安全模式；
2. 点 **浏览（Browse）**，搜索 **EpXsC Syntax**；
3. **安装 → 启用**。`styles.css` 会随插件自动加载，**不需要**再启用 CSS 片段。

### BRAT

添加仓库 `Shir0Tak1na/EpXsC-Syntax-Highlight`，然后启用插件。

### 手动安装

1. 下载 Release 里的 `main.js`、`manifest.json`、`styles.css`；
2. 放进 `<库>/.obsidian/plugins/epxsc-syntax/`；
3. 重启 Obsidian → 设置 → 第三方插件 → 启用 **EpXsC Syntax**。

## Usage / 使用

### 代码块

| 语言名 | 用途 |
| :-- | :-- |
| `EpXsC` | 术式正文：着色、词义、语法检查 |
| `EpXsT` | 句子对译：原文与译文按块排版 |
| `EpXsG` | 语法标记：词性/成分标注 |

语言名 `EpXsC` / `epxsc` / `EPXSC` 等效；`EpXsT`、`EpXsG` 同理。

### 悬停

阅读视图和实时预览里，鼠标停在 token 上会浮出类别与释义。移动端没有鼠标悬停，词义请在桌面端查看。

### 命令

命令面板搜索 **EpXsC**：

| 命令 | 作用 |
| :-- | :-- |
| 检查当前笔记的 EpXsC 代码块 | 打开语法检查面板，点结果跳转到对应行 |
| 重新载入词表与释义 | 词典/术式语法/维度模型改动后手动刷新 |
| EpXsC 自检（视图／token／颜色／样式表） | 排查“为什么没颜色/没悬停” |
| EpXsC 诊断报告 | 在库根目录生成诊断文件，便于贴出排查 |
| 重载 EpXsC 插件 | 提示到设置里关闭再启用 |

## Dictionaries / 词典

插件启动时读取（存在即优先）：

| 文件 | 提供 |
| :-- | :-- |
| `世界设定集/地域文化图鉴/语言/述无空语/述无空语词典.md` | 词性、释义、缩写 |
| `世界设定集/地域文化图鉴/语言/述无空语/述无空语术式语法.md` | 筛选键、单位表 |
| `世界设定集/设定概念集合/维度/维度模型.md` | 秩与维度的对应 |

改这三份文件后插件会自动重读；换库或改路径时，同步修改 `main.js` 里的 `DICT_PATH`、`SYNTAX_PATH`、`RANK_PATH`。读不到文件（例如别人下载的库）时使用内置词库快照，开箱即用。

## Customization / 自定义

配色走 `styles.css` 里的 CSS 变量：`--epx-comment`、`--epx-decl`、`--epx-keyword`、`--epx-type`、`--epx-verb` 等；改变量即可换色，不必动 `main.js`。

只要配色、不要插件功能：把 `snippets/EpXsC-Highlight.css` 放进 `<库>/.obsidian/snippets/`，在外观 → CSS 片段里启用；但没有 token 着色，只有代码块外框与静态样式。

## Compatibility / 兼容性

- 最低 Obsidian **1.4.0**；桌面与移动端都可启用。
- 阅读视图、实时预览都支持；实时预览中光标进入代码块会暂时显示源码，这是 Obsidian 的默认行为。
- **超过 50 行**的代码块只保留普通代码块外观，不做 token 着色（性能考虑）。
- 外框与右上角语言签使用 `:has()`，需要 iOS 15.4+ / 较新的 Chromium；不支持时仅外框不出现，token 着色不受影响。
- 插件不发起网络请求，不修改笔记内容。

## Development / 开发

没有构建步骤：`main.js` 就是源码，`styles.css` 就是样式。

| 文件 | 作用 |
| :-- | :-- |
| `main.js` | 插件入口：分词、代码块处理器、悬停、检查、词典加载 |
| `styles.css` | token 配色、代码块外框、T/G 版面 |
| `snippets/EpXsC-Highlight.css` | 独立配色片段 |
| `manifest.json` / `versions.json` | 插件元数据与版本映射 |

本地调试：把仓库放进 `<库>/.obsidian/plugins/epxsc-syntax/`，在 Obsidian 里重载插件；改 `main.js` 后关闭再启用即可。Release 附件只放 `main.js`、`manifest.json`、`styles.css` 三个文件。

## Release notes

[GitHub Releases](https://github.com/Shir0Tak1na/EpXsC-Syntax-Highlight/releases)

## License

[Apache-2.0](LICENSE)
