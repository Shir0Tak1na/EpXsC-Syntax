'use strict';

const { Modal, Notice } = require('obsidian');

class ExplainModal extends Modal {
  constructor(app, source, explanation) {
    super(app);
    this.source = String(source || '');
    this.explanation = String(explanation || '');
  }
  onOpen() {
    const el = this.contentEl;
    el.empty();
    el.createEl('h2', { text: 'EpXsC 解释（只读）' });
    el.createEl('p', { text: '这只是模型解释，不是语法判定；不会修改正文。' });
    el.createEl('h3', { text: '源块' });
    const pre = el.createEl('pre');
    pre.textContent = this.source;
    pre.style.color = 'var(--text-normal)';
    pre.style.background = 'var(--background-secondary)';
    pre.style.padding = '0.7em 0.9em';
    pre.style.borderRadius = 'var(--radius-s)';
    pre.style.whiteSpace = 'pre-wrap';
    el.createEl('h3', { text: '解释' });
    const out = el.createEl('div');
    out.style.whiteSpace = 'pre-wrap';
    out.style.lineHeight = '1.6';
    out.textContent = this.explanation;
  }
  onClose() { this.contentEl.empty(); }
}
module.exports = { ExplainModal };
