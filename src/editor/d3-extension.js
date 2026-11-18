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
  const onFirstUpdate = typeof opts.onFirstUpdate === 'function' ? opts.onFirstUpdate : function () {};
  const getUnknowns = typeof opts.getUnknowns === 'function' ? opts.getUnknowns : function () { return []; };
  let firstUpdateDone = false;

  function build(view) {
    const ranges = [];
    if (!isEnabled()) return Decoration.none;
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
      ranges.push(Decoration.line({
        class: 'epx-cm-lint-' + (error ? 'error' : 'warn'),
        attributes: { 'data-epx-lint': title, title: title }
      }).range(line.from));
    }
    try {
      const unknowns = getUnknowns(view.state.doc.toString()) || [];
      for (let u = 0; u < unknowns.length; u++) {
        const r = unknowns[u];
        if (r.from >= 0 && r.to > r.from && r.to <= view.state.doc.length) {
          ranges.push(Decoration.mark({ class: 'epx-cm-unknown', attributes: { title: '未入典：' + (r.text || '') } }).range(r.from, r.to));
        }
      }
    } catch (e) { onError('unknowns', e); }
    if (!ranges.length) return Decoration.none;
    return Decoration.set(ranges, true);
  }

  return ViewPlugin.fromClass(class {
    constructor(view) {
      this.decorations = this.safeBuild(view);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) this.decorations = this.safeBuild(update.view);
      if (!firstUpdateDone) { firstUpdateDone = true; try { onFirstUpdate(); } catch (e) { /* best effort */ } }
    }
    safeBuild(view) {
      try { return build(view); } catch (e) { onError('build', e); return Decoration.none; }
    }
  }, {
    decorations: function (value) { return value.decorations; }
  });
}

module.exports = { createD3Extension };
