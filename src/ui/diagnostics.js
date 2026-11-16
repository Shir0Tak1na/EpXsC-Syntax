'use strict';

const { MarkdownView, Notice } = require('obsidian');

async function diagnose(plugin, BUILD) {
    const L = [];
    const add = function (s) { L.push(s); };
    add('# EpXsC 诊断报告');
    add('');
    add('- 代码版本（BUILD）：' + BUILD);
    add('- manifest 版本：' + ((plugin.manifest && plugin.manifest.version) || '?'));
    add('- 插件目录：' + ((plugin.manifest && plugin.manifest.dir) || '?'));
    add('- 生成时间：' + new Date().toLocaleString());
    let mode = '非笔记视图';
    try {
      const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
      if (view) mode = view.getMode() === 'preview' ? '阅读视图' : '实时预览／源码';
    } catch (e) { /* 忽略 */ }
    add('- 当前视图：**' + mode + '**');
    add('- 词表：词条 ' + plugin.info.size + ' · 词根 ' + (plugin.roots ? plugin.roots.size : '-') + ' · 秩 ' + plugin.ranks.size + ' · 谓词 ' + plugin.grammar.predicate.source.length + ' 字符');
    add('- 自带切词器：已装（不依赖 window.Prism）');
    add('- Prism：' + (window.Prism ? '有' : '**没有**') + ' · 语法 EpXsC：' + (window.Prism && window.Prism.languages && window.Prism.languages.EpXsC ? '已装' : '**缺失**'));
    add('');
    const codes = document.querySelectorAll(':is(code[class*="language-EpXsC" i], .epx-ord)');
    add('## 代码块（' + codes.length + ' 个）');
    for (let i = 0; i < codes.length && i < 6; i++) {
      const el = codes[i];
      let tokens = 0;
      let color = '-';
      try {
        tokens = el.querySelectorAll('span.token').length;
        const first = el.querySelector('span.token');
        if (first && window.getComputedStyle) color = window.getComputedStyle(first).color;
      } catch (e) { color = '(测不到)'; }
      add('- 第 ' + (i + 1) + ' 个：class="' + (el.className || '') + '" · token ' + tokens + ' 个 · 首个 token 颜色 ' + color);
    }
    add('');
    add('## 样式表');
    let ourRules = 0;
    try {
      const sheets = document.styleSheets || [];
      add('- 共 ' + sheets.length + ' 张');
      for (let i = 0; i < sheets.length; i++) {
        let n = 0;
        let ours = 0;
        let rules = null;
        try { rules = sheets[i].cssRules; } catch (e) { add('- 第 ' + (i + 1) + ' 张：读不到（跨源）' + (sheets[i].href ? ' href=' + sheets[i].href : '')); continue; }
        if (rules) {
          n = rules.length;
          for (let j = 0; j < rules.length; j++) {
            const sel = rules[j].selectorText || '';
            if (sel.indexOf('.epx-') >= 0 || sel.indexOf('.token.') >= 0) ours += 1;
          }
        }
        ourRules += ours;
        add('- 第 ' + (i + 1) + ' 张：' + n + ' 条规则，其中我们的 ' + ours + ' 条' + (sheets[i].href ? ' · href=' + sheets[i].href : ''));
      }
    } catch (e) { add('- 读样式表出错：' + (e && e.message)); }
    add('- 命中我们选择器的规则合计：' + ourRules);
    add('- 兜底状态：' + (plugin._styleState || '(还没跑)'));
    add('');
    add('## 插件目录里的 styles.css');
    try {
      const dir = (plugin.manifest && plugin.manifest.dir) || '.obsidian/plugins/epxsc-syntax';
      const css = await plugin.app.vault.adapter.read(dir + '/styles.css');
      const lines = String(css).split('\n');
      add('- 读到 ' + css.length + ' 字符 · 含 .epx-tip：' + (css.indexOf('.epx-tip') >= 0 ? '是' : '**否**') + ' · 含 --epx-modifier：' + (css.indexOf('--epx-modifier') >= 0 ? '是' : '否'));
      add('- 前 3 行：');
      for (let i = 0; i < 3 && i < lines.length; i++) add('    ' + (i + 1) + '. ' + lines[i]);
    } catch (e) { add('- **读不到**：' + (e && e.message)); }
    add('');
    add('## 样例代码块（下面这块在阅读视图里应当有颜色）');
    add('');
    add('\x60\x60\x60EpXsC');
    add('Purificatio(priv locus: zone) {');
    add('\tconsta lit = 3 MU;');
    add('\tpriv x = &zone;');
    add('\tpubl consta total = lit;');
    add('\tne navis *&zone');
    add('\tluss lit;');
    add('}');
    add('\x60\x60\x60');
    const text = L.join('\n');
    try {
      await plugin.app.vault.adapter.write('EpXsC 诊断报告.md', text);
      new Notice('诊断报告已写入库根目录：EpXsC 诊断报告.md（代码版本 ' + BUILD + '）', 12000);
    } catch (e) {
      new Notice('写报告失败：' + (e && e.message));
    }
    return text;
  }



function selfCheck(plugin, BUILD) {
    let mode = '非笔记视图';
    try {
      const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
      if (view) mode = view.getMode() === 'preview' ? '阅读视图' : '实时预览／源码';
    } catch (err) { /* 忽略 */ }
    const codes = document.querySelectorAll(':is(code[class*="language-EpXsC" i], .epx-ord)');
    let tokened = 0;
    let ordBlocks = 0;
    for (let i = 0; i < codes.length; i++) {
      if (codes[i].classList && codes[i].classList.contains('epx-ord')) ordBlocks += 1;
      if (codes[i].querySelector('span.token')) tokened += 1;
    }
    const lines = document.querySelectorAll('.HyperMD-codeblock').length;
    /* 决定性三问：token 有没有、算出来的颜色是什么、样式表载入没有 */
    let firstClass = '(没有代码块)';
    let tokenCount = 0;
    let color = '(未测)';
    if (codes[0]) {
      firstClass = codes[0].className || '(空)';
      tokenCount = codes[0].querySelectorAll('span.token').length;
      const first = codes[0].querySelector('span.token');
      try { if (first && window.getComputedStyle) color = window.getComputedStyle(first).color; } catch (e) { color = '(读不到)'; }
    }
    let styleState = '未知';
    try {
      let n = 0;
      const sheets = document.styleSheets || [];
      for (let i = 0; i < sheets.length; i++) {
        let rules = null;
        try { rules = sheets[i].cssRules; } catch (e) { continue; }
        if (!rules) continue;
        for (let j = 0; j < rules.length; j++) {
          const sel = rules[j].selectorText || '';
          if (sel.indexOf('.token.') >= 0 || sel.indexOf('.epx-tip') >= 0) n += 1;
        }
      }
      styleState = n ? '已载入 ' + n + ' 条着色规则' : '未载入 ✗（styles.css 没生效）';
    } catch (e) { styleState = '读不到'; }
    new Notice([
      'EpXsC 自检 · 代码版本 ' + BUILD,
      '词条 ' + plugin.info.size + ' · 秩 ' + plugin.ranks.size + ' · 语法' + (plugin.grammar ? '已装' : '缺失') + ' · 切词器：自带（Prism ' + (window.Prism ? '有' : '没有') + '）',
      '当前视图：' + mode,
      'EpXsC 代码块 ' + (codes.length - ordBlocks) + ' 个 · 普通句块（G／T）' + ordBlocks + ' 个 · 带 token 的 ' + tokened + ' 个 · 实时预览代码行 ' + lines + ' 行',
      (codes.length > 0 && tokened === 0 && mode === '阅读视图' ? '⚠ 阅读视图里这些块没有 token —— 渲染没跑起来，请把这几行发我' : '渲染：' + (tokened > 0 ? '正常' : '无代码块')),
      '首个块 class：' + firstClass,
      '首个块 token 数：' + tokenCount + ' · 首个 token 颜色：' + color,
      '样式表：' + styleState + (plugin._styleState ? ' · 兜底：' + plugin._styleState : '')
    ].join('\n'), 15000);
  }



module.exports = { diagnose, selfCheck };
