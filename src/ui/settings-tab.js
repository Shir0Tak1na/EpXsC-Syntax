'use strict';

const { PluginSettingTab, Setting, Notice } = require('obsidian');
const { normalizeSettings } = require('../core/settings.js');

class EpXsSettingsTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  scheduleSave(delay) {
    if (this._saveTimer) window.clearTimeout(this._saveTimer);
    this._saveTimer = window.setTimeout(() => { this._saveTimer = null; this.persist(); }, typeof delay === 'number' ? delay : 400);
  }

  hide() {
    if (this._saveTimer) window.clearTimeout(this._saveTimer);
    this._saveTimer = null;
  }

  async persist() {
    try {
      await this.plugin.saveSettings();
    } catch (err) {
      new Notice('EpXsC 设置保存失败：' + (err && err.message ? err.message : err));
    }
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'EpXsC Syntax 设置' });
    containerEl.createEl('p', { text: '2.1.0 只包含词库与阅读设置；翻译模型配置属于 2.2.0。' });

    containerEl.createEl('h3', { text: '词库' });
    const def = containerEl.createEl('p', {
      text: '默认词库由插件内置路径读取；自定义词库按列表顺序覆盖，越靠后优先级越高。'
    });
    def.addClass && def.addClass('setting-item-description');

    const paths = this.plugin.settings.lexicon.customPaths.join('\n');
    new Setting(containerEl)
      .setName('自定义词库路径')
      .setDesc('每行一个 Vault 路径，例如：世界设定集/我的词库.md')
      .addTextArea((text) => {
        text.inputEl.rows = 4;
        text.inputEl.style.width = '100%';
        text.setValue(paths).onChange(async (value) => {
          this.plugin.settings.lexicon.customPaths = String(value || '').split(/\r?\n/);
          this.plugin.settings = normalizeSettings(this.plugin.settings);
          this.scheduleSave();
        });
      });

    new Setting(containerEl)
      .setName('导入自定义词库')
      .setDesc('把 .md 或 .json 文件复制到插件目录的 lexicons/ 下，并加入路径列表。')
      .addButton((btn) => btn.setButtonText('选择文件').onClick(() => this.pickFile()));

    if (this.plugin.lexiconConflicts && this.plugin.lexiconConflicts.length) {
      containerEl.createEl('h4', { text: '词库冲突' });
      const list = containerEl.createEl('ul');
      this.plugin.lexiconConflicts.slice(0, 20).forEach((c) => {
        list.createEl('li', { text: c.word + '：' + (c.previous && c.previous.meaning) + ' → ' + (c.next && c.next.meaning) + '（' + c.source + '）' });
      });
    }
    if (this.plugin.customDictionaryErrors && this.plugin.customDictionaryErrors.length) {
      containerEl.createEl('h4', { text: '词库错误' });
      const list = containerEl.createEl('ul');
      this.plugin.customDictionaryErrors.forEach((e) => list.createEl('li', { text: e.path + '：' + e.message }));
    }

    containerEl.createEl('h3', { text: '显示' });
    new Setting(containerEl)
      .setName('显示语言')
      .setDesc('auto 跟随 Obsidian 界面语言；也可固定为某个语言标签。')
      .addDropdown((drop) => {
        drop.addOption('auto', 'auto（跟随 Obsidian）');
        ['zh-CN', 'zh-TW', 'en', 'ja'].forEach((lang) => drop.addOption(lang, lang));
        drop.setValue(this.plugin.settings.display.language || 'auto').onChange(async (value) => {
          this.plugin.settings.display.language = value;
          await this.persist();
        });
      });

    new Setting(containerEl)
      .setName('备用语言')
      .setDesc('当前语言没有译文时，再尝试这个语言；留空则不启用。')
      .addText((text) => text.setPlaceholder('例如 zh-CN').setValue(this.plugin.settings.display.fallbackLanguage || '').onChange(async (value) => {
        this.plugin.settings.display.fallbackLanguage = String(value || '').trim();
        await this.persist();
      }));

    containerEl.createEl('h3', { text: '诊断' });
    new Setting(containerEl)
      .setName('词条统计')
      .setDesc('当前词条 ' + this.plugin.info.size + ' · 词根 ' + this.plugin.roots.size + ' · 自定义冲突 ' + this.plugin.lexiconConflicts.length)
      .addButton((btn) => btn.setButtonText('重新载入').onClick(async () => { await this.plugin.refresh(); this.display(); }));
  }

  pickFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.json,text/markdown,application/json';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      input.remove();
      if (!file) return;
      try {
        const text = await file.text();
        const dir = (this.plugin.manifest && this.plugin.manifest.dir ? this.plugin.manifest.dir : '.obsidian/plugins/epxsc-syntax') + '/lexicons';
        const adapter = this.app.vault.adapter;
        if (adapter && typeof adapter.mkdir === 'function') {
          try { await adapter.mkdir(dir); } catch (e) { /* exists */ }
        }
        if (!adapter || typeof adapter.write !== 'function') throw new Error('Vault adapter 不支持写入');
        const target = dir + '/' + file.name;
        await adapter.write(target, text);
        const list = this.plugin.settings.lexicon.customPaths;
        if (list.indexOf(target) < 0) list.push(target);
        await this.persist();
        new Notice('已导入词库：' + target);
        this.display();
      } catch (err) {
        new Notice('词库导入失败：' + (err && err.message ? err.message : err));
      }
    });
    input.click();
  }
}

module.exports = { EpXsSettingsTab };
