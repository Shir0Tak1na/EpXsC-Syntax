'use strict';

/* Lint a source block against a lexicon snapshot. Pure service. */

const { lintText } = require('../core/lint.js');

function lintSource(source, snapshot, path) {
  const s = snapshot || {};
  return lintText(source, {
    info: s.info || new Map(),
    units: s.units || new Set(),
    keys: s.keys || new Set(),
    spells: s.spells || new Map(),
    path: path || ''
  });
}

module.exports = { lintSource };
