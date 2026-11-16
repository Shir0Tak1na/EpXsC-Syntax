'use strict';

/* Public, Obsidian-free core entry for other tools. */
module.exports = Object.assign(
  {},
  require('./markdown-blocks.js'),
  require('./grammar.js'),
  require('./tokenizer.js'),
  require('../data/parsers.js'),
  require('./spells.js'),
  require('./lint.js'),
  require('./markup.js')
);
