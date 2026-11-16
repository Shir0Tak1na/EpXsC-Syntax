'use strict';

/* Collect spell declarations from named source files. Pure service. */

const { collectSpells } = require('../core/spells.js');

function buildSpellRegistry(sources) {
  const spells = new Map();
  const list = Array.isArray(sources) ? sources : [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item || typeof item.text !== 'string') continue;
    collectSpells(item.text, spells, item.path || '');
  }
  return spells;
}

module.exports = { buildSpellRegistry };
