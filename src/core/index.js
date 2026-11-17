'use strict';

/* Public, Obsidian-free core entry for other tools. */
const blocks = require('./markdown-blocks.js');
const grammar = require('./grammar.js');
const tokenizer = require('./tokenizer.js');
const parsers = require('../data/parsers.js');
const spells = require('./spells.js');
const lint = require('./lint.js');
const markup = require('./markup.js');
const ord = require('./ord/parse.js');
const settings = require('./settings.js');
const lexiconMerge = require('./lexicon/merge.js');
const translation = require('./translation/request.js');
const translationPrompt = require('./translation/prompt.js');
const translationReference = require('./translation/reference.js');
const translationRedact = require('./translation/redact.js');

module.exports = Object.assign(
  {},
  blocks,
  grammar,
  tokenizer,
  parsers,
  spells,
  lint,
  markup,
  ord,
  settings,
  lexiconMerge,
  translation,
  translationPrompt,
  translationReference,
  translationRedact,
  {
    /* 稳定别名：外部工具按这些名字调用 */
    extractBlocks: blocks.extractEpXsCBlocks,
    parseDictionary: parsers.parseEntries,
    buildGrammar: grammar.makeGrammar,
    tokenize: tokenizer.tokenizeText,
    lint: lint.lintText,
    parseOrdLines: ord.parseOrdLines,
    parseTranslations: ord.parseTranslations,
    normalizeLang: ord.normalizeLang,
    pickTranslation: ord.pickTranslation,
    sourceHash: ord.sourceHash,
    normalizeSettings: settings.normalizeSettings,
    mergeDictionaries: lexiconMerge.mergeDictionaries,
    resolveEndpoint: translation.resolveEndpoint,
    validateProviderConfig: translation.validateProviderConfig,
    providerFingerprint: translation.providerFingerprint,
    parseReferenceResponse: translationReference.parseReferenceResponse,
    redactHeaders: translationRedact.redactHeaders,
    redactUrl: translationRedact.redactUrl
  }
);
