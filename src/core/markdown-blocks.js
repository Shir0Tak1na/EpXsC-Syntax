'use strict';

function extractEpXsCBlocks(text) {
  const re = /^[ \t]*\x60{3}[ \t]*(?:EpXsC|epxsc|EPXSC)[ \t]*\r?\n([\s\S]*?)^[ \t]*\x60{3}[ \t]*\r?$/gm;
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    out.push({ source: m[1].replace(/\r/g, ''), line: text.slice(0, m.index).split('\n').length });
  }
  return out;
}

module.exports = { extractEpXsCBlocks };
