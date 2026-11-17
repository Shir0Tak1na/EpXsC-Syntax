'use strict';

/* D3 spike: prove that a host-provided CM6 extension can be registered without bundling CM6. */
let ViewPlugin;
try {
  const cmView = require('@codemirror/view');
  ViewPlugin = cmView.ViewPlugin;
} catch (e) {
  console.warn('[EpXsC D3 spike] host CM6 module is unavailable:', e && e.message ? e.message : e);
}

function createNoopExtension() {
  if (!ViewPlugin || typeof ViewPlugin.fromClass !== 'function') return null;
  return ViewPlugin.fromClass(class {
    constructor() { this.enabled = true; }
    update() { /* no decorations: registration/lifecycle only */ }
  });
}

module.exports = { createNoopExtension };
