'use strict';

const { Modal } = require('obsidian');

/* 检查结果面板：点一行跳到那一处 */
class LintModal extends Modal {
  constructor(app, file, issues, blocks) {
    super(app);
    this.file = file;
    this.issues = issues;
    this.blocks = blocks;
  }

  onOpen() {
    const el = this.contentEl;
    el.addClass('epx-lint');
    el.createEl('h4', { text: 'EpXsC 语法检查 · ' + this.file.basename });
    if (!this.issues.length) {
      el.createEl('div', { class: 'epx-lint-summary', text: this.blocks + ' 个代码块 · 没有发现问题' });
      return;
    }
    let errs = 0;
    for (let i = 0; i < this.issues.length; i++) if (this.issues[i].level === 'error') errs += 1;
    el.createEl('div', { class: 'epx-lint-summary', text: this.blocks + ' 个代码块 · ' + this.issues.length + ' 处（' + errs + ' 错误 / ' + (this.issues.length - errs) + ' 警告）· 点一行跳到该处' });
    const list = el.createEl('div', { class: 'epx-lint-list' });
    const self = this;
    for (let i = 0; i < this.issues.length; i++) {
      const it = this.issues[i];
      const row = list.createEl('div', { class: 'epx-lint-row epx-lint-' + it.level });
      row.createEl('span', { class: 'epx-lint-line', text: '第 ' + it.line + ' 行' });
      row.createEl('span', { class: 'epx-lint-msg', text: it.message });
      row.addEventListener('click', function () {
        self.app.workspace.getLeaf(false).openFile(self.file, { eState: { line: Math.max(0, it.line - 1), ch: 0 } });
        self.close();
      });
    }
  }

  onClose() { this.contentEl.empty(); }
}


module.exports = { LintModal };
