'use strict';

/* Pure settings normalization. No Obsidian imports. */

const { DEFAULT_PROVIDER, normalizeProviderConfig } = require('./translation/request.js');

const DEFAULT_SETTINGS = {
  schemaVersion: 1,
  lexicon: { customPaths: [] },
  display: { language: 'auto', fallbackLanguage: '' },
  diagnostics: { enabled: true, editorDecorations: false },
  translation: {
    enabled: false,
    grammarPath: '',
    provider: Object.assign({}, DEFAULT_PROVIDER)
  }
};

function normalizePaths(input) {
  const out = [];
  const seen = new Set();
  const list = Array.isArray(input) ? input : [];
  for (let i = 0; i < list.length; i++) {
    const s = String(list[i] || '').trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function normalizeSettings(data) {
  const d = data && typeof data === 'object' ? data : {};
  const lexicon = d.lexicon && typeof d.lexicon === 'object' ? d.lexicon : {};
  const display = d.display && typeof d.display === 'object' ? d.display : {};
  const translation = d.translation && typeof d.translation === 'object' ? d.translation : {};
  const diagnostics = d.diagnostics && typeof d.diagnostics === 'object' ? d.diagnostics : {};
  const language = String(display.language || 'auto').trim() || 'auto';
  const fallback = String(display.fallbackLanguage || '').trim();
  return {
    schemaVersion: 1,
    lexicon: { customPaths: normalizePaths(lexicon.customPaths) },
    display: {
      language: language === 'auto' ? 'auto' : language,
      fallbackLanguage: fallback
    },
    diagnostics: {
      enabled: diagnostics.enabled !== false,
      editorDecorations: diagnostics.editorDecorations === true
    },
    translation: {
      enabled: translation.enabled === true,
      grammarPath: String(translation.grammarPath || '').trim(),
      provider: normalizeProviderConfig(translation.provider)
    }
  };
}

module.exports = { DEFAULT_SETTINGS, normalizeSettings, normalizePaths };
