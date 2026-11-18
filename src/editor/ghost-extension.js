'use strict';

/* D4.1 inline ghost text for EpXsT source lines. Host-provided CM6 only. */
let ViewPlugin, Decoration, WidgetType, EditorView;
try {
  const view = require('@codemirror/view');
  ViewPlugin = view.ViewPlugin;
  Decoration = view.Decoration;
  WidgetType = view.WidgetType;
  EditorView = view.EditorView;
} catch (e) {
  console.warn('[EpXsC Ghost] host CM6 unavailable:', e && e.message ? e.message : e);
}

class GhostWidget extends WidgetType {
  constructor(text) { super(); this.text = text; }
  eq(other) { return other && other.text === this.text; }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'epx-ghost';
    span.textContent = this.text;
    span.setAttribute('aria-hidden', 'true');
    return span;
  }
  ignoreEvent() { return true; }
}

function createGhostExtension(options) {
  const o = options || {};
  if (!ViewPlugin || !Decoration || !WidgetType || !EditorView) return null;
  const getSuggestion = typeof o.getSuggestion === 'function' ? o.getSuggestion : function () { return null; };
  const isEnabled = typeof o.isEnabled === 'function' ? o.isEnabled : function () { return true; };

  const plugin = ViewPlugin.fromClass(class {
    constructor(view) { this.decorations = this.build(view); }
    update(update) {
      if (update.docChanged || update.selectionSet) this.decorations = this.build(update.view);
    }
    build(view) {
      try {
        if (!isEnabled()) return Decoration.none;
        const sel = view.state.selection.main;
        if (!sel.empty) return Decoration.none;
        const pos = sel.head;
        const s = getSuggestion(view.state.doc.toString(), pos);
        if (!s || !s.text) return Decoration.none;
        if (typeof s.from === 'number' && s.from < s.to) {
          return Decoration.set([Decoration.replace({ widget: new GhostWidget(s.text) }).range(s.from, s.to)]);
        }
        return Decoration.set([Decoration.widget({ widget: new GhostWidget(s.text), side: 1 }).range(pos)]);
      } catch (e) {
        return Decoration.none;
      }
    }
  }, { decorations: function (v) { return v.decorations; } });

  const keys = EditorView.domEventHandlers({
    keydown: function (event, view) {
      if (event.key !== 'Tab') return false;
      try {
        const pos = view.state.selection.main.head;
        if (!view.state.selection.main.empty) return false;
        const s = getSuggestion(view.state.doc.toString(), pos);
        if (!s || !s.text) return false;
        const from = typeof s.from === 'number' ? s.from : pos;
        const to = typeof s.to === 'number' ? s.to : pos;
        view.dispatch({
          changes: { from: from, to: to, insert: s.text },
          selection: { anchor: from + s.text.length }
        });
        event.preventDefault();
        return true;
      } catch (e) {
        return false;
      }
    }
  });

  return [plugin, keys];
}

module.exports = { createGhostExtension };
