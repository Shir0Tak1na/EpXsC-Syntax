# EpXsC CLI

The CLI uses the same Obsidian-free core as the plugin. It is a sample consumer for
`src/core/index.js` and does not import Obsidian, DOM or vault APIs.

## Usage

```bash
node bin/epxsc.mjs --help
node bin/epxsc.mjs tokenize note.md
node bin/epxsc.mjs tokenize note.md --json
node bin/epxsc.mjs lint note.md
node bin/epxsc.mjs lint note.md --json --dictionary 述无空语词典.md --syntax 述无空语术式语法.md
```

When installed as a package, the bin name is `epxsc`.

## Commands

### tokenize

- extracts `EpXsC` / `epxsc` / `EPXSC` fenced blocks (case-insensitive);
- if there are no fenced blocks, tokenizes the whole file;
- `--dictionary <md>` builds keyword/predicate/unit lists from a dictionary.
- `--json` prints `{ "file": "...", "blocks": [{ "line": n, "html": "..." }] }`.

### lint

- extracts EpXsC fenced blocks and runs the core linter;
- `--dictionary` / `--syntax` load hover/lint context;
- exits **1** when at least one `error` is reported, otherwise **0**;
- `--json` prints `{ "file": "...", "blocks": n, "issues": [...] }`.

## Package exports

```js
const core = require('./src/core');          // pure core API
const { tokenize, lint } = require('./src/core');
```

```json
{
  "exports": {
    ".": "./src/core/index.js",
    "./cli": "./bin/epxsc.mjs"
  }
}
```

## Limits

- The CLI has no vault access; pass `--dictionary` and `--syntax` explicitly for full lint context.
- It is a sample integration, not a language server; the plugin remains the primary UI.
