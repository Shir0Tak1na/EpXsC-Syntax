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

    containerEl.createEl('h3', { text: '翻译（2.2.0）' });
    const tr = this.plugin.settings.translation;
    new Setting(containerEl)
      .setName('启用自动翻译')
      .setDesc('默认关闭；开启后仅在 T 块缺当前语言译文时请求本地模型。')
      .addToggle((toggle) => toggle.setValue(!!tr.enabled).onChange(async (value) => {
        tr.enabled = !!value;
        await this.persist();
      }));

    new Setting(containerEl)
      .setName('Base URL')
      .setDesc('例如 http://127.0.0.1:11434/v1；非回环地址必须 HTTPS。')
      .addText((text) => text.setPlaceholder('http://127.0.0.1:11434/v1').setValue(tr.provider.baseUrl || '').onChange(async (value) => {
        tr.provider.baseUrl = String(value || '').trim();
        this.scheduleSave();
      }));

    new Setting(containerEl)
      .setName('Endpoint')
      .setDesc('相对 endpoint 会拼接 Base URL；也可填写完整 URL。')
      .addText((text) => text.setValue(tr.provider.endpoint || '/chat/completions').onChange(async (value) => {
        tr.provider.endpoint = String(value || '').trim();
        this.scheduleSave();
      }));

    new Setting(containerEl)
      .setName('Model')
      .addText((text) => text.setPlaceholder('模型名称').setValue(tr.provider.model || '').onChange(async (value) => {
        tr.provider.model = String(value || '').trim();
        this.scheduleSave();
      }));

    new Setting(containerEl)
      .setName('API Key')
      .setDesc('只保存在插件 data.json；不要使用带高权限的长期令牌。')
      .addText((text) => {
        text.inputEl.type = 'password';
        text.setValue(tr.provider.apiKey || '').onChange(async (value) => {
          tr.provider.apiKey = String(value || '');
          this.scheduleSave();
        });
      });

    new Setting(containerEl)
      .setName('Headers')
      .setDesc('JSON 对象；与内置 Content-Type 合并。')
      .addTextArea((text) => {
        text.inputEl.rows = 3;
        text.inputEl.style.width = '100%';
        text.setValue(JSON.stringify(tr.provider.headers || {}, null, 2)).onChange(async (value) => {
          try {
            const parsed = JSON.parse(String(value || '{}'));
            tr.provider.headers = parsed && typeof parsed === 'object' ? parsed : {};
            this.scheduleSave();
          } catch (e) { /* keep last valid headers */ }
        });
      });

    new Setting(containerEl)
      .setName('参数')
      .setDesc('timeoutMs / maxTokens / temperature')
      .addText((text) => text.setValue(String(tr.provider.timeoutMs || 30000)).onChange((value) => {
        tr.provider.timeoutMs = Number(value) || 30000; this.scheduleSave();
      }))
      .addText((text) => text.setValue(String(tr.provider.maxTokens || 2048)).onChange((value) => {
        tr.provider.maxTokens = Number(value) || 2048; this.scheduleSave();
      }))
      .addText((text) => text.setValue(String(tr.provider.temperature === undefined ? 0.3 : tr.provider.temperature)).onChange((value) => {
        tr.provider.temperature = Number(value); this.scheduleSave();
      }));

    new Setting(containerEl)
      .setName('测试连接')
      .setDesc('只在你点击时发起一次请求，不保存测试结果。')
      .addButton((btn) => btn.setButtonText('测试').onClick(async () => {
        const result = await this.plugin.testTranslation();
        new Notice(result && result.ok ? '翻译连接成功' : '翻译失败：' + (result && result.error ? result.error.message : '未知错误'));
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
