const Module = require('module');
const stub = {
  Plugin: class {
    constructor(app, manifest) { this.app = app; this.manifest = manifest; }
    registerEvent() { return {}; }
    register() { return {}; }
    addCommand() {}
    registerMarkdownCodeBlockProcessor() {}
    registerMarkdownPostProcessor() {}
    registerInterval() {}
    registerDomEvent() {}
    registerHoverLinkSource() {}
  },
  TFile: class {}, TFolder: class {}, Notice: class { constructor() {} }, MarkdownView: class {}, Modal: class {}
};
const orig = Module._load;
Module._load = function (req, parent, isMain) {
  if (req === 'obsidian') return stub;
  return orig.call(this, req, parent, isMain);
};
const P = require('../main.js');
const app = {
  vault: { on: () => ({}), getAbstractFileByPath: () => null, adapter: { read: async () => '' }, cachedRead: async () => '' },
  workspace: { on: () => ({}), onLayoutReady: () => {}, getActiveViewOfType: () => null }
};
const fakeEl = () => ({ classList: { add() {} }, appendChild() {}, style: {}, createEl() {}, empty() {} });
global.window = { Prism: { languages: {} }, setTimeout, clearTimeout, setInterval, clearInterval };
global.document = { addEventListener() {}, querySelectorAll: () => [], createElement: fakeEl, head: { appendChild() {} }, hidden: false };
const p = new P(app, { id: 'epxsc-syntax', dir: '.obsidian/plugins/epxsc-syntax' });
try {
  p.onload();
  console.log('onload OK');
} catch (e) {
  console.error(e.stack || e);
  process.exitCode = 1;
}
