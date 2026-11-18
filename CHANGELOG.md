# Changelog

## 2.3.2

发布日期：待发布

**2.3.2 是受控的编辑器诊断与离线/只读辅助层。默认关闭实验性编辑器装饰。**

### D3 编辑器诊断

- external CM6：不打包第二份 CodeMirror；隔离库验证宿主扩展注册成功。
- 源码/Live Preview 行级诊断：错误红色虚线，警告橙色波浪线。
- D3 state machine：`disabled → enabling → active → disabled-on-crash`。
- 首次 update 清除 enabling marker；启动残留 marker 自动关闭。
- 3 个不同错误签名触发熔断；关闭后不重建装饰。
- `diagnostics.editorDecorations` 默认关闭；切换后调用 `app.workspace.updateOptions()`。

### D4 辅助

- D4.1 离线词条补全：词典/语法候选，用户选择后插入，不联网。
- D4.2 只读 EpXsC 解释：显式命令、发送前确认、当前块 + 相关释义，不自动写 Markdown。
- `assistance.enabled` 默认关闭。

### 安全

- `main.js` 不包含 CM6/Lezer 实现；CI 用 esbuild metafile 检查。
- 实验编辑器扩展只在隔离库验证；主库安装需要 D3-SMOKE。

## 2.3.0

发布日期：2026-11-18（计划）

**2.3.0 是安全优先的语法诊断层；包含 2.2.0 的可选翻译能力。自动翻译仍默认关闭。**

> 2.2.0 没有单独发布，其 F5/F6/F8 能力并入本版本；避免同一天重复发布。

### 语法诊断（D1）

- lint issue 增加 `line` / `column` / `start` / `end`。
- 括号类问题为精确范围；未登记单位也改为 token 级精确范围。
- 其余规则保留整行近似范围，并标记 `approximate: true`。
- CRLF 输入在 Core 入口归一化；新增 CRLF fixture。
- lint fixtures 扩展到 8 条。

### 渲染层诊断（D2）

- 阅读视图 / Live Preview 的 EpXsC 块：
  - error：红色虚线
  - warning：橙色波浪线
  - hover/点击显示更大的自定义 tooltip
- T/G 块：未入典词显示点线，并复用诊断 tooltip。
- 装饰在重新高亮后保留；渲染行数与源码行数不一致时 fail-open，不包装。

### 诊断入口与设置

- 新增 `diagnostics.enabled` 总开关，默认开启。
- 桌面状态栏显示当前笔记的错误/警告数；点击打开 lint 面板。
- 设置页新增诊断开关和实验性编辑器装饰开关（后者为 2.3.x 预留，默认关闭）。
- 诊断关闭后下划线、未入典词标记、状态栏和命令入口停止工作。

### 可选翻译（并入 2.2.0）

- OpenAI-compatible provider、T 块自动翻译、作者参考面板。
- 默认关闭；不配置模型时无网络请求。
- 缓存、in-flight 去重、超时、逻辑取消和脱敏。

### 未包含

- D3 CodeMirror 内联装饰：移至 2.3.x；初版因打包第二份 CM6 导致编辑器不可用，已回退。
- D4 Codex 式辅助：后续版本。

## 2.2.0（并入 2.3.0，未单独发布）

发布日期：未单独发布

**2.2.0 是可选联网翻译层；默认关闭，不配置模型也能正常阅读。**

### 自动翻译（F5）

- T 块缺当前语言译文时，可选择请求 OpenAI-compatible 模型生成译文。
- 默认关闭；关闭时不创建翻译服务、不发起请求、不加载模型。
- 发送源句、目标语言、源句词典释义、语法摘要和少量已验证译例。
- 译例与源句分区，明确禁止照抄现有文本。
- 内存缓存、in-flight 去重、超时和逻辑取消。
- 缓存键包含源句、语言、词库版本和 provider fingerprint；不含 API Key。
- 人工译文始终优先；自动译文仅显示在内存中，不写入 Markdown。

### 作者参考（F6）

- 新增命令“从中文生成 EpXs 参考”。
- 模型返回 JSON；Core 计算逐词、未知词和 lint。
- 只使用与中文源句相关的词典条目，并附带最小语法上下文。
- 有未知词或 lint error 时标记未通过校验，并禁用“插入参考块”。
- 插入必须由用户点击确认。

### Provider 与隐私（F8）

- 支持本地 Ollama / LM Studio 等 OpenAI-compatible endpoint。
- 非回环地址强制 HTTPS；默认不启用云服务。
- API Key 只保存在插件设置；请求头、URL 敏感参数和异常文本脱敏。
- 首次开启自动翻译时提示请求范围与设备负荷。
- 设置页支持 Base URL、Endpoint、Model、Headers、超时、maxTokens、temperature、连接测试和语法上下文文件。

### 测试与构建

- 新增 provider/service/reference、endpoint、缓存 LRU、取消、超时、脱敏、设置和零网络默认测试。
- `npm run build`、`npm test`、`npm run check`、`npm run release:check` 通过。

## 2.1.0

发布日期：2026-11-17

**2.1.0 是无网络阅读层：不引入模型请求，也不改变 EpXsC 语言语义。**

### 多语言 T 块

- 支持语言标签：> (zh-CN) 译文、> (en) translation。
- 旧式 > 文本 继续作为默认译文。
- 无标签旧块、括号开头的默认译文、it/no/he 等语言码与转义规则均有测试。
- 按 Obsidian 界面语言选择译文；fallbackLanguage 为单次精确/基础语言回退，不递归。
- 缺译文时显示 尚未翻译 / Untranslated，不回退 G 词注。

### 设置与词库

- 新增 EpXsC Syntax 设置页：自定义词库路径、导入 md/json、显示语言、备用语言、诊断。
- 新增左侧栏 EpXsC 设置按钮和“打开 EpXsC 设置”命令。
- 自定义词库按路径顺序覆盖默认词库；以 word 为身份整条覆盖，并生成冲突报告。
- 自定义词库缺失、读取失败或格式错误时保留旧快照，并显示错误。
- 设置读取失败时使用默认值；不因缺少字段报错。
- 2.1.0 全程不发起网络请求。

### Core API

- 新增 src/core/ord/parse.js：parseOrdLines、parseTranslations、normalizeLang、pickTranslation、sourceHash。
- 新增 src/core/settings.js：设置规范化。
- 新增 src/core/lexicon/merge.js：词库整条覆盖与冲突报告。
- 新增 src/ui/settings-tab.js。

### 测试与构建

- 新增语言标签、旧块兼容、默认译文、重复语言、fallback、设置规范化、自定义词库合并和零网络静态测试。
- npm run build、npm test、npm run check、npm run release:check 全部通过。

---

## 2.0.0

发布日期：2026-11-16

**2.0.0 是架构稳定版：不包含 EpXsC 语言语义的破坏性变更。**

### 架构

- 完成 Core / Data / Services / Renderers / UI / Adapter 分层。
- 新增 `src/services/`：`refresh-scheduler`、`lexicon-service`、`spell-registry`、`lint-service`。
- 新增 `src/renderers/`：EpXsC、T/G 数据与 DOM 渲染。
- 新增 `src/ui/`：tooltip、lint modal、diagnostics。
- adapter 从约 72KB 收薄到约 39KB，只保留生命周期、事件、命令和 DOM 挂载。
- 数据源路径集中到 `src/adapter/config.js`；内置词库独立为 `data/builtin-lexicon.json`，带 schema gate。

### 修复

- 修复 T/G refresh 后停留在 `BASE_LISTS` 的着色回归：`rehighlight()` 缺少 `renderOrdBlockInner` 导入。
- 修复渲染拆分时误删的 `EXTRA_WORDS` / `SECTION_POS` / `TYPE_NOTES`，并加回归断言。
- 适配新版《维度模型》的「九序规则」表；秩/序定义重新解析（旧版「九个秩与维度的对应」表仍兼容）。
- 数据回退、空/缺/损坏源、Hover、C/T/G 重渲染均有测试。

### 测试与 CI

- golden fixtures：tokenizer 13、parser 12、lint 7、markup 6。
- 新增 CLI 测试、fake-vault 测试、renderer 测试、history regression。
- CI 在干净构建后校验 `main.js` 无漂移；新增 release asset validator 与 lexicon canonical check。
- `npm run bench` 基准：短块 tokenize ≈ 0.14ms，1000 行词典解析 ≈ 0.47ms，150 token 块 ≈ 1.62ms。

### 文档与工具

- README 英文主文档 + `README.zh-CN.md`；manifest 描述中英双语。
- 新增 `bin/epxsc.mjs` CLI（tokenize / lint / JSON / dictionary+syntax）与 `docs/CLI.md`。
- 新增 `docs/ROADMAP.md`、`docs/RELEASING.md`、`docs/NEXT_RELEASE.md`。

---

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
