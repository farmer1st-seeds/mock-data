# API Reference

## No JavaScript API

`@farmer1st-seeds/mock-overlays` is a **pure data package**. It contains only JSON overlay files and exports no JavaScript functions.

## Validation Script

The package includes a standalone `validate.mjs` CLI script for checking overlay integrity:

```bash
node packages/mock-overlays/validate.mjs                   # Validate overlay files
```

This validates overlay file correctness: filename/meta consistency, visibility, fields array, values array length, etc.

## Package Contents

### @farmer1st-seeds/mock-overlays

Overlay JSON files (realistic names, regional data) and a `validate.mjs` script. Overlay files follow the naming convention `{field}-{group}.json` (e.g., `first-names-kenya.json`).
