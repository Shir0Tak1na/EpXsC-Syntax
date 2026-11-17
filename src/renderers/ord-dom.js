'use strict';

/* DOM mount for EpXsT/EpXsG records. Uses document; no Obsidian API. */

const { parseOrdBlocks } = require('./ord-renderer.js');
const { SECTION_POS } = require('../ui/tooltip.js');

function renderOrdBlockInner(el, source, mode, grammar, info, options) {
  const records = parseOrdBlocks(source, mode, grammar, info, SECTION_POS, options);
  const wrap = document.createElement('div');
  wrap.className = 'epx-ord-wrap';
  const code = document.createElement('div');
  code.className = 'epx-ord epx-ord-' + mode;
  wrap.appendChild(code);
  const appendHTML = function (parent, html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    parent.appendChild(tpl.content);
  };
  const markUnknownIn = function (root) {
    if (!info || !root || !root.querySelectorAll) return;
    const spans = root.querySelectorAll('span.token.word');
    for (let i = 0; i < spans.length; i++) {
      const w = (spans[i].textContent || '').toLowerCase();
      if (w.length < 4 || /[0-9]/.test(w)) continue;
      if (info.has(w)) continue;
      spans[i].classList.add('epx-unknown');
      const msg = '未入典：' + spans[i].textContent;
      spans[i].setAttribute('data-epx-lint', msg);
      spans[i].setAttribute('aria-label', msg);
    }
  };
  const lineEl = function () {
    const d = document.createElement('div');
    d.className = 'epx-oline';
    return d;
  };
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.kind === 'gap') {
      const gap = document.createElement('div');
      gap.className = 'epx-gap';
      code.appendChild(gap);
      continue;
    }
    const line = lineEl();
    if (mode === 'G') {
      const gs = document.createElement('div');
      gs.className = 'epx-gs';
      const toks = record.tokens || [];
      for (let j = 0; j < toks.length; j++) {
        const tok = toks[j];
        const gw = document.createElement('span');
        gw.className = 'epx-gw';
        const srcEl = document.createElement('span');
        srcEl.className = 'epx-gsrc token ' + tok.cls;
        srcEl.textContent = tok.text;
        gw.appendChild(srcEl);
        markUnknownIn(gw);
        if (tok.gloss) {
          const gg = document.createElement('span');
          gg.className = 'epx-ggl';
          gg.textContent = tok.gloss;
          gw.appendChild(gg);
        }
        gs.appendChild(gw);
      }
      line.appendChild(gs);
    } else if (record.src) {
      const srcEl = document.createElement('div');
      srcEl.className = 'epx-tsrc';
      appendHTML(srcEl, record.html || '');
      markUnknownIn(srcEl);
      line.appendChild(srcEl);
    }
    if (record.zh) {
      const zh = document.createElement('div');
      zh.className = 'epx-tzh';
      zh.textContent = record.zh;
      line.appendChild(zh);
    } else if (mode === 'T') {
      const zh = document.createElement('div');
      zh.className = 'epx-tzh epx-tuntranslated';
      zh.textContent = '尚未翻译 / Untranslated';
      line.appendChild(zh);
      if (record.translationState === 'untranslated' && options && options.autoTranslate && options.translationService && record.src) {
        zh.className = 'epx-tzh epx-t-auto';
        zh.textContent = '自动翻译中…';
        Promise.resolve(options.translationService.translate({
          text: record.src,
          sourceLang: 'epxsc',
          targetLanguage: options.requestedLanguage || 'zh-CN',
          lexiconVersion: options.lexiconVersion || '',
          context: options.translationContext ? options.translationContext(record.src) : '',
          grammarContext: options.grammarContext || ''
        })).then(function (result) {
          if (!zh.isConnected) return;
          if (result && result.ok) {
            zh.textContent = result.text;
            zh.classList.remove('epx-tuntranslated');
            zh.classList.add('epx-t-auto');
          } else {
            zh.textContent = '自动翻译失败（可重试）';
            zh.classList.add('epx-t-failed');
            console.warn('[EpXsC Syntax] 自动翻译失败：', result && result.error);
          }
        }).catch(function () {
          if (zh.isConnected) zh.textContent = '自动翻译失败（可重试）';
        });
      }
    }
    code.appendChild(line);
  }
  el.textContent = '';
  el.appendChild(wrap);
}
/* 包一层：普通句渲染出错时退化成普通代码块，不要变成 Obsidian 的「代码块渲染错误」。 */
function renderOrdBlock(el, source, mode, grammar, info, options) {
  try {
    renderOrdBlockInner(el, source, mode, grammar, info, options);
  } catch (err) {
    console.warn('[EpXsC Syntax] 普通句渲染失败：', err);
    try {
      if (el && el.empty) el.empty();
      if (el && el.createEl) el.createEl('pre', { text: String(source || '') });
    } catch (e) { /* 兜底也失败就算了 */ }
  }
}

/* 实时预览里，被「代码块处理器」渲染出来的块是一个部件：点它不会自动回到源码。
   这里把光标送进块首，于是点一下（含双击的第一下）就能编辑；阅读视图不动。 */

module.exports = { renderOrdBlock, renderOrdBlockInner };
