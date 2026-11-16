'use strict';

/* Debounced refresh scheduler. Pure; timers are injectable for Node tests. */

class RefreshScheduler {
  constructor(run, delay, timers) {
    if (typeof run !== 'function') throw new TypeError('run must be a function');
    this.run = run;
    this.delay = typeof delay === 'number' ? delay : 300;
    const t = timers || {};
    this.setTimeout = t.setTimeout || setTimeout;
    this.clearTimeout = t.clearTimeout || clearTimeout;
    this.timer = null;
    this.generation = 0;
  }

  request() {
    this.cancel();
    this.generation += 1;
    const gen = this.generation;
    this.timer = this.setTimeout(() => {
      this.timer = null;
      if (gen !== this.generation) return;
      this.run();
    }, this.delay);
    return gen;
  }

  cancel() {
    if (this.timer !== null) {
      this.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  pending() {
    return this.timer !== null;
  }
}

module.exports = { RefreshScheduler };
