'use strict';

const { Modal, Setting, Notice, MarkdownView } = require('obsidian');

class ReferenceModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.result = null;
    this.chinese = '';
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'EpXsC 参考翻译' });
    contentEl.createEl('p', { text: '输入中文，模型生成 EpXs 参考；结果不会自动写入正文。' });

    const source = contentEl.createEl('textarea');
    source.rows = 4;
    source.style.width = '100%';
    source.placeholder = '输入中文句子…';
    source.addEventListener('input', () => { this.chinese = source.value; });

    const status = contentEl.createEl('p', { text: '' });
    const output = contentEl.createEl('div');

    new Setting(contentEl)
      .addButton((btn) => btn.setButtonText('生成参考').setCta().onClick(async () => {
        const text = String(source.value || '').trim();
        if (!text) { new Notice('请先输入中文'); return; }
        status.textContent = '生成中…';
        btn.setDisabled(true);
        try {
          const result = await this.plugin.generateReference(text);
          this.result = result;
          output.empty();
          if (!result || !result.ok) {
            status.textContent = '生成失败：' + (result && result.error ? result.error.message : '未知错误');
            return;
          }
          status.textContent = '参考结果；请自行核对，不会自动写入正文。';
          output.createEl('h3', { text: '参考 EpXs' });
          output.createEl('pre', { text: result.reference });
          if (result.backTranslation) {
            output.createEl('h3', { text: '模型回译（非权威）' });
            output.createEl('p', { text: result.backTranslation });
          }
          if (result.notes && result.notes.length) {
            output.createEl('h3', { text: '备注' });
            const ul = output.createEl('ul');
            result.notes.forEach((n) => ul.createEl('li', { text: String(n) }));
          }
          if (result.wordBreakdown && result.wordBreakdown.length) {
            output.createEl('h3', { text: '逐词' });
            const table = output.createEl('table');
            const head = table.createEl('tr');
            head.createEl('th', { text: '词' });
            head.createEl('th', { text: '释义' });
            result.wordBreakdown.forEach((w) => {
              const row = table.createEl('tr');
              row.createEl('td', { text: w.text });
              row.createEl('td', { text: w.gloss || '（未知）' });
            });
          }
          if (result.unknownWords && result.unknownWords.length) {
            output.createEl('h3', { text: '未知词' });
            output.createEl('p', { text: result.unknownWords.map((w) => w.text).join('、') });
          }
          if (result.lint && result.lint.length) {
            output.createEl('h3', { text: '语法检查' });
            const ul = output.createEl('ul');
            result.lint.forEach((issue) => ul.createEl('li', { text: issue.message || String(issue) }));
          }
          new Setting(output)
            .addButton((b) => b.setButtonText('复制参考').onClick(async () => {
              try { await navigator.clipboard.writeText(result.reference); new Notice('已复制'); } catch (e) { new Notice('复制失败'); }
            }))
            .addButton((b) => b.setButtonText('插入参考块').onClick(() => this.insertReference(result.reference, text)));
        } catch (err) {
          status.textContent = '生成失败：' + (err && err.message ? err.message : err);
        } finally {
          btn.setDisabled(false);
        }
      }));
  }

  insertReference(reference, chinese) {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !view.editor) { new Notice('请先打开一个 Markdown 笔记'); return; }
    const block = '\x60\x60\x60EpXsT\n' + reference + '\n> (zh-CN) ' + String(chinese).replace(/\n/g, ' ') + '\n\x60\x60\x60\n';
    view.editor.replaceSelection(block);
    new Notice('已插入参考块');
    this.close();
  }

  onClose() { this.contentEl.empty(); }
}

module.exports = { ReferenceModal };
