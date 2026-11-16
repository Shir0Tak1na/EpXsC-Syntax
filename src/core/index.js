'use strict';

/* Public, Obsidian-free core entry for other tools. */
const blocks = require('./markdown-blocks.js');
const grammar = require('./grammar.js');
const tokenizer = require('./tokenizer.js');
const parsers = require('../data/parsers.js');
const spells = require('./spells.js');
const lint = require('./lint.js');
const markup = require('./markup.js');

module.exports = Object.assign(
  {},
  blocks,
  grammar,
  tokenizer,
  parsers,
  spells,
  lint,
  markup,
  {
    /* 稳定别名：外部工具按这些名字调用 */
    extractBlocks: blocks.extractEpXsCBlocks,
    parseDictionary: parsers.parseEntries,
    buildGrammar: grammar.makeGrammar,
    tokenize: tokenizer.tokenizeText,
    lint: lint.lintText
  }
);
