'use strict';

const { SuggestModal } = require('obsidian');
const { wordCandidates, grammarCandidates, wordAt } = require('../core/completion.js');

class CompletionModal extends SuggestModal {
  constructor(app, plugin, editor) {
    super(app);
    this.plugin = plugin;
    this.editor = editor;
    const cursor = editor.getCursor();
    this.line = editor.getLine(cursor.line) || '';
    this.cursor = { line: cursor.line, ch: cursor.ch };
    this.span = wordAt(this.line, cursor.ch);
    this.prefix = this.span.prefix || '';
  }

  getSuggestions(query) {
    const q = String(query || '').trim();
    const prefix = q || this.prefix;
    const words = wordCandidates(this.plugin.info, prefix, 40);
    const grammar = grammarCandidates(this.plugin.grammar, prefix, 20);
    const seen = new Set();
    const out = [];
    const all = words.concat(grammar);
    for (let i = 0; i < all.length; i++) {
      const key = all[i].kind + ':' + all[i].word;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(all[i]);
    }
    return out;
  }

  renderSuggestion(item, el) {
    const row = el.createDiv({ cls: 'epx-completion-row' });
    row.createSpan({ cls: 'epx-completion-word', text: item.word });
    if (item.pos) row.createSpan({ cls: 'epx-completion-pos', text: item.pos });
    if (item.meaning) row.createSpan({ cls: 'epx-completion-meaning', text: item.meaning });
    if (item.kind === 'grammar') row.createSpan({ cls: 'epx-completion-kind', text: '语法' });
  }

  onChooseSuggestion(item) {
    if (!item || !item.word) return;
    const from = { line: this.cursor.line, ch: this.span.start };
    const to = { line: this.cursor.line, ch: this.span.end };
    this.editor.replaceRange(item.word, from, to);
    this.editor.setCursor({ line: this.cursor.line, ch: this.span.start + item.word.length });
    this.close();
  }
}

module.exports = { CompletionModal };
