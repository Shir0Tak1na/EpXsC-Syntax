'use strict';

/* 2.3.0 D3: CodeMirror 6 line decorations for EpXsC lint issues.
   The extension itself is pure; the host supplies a sync issue callback. */

const { Decoration, ViewPlugin } = require('@codemirror/view');
const { RangeSetBuilder } = require('@codemirror/state');

function buildDecorations(view, issues) {
  const builder = new RangeSetBuilder();
  const list = Array.isArray(issues) ? issues.slice() : [];
  list.sort(function (a, b) { return Number(a.line) - Number(b.line); });
  const byLine = new Map();
  for (let i = 0; i < list.length; i++) {
    const n = Number(list[i].line);
    if (!n || n < 1 || n > view.state.doc.lines) continue;
    if (!byLine.has(n)) byLine.set(n, []);
    byLine.get(n).push(list[i]);
  }
  const nums = Array.from(byLine.keys()).sort(function (a, b) { return a - b; });
  for (let k = 0; k < nums.length; k++) {
    const n = nums[k];
    const line = view.state.doc.line(n);
    const items = byLine.get(n);
    const error = items.some(function (x) { return x.level === 'error'; });
    const title = items.map(function (x) { return x.message; }).join('\n');
    builder.add(line.from, line.from, Decoration.line({
      class: 'epx-cm-lint-' + (error ? 'error' : 'warn'),
      attributes: { title: title }
    }));
  }
  return builder.finish();
}

function createLintExtension(getIssues) {
  return ViewPlugin.fromClass(class {
    constructor(view) {
      this.decorations = this.build(view);
    }
    update(update) {
      if (update.docChanged) this.decorations = this.build(update.view);
    }
    build(view) {
      try {
        const text = view.state.doc.toString();
        return buildDecorations(view, getIssues(text));
      } catch (e) {
        return buildDecorations(view, []);
      }
    }
  }, {
    decorations: function (value) { return value.decorations; }
  });
}

module.exports = { createLintExtension };
