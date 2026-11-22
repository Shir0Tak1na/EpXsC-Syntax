import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
dom.window.__epxscD3Enabled = true;
global.MutationObserver = dom.window.MutationObserver;
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
dom.window.requestAnimationFrame = (fn) => setTimeout(fn, 0);
dom.window.cancelAnimationFrame = (id) => clearTimeout(id);
global.requestAnimationFrame = dom.window.requestAnimationFrame;
global.cancelAnimationFrame = dom.window.cancelAnimationFrame;

const { EditorView } = require('@codemirror/view');
const { createD3Extension } = require('../src/editor/d3-extension.js');
const { createGhostExtension } = require('../src/editor/ghost-extension.js');
const TICK = String.fromCharCode(96).repeat(3);

let errors = 0;
const d3 = createD3Extension({
  getIssues: () => [{ level: 'error', line: 2, message: 'synthetic', from: 10, to: 14 }],
  getUnknowns: () => [],
  isEnabled: () => true,
  onError: () => { errors += 1; }
});
const view = new EditorView({ doc: TICK + 'EpXsC\nFoo() {\n' + TICK, extensions: [d3], parent: document.body });
assert.ok(view.dom.querySelector('.cm-line.epx-cm-lint-error'), 'D3 error line decoration must render');
assert.ok(view.dom.querySelector('.epx-cm-lint-token-error'), 'D3 exact token decoration must render');
view.destroy();

const unknownD3 = createD3Extension({
  getIssues: () => [],
  getUnknowns: () => [{ from: 10, to: 14, text: 'Zzzz' }],
  isEnabled: () => true
});
const uv = new EditorView({ doc: TICK + 'EpXsT\nZzzz Aqua\n' + TICK, extensions: [unknownD3], parent: document.body });
assert.ok(uv.dom.querySelector('.epx-cm-unknown'), 'unknown word mark must render');
uv.destroy();

const bad = createD3Extension({
  getIssues: () => { throw new Error('synthetic'); },
  isEnabled: () => true,
  onError: () => { errors += 1; }
});
const bv = new EditorView({ doc: 'x', extensions: [bad], parent: document.body });
bv.dispatch({ changes: { from: 1, insert: 'y' } });
bv.dispatch({ changes: { from: 2, insert: 'z' } });
assert.ok(errors >= 1, 'extension errors must be reported without crashing');
bv.destroy();

const ghost = createGhostExtension({
  getSuggestion: () => ({ text: 'ua', from: 11, to: 11 }),
  isEnabled: () => true
});
const gv = new EditorView({ doc: TICK + 'EpXsT\nAq\n' + TICK, extensions: [ghost], parent: document.body });
assert.ok(gv.dom.querySelector('.epx-ghost'), 'ghost widget must render');
const event = new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
gv.contentDOM.dispatchEvent(event);
assert.equal(gv.state.doc.toString(), TICK + 'EpXsT\nAqua\n' + TICK);
gv.destroy();

console.log('OK: editor D3/ghost smoke');