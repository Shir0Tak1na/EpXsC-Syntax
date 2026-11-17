'use strict';

/* Pure dictionary merge. Dictionary identity is the word key (2.1.0). */

function sameEntry(a, b) {
  return a && b && a.word === b.word && a.pos === b.pos && a.meaning === b.meaning && (a.abbr || '') === (b.abbr || '');
}

function mergeDictionaries(base, layers) {
  const out = new Map(base || []);
  const conflicts = [];
  const list = Array.isArray(layers) ? layers : [];
  for (let i = 0; i < list.length; i++) {
    const layer = list[i] || {};
    const name = layer.name || ('layer-' + i);
    const entries = layer.entries;
    if (!entries || typeof entries.forEach !== 'function') continue;
    entries.forEach(function (value, key) {
      if (out.has(key)) {
        const prev = out.get(key);
        if (!sameEntry(prev, value)) {
          conflicts.push({
            word: value.word || key,
            key: key,
            source: name,
            previous: prev,
            next: value,
            kinds: [
              prev.meaning !== value.meaning ? 'definition' : '',
              prev.pos !== value.pos ? 'pos' : '',
              (prev.abbr || '') !== (value.abbr || '') ? 'abbr' : ''
            ].filter(Boolean)
          });
        }
      }
      out.set(key, value);
    });
  }
  return { dictionary: out, conflicts: conflicts };
}

module.exports = { mergeDictionaries, sameEntry };
