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
class ExplainConfirmModal extends Modal {
  constructor(app, endpoint, source, dictionary, adjacent, onConfirm) {
    super(app);
    this.endpoint = String(endpoint || '');
    this.source = String(source || '');
    this.dictionary = String(dictionary || '');
    this.adjacent = typeof adjacent === 'string' ? adjacent : '';
    this.onConfirm = typeof adjacent === 'function' ? adjacent : onConfirm;
  }
  onOpen() {
    const el = this.contentEl;
    el.empty();
    el.createEl('h2', { text: '发送前确认' });
    el.createEl('p', { text: '只发送当前 EpXsC 块和相关词典释义到以下 endpoint。' });
    el.createEl('p', { text: 'endpoint: ' + this.endpoint });
    el.createEl('h3', { text: '将发送的块' });
    const pre = el.createEl('pre');
    pre.textContent = this.source;
    pre.style.whiteSpace = 'pre-wrap';
    if (this.dictionary) {
      el.createEl('h3', { text: '词典上下文' });
      const d = el.createEl('pre');
      d.textContent = this.dictionary;
      d.style.whiteSpace = 'pre-wrap';
    }
    if (this.adjacent) {
      el.createEl('h3', { text: '相邻句上下文（你已开启）' });
      const a = el.createEl('pre');
      a.textContent = this.adjacent;
      a.style.whiteSpace = 'pre-wrap';
    }
    const row = el.createDiv();
    const cancel = row.createEl('button', { text: '取消' });
    cancel.addEventListener('click', () => this.close());
    const ok = row.createEl('button', { text: '发送并解释', cls: 'mod-cta' });
    ok.addEventListener('click', () => { this.close(); this.onConfirm(); });
  }
  onClose() { this.contentEl.empty(); }
}

module.exports = { ExplainModal, ExplainConfirmModal };
