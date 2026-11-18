'use strict';

/* D3.2: line-level CodeMirror decorations. CM6 is host-provided; never bundling. */
let ViewPlugin, Decoration, RangeSetBuilder;
try {
  const view = require('@codemirror/view');
  const state = require('@codemirror/state');
  ViewPlugin = view.ViewPlugin;
  Decoration = view.Decoration;
  RangeSetBuilder = state.RangeSetBuilder;
} catch (e) {
  console.warn('[EpXsC D3] host CM6 unavailable:', e && e.message ? e.message : e);
}

function createD3Extension(options) {
  const opts = options || {};
  if (!ViewPlugin || !Decoration || !RangeSetBuilder) return null;
  const getIssues = typeof opts.getIssues === 'function' ? opts.getIssues : function () { return []; };
  const isEnabled = typeof opts.isEnabled === 'function' ? opts.isEnabled : function () { return true; };
  const onError = typeof opts.onError === 'function' ? opts.onError : function () {};

  function build(view) {
    const builder = new RangeSetBuilder();
    if (!isEnabled()) return builder.finish();
    let issues;
    try {
      issues = getIssues(view.state.doc.toString());
    } catch (e) {
      onError('issue', e);
      return builder.finish();
    }
    const byLine = new Map();
    for (let i = 0; i < issues.length; i++) {
      const n = Number(issues[i].line);
      if (!n || n < 1 || n > view.state.doc.lines) continue;
      if (!byLine.has(n)) byLine.set(n, []);
      byLine.get(n).push(issues[i]);
    }
    const nums = Array.from(byLine.keys()).sort(function (a, b) { return a - b; });
    for (let k = 0; k < nums.length; k++) {
      const n = nums[k];
      const line = view.state.doc.line(n);
      const list = byLine.get(n);
      const error = list.some(function (x) { return x.level === 'error'; });
      const title = list.map(function (x) { return x.message + (x.approximate ? '（此行附近）' : ''); }).join('\n');
      builder.add(line.from, line.from, Decoration.line({
        class: 'epx-cm-lint-' + (error ? 'error' : 'warn'),
        attributes: { 'data-epx-lint': title, title: title }
      }));
    }
    return builder.finish();
  }

  return ViewPlugin.fromClass(class {
    constructor(view) {
      this.decorations = this.safeBuild(view);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) this.decorations = this.safeBuild(update.view);
    }
    safeBuild(view) {
      try { return build(view); } catch (e) { onError('build', e); return new RangeSetBuilder().finish(); }
    }
  }, {
    decorations: function (value) { return value.decorations; }
  });
}

module.exports = { createD3Extension };
