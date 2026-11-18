'use strict';

/* Pure D3 lifecycle state machine. No Obsidian, no CM6. */
class D3Controller {
  constructor(options) {
    const o = options || {};
    this.maxErrors = Number(o.maxErrors) > 0 ? Number(o.maxErrors) : 3;
    this.state = 'disabled';
    this.signatures = new Set();
    this.lastError = null;
  }
  enable() {
    if (this.state === 'active') return this.state;
    this.state = 'enabling';
    return this.state;
  }
  activate() {
    if (this.state === 'enabling' || this.state === 'active') this.state = 'active';
    return this.state;
  }
  disable() {
    this.state = 'disabled';
    return this.state;
  }
  fail(stage, err) {
    const sig = String(stage || 'unknown') + ':' + String(err && err.message || err || '');
    this.lastError = { stage: stage, signature: sig };
    if (this.state === 'disabled') return this.state;
    this.signatures.add(sig);
    if (this.signatures.size >= this.maxErrors) {
      this.state = 'disabled-on-crash';
    }
    return this.state;
  }
  isEnabled() {
    return this.state === 'enabling' || this.state === 'active';
  }
  canRender() {
    return this.state === 'active';
  }
}
module.exports = { D3Controller };
