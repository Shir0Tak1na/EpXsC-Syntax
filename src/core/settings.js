'use strict';

/* Pure settings normalization. No Obsidian imports. */

const DEFAULT_SETTINGS = {
  schemaVersion: 1,
  lexicon: { customPaths: [] },
  display: { language: 'auto', fallbackLanguage: '' }
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
  const language = String(display.language || 'auto').trim() || 'auto';
  const fallback = String(display.fallbackLanguage || '').trim();
  return {
    schemaVersion: 1,
    lexicon: { customPaths: normalizePaths(lexicon.customPaths) },
    display: {
      language: language === 'auto' ? 'auto' : language,
      fallbackLanguage: fallback
    }
  };
}

module.exports = { DEFAULT_SETTINGS, normalizeSettings, normalizePaths };
